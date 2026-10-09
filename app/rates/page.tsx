"use client";

import React, { useState, useEffect } from "react";
import { BadgeDollarSign, Save, Calendar, CheckCircle2, AlertTriangle, History } from "lucide-react";
import { formatRs, getTodayDatePK, formatDate } from "@/lib/formatters";
import { DailyRate } from "@/lib/types";

export default function DailyRatesPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDatePK());
  const [petrol, setPetrol] = useState<string>("");
  const [diesel, setDiesel] = useState<string>("");
  const [hioctane, setHioctane] = useState<string>("");
  const [history, setHistory] = useState<DailyRate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const fetchRates = async () => {
    try {
      setLoading(true);
      const resDate = await fetch(`/api/rates?date=${selectedDate}`);
      const dataDate = await resDate.json();
      if (dataDate.rate) {
        setPetrol(dataDate.rate.petrol_rate.toString());
        setDiesel(dataDate.rate.diesel_rate.toString());
        setHioctane(dataDate.rate.hioctane_rate.toString());
      } else {
        setPetrol("");
        setDiesel("");
        setHioctane("");
      }

      // Fetch history
      const resHist = await fetch(`/api/rates?history=true`);
      const dataHist = await resHist.json();
      if (dataHist.rates) {
        setHistory(dataHist.rates);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load rates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const pRate = parseFloat(petrol);
    const dRate = parseFloat(diesel);
    const hRate = parseFloat(hioctane);

    if (isNaN(pRate) || isNaN(dRate) || isNaN(hRate) || pRate <= 0 || dRate <= 0 || hRate <= 0) {
      setErrorMsg("تمام ریٹس صحیح درج کریں (Please enter valid positive numbers for all fuels)");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          petrol_rate: pRate,
          diesel_rate: dRate,
          hioctane_rate: hRate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save rate");

      setSuccessMsg(`تاریخ ${formatDate(selectedDate)} کے ریٹس کامیابی سے محفوظ ہو گئے ہیں!`);
      setTimeout(() => setSuccessMsg(""), 5000);
      fetchRates();
    } catch (err: any) {
      setErrorMsg(err.message || "Error saving rate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
          <span className="p-2 rounded-2xl bg-amber-100 text-amber-700">
            <BadgeDollarSign className="w-6 h-6" />
          </span>
          <span>روزانہ فیول ریٹس</span>
          <span className="text-slate-400 font-normal text-xl sm:text-2xl">| Daily Fuel Rates</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          اوگرا (OGRA) نوٹیفکیشن کے مطابق پٹرول، ڈیزل اور ہائی اوکٹین کے سرکاری ریٹ مقرر کریں
        </p>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Rate Form Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-md">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-900 uppercase tracking-wider">
              ریٹ مقرر کریں (Set Fuel Rates)
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-300 shadow-2xs">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <input
              type="text"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              placeholder="DD-MM-YYYY"
              className="bg-transparent text-slate-900 text-xs font-bold font-mono focus:outline-none w-28 text-center"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Super Petrol */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-teal-100 border-l-4 border-emerald-500 border border-emerald-200/80 shadow-md">
              <label className="block text-xs font-black text-emerald-900 uppercase tracking-wider mb-2">
                Super Petrol (پٹرول سپریم)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">Rs.</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="285.50"
                  value={petrol}
                  onChange={(e) => setPetrol(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-emerald-300 text-lg font-black font-mono text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 shadow-xs"
                />
              </div>
              <p className="text-[11px] text-emerald-800 font-bold mt-2">فی لیٹر خوردہ قیمت (Rs. per Litre)</p>
            </div>

            {/* High Speed Diesel */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 border-l-4 border-amber-500 border border-amber-200/80 shadow-md">
              <label className="block text-xs font-black text-amber-900 uppercase tracking-wider mb-2">
                High Speed Diesel (ڈیزل HSD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">Rs.</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="292.00"
                  value={diesel}
                  onChange={(e) => setDiesel(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-amber-300 text-lg font-black font-mono text-slate-900 focus:border-amber-600 focus:ring-2 focus:ring-amber-200 shadow-xs"
                />
              </div>
              <p className="text-[11px] text-amber-800 font-bold mt-2">فی لیٹر خوردہ قیمت (Rs. per Litre)</p>
            </div>

            {/* Hi-Octane */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 border-l-4 border-pink-500 border border-pink-200/80 shadow-md">
              <label className="block text-xs font-black text-pink-900 uppercase tracking-wider mb-2">
                Hi-Octane HOBC (ہائی اوکٹین)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">Rs.</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="312.00"
                  value={hioctane}
                  onChange={(e) => setHioctane(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-pink-300 text-lg font-black font-mono text-slate-900 focus:border-pink-600 focus:ring-2 focus:ring-pink-200 shadow-xs"
                />
              </div>
              <p className="text-[11px] text-pink-800 font-bold mt-2">فی لیٹر خوردہ قیمت (Rs. per Litre)</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all hover:scale-102 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "محفوظ ہو رہا ہے..." : "ریٹس محفوظ کریں (Save Rates)"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Historical Rates Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              گزشتہ ریٹس ہسٹری (Recent Rates History)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono font-bold">
            {history.length} records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">تاریخ (Date - DD-MM-YYYY)</th>
                <th className="py-3 px-4 text-right">Petrol Super</th>
                <th className="py-3 px-4 text-right">High Speed Diesel</th>
                <th className="py-3 px-4 text-right">Hi-Octane HOBC</th>
                <th className="py-3 px-4 text-center">ایکشن (Action)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    کوئی ہسٹری ریکارڈ موجود نہیں
                  </td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatDate(row.date)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-700">
                      {formatRs(row.petrol_rate)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-amber-700">
                      {formatRs(row.diesel_rate)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-pink-700">
                      {formatRs(row.hioctane_rate)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedDate(formatDate(row.date));
                          setPetrol(row.petrol_rate.toString());
                          setDiesel(row.diesel_rate.toString());
                          setHioctane(row.hioctane_rate.toString());
                        }}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 underline font-bold"
                      >
                        لوڈ کریں
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
