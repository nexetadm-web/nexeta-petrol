"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Save, Edit3, Clock, Sparkles } from "lucide-react";
import { DailyRate } from "@/lib/types";
import { formatRs, formatDate, toStandardYMD } from "@/lib/formatters";
import {
  getSavedRateLocal,
  saveRateLocal,
  formatLastUpdatedText,
  StoredRateData,
} from "@/lib/store/rates";

interface RateBannerProps {
  initialRate: DailyRate | null;
  todayDateStr: string;
  onRatesUpdated?: (rate: any) => void;
}

export function RateBanner({ initialRate, todayDateStr, onRatesUpdated }: RateBannerProps) {
  // Initialize with initialRate or localStorage immediately to prevent layout shifts/warnings
  const [rate, setRate] = useState<DailyRate | null>(() => {
    if (initialRate) return initialRate;
    const local = getSavedRateLocal(todayDateStr);
    if (local) {
      return {
        id: local.pump_id || 0,
        pump_id: local.pump_id || 1,
        date: local.date,
        petrol_rate: local.petrol_rate,
        diesel_rate: local.diesel_rate,
        hioctane_rate: local.hioctane_rate,
      };
    }
    return null;
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [petrol, setPetrol] = useState<string>("");
  const [diesel, setDiesel] = useState<string>("");
  const [hioctane, setHioctane] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const displayDate = formatDate(todayDateStr);

  // Sync state whenever initialRate or localStorage changes
  useEffect(() => {
    if (initialRate) {
      setRate(initialRate);
      setPetrol(initialRate.petrol_rate.toString());
      setDiesel(initialRate.diesel_rate.toString());
      setHioctane(initialRate.hioctane_rate.toString());
      // Save to localStorage as backup
      saveRateLocal({
        petrol_rate: initialRate.petrol_rate,
        diesel_rate: initialRate.diesel_rate,
        hioctane_rate: initialRate.hioctane_rate,
        date: todayDateStr,
      });
      setLastUpdated(formatLastUpdatedText(new Date()));
      return;
    }

    // Check localStorage if initialRate is null
    const local = getSavedRateLocal(todayDateStr);
    if (local) {
      const restoredRate: DailyRate = {
        id: local.pump_id || 0,
        pump_id: local.pump_id || 1,
        date: local.date,
        petrol_rate: local.petrol_rate,
        diesel_rate: local.diesel_rate,
        hioctane_rate: local.hioctane_rate,
      };
      setRate(restoredRate);
      setPetrol(local.petrol_rate.toString());
      setDiesel(local.diesel_rate.toString());
      setHioctane(local.hioctane_rate.toString());
      setLastUpdated(formatLastUpdatedText(local.updated_at));
    } else {
      // Fetch directly from /api/rates?date=today
      const ymd = toStandardYMD(todayDateStr) || new Date().toISOString().split("T")[0];
      fetch(`/api/rates?date=${ymd}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.rate) {
            setRate(data.rate);
            setPetrol(data.rate.petrol_rate.toString());
            setDiesel(data.rate.diesel_rate.toString());
            setHioctane(data.rate.hioctane_rate.toString());
            saveRateLocal(data.rate, todayDateStr);
            setLastUpdated(formatLastUpdatedText(data.rate.updated_at || new Date()));
          }
        })
        .catch(() => {});
    }
  }, [initialRate, todayDateStr]);

  // Listen to custom window rate update events from other components
  useEffect(() => {
    const handleCustomUpdate = (e: any) => {
      const detail = e.detail as StoredRateData;
      if (detail) {
        setRate({
          id: detail.pump_id || 0,
          pump_id: detail.pump_id || 1,
          date: detail.date,
          petrol_rate: detail.petrol_rate,
          diesel_rate: detail.diesel_rate,
          hioctane_rate: detail.hioctane_rate,
        });
        setPetrol(detail.petrol_rate.toString());
        setDiesel(detail.diesel_rate.toString());
        setHioctane(detail.hioctane_rate.toString());
        setLastUpdated(formatLastUpdatedText(detail.updated_at));
      }
    };

    window.addEventListener("nexeta_rates_updated", handleCustomUpdate);
    return () => {
      window.removeEventListener("nexeta_rates_updated", handleCustomUpdate);
    };
  }, []);

  const handleStartEdit = () => {
    if (rate) {
      setPetrol(rate.petrol_rate.toString());
      setDiesel(rate.diesel_rate.toString());
      setHioctane(rate.hioctane_rate.toString());
    }
    setErrorMsg("");
    setSuccessMsg("");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (rate) {
      setIsEditing(false);
      setErrorMsg("");
    }
  };

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const pRate = parseFloat(petrol);
    const dRate = parseFloat(diesel);
    const hRate = parseFloat(hioctane);

    if (isNaN(pRate) || isNaN(dRate) || isNaN(hRate) || pRate <= 0 || dRate <= 0 || hRate <= 0) {
      setErrorMsg("تمام ریٹ صحیح درج کریں (Please enter valid positive numbers for all 3 fuels)");
      return;
    }

    try {
      setLoading(true);

      const targetDate = toStandardYMD(todayDateStr) || new Date().toISOString().split("T")[0];
      const nowIso = new Date().toISOString();

      // 1. Save to Database
      const res = await fetch("/api/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: targetDate,
          petrol_rate: pRate,
          diesel_rate: dRate,
          hioctane_rate: hRate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save rates");
      }

      const savedRateObj: DailyRate = data.rate || {
        id: 0,
        pump_id: 1,
        date: targetDate,
        petrol_rate: pRate,
        diesel_rate: dRate,
        hioctane_rate: hRate,
      };

      // 2. Save to localStorage with date key `petrol_rates_YYYY-MM-DD`
      saveRateLocal({
        petrol_rate: pRate,
        diesel_rate: dRate,
        hioctane_rate: hRate,
        super_rate: hRate,
        date: targetDate,
        updated_at: nowIso,
      }, targetDate);

      setRate(savedRateObj);
      setIsEditing(false);
      setLastUpdated(formatLastUpdatedText(nowIso));
      setSuccessMsg("ریٹس کامیابی سے محفوظ ہو گئے ہیں! (Rates saved successfully)");
      setTimeout(() => setSuccessMsg(""), 4000);

      if (onRatesUpdated) {
        onRatesUpdated(savedRateObj);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error saving rates");
    } finally {
      setLoading(false);
    }
  };

  // CASE 1: Form to set/edit rates (Shown if no rate exists or user clicked "Rate Change / Edit Karein")
  if (!rate || isEditing) {
    return (
      <div
        className={`w-full rounded-2xl p-5 mb-6 transition-all ${
          !rate
            ? "bg-amber-50 border-2 border-amber-300 shadow-md text-slate-800"
            : "bg-white border border-slate-200 shadow-md text-slate-800"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Header & Alert Message */}
          <div className="flex items-start gap-3">
            <div
              className={`p-3 rounded-2xl ${
                !rate ? "bg-amber-500 text-white shadow-xs" : "bg-indigo-100 text-indigo-700"
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {!rate ? "آج کے فیول ریٹس درج کریں (Set Daily Rates)" : "آج کے فیول ریٹس تبدیل کریں (Change Rates)"}
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-100 border border-slate-300 text-slate-700 font-bold">
                  {displayDate}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                تمام نوزل سیلز اور میٹر ریڈنگز کا حساب خودکار طور پر ان ریٹس کے مطابق ہوگا
              </p>
            </div>
          </div>

          {/* Rate Inputs Form */}
          <form onSubmit={handleSaveRates} className="flex-1 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Petrol */}
              <div className="relative">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                  Petrol Super (پٹرول)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">Rs.</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="290.50"
                    value={petrol}
                    onChange={(e) => setPetrol(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              {/* Diesel */}
              <div className="relative">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1">
                  High Speed Diesel (ڈیزل)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">Rs.</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="280.30"
                    value={diesel}
                    onChange={(e) => setDiesel(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </div>
              </div>

              {/* Hi-Octane / Super */}
              <div className="relative">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-700 mb-1">
                  Super / Hi-Octane (اوکٹین)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">Rs.</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="300.00"
                    value={hioctane}
                    onChange={(e) => setHioctane(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                  />
                </div>
              </div>
            </div>

            {/* Error message */}
            {errorMsg && (
              <p className="text-xs text-red-700 mt-2 bg-red-100 p-2.5 rounded-xl border border-red-300 font-medium">
                {errorMsg}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 mt-3">
              {rate && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors font-medium"
                >
                  منسوخ (Cancel)
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all hover:scale-102 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? "محفوظ ہو رہا ہے..." : "ریٹ محفوظ کریں (Save Rates)"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // CASE 2: Rate is active for today - Show "موجودہ ریٹ چل رہا ہے (Mojuda Rate Chal Raha Hai)"
  return (
    <div className="w-full rounded-2xl bg-white border border-slate-200 shadow-sm p-4 sm:p-5 mb-6 relative">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Status info */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700">
                موجودہ ریٹ چل رہا ہے (Mojuda Rate Chal Raha Hai)
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-700 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300">
                {displayDate}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-slate-500 font-medium">
                تمام نوزلز کی ریڈنگز ان ریٹس پر حساب ہو رہی ہیں
              </p>
              {lastUpdated && (
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  • <Clock className="w-3 h-3 text-slate-400" />
                  <span>Aakhri update: {lastUpdated}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Rates Displays */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Petrol */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <div>
              <div className="text-[10px] text-emerald-800 uppercase font-bold">Petrol (پٹرول)</div>
              <div className="text-sm font-extrabold text-slate-900 font-mono">
                {formatRs(rate.petrol_rate)} /L
              </div>
            </div>
          </div>

          {/* Diesel */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <div>
              <div className="text-[10px] text-amber-800 uppercase font-bold">Diesel (ڈیزل)</div>
              <div className="text-sm font-extrabold text-slate-900 font-mono">
                {formatRs(rate.diesel_rate)} /L
              </div>
            </div>
          </div>

          {/* Super / Hi-Octane */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-pink-50 border border-pink-200">
            <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
            <div>
              <div className="text-[10px] text-pink-800 uppercase font-bold">Super (سپر / اوکٹین)</div>
              <div className="text-sm font-extrabold text-slate-900 font-mono">
                {formatRs(rate.hioctane_rate)} /L
              </div>
            </div>
          </div>

          {/* Edit button: "Rate Change / Edit Karein" */}
          <button
            onClick={handleStartEdit}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition-all hover:shadow-xs active:scale-98"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Rate Change / Edit Karein (ریٹ بدلیں)</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mt-3 text-xs font-bold text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-300 text-center animate-in fade-in">
          {successMsg}
        </div>
      )}
    </div>
  );
}
