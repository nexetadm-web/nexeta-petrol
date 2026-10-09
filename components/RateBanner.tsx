"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Save, Edit3 } from "lucide-react";
import { DailyRate } from "@/lib/types";
import { formatRs, formatDate } from "@/lib/formatters";

interface RateBannerProps {
  initialRate: DailyRate | null;
  todayDateStr: string;
  onRatesUpdated?: () => void;
}

export function RateBanner({ initialRate, todayDateStr, onRatesUpdated }: RateBannerProps) {
  const [rate, setRate] = useState<DailyRate | null>(initialRate);
  const [isEditing, setIsEditing] = useState<boolean>(!initialRate);
  const [petrol, setPetrol] = useState<string>(initialRate ? initialRate.petrol_rate.toString() : "");
  const [diesel, setDiesel] = useState<string>(initialRate ? initialRate.diesel_rate.toString() : "");
  const [hioctane, setHioctane] = useState<string>(initialRate ? initialRate.hioctane_rate.toString() : "");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const displayDate = formatDate(todayDateStr);

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
      const res = await fetch("/api/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: todayDateStr,
          petrol_rate: pRate,
          diesel_rate: dRate,
          hioctane_rate: hRate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save rates");
      }

      setRate(data.rate);
      setIsEditing(false);
      setSuccessMsg("آج کے ریٹس کامیابی سے محفوظ ہو گئے ہیں! (Today's rates saved successfully)");
      setTimeout(() => setSuccessMsg(""), 4000);
      if (onRatesUpdated) onRatesUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || "Error saving rates");
    } finally {
      setLoading(false);
    }
  };

  // If rate is not set today or is in editing mode
  if (!rate || isEditing) {
    return (
      <div
        className={`w-full rounded-2xl p-5 mb-6 transition-all ${
          !rate
            ? "bg-red-50 border-2 border-red-400 warning-pulse text-slate-800 shadow-md"
            : "bg-white border border-slate-200 shadow-md text-slate-800"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Header & Alert Message */}
          <div className="flex items-start gap-3">
            <div
              className={`p-3 rounded-2xl ${
                !rate ? "bg-red-600 text-white animate-bounce" : "bg-indigo-100 text-indigo-700"
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {!rate ? "⚠️ توجہ فرمائیں: آج کا ریٹ سیٹ کریں" : "آج کے فیول ریٹس تبدیل کریں"}
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-100 border border-slate-300 text-slate-700 font-bold">
                  {displayDate}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                {!rate
                  ? "آج کے ریٹس مقرر نہیں ہیں۔ جب تک ریٹ سیٹ نہیں ہوں گے میٹر ریڈنگز اور آمدنی کا حساب نہیں بنے گا۔"
                  : "All nozzle reading calculations automatically reflect these daily rates."}
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
                    placeholder="285.50"
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
                    placeholder="292.00"
                    value={diesel}
                    onChange={(e) => setDiesel(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </div>
              </div>

              {/* Hi-Octane */}
              <div className="relative">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-pink-700 mb-1">
                  Hi-Octane HOBC (اوکٹین)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">Rs.</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="312.00"
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
                  onClick={() => setIsEditing(false)}
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

  // Rate is already set for today - Show School SaaS confirmed card
  return (
    <div className="w-full rounded-2xl bg-white border border-slate-200 shadow-md p-4 sm:p-5 mb-6 relative">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Status info */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700">
                آج کے فیول ریٹس لاگو ہیں • Rates Active
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-700 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300">
                {displayDate}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              تمام نوزلز کی ریڈنگز ان ریٹس پر حساب ہو رہی ہیں
            </p>
          </div>
        </div>

        {/* Center: Rates Displays */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Petrol */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <div>
              <div className="text-[10px] text-emerald-800 uppercase font-bold">Petrol (پٹرول)</div>
              <div className="text-sm font-extrabold text-slate-900 font-mono">{formatRs(rate.petrol_rate)} /L</div>
            </div>
          </div>

          {/* Diesel */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <div>
              <div className="text-[10px] text-amber-800 uppercase font-bold">Diesel (ڈیزل)</div>
              <div className="text-sm font-extrabold text-slate-900 font-mono">{formatRs(rate.diesel_rate)} /L</div>
            </div>
          </div>

          {/* Hi-Octane */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-pink-50 border border-pink-200">
            <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
            <div>
              <div className="text-[10px] text-pink-800 uppercase font-bold">Hi-Octane (اوکٹین)</div>
              <div className="text-sm font-extrabold text-slate-900 font-mono">{formatRs(rate.hioctane_rate)} /L</div>
            </div>
          </div>

          {/* Edit button */}
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>ریٹ بدلیں (Edit)</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mt-3 text-xs font-bold text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-300 text-center">
          {successMsg}
        </div>
      )}
    </div>
  );
}
