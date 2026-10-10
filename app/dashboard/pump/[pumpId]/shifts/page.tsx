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
  Sparkles,
  Layers
} from "lucide-react";
import { formatRs, formatLitres, getTodayDatePK, formatDate } from "@/lib/formatters";
import { Shift } from "@/lib/types";

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
  const [closeEndTime, setCloseEndTime] = useState<string>("04:00 PM");
  const [nozzleClosingInputs, setNozzleClosingInputs] = useState<Record<number, string>>({});
  const [closing, setClosing] = useState<boolean>(false);
  const [closeAuditResult, setCloseAuditResult] = useState<any | null>(null);

  const fetchShiftsData = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await fetch(`/api/pumps/${pumpId}/shifts?date=${selectedDate}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load shifts data");
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

  // Close Shift Handler
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;

    const cCash = parseFloat(closingCash);
    if (isNaN(cCash)) {
      setErrorMsg("اختتامی کیش (Closing Cash) درج کریں");
      return;
    }

    const readingsPayload = (activeShift.readings || []).map((r: any) => ({
      nozzle_id: r.nozzle_id,
      closing: parseFloat(nozzleClosingInputs[r.nozzle_id] || "0") || r.opening,
    }));

    try {
      setClosing(true);
      setErrorMsg("");
      const res = await fetch(`/api/pumps/${pumpId}/shifts/${activeShift.id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          closing_cash: cCash,
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
      {showCloseModal && activeShift && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  شفٹ بند کریں ({activeShift.shift_name} شفٹ)
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  انچارج: {activeShift.staff_name} | اوپننگ کیش: {formatRs(activeShift.opening_cash)}
                </p>
              </div>
              <button
                onClick={() => setShowCloseModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-4">
              {/* Nozzle Closings Inputs */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase mb-2">
                  1. نوزل کلوزنگ میٹر ریڈنگز درج کریں:
                </label>
                <div className="space-y-2 border rounded-xl p-3 bg-slate-50">
                  {activeShift.readings?.map((r: any) => {
                    const currentClose = parseFloat(nozzleClosingInputs[r.nozzle_id] || "0") || r.opening;
                    const diffLiters = Math.max(0, currentClose - r.opening);
                    return (
                      <div key={r.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                        <div className="col-span-4 font-bold text-slate-800 truncate">
                          {r.nozzle_name || `Nozzle ${r.nozzle_id}`} ({r.fuel_type})
                        </div>
                        <div className="col-span-3 font-mono text-slate-500 text-right">
                          اوپن: {Number(r.opening).toLocaleString()}
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder={r.opening.toString()}
                            value={nozzleClosingInputs[r.nozzle_id] ?? ""}
                            onChange={(e) =>
                              setNozzleClosingInputs({
                                ...nozzleClosingInputs,
                                [r.nozzle_id]: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-right bg-white focus:outline-none focus:border-indigo-600"
                          />
                        </div>
                        <div className="col-span-2 font-mono font-bold text-emerald-700 text-right">
                          {formatLitres(diffLiters)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* End Time & Closing Cash */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اختتام وقت (End Time)
                  </label>
                  <input
                    type="text"
                    value={closeEndTime}
                    onChange={(e) => setCloseEndTime(e.target.value)}
                    placeholder="04:00 PM"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-center focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-rose-700 mb-1">
                    کلوزنگ کیش روپے (Actual Cash) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="e.g. 150000"
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-rose-300 text-sm font-mono font-black text-slate-900 focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                سسٹم خودکار طور پر متوقع کیش اور جمع شدہ کیش کا فرق (Short/Excess) رپورٹ میں شمار کر لے گا۔
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
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
                  className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {closing ? "محفوظ ہو رہا ہے..." : "شفٹ بند کریں (Close & Save Audit)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
