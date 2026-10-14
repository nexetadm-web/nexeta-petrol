"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Clock,
  Play,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Users,
  Wallet,
  Fuel,
  ArrowRight,
  Gauge,
  X,
  Calendar,
  Layers,
  HelpCircle,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { formatRs, formatLitres, getTodayDatePK, formatDate } from "@/lib/formatters";
import { Shift } from "@/lib/types";
import {
  calculateShift,
  calculateMultiNozzleShift,
  validateShiftReadings,
} from "@/lib/calculations/shift-calculation";
import { getSavedRateLocal } from "@/lib/store/rates";

export default function PumpShiftsPage() {
  const params = useParams();
  const router = useRouter();
  const pumpId = (params?.pumpId as string) || "1";

  const [activeShift, setActiveShift] = useState<any | null>(null);
  const [shiftsHistory, setShiftsHistory] = useState<Shift[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [nozzlesList, setNozzlesList] = useState<any[]>([]);
  const [pumpName, setPumpName] = useState<string>("Nexeta Petrol");
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDatePK());

  // Dynamic Fuel Rates (From Dashboard / DB / localStorage)
  const [petrolRate, setPetrolRate] = useState<number>(() => {
    if (typeof window === "undefined") return 290.50;
    const local = getSavedRateLocal();
    return local?.petrol_rate || 290.50;
  });
  const [dieselRate, setDieselRate] = useState<number>(() => {
    if (typeof window === "undefined") return 285.00;
    const local = getSavedRateLocal();
    return local?.diesel_rate || 285.00;
  });
  const [hioctaneRate, setHioctaneRate] = useState<number>(() => {
    if (typeof window === "undefined") return 300.00;
    const local = getSavedRateLocal();
    return local?.hioctane_rate || 300.00;
  });
  const [nozzleRateInputs, setNozzleRateInputs] = useState<Record<number, string>>({});

  // Start Shift Modal
  const [showStartModal, setShowStartModal] = useState<boolean>(false);
  const [startShiftName, setStartShiftName] = useState<string>("Morning");
  const [startStaffId, setStartStaffId] = useState<string>("");
  const [startOpeningCash, setStartOpeningCash] = useState<string>("10000");
  const [startTime, setStartTime] = useState<string>("08:00 AM");
  const [starting, setStarting] = useState<boolean>(false);

  // Close Shift Modal
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [closingCash, setClosingCash] = useState<string>("");
  const [closingCredit, setClosingCredit] = useState<string>("0");
  const [closingExpense, setClosingExpense] = useState<string>("0");
  const [closeEndTime, setCloseEndTime] = useState<string>("04:00 PM");
  const [nozzleClosingInputs, setNozzleClosingInputs] = useState<Record<number, string>>({});
  const [closing, setClosing] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [closeAuditResult, setCloseAuditResult] = useState<any | null>(null);

  // Helper to dynamically get rate per nozzle based on product type or custom edit
  const getProductRate = (nozzle: any): number => {
    const product = (nozzle.product || nozzle.fuel_type || "").toLowerCase();
    if (product.includes("hsd") || product.includes("diesel")) return dieselRate;
    if (product.includes("hioctane") || product.includes("hobc") || product.includes("super")) return hioctaneRate;
    return petrolRate;
  };

  const getRateForNozzle = (nozzle: any): number => {
    const nozzleId = nozzle.nozzle_id ?? nozzle.id;
    if (nozzleRateInputs[nozzleId] !== undefined && nozzleRateInputs[nozzleId] !== "") {
      const parsed = parseFloat(nozzleRateInputs[nozzleId]);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return getProductRate(nozzle);
  };

  // Listen for realtime rates update from dashboard or settings
  useEffect(() => {
    const handleRatesUpdated = (e: any) => {
      const detail = e.detail;
      if (detail) {
        if (detail.petrol_rate) setPetrolRate(Number(detail.petrol_rate));
        if (detail.diesel_rate) setDieselRate(Number(detail.diesel_rate));
        if (detail.hioctane_rate) setHioctaneRate(Number(detail.hioctane_rate));
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("nexeta_rates_updated", handleRatesUpdated);
      return () => window.removeEventListener("nexeta_rates_updated", handleRatesUpdated);
    }
  }, []);

  const fetchShiftsData = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const [resShifts, resRates] = await Promise.all([
        fetch(`/api/pumps/${pumpId}/shifts?date=${selectedDate}`),
        fetch(`/api/rates?date=${selectedDate}`).catch(() => null),
      ]);

      const data = await resShifts.json();
      if (!resShifts.ok || !data.success) {
        throw new Error(data.error || "Failed to load shifts data");
      }

      // Update dynamic fuel rates from API or localStorage
      if (resRates && resRates.ok) {
        try {
          const ratesData = await resRates.json();
          if (ratesData.success && ratesData.rate) {
            if (ratesData.rate.petrol_rate) setPetrolRate(Number(ratesData.rate.petrol_rate));
            if (ratesData.rate.diesel_rate) setDieselRate(Number(ratesData.rate.diesel_rate));
            if (ratesData.rate.hioctane_rate) setHioctaneRate(Number(ratesData.rate.hioctane_rate));
          }
        } catch {}
      } else if (data.rates) {
        if (data.rates.petrol_rate) setPetrolRate(Number(data.rates.petrol_rate));
        if (data.rates.diesel_rate) setDieselRate(Number(data.rates.diesel_rate));
        if (data.rates.hioctane_rate) setHioctaneRate(Number(data.rates.hioctane_rate));
      }

      setActiveShift(data.activeShift);
      setShiftsHistory(data.shifts || []);
      setStaffList(data.staff || []);
      setNozzlesList(data.nozzles || []);
      setPumpName(data.pump_name || "Nexeta Petrol");

      // Pre-fill close inputs with opening meters if active shift exists
      if (data.activeShift?.readings) {
        const initialCloses: Record<number, string> = {};
        data.activeShift.readings.forEach((r: any) => {
          initialCloses[r.nozzle_id] = r.opening?.toString() || "0";
        });
        setNozzleClosingInputs(initialCloses);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "شفٹ ڈیٹا لوڈ کرنے میں خرابی");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftsData();
  }, [pumpId, selectedDate]);

  // Start Shift Handler
  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const opCash = parseFloat(startOpeningCash) || 0;
    const selectedStaff = staffList.find((s) => s.id.toString() === startStaffId);

    try {
      setStarting(true);
      setErrorMsg("");
      const res = await fetch(`/api/pumps/${pumpId}/shifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift_name: startShiftName,
          staff_id: startStaffId ? Number(startStaffId) : null,
          staff_name: selectedStaff?.name || "Staff Operator",
          opening_cash: opCash,
          start_time: startTime,
          date: getTodayDatePK(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "شفٹ شروع نہیں ہو سکی");
      }

      setSuccessMsg(data.message || "شفٹ کامیابی سے شروع ہو گئی!");
      setShowStartModal(false);
      fetchShiftsData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setStarting(false);
    }
  };

  // Close Shift Handler - Validates and Prompts Confirmation
  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;

    setErrorMsg("");

    // 1. Validation: nozzle_end must be >= nozzle_start
    for (const r of (activeShift.readings || [])) {
      const currentClose = parseFloat(nozzleClosingInputs[r.nozzle_id] ?? r.opening);
      const validation = validateShiftReadings(r.opening, currentClose);
      if (!validation.valid) {
        setErrorMsg(validation.error || "End reading start se kam nahi ho sakta");
        return;
      }
    }

    const cCash = parseFloat(closingCash);
    if (isNaN(cCash)) {
      setErrorMsg("براہ کرم لڑکے سے موصول شدہ کیش (Cash Received) درج کریں");
      return;
    }

    // Open confirm dialog: "Kya calculation theek hai?"
    setShowConfirmModal(true);
  };

  // Final Submit execution after confirmation
  const executeCloseShift = async () => {
    if (!activeShift) return;

    const cCash = parseFloat(closingCash) || 0;
    const cred = parseFloat(closingCredit) || 0;
    const exp = parseFloat(closingExpense) || 0;

    const readingsPayload = (activeShift.readings || []).map((r: any) => ({
      nozzle_id: r.nozzle_id,
      closing: parseFloat(nozzleClosingInputs[r.nozzle_id] ?? r.opening) || r.opening,
      rate: getRateForNozzle(r),
    }));

    try {
      setClosing(true);
      setErrorMsg("");
      const res = await fetch(`/api/pumps/${pumpId}/shifts/${activeShift.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closing_cash: cCash,
          credit: cred,
          expense: exp,
          end_time: closeEndTime,
          readings: readingsPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "شفٹ بند نہیں ہو سکی");
      }

      setCloseAuditResult(data.audit);
      setSuccessMsg(data.message || "شفٹ کامیابی سے بند اور آڈٹ ہو گئی!");
      setShowConfirmModal(false);
      setShowCloseModal(false);
      fetchShiftsData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-700 shadow-xs">
              <Clock className="w-6 h-6" />
            </span>
            <span>شفٹ مینیجمنٹ (صبح و شام شفٹ ہینڈ اوور)</span>
            <span className="text-slate-400 font-normal text-xl sm:text-2xl">| Shift Handover & Audit</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {pumpName} — صبح، شام اور رات کی شفٹ کا الگ الگ کیش آڈٹ، میٹر ریڈنگز اور شارٹ/ایکسیس کیلکولیشن
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchShiftsData}
            className="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-600 hover:text-slate-900 shadow-sm transition-all"
            title="ریفریش کریں"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {!activeShift ? (
            <button
              onClick={() => setShowStartModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>نئی شفٹ شروع کریں (Start Shift)</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setClosingCash("");
                setShowCloseModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all animate-pulse"
            >
              <CheckCircle className="w-4 h-4" />
              <span>شفٹ بند کریں (Close & Audit)</span>
            </button>
          )}
        </div>
      </div>

      {/* Current Rates Banner */}
      <div className="bg-blue-50 border border-blue-200 text-blue-900 p-2.5 sm:p-3 rounded-2xl text-xs sm:text-sm font-bold flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <Fuel className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Current Rates: Petrol Rs. {petrolRate.toFixed(2)} | HSD Rs. {dieselRate.toFixed(2)} {hioctaneRate > 0 ? `| Super Rs. ${hioctaneRate.toFixed(2)}` : ""} (from Dashboard)</span>
        </div>
        <a
          href="/settings"
          className="text-[11px] font-bold text-blue-700 underline hover:text-blue-900"
        >
          ریٹ تبدیل کریں (Change Rates)
        </a>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* RECENT AUDIT RESULT POPUP BANNER */}
      {closeAuditResult && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-200 shadow-lg">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-indigo-100">
            <h3 className="text-sm font-black text-indigo-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>شفٹ آڈٹ رپورٹ خلاصہ ({closeAuditResult.shiftName})</span>
            </h3>
            <button
              onClick={() => setCloseAuditResult(null)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold"
            >
              بند کریں ×
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 font-bold block">اوپننگ کیش:</span>
              <span className="font-mono font-black text-slate-900 text-sm">{formatRs(closeAuditResult.openingCash)}</span>
            </div>
            <div>
              <span className="text-slate-500 font-bold block">کل فیول سیل:</span>
              <span className="font-mono font-black text-emerald-700 text-sm">+{formatRs(closeAuditResult.totalIncome)}</span>
            </div>
            <div>
              <span className="text-slate-500 font-bold block">متوقع کیش (Expected):</span>
              <span className="font-mono font-black text-blue-700 text-sm">{formatRs(closeAuditResult.expectedCash)}</span>
            </div>
            <div>
              <span className="text-slate-500 font-bold block">شارٹ / سرپلس فرق:</span>
              <span
                className={`font-mono font-black text-sm px-2 py-0.5 rounded ${
                  closeAuditResult.difference === 0
                    ? "bg-emerald-100 text-emerald-800"
                    : closeAuditResult.difference < 0
                    ? "bg-red-100 text-red-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {closeAuditResult.difference === 0
                  ? "برابر (Matched)"
                  : `${closeAuditResult.difference < 0 ? "شارٹ: " : "سرپلس: "} ${formatRs(Math.abs(closeAuditResult.difference))}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE SHIFT STATUS CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${activeShift ? "bg-emerald-500 animate-ping" : "bg-slate-300"}`} />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              {activeShift ? `ایکٹو شفٹ جاری ہے: ${activeShift.shift_name} شفٹ` : "کوئی فعال شفٹ نہیں ہے"}
            </span>
          </div>
          {activeShift && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
              Active Shift In Progress
            </span>
          )}
        </div>

        {activeShift ? (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 font-bold block">انچارج سٹاف (Staff)</span>
                <span className="text-sm font-black text-slate-900 mt-1 block flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>{activeShift.staff_name || "آپریٹر"}</span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 font-bold block">شروع ہونے کا وقت (Start Time)</span>
                <span className="text-sm font-black font-mono text-slate-900 mt-1 block flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>{activeShift.start_time} ({formatDate(activeShift.date)})</span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 font-bold block">اوپننگ کیش (Opening Cash)</span>
                <span className="text-sm font-black font-mono text-indigo-700 mt-1 block flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-indigo-600" />
                  <span>{formatRs(activeShift.opening_cash)}</span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 font-bold block">فعال نوزلز (Active Nozzles)</span>
                <span className="text-sm font-black text-slate-900 mt-1 block flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-amber-600" />
                  <span>{activeShift.readings?.length || 0} نوزلز منسلک</span>
                </span>
              </div>
            </div>

            {/* Nozzle Opening Readings Table */}
            <div>
              <h4 className="text-xs font-black uppercase text-slate-700 mb-2 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-indigo-600" />
                <span>نوزل میٹر اوپننگ ریڈنگز (Shift Initial Meters)</span>
              </h4>
              <div className="overflow-x-auto border rounded-xl border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">نوزل نام</th>
                      <th className="py-2.5 px-3">ایندھن قسم</th>
                      <th className="py-2.5 px-4 text-right">اوپننگ میٹر (Start Meter)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeShift.readings?.map((r: any) => (
                      <tr key={r.id}>
                        <td className="py-2 px-3 font-bold text-slate-900">{r.nozzle_name || `Nozzle ${r.nozzle_id}`}</td>
                        <td className="py-2 px-3 font-medium text-slate-600">{r.fuel_type || "Petrol"}</td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-indigo-700">
                          {Number(r.opening || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setClosingCash("");
                  setShowCloseModal(true);
                }}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md transition-all hover:scale-102 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>شفٹ کلوز کریں اور کیش ہینڈ اوور درج کریں (Close Shift & Cash Audit)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-700">اس وقت کوئی شفٹ ایکٹو نہیں ہے</h3>
            <p className="text-xs text-slate-400 mt-1">
              نئی شفٹ (صبح، شام، یا رات) شروع کرنے کے لیے بٹن دبائیں
            </p>
            <button
              onClick={() => setShowStartModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all hover:scale-102"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>نئی شفٹ شروع کریں</span>
            </button>
          </div>
        )}
      </div>

      {/* SHIFTS HISTORY TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            ماضی کی شفٹ ہسٹری و کیش آڈٹ لاگ
          </span>
          <span className="text-xs font-mono font-bold text-slate-500">
            {shiftsHistory.length} ریکارڈز
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">تاریخ</th>
                <th className="py-3 px-3">شفٹ نام</th>
                <th className="py-3 px-3">انچارج ملازم</th>
                <th className="py-3 px-3 text-center">وقت (Time Range)</th>
                <th className="py-3 px-3 text-right">اوپننگ کیش</th>
                <th className="py-3 px-3 text-right">فروخت لیٹرز</th>
                <th className="py-3 px-3 text-right">فیول آمدنی (Income)</th>
                <th className="py-3 px-3 text-right">کلوزنگ کیش</th>
                <th className="py-3 px-4 text-center">سٹیٹس</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {shiftsHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    کوئی پرانا شفٹ ریکارڈ موجود نہیں ہے
                  </td>
                </tr>
              ) : (
                shiftsHistory.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{formatDate(s.date)}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.shift_name === "Morning"
                          ? "bg-amber-100 text-amber-800"
                          : s.shift_name === "Evening"
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-purple-100 text-purple-800"
                      }`}>
                        {s.shift_name === "Morning" ? "صبح (Morning)" : s.shift_name === "Evening" ? "شام (Evening)" : "رات (Night)"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{s.staff_name || "—"}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600">
                      {s.start_time} - {s.end_time || "جاری..."}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">{formatRs(s.opening_cash)}</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                      {formatLitres(s.total_sale_liters)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-700">
                      {formatRs(s.total_income)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-blue-700">
                      {s.closing_cash > 0 ? formatRs(s.closing_cash) : "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === "closed" ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {s.status === "closed" ? "بند شدہ (Closed)" : "فعال (Active)"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: START SHIFT */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-600 fill-emerald-600" />
                <span>نئی شفٹ شروع کریں (Start Shift)</span>
              </h3>
              <button
                onClick={() => setShowStartModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartShift} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  شفٹ کا انتخاب (Shift) *
                </label>
                <select
                  value={startShiftName}
                  onChange={(e) => setStartShiftName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  <option value="Morning">صبح شفٹ (Morning: 08:00 AM - 04:00 PM)</option>
                  <option value="Evening">شام شفٹ (Evening: 04:00 PM - 12:00 AM)</option>
                  <option value="Night">رات شفٹ (Night: 12:00 AM - 08:00 AM)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  انچارج عملہ / کیشیئر (Staff Assigned)
                </label>
                <select
                  value={startStaffId}
                  onChange={(e) => setStartStaffId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  <option value="">عملہ منتخب کریں...</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duty_type || "Cashier"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اوپننگ کیش (Opening Rs.)
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={startOpeningCash}
                    onChange={(e) => setStartOpeningCash(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm font-mono font-black text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    شروع وقت (Start Time)
                  </label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="08:00 AM"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-center focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  disabled={starting}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {starting ? "شروع ہو رہی ہے..." : "شفٹ شروع کریں (Confirm Start)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CLOSE SHIFT */}
      {showCloseModal && activeShift && (() => {
        // Prepare entries for calculation
        const nozzleEntries = (activeShift.readings || []).map((r: any) => {
          const currentClose = parseFloat(nozzleClosingInputs[r.nozzle_id] ?? r.opening);
          const startVal = parseFloat(r.opening) || 0;
          const endVal = isNaN(currentClose) ? startVal : currentClose;
          const appliedRate = getRateForNozzle(r);
          return {
            nozzle_id: r.nozzle_id,
            nozzle_name: r.nozzle_name,
            fuel_type: r.fuel_type,
            start: startVal,
            end: endVal,
            rate: appliedRate,
          };
        });

        const calc = calculateMultiNozzleShift(
          nozzleEntries,
          parseFloat(closingCash) || 0,
          parseFloat(closingCredit) || 0,
          parseFloat(closingExpense) || 0
        );

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <span>شفٹ بند اور آڈٹ کریں ({activeShift.shift_name} شفٹ)</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">
                    انچارج: <strong className="text-slate-800">{activeShift.staff_name}</strong> | اوپننگ کیش: <strong className="text-slate-800">{formatRs(activeShift.opening_cash)}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current Rates Badge in Shift Close Modal */}
              <div className="bg-blue-50 border border-blue-200 text-blue-900 p-2.5 rounded-xl text-xs font-bold flex items-center justify-between mb-4 shadow-2xs">
                <span>Current Rates: Petrol Rs. {petrolRate.toFixed(2)} | HSD Rs. {dieselRate.toFixed(2)} (from Dashboard)</span>
                <span className="text-[10px] text-blue-600 font-semibold">ریٹ نوزل کے لحاظ سے ایڈٹ بھی کر سکتے ہیں</span>
              </div>

              {errorMsg && (
                <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleCloseShift} className="space-y-5">
                {/* 1. Nozzle Closings Inputs with Live Calculation */}
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase mb-2">
                    1. نوزل کلوزنگ میٹر ریڈنگز اور فیول ریٹ (Closing Readings & Rate):
                  </label>
                  <div className="space-y-3 border border-slate-200 rounded-2xl p-3 bg-slate-50">
                    {activeShift.readings?.map((r: any) => {
                      const startVal = parseFloat(r.opening) || 0;
                      const rawInput = nozzleClosingInputs[r.nozzle_id];
                      const currentClose = rawInput !== undefined && rawInput !== "" ? parseFloat(rawInput) : startVal;
                      const appliedRate = getRateForNozzle(r);
                      const isEndLess = !isNaN(currentClose) && currentClose < startVal;
                      const diffLiters = parseFloat(Math.max(0, currentClose - startVal).toFixed(2));
                      const lineAmount = parseFloat((diffLiters * appliedRate).toFixed(2));

                      return (
                        <div key={r.id} className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                          <div className="grid grid-cols-12 gap-2 items-center text-xs">
                            <div className="col-span-12 sm:col-span-3 font-extrabold text-slate-900 truncate">
                              {r.nozzle_name || `Nozzle ${r.nozzle_id}`}
                              <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                {r.fuel_type}
                              </span>
                            </div>
                            <div className="col-span-4 sm:col-span-2 font-mono text-slate-500 text-right sm:text-center text-[11px]">
                              اوپننگ: <strong className="text-slate-800">{Number(startVal).toLocaleString()}</strong>
                            </div>
                            <div className="col-span-4 sm:col-span-4">
                              <label className="block text-[10px] text-slate-500 font-bold mb-0.5 text-right">کلوزنگ میٹر</label>
                              <input
                                type="number"
                                step="0.01"
                                required
                                placeholder={startVal.toString()}
                                value={nozzleClosingInputs[r.nozzle_id] ?? ""}
                                onChange={(e) =>
                                  setNozzleClosingInputs({
                                    ...nozzleClosingInputs,
                                    [r.nozzle_id]: e.target.value,
                                  })
                                }
                                className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono font-bold text-right focus:outline-none ${
                                  isEndLess
                                    ? "border-rose-400 bg-rose-50 text-rose-800 focus:border-rose-600"
                                    : "border-slate-300 bg-white text-slate-900 focus:border-indigo-600"
                                }`}
                              />
                            </div>
                            <div className="col-span-4 sm:col-span-3">
                              <label className="block text-[10px] text-slate-500 font-bold mb-0.5 text-right">ریٹ (Rs)</label>
                              <input
                                type="number"
                                step="0.01"
                                required
                                value={nozzleRateInputs[r.nozzle_id] ?? appliedRate.toString()}
                                onChange={(e) =>
                                  setNozzleRateInputs((prev) => ({
                                    ...prev,
                                    [r.nozzle_id]: e.target.value,
                                  }))
                                }
                                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-right bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
                              />
                            </div>
                          </div>

                          {/* Live Calculation Display as user types */}
                          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] pt-1.5 border-t border-slate-100">
                            {isEndLess ? (
                              <span className="text-rose-600 font-bold flex items-center gap-1">
                                ⚠️ End reading start se kam nahi ho sakta ({currentClose} &lt; {startVal})
                              </span>
                            ) : (
                              <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md font-mono">
                                {diffLiters} Litre × Rs. {appliedRate.toFixed(2)} = Rs. {lineAmount.toLocaleString("en-PK")}
                              </span>
                            )}
                            <span className="text-emerald-700 font-mono font-black">
                              {formatLitres(diffLiters)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Three Separate Fields: Cash Jama, Udhar, Kharcha */}
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase mb-2">
                    2. کیش وصولی، ادھار اور خرچہ (3 Separate Fields):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Field 1: Cash Jama (jo larke ne diya) */}
                    <div>
                      <label className="block text-[11px] font-black text-rose-700 mb-1">
                        کیش جمع (جو لڑکے نے دیا) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="e.g. 138000"
                        value={closingCash}
                        onChange={(e) => setClosingCash(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-rose-300 text-sm font-mono font-black text-slate-900 focus:outline-none focus:border-rose-600"
                      />
                      <span className="text-[10px] text-slate-400 font-medium">Actual Cash Received</span>
                    </div>

                    {/* Field 2: Udhar (Credit) */}
                    <div>
                      <label className="block text-[11px] font-bold text-amber-700 mb-1">
                        ادھار سیل (Udhar / Credit)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={closingCredit}
                        onChange={(e) => setClosingCredit(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-amber-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                      />
                      <span className="text-[10px] text-slate-400 font-medium">Credit given on shift</span>
                    </div>

                    {/* Field 3: Kharcha (Expense) */}
                    <div>
                      <label className="block text-[11px] font-bold text-purple-700 mb-1">
                        شفٹ خرچہ (Expense / Kharcha)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={closingExpense}
                        onChange={(e) => setClosingExpense(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-purple-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                      />
                      <span className="text-[10px] text-slate-400 font-medium">Expenses paid from counter</span>
                    </div>
                  </div>
                </div>

                {/* End Time Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اختتام وقت (End Time)
                  </label>
                  <input
                    type="text"
                    value={closeEndTime}
                    onChange={(e) => setCloseEndTime(e.target.value)}
                    placeholder="04:00 PM"
                    className="w-full sm:w-1/2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>

                {/* 3. Big Calculation Card: Master Formula Result */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-indigo-300">
                    <span className="font-extrabold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>فائنل کیش حساب (Cash Audit Summary)</span>
                    </span>
                    <span className="font-mono text-[11px] bg-indigo-900/80 px-2 py-0.5 rounded-full border border-indigo-700 font-bold">
                      کل سیل: {calc.formatted.total_litre}
                    </span>
                  </div>

                  {/* Cash Hona Chahiye Calculation Line */}
                  <div className="bg-slate-800/90 p-3 rounded-xl border border-slate-700 font-mono text-xs sm:text-sm">
                    <span className="text-slate-300 font-bold block text-[11px] mb-1">کیش دراز میں ہونا چاہیے:</span>
                    <span className="text-amber-300 font-black tracking-wide leading-relaxed block">
                      {calc.formatted.summary_line}
                    </span>
                  </div>

                  {/* Comparison & Difference */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-indigo-900/60">
                    <div>
                      <span className="text-[11px] text-slate-400 font-bold block">لڑکے نے کیش جمع کروایا:</span>
                      <span className="text-base sm:text-lg font-mono font-black text-white">
                        Larke ne diya: Rs. {(parseFloat(closingCash) || 0).toLocaleString("en-PK")}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 font-bold block">شارٹ / ایکسٹرا اسٹیٹس:</span>
                      <span
                        className={`inline-block px-3 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-black shadow-xs ${
                          calc.status === "matched"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : calc.status === "short"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                        }`}
                      >
                        {calc.status === "matched"
                          ? "✅ کیش بالکل برابر ہے (Matched: Rs. 0)"
                          : calc.status === "short"
                          ? `❌ Short: Rs. ${Math.abs(calc.difference).toLocaleString("en-PK")}`
                          : `➕ Extra: Rs. ${calc.difference.toLocaleString("en-PK")}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowCloseModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    منسوخ کریں
                  </button>
                  <button
                    type="submit"
                    disabled={closing}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs shadow-md disabled:opacity-50 hover:shadow-lg transition-all"
                  >
                    شفٹ بند کریں (Close & Audit)
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* CONFIRMATION DIALOG MODAL: "Kya calculation theek hai?" */}
      {showConfirmModal && activeShift && (() => {
        const nozzleEntries = (activeShift.readings || []).map((r: any) => ({
          nozzle_id: r.nozzle_id,
          start: r.opening,
          end: parseFloat(nozzleClosingInputs[r.nozzle_id] ?? r.opening) || r.opening,
          rate: getRateForNozzle(r),
        }));
        const calc = calculateMultiNozzleShift(
          nozzleEntries,
          parseFloat(closingCash) || 0,
          parseFloat(closingCredit) || 0,
          parseFloat(closingExpense) || 0
        );

        return (
          <div className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <HelpCircle className="w-6 h-6" />
              </div>

              <h3 className="text-center text-lg font-black text-slate-900">
                کیا کیلکولیشن بالکل درست ہے؟
              </h3>
              <p className="text-center text-xs text-slate-500 font-bold mt-1">
                Kya calculation theek hai? برائے مہربانی محفوظ کرنے سے پہلے تصدیق کریں:
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 my-4 space-y-2 text-xs font-bold text-slate-700">
                <div className="flex justify-between">
                  <span>کل فیول سیل (Total Sale):</span>
                  <span className="font-mono text-slate-900">{calc.formatted.total_amount} ({calc.formatted.total_litre})</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>منہا ادھار (Udhar):</span>
                  <span className="font-mono">-Rs. {parseFloat(closingCredit || "0").toLocaleString("en-PK")}</span>
                </div>
                <div className="flex justify-between text-purple-700">
                  <span>منہا خرچہ (Kharcha):</span>
                  <span className="font-mono">-Rs. {parseFloat(closingExpense || "0").toLocaleString("en-PK")}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-indigo-950">
                  <span>کیش ہونا چاہیے (Cash In Hand):</span>
                  <span className="font-mono font-black text-indigo-700">{calc.formatted.cash_in_hand}</span>
                </div>
                <div className="flex justify-between">
                  <span>لڑکے نے جمع کروایا (Larke ne diya):</span>
                  <span className="font-mono font-black text-slate-900">Rs. {parseFloat(closingCash || "0").toLocaleString("en-PK")}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span>نتیجہ (Difference):</span>
                  <span
                    className={`font-mono font-black px-2 py-0.5 rounded ${
                      calc.status === "matched"
                        ? "bg-emerald-100 text-emerald-800"
                        : calc.status === "short"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {calc.status === "matched"
                      ? "برابر (Matched)"
                      : calc.status === "short"
                      ? `شارٹ: ${calc.formatted.difference}`
                      : `ایکسٹرا: ${calc.formatted.difference}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={closing}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  نہیں، دوبارہ چیک کریں (Cancel)
                </button>
                <button
                  type="button"
                  onClick={executeCloseShift}
                  disabled={closing}
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {closing ? "محفوظ ہو رہا ہے..." : "جی ہاں، کنفرم کریں (Yes, Save)"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
