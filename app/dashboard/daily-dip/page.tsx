"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Gauge,
  Droplets,
  Fuel,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Calendar,
  Save,
  Clock,
  Sparkles,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet
} from "lucide-react";
import { formatLitres, formatRs, getTodayDatePK } from "@/lib/formatters";
import { usePump } from "@/lib/usePump";
import { getStockFromDip } from "@/lib/stock";

export default function DailyDipEntryPage() {
  const { pump } = usePump();
  const pumpId = pump?.id || 1;

  const [tanks, setTanks] = useState<any[]>([]);
  const [selectedTankId, setSelectedTankId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [chartRows, setChartRows] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState<boolean>(false);

  // Form states
  const [dipCm, setDipCm] = useState<string>("45");
  const [enteredDate, setEnteredDate] = useState<string>(getTodayDatePK());
  const [receivedLiters, setReceivedLiters] = useState<string>("0");
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Fetch tanks
  const fetchTanks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/pumps/${pumpId}/tanks`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tanks) && data.tanks.length > 0) {
          setTanks(data.tanks);
          if (!selectedTankId) {
            setSelectedTankId(data.tanks[0].id);
          }
        }
      }
    } catch (err) {
      console.error("fetch tanks error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pumpId) {
      fetchTanks();
    }
  }, [pumpId]);

  // Fetch selected tank's dip chart
  useEffect(() => {
    if (!selectedTankId) return;
    setLoadingChart(true);
    fetch(`/api/pumps/${pumpId}/tanks/${selectedTankId}/dip-chart`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setChartRows(data.chart || []);
          // Pre-fill current dip cm if tank has one
          if (data.tank?.current_dip_mm) {
            setDipCm(String(Math.round(data.tank.current_dip_mm / 10)));
          }
        }
      })
      .catch((err) => console.error("fetch chart error:", err))
      .finally(() => setLoadingChart(false));
  }, [selectedTankId, pumpId]);

  const currentTank = useMemo(() => {
    return tanks.find((t) => t.id === selectedTankId) || null;
  }, [tanks, selectedTankId]);

  // Auto-calculated Litres from Dip using Interpolation
  const calculatedLitres = useMemo(() => {
    const cm = parseFloat(dipCm);
    if (isNaN(cm) || cm <= 0) return 0;
    const dipMm = cm * 10;
    const cap = currentTank ? currentTank.capacity_liters || currentTank.capacity || 40000 : 40000;
    return getStockFromDip(dipMm, chartRows, cap);
  }, [dipCm, chartRows, currentTank]);

  const fillPercentage = useMemo(() => {
    const cap = currentTank ? currentTank.capacity_liters || currentTank.capacity || 40000 : 40000;
    return cap > 0 ? Math.min(100, Math.round((calculatedLitres / cap) * 100)) : 0;
  }, [calculatedLitres, currentTank]);

  // Handle Save Daily Dip
  const handleSaveDailyDip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTankId) return;

    const cm = parseFloat(dipCm);
    if (isNaN(cm) || cm <= 0) {
      setErrorMsg("درست ڈِپ سینٹی میٹر درج کریں");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg("");
      setSuccessMsg("");

      const dipMm = Math.round(cm * 10);
      const res = await fetch(`/api/pumps/${pumpId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tank_id: selectedTankId,
          date: enteredDate,
          dip_mm: dipMm,
          calculated_stock_liters: calculatedLitres,
          received_liters: parseFloat(receivedLiters) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "محفوظ کرنے میں خرابی");
      }

      setSuccessMsg(
        `روزانہ ڈِپ محفوظ ہو گئی! ${cm} cm = ${formatLitres(calculatedLitres)} اسٹاک اپ ڈیٹ ہو گیا۔`
      );
      fetchTanks();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || "خرابی");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-cyan-100 text-cyan-700 shadow-xs">
              <Droplets className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              روزانہ ڈِپ اینٹری (Daily Dip Entry)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {pump?.name || "Nexeta Petrol"} — ڈِپ سینٹی میٹر درج کریں، لیٹرز خودکار کیلیبریٹ ہو کر نکلیں گے
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/dip-chart/upload"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md transition-all hover:scale-102"
          >
            <Sliders className="w-4 h-4" />
            <span>📸 نیا ڈِپ چارٹ اپلوڈ کریں</span>
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-300 text-red-900 text-xs font-bold flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tank Selector Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {tanks.map((t) => {
          const isSelected = t.id === selectedTankId;
          const isDiesel = (t.product || t.fuel_type || "").toLowerCase().includes("diesel");
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTankId(t.id)}
              className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between ${
                isSelected
                  ? "bg-slate-900 text-white border-slate-900 shadow-md scale-102"
                  : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isDiesel ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                  />
                  <h4 className="font-black text-sm">{t.tank_name || t.name}</h4>
                </div>
                <div className={`text-xs mt-1 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                  {t.product || t.fuel_type} • {Number(t.capacity_liters || t.capacity).toLocaleString()}L
                </div>
              </div>

              <div className="text-left font-mono">
                <div className={`text-xs ${isSelected ? "text-slate-400" : "text-slate-400"}`}>
                  موجودہ ڈِپ:
                </div>
                <div className="font-black text-sm">
                  {Math.round((t.current_dip_mm || 0) / 10)} cm
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Dip Calculation Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md">
        <form onSubmit={handleSaveDailyDip} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Input Box: Dip cm */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                  آج کی ڈِپ سینٹی میٹر (Dip in cm) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={dipCm}
                    onChange={(e) => setDipCm(e.target.value)}
                    placeholder="مثلاً 45 یا 120"
                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-indigo-300 focus:border-indigo-600 text-3xl font-mono font-black text-slate-900 focus:outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                    cm
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  نوٹ: {dipCm ? `${Math.round(parseFloat(dipCm) * 10)} mm ملی میٹر` : "0 mm"}
                </p>
              </div>

              {/* Date & Inward Fuel */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاریخ (Date)
                  </label>
                  <input
                    type="text"
                    value={enteredDate}
                    onChange={(e) => setEnteredDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-center text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    آج آیا تیل (Inward L)
                  </label>
                  <input
                    type="number"
                    value={receivedLiters}
                    onChange={(e) => setReceivedLiters(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Output Display: Real-time Calculated Litres from Dip Chart */}
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-indigo-800/40 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>کیلیبریٹڈ لیٹرز (Auto-Calculated)</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 font-mono text-[11px]">
                  {chartRows.length > 0 ? `${chartRows.length} پوائنٹس چارٹ` : "ڈیفالٹ کیلیبریشن"}
                </span>
              </div>

              <div className="mt-3">
                <div className="text-3xl sm:text-4xl font-mono font-black text-emerald-400 tracking-tight">
                  {formatLitres(calculatedLitres)}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  ٹینک کی گنجائش کا <b>{fillPercentage}%</b> حصہ بھرا ہوا ہے
                </div>
              </div>

              {/* Tank Fill Bar */}
              <div className="mt-4">
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${fillPercentage}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-3 border-t border-white/10">
                <span>0L (خالی)</span>
                <span>{currentTank?.tank_name || "ٹینک"}</span>
                <span>{Number(currentTank?.capacity_liters || 40000).toLocaleString()}L (فل)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href="/dashboard/dip-chart/upload"
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              چارٹ میں ترمیم کریں
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white font-black text-xs sm:text-sm shadow-md transition-all hover:scale-102 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
              <span>{saving ? "محفوظ ہو رہا ہے..." : "روزانہ ڈِپ محفوظ کریں (Save Stock)"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
