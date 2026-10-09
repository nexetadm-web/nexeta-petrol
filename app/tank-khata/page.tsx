"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Droplets, 
  PlusCircle, 
  RefreshCw, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  AlertTriangle, 
  Scale, 
  Calendar,
  Layers,
  Fuel,
  Info,
  Printer,
  Download
} from "lucide-react";
import { formatLitres, getTodayDatePK, formatDate, formatRs } from "@/lib/formatters";
import { TankKhata, Tank, DipChart } from "@/lib/types";
import { downloadTankKhataPDF } from "@/lib/pdf-generator";

export default function TankKhataPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [dieselRecords, setDieselRecords] = useState<TankKhata[]>([]);
  const [petrolRecords, setPetrolRecords] = useState<TankKhata[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [charts, setCharts] = useState<DipChart[]>([]);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(20);
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showChartModal, setShowChartModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Form State
  const [formDate, setFormDate] = useState<string>(getTodayDatePK());
  const [selectedTankId, setSelectedTankId] = useState<string>("");
  const [dipValue, setDipValue] = useState<string>("");
  const [dipUnit, setDipUnit] = useState<string>("inch");
  const [remarks, setRemarks] = useState<string>("");

  // Live Auto Calculation Preview in Modal
  const [livePreview, setLivePreview] = useState<{
    dipLitres: number;
    registerStock: number;
    gainLoss: number;
  } | null>(null);

  const fetchKhataData = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await fetch("/api/tank-khata");
      const data = await res.json();
      if (data.success) {
        setDieselRecords(data.dieselRecords || []);
        setPetrolRecords(data.petrolRecords || []);
        setTanks(data.tanks || []);
        if (data.tanks?.length > 0 && !selectedTankId) {
          setSelectedTankId(data.tanks[0].id.toString());
        }
      }

      // Fetch low stock threshold from settings
      try {
        const sRes = await fetch("/api/settings");
        const sData = await sRes.json();
        if (sData.success && sData.settings?.low_stock_threshold) {
          setLowStockThreshold(Number(sData.settings.low_stock_threshold) || 20);
        }
      } catch (err) {
        // default 20
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load tank khata records");
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const res = await fetch("/api/dip-chart");
      const data = await res.json();
      if (data.success) {
        setCharts(data.charts || []);
      }
    } catch (err) {
      console.error("Dip chart fetch error:", err);
    }
  };

  useEffect(() => {
    fetchKhataData();
    fetchChartData();
  }, []);

  // Update live preview when dip measurement or tank changes
  useEffect(() => {
    const calcLive = async () => {
      const dipNum = parseFloat(dipValue);
      if (isNaN(dipNum) || dipNum <= 0 || !selectedTankId) {
        setLivePreview(null);
        return;
      }

      const targetTank = tanks.find((t) => t.id === Number(selectedTankId));
      if (!targetTank) return;

      try {
        const res = await fetch(
          `/api/dip-chart?dip=${dipNum}&tank_id=${targetTank.id}&fuel_type=${targetTank.fuel_type}`
        );
        const data = await res.json();
        if (data.success) {
          const dipLtr = data.litres || 0;
          
          // Get previous record for this tank
          const prevList = targetTank.fuel_type === "Diesel" ? dieselRecords : petrolRecords;
          const prevRec = prevList[0];
          const prevReg = prevRec ? prevRec.register_stock : targetTank.current_stock;
          
          // Gain / Loss preview
          const diff = dipLtr - prevReg;
          setLivePreview({
            dipLitres: dipLtr,
            registerStock: prevReg,
            gainLoss: diff,
          });
        }
      } catch (err) {
        console.error("Live dip calc error:", err);
      }
    };

    calcLive();
  }, [dipValue, selectedTankId, tanks, dieselRecords, petrolRecords]);

  // Handle Add Entry Submit
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTankId || !dipValue) return;

    try {
      setSubmitting(true);
      setErrorMsg("");

      const targetTank = tanks.find((t) => t.id === Number(selectedTankId));
      if (!targetTank) return;

      const res = await fetch("/api/tank-khata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          tank_id: targetTank.id,
          fuel_type: targetTank.fuel_type,
          dip_value: parseFloat(dipValue),
          dip_unit: dipUnit,
          remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save entry");

      setSuccessMsg(data.message || "ٹینک کھاتہ انٹری کامیابی سے محفوظ ہو گئی!");
      setTimeout(() => setSuccessMsg(""), 4000);
      setShowAddModal(false);
      setDipValue("");
      setRemarks("");
      setLivePreview(null);
      fetchKhataData();
    } catch (err: any) {
      setErrorMsg(err.message || "Error saving entry");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Entry
  const handleDeleteEntry = async (id: number) => {
    if (!confirm("کیا آپ واقعی یہ انٹری حذف کرنا چاہتے ہیں؟")) return;

    try {
      const res = await fetch(`/api/tank-khata?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchKhataData();
      } else {
        alert(data.error || "Failed to delete");
      }
    } catch (err: any) {
      alert(err.message || "Error deleting entry");
    }
  };

  // Calculate Latest Metrics
  const latestDiesel = dieselRecords[0];
  const latestPetrol = petrolRecords[0];
  const dieselTank = tanks.find((t) => t.fuel_type === "Diesel");
  const petrolTank = tanks.find((t) => t.fuel_type === "Petrol");

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-cyan-100 text-cyan-700">
              <Droplets className="w-6 h-6" />
            </span>
            <span>روزانہ ٹینک کھاتہ و ڈپ</span>
            <span className="text-slate-400 font-normal text-xl sm:text-2xl">| Daily Tank Khata</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            فزیکل ڈپ پیمائش، ڈپ چارٹ لٹرز، رجسٹر اسٹاک، اور نفع/نقصان (Gain/Loss) کا خودکار حساب کتاب
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-bold shadow-sm hover:shadow transition-all"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>پرنٹ رپورٹ (Print)</span>
          </button>

          <button
            onClick={() => downloadTankKhataPDF([...dieselRecords, ...petrolRecords], getTodayDatePK())}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF (ڈاؤن لوڈ پی ڈی ایف)</span>
          </button>

          <button
            onClick={() => setShowChartModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 text-xs font-bold shadow-sm transition-all"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>ڈپ چارٹ (Calibration Chart)</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-900/20 transition-all hover:scale-102"
          >
            <PlusCircle className="w-4 h-4" />
            <span>نیا روزانہ ڈپ درج کریں (Add Dip)</span>
          </button>

          <button
            onClick={fetchKhataData}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-600" : ""}`} />
          </button>
        </div>
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

      {/* TOP SUMMARY CARDS: DIESEL & PETROL OVERVIEW WITH VISUAL PROGRESS FILL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Diesel Tank Card */}
        {(() => {
          const dCapacity = dieselTank?.capacity || 40000;
          const dStock = latestDiesel ? latestDiesel.tank_stock : (dieselTank?.current_stock || 0);
          const dPct = Math.min(100, Math.round((dStock / dCapacity) * 100));
          const isDLow = dPct < lowStockThreshold;
          const isDMed = dPct >= lowStockThreshold && dPct <= 40;

          return (
            <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-amber-100 rounded-2xl p-6 border-l-4 border-l-amber-500 border border-amber-200/60 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-xs" />
                  <span>High Speed Diesel Tank (ڈیزل ٹینک)</span>
                </span>
                <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-amber-200/80 border border-amber-300 text-amber-900 shadow-xs">
                  Capacity: {formatLitres(dCapacity)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                <div className="p-3 rounded-xl bg-white/80 border border-amber-200/60 shadow-xs">
                  <div className="text-[10px] text-amber-800 font-bold uppercase">آخری ڈپ (Last Dip)</div>
                  <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                    {latestDiesel ? `${latestDiesel.dip_value} ${latestDiesel.dip_unit}` : "—"}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/80 border border-amber-200/60 shadow-xs">
                  <div className="text-[10px] text-amber-800 font-bold uppercase">ٹینک اسٹاک (Tank Stock)</div>
                  <div className="text-lg font-black text-amber-900 font-mono mt-0.5">
                    {latestDiesel ? formatLitres(latestDiesel.tank_stock) : "—"}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/80 border border-amber-200/60 shadow-xs">
                  <div className="text-[10px] text-amber-800 font-bold uppercase">Gain / Loss (نفع/کمی)</div>
                  <div
                    className={`text-lg font-black font-mono mt-0.5 ${
                      latestDiesel && latestDiesel.gain_loss >= 0 ? "text-emerald-700 font-extrabold" : "text-rose-700 font-extrabold"
                    }`}
                  >
                    {latestDiesel
                      ? `${latestDiesel.gain_loss >= 0 ? "+" : ""}${latestDiesel.gain_loss} L`
                      : "—"}
                  </div>
                </div>
              </div>

              {/* Visual Tank Fill Progress Bar */}
              <div className="mt-4 pt-3 border-t border-amber-200/70">
                <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                  <span className="text-amber-900">ٹینک لیول (Visual Tank Fill):</span>
                  <span className={`font-mono ${isDLow ? "text-red-700 animate-pulse font-black" : isDMed ? "text-amber-800 font-bold" : "text-emerald-800 font-bold"}`}>
                    {isDLow ? "⚠️ کم اسٹاک الرٹ " : ""}{dPct}% ({formatLitres(dStock)} / {formatLitres(dCapacity)})
                  </span>
                </div>
                <div className="w-full bg-amber-200/60 rounded-full h-3 overflow-hidden p-0.5 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isDLow ? "bg-red-500" : isDMed ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(2, dPct))}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 text-[11px] text-amber-800 font-medium text-right">
                آخری اپ ڈیٹ تاریخ: <strong className="text-amber-950 font-bold">{latestDiesel ? formatDate(latestDiesel.date) : "—"}</strong>
              </div>
            </div>
          );
        })()}

        {/* Petrol Tank Card */}
        {(() => {
          const pCapacity = petrolTank?.capacity || 30000;
          const pStock = latestPetrol ? latestPetrol.tank_stock : (petrolTank?.current_stock || 0);
          const pPct = Math.min(100, Math.round((pStock / pCapacity) * 100));
          const isPLow = pPct < lowStockThreshold;
          const isPMed = pPct >= lowStockThreshold && pPct <= 40;

          return (
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-teal-100 rounded-2xl p-6 border-l-4 border-l-emerald-500 border border-emerald-200/60 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-xs" />
                  <span>Super Petrol Tank (پٹرول ٹینک)</span>
                </span>
                <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-emerald-200/80 border border-emerald-300 text-emerald-900 shadow-xs">
                  Capacity: {formatLitres(pCapacity)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                <div className="p-3 rounded-xl bg-white/80 border border-emerald-200/60 shadow-xs">
                  <div className="text-[10px] text-emerald-800 font-bold uppercase">آخری ڈپ (Last Dip)</div>
                  <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                    {latestPetrol ? `${latestPetrol.dip_value} ${latestPetrol.dip_unit}` : "—"}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/80 border border-emerald-200/60 shadow-xs">
                  <div className="text-[10px] text-emerald-800 font-bold uppercase">ٹینک اسٹاک (Tank Stock)</div>
                  <div className="text-lg font-black text-emerald-900 font-mono mt-0.5">
                    {latestPetrol ? formatLitres(latestPetrol.tank_stock) : "—"}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/80 border border-emerald-200/60 shadow-xs">
                  <div className="text-[10px] text-emerald-800 font-bold uppercase">Gain / Loss (نفع/کمی)</div>
                  <div
                    className={`text-lg font-black font-mono mt-0.5 ${
                      latestPetrol && latestPetrol.gain_loss >= 0 ? "text-emerald-700 font-extrabold" : "text-rose-700 font-extrabold"
                    }`}
                  >
                    {latestPetrol
                      ? `${latestPetrol.gain_loss >= 0 ? "+" : ""}${latestPetrol.gain_loss} L`
                      : "—"}
                  </div>
                </div>
              </div>

              {/* Visual Tank Fill Progress Bar */}
              <div className="mt-4 pt-3 border-t border-emerald-200/70">
                <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                  <span className="text-emerald-900">ٹینک لیول (Visual Tank Fill):</span>
                  <span className={`font-mono ${isPLow ? "text-red-700 animate-pulse font-black" : isPMed ? "text-amber-800 font-bold" : "text-emerald-800 font-bold"}`}>
                    {isPLow ? "⚠️ کم اسٹاک الرٹ " : ""}{pPct}% ({formatLitres(pStock)} / {formatLitres(pCapacity)})
                  </span>
                </div>
                <div className="w-full bg-emerald-200/60 rounded-full h-3 overflow-hidden p-0.5 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isPLow ? "bg-red-500" : isPMed ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(2, pPct))}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 text-[11px] text-emerald-800 font-medium text-right">
                آخری اپ ڈیٹ تاریخ: <strong className="text-emerald-950 font-bold">{latestPetrol ? formatDate(latestPetrol.date) : "—"}</strong>
              </div>
            </div>
          );
        })()}
      </div>

      {/* TABLE 1: DIESEL KHATA (ڈیزل ٹینک کھاتہ) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        <div className="p-4 sm:p-5 bg-amber-50/70 border-b border-amber-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500" />
            <div>
              <h2 className="text-base sm:text-lg font-black text-amber-950">
                1. High Speed Diesel Khata (ڈیزل ٹینک کھاتہ)
              </h2>
              <p className="text-xs text-amber-800 font-medium">
                روزانہ فزیکل ڈپ، ڈپ چارٹ لٹرز، رجسٹر اسٹاک اور بچت/کمی
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-white px-3 py-1 rounded-full text-amber-800 border border-amber-200 shadow-xs">
            {dieselRecords.length} Entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date (DD-MM-YYYY)</th>
                <th className="py-3 px-3">Tank</th>
                <th className="py-3 px-3 text-right">Dip (Inch/CM)</th>
                <th className="py-3 px-3 text-right">Dip Chart Litres (auto)</th>
                <th className="py-3 px-3 text-right">Tank Stock (from dip)</th>
                <th className="py-3 px-3 text-right">Register Stock (auto)</th>
                <th className="py-3 px-3 text-right">Gain / Loss</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {dieselRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    کوئی ڈیزل انٹری موجود نہیں ہے۔ نیا ڈپ شامل کریں۔
                  </td>
                </tr>
              ) : (
                dieselRecords.map((row) => {
                  const isGain = row.gain_loss >= 0;
                  const tank = tanks.find((t) => t.id === row.tank_id);
                  const cap = tank?.capacity || 40000;
                  const pct = Math.round((row.tank_stock / cap) * 100);
                  const isLow = pct < lowStockThreshold;
                  const isMed = pct >= lowStockThreshold && pct <= 40;

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        isLow
                          ? "bg-red-50/90 text-red-950 font-medium border-l-4 border-l-red-500 hover:bg-red-100/80"
                          : isMed
                          ? "bg-amber-50/80 text-amber-950 border-l-4 border-l-amber-400 hover:bg-amber-100/70"
                          : "hover:bg-amber-50/20"
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatDate(row.date)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-amber-900 font-bold">
                        <div className="flex items-center gap-1.5">
                          <span>{row.tankName || "Diesel Tank 1"}</span>
                          {isLow && (
                            <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black tracking-wide animate-pulse">
                              {pct}% کم
                            </span>
                          )}
                          {!isLow && isMed && (
                            <span className="text-[10px] bg-amber-200 text-amber-900 border border-amber-300 px-1 py-0.2 rounded font-bold">
                              {pct}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                        {row.dip_value} {row.dip_unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                        {formatLitres(row.dip_litres)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                        {formatLitres(row.tank_stock)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-600 whitespace-nowrap">
                        {formatLitres(row.register_stock)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            isGain
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-red-100 text-red-800 border-red-300"
                          }`}
                        >
                          {isGain ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : <TrendingDown className="w-3 h-3 text-red-600" />}
                          {isGain ? `+${row.gain_loss} L` : `${row.gain_loss} L`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {row.remarks || "—"}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteEntry(row.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="حذف کریں"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLE 2: PETROL KHATA (پٹرول ٹینک کھاتہ) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        <div className="p-4 sm:p-5 bg-emerald-50/70 border-b border-emerald-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
            <div>
              <h2 className="text-base sm:text-lg font-black text-emerald-950">
                2. Super Petrol Khata (پٹرول ٹینک کھاتہ)
              </h2>
              <p className="text-xs text-emerald-800 font-medium">
                روزانہ فزیکل ڈپ، ڈپ چارٹ لٹرز، رجسٹر اسٹاک اور بچت/کمی
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-white px-3 py-1 rounded-full text-emerald-800 border border-emerald-200 shadow-xs">
            {petrolRecords.length} Entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date (DD-MM-YYYY)</th>
                <th className="py-3 px-3">Tank</th>
                <th className="py-3 px-3 text-right">Dip (Inch/CM)</th>
                <th className="py-3 px-3 text-right">Dip Chart Litres (auto)</th>
                <th className="py-3 px-3 text-right">Tank Stock (from dip)</th>
                <th className="py-3 px-3 text-right">Register Stock (auto)</th>
                <th className="py-3 px-3 text-right">Gain / Loss</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {petrolRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    کوئی پٹرول انٹری موجود نہیں ہے۔ نیا ڈپ شامل کریں۔
                  </td>
                </tr>
              ) : (
                petrolRecords.map((row) => {
                  const isGain = row.gain_loss >= 0;
                  const tank = tanks.find((t) => t.id === row.tank_id);
                  const cap = tank?.capacity || 30000;
                  const pct = Math.round((row.tank_stock / cap) * 100);
                  const isLow = pct < lowStockThreshold;
                  const isMed = pct >= lowStockThreshold && pct <= 40;

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        isLow
                          ? "bg-red-50/90 text-red-950 font-medium border-l-4 border-l-red-500 hover:bg-red-100/80"
                          : isMed
                          ? "bg-amber-50/80 text-amber-950 border-l-4 border-l-amber-400 hover:bg-amber-100/70"
                          : "hover:bg-emerald-50/20"
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatDate(row.date)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-emerald-900 font-bold">
                        <div className="flex items-center gap-1.5">
                          <span>{row.tankName || "Petrol Tank 1"}</span>
                          {isLow && (
                            <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black tracking-wide animate-pulse">
                              {pct}% کم
                            </span>
                          )}
                          {!isLow && isMed && (
                            <span className="text-[10px] bg-amber-200 text-amber-900 border border-amber-300 px-1 py-0.2 rounded font-bold">
                              {pct}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                        {row.dip_value} {row.dip_unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {formatLitres(row.dip_litres)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                        {formatLitres(row.tank_stock)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-600 whitespace-nowrap">
                        {formatLitres(row.register_stock)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            isGain
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-red-100 text-red-800 border-red-300"
                          }`}
                        >
                          {isGain ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : <TrendingDown className="w-3 h-3 text-red-600" />}
                          {isGain ? `+${row.gain_loss} L` : `${row.gain_loss} L`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {row.remarks || "—"}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteEntry(row.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="حذف کریں"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD DAILY DIP ENTRY */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-cyan-100 text-cyan-700">
                  <Droplets className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  نیا روزانہ ٹینک ڈپ درج کریں
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="space-y-4 mt-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  تاریخ (Date - DD-MM-YYYY)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  />
                </div>
              </div>

              {/* Tank Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ٹینک منتخب کریں (Select Tank)
                </label>
                <select
                  value={selectedTankId}
                  onChange={(e) => setSelectedTankId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 bg-white"
                >
                  {tanks.map((tank) => (
                    <option key={tank.id} value={tank.id}>
                      {tank.name} ({tank.fuel_type}) • Capacity: {tank.capacity.toLocaleString()} L
                    </option>
                  ))}
                </select>
              </div>

              {/* Dip Measurement & Unit */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    ڈپ پیمائش (Dip Reading)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={dipValue}
                    onChange={(e) => setDipValue(e.target.value)}
                    placeholder="e.g. 64.5"
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-black text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    یونٹ (Unit)
                  </label>
                  <select
                    value={dipUnit}
                    onChange={(e) => setDipUnit(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                  >
                    <option value="inch">انچ (Inch)</option>
                    <option value="cm">سینٹی میٹر (CM)</option>
                  </select>
                </div>
              </div>

              {/* LIVE AUTO CALCULATION CARD */}
              {livePreview && (
                <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 space-y-2">
                  <div className="text-xs font-black text-cyan-950 uppercase tracking-wide flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-cyan-700" />
                    <span>خودکار حساب کتاب (Auto Calculated)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-white p-2 rounded-xl border border-cyan-100">
                      <div className="text-[10px] text-slate-500 font-bold">Dip Chart Litres</div>
                      <div className="text-sm font-black text-cyan-800 font-mono mt-0.5">
                        {formatLitres(livePreview.dipLitres)}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-cyan-100">
                      <div className="text-[10px] text-slate-500 font-bold">Register Stock</div>
                      <div className="text-sm font-black text-slate-700 font-mono mt-0.5">
                        {formatLitres(livePreview.registerStock)}
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-cyan-100">
                      <div className="text-[10px] text-slate-500 font-bold">Gain / Loss</div>
                      <div
                        className={`text-sm font-black font-mono mt-0.5 ${
                          livePreview.gainLoss >= 0 ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {livePreview.gainLoss >= 0 ? `+${livePreview.gainLoss} L` : `${livePreview.gainLoss} L`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ریمارکس / تفصیل (Remarks)
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="مثلاً: شام کی شفٹ کلوزنگ ڈپ، موسم کا فرق، وغیرہ"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:border-cyan-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  منسوخ (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-900/30 transition-all hover:scale-102 disabled:opacity-50"
                >
                  {submitting ? "محفوظ ہو رہا ہے..." : "انٹری محفوظ کریں (Save Dip)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DIP CHART CALIBRATION LIST */}
      {showChartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Layers className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    ڈپ چارٹ کیلیبریشن (Dip Chart Calibration Points)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    ہر انچ کی بنیاد پر ٹینک کے اندر موجود حقیقی لٹرز کا چارٹ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowChartModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {/* Petrol Chart Points */}
              <div className="border border-emerald-200 rounded-2xl overflow-hidden bg-emerald-50/20">
                <div className="p-3 bg-emerald-100/70 border-b border-emerald-200 font-bold text-xs text-emerald-900">
                  Super Petrol Tank (30,000 L)
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-emerald-50 text-slate-600 font-bold text-[10px]">
                      <tr>
                        <th className="py-2 px-3 text-left">Dip (Inch)</th>
                        <th className="py-2 px-3 text-right">Litres (L)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100 font-mono">
                      {charts
                        .filter((c) => c.fuel_type === "Petrol")
                        .map((c) => (
                          <tr key={c.id}>
                            <td className="py-1.5 px-3">{c.dip_value} {c.unit}</td>
                            <td className="py-1.5 px-3 text-right font-bold text-emerald-800">
                              {c.litres.toLocaleString()} L
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Diesel Chart Points */}
              <div className="border border-amber-200 rounded-2xl overflow-hidden bg-amber-50/20">
                <div className="p-3 bg-amber-100/70 border-b border-amber-200 font-bold text-xs text-amber-900">
                  High Speed Diesel Tank (40,000 L)
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-amber-50 text-slate-600 font-bold text-[10px]">
                      <tr>
                        <th className="py-2 px-3 text-left">Dip (Inch)</th>
                        <th className="py-2 px-3 text-right">Litres (L)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 font-mono">
                      {charts
                        .filter((c) => c.fuel_type === "Diesel")
                        .map((c) => (
                          <tr key={c.id}>
                            <td className="py-1.5 px-3">{c.dip_value} {c.unit}</td>
                            <td className="py-1.5 px-3 text-right font-bold text-amber-800">
                              {c.litres.toLocaleString()} L
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowChartModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                بند کریں (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
