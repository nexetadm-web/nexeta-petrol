"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Gauge, 
  Calendar, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  Printer, 
  RefreshCw, 
  Droplet,
  Fuel,
  Clock,
  PlusCircle,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { formatRs, formatLitres, getTodayDatePK, formatDate, toStandardYMD } from "@/lib/formatters";
import { DailyRate } from "@/lib/types";

interface NozzleReadingRow {
  readingId: number | null;
  nozzleId: number;
  nozzleName: string;
  tankId: number;
  tankName: string;
  fuelType: string;
  prevClosing: number;
  startTime: string;
  endTime: string;
  startReading: number | string;
  endReading: number | string;
  morningReading?: number | string;
  eveningReading?: number | string;
  litresSold: number;
  rate: number;
  amount: number;
  isRecorded: boolean;
}

export default function DailyReadingsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDatePK());
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [rate, setRate] = useState<DailyRate | null>(null);
  const [rows, setRows] = useState<NozzleReadingRow[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Modal for Single Reading Entry
  const [showEntryModal, setShowEntryModal] = useState<boolean>(false);
  const [modalNozzleId, setModalNozzleId] = useState<string>("");
  const [modalStartTime, setModalStartTime] = useState<string>("08:00 AM");
  const [modalEndTime, setModalEndTime] = useState<string>("08:00 PM");
  const [modalStartReading, setModalStartReading] = useState<string>("");
  const [modalEndReading, setModalEndReading] = useState<string>("");

  const fetchReadings = async (dateStr: string) => {
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await fetch(`/api/readings?date=${dateStr}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load readings");
      }

      setRate(data.rate);
      const mapped = (data.readings || []).map((r: any) => ({
        ...r,
        startTime: r.startTime || "08:00 AM",
        endTime: r.endTime || "08:00 PM",
        startReading: r.startReading !== undefined ? r.startReading : r.morningReading,
        endReading: r.endReading !== undefined ? r.endReading : r.eveningReading,
      }));
      setRows(mapped);

      if (mapped.length > 0 && !modalNozzleId) {
        setModalNozzleId(mapped[0].nozzleId.toString());
        setModalStartReading(mapped[0].startReading.toString());
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to fetch readings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadings(selectedDate);
  }, [selectedDate]);

  // Handle cell input changes
  const handleReadingChange = (
    index: number,
    field: "startReading" | "endReading" | "startTime" | "endTime",
    value: string
  ) => {
    const updated = [...rows];
    const row = { ...updated[index] };

    (row as any)[field] = value;

    if (field === "startReading" || field === "endReading") {
      const start = parseFloat(row.startReading as string) || 0;
      const end = parseFloat(row.endReading as string) || 0;
      const litres = Math.max(0, end - start);
      row.litresSold = litres;
      row.amount = litres * (row.rate || 0);
    }

    updated[index] = row;
    setRows(updated);
  };

  // Quick Shift Preset Application
  const applyShiftPreset = (index: number, start: string, end: string) => {
    const updated = [...rows];
    updated[index].startTime = start;
    updated[index].endTime = end;
    setRows(updated);
  };

  // Save all readings
  const handleSaveAll = async () => {
    if (!rate) {
      alert("اس تاریخ کا ریٹ سیٹ نہیں ہے۔ پہلے ریٹ سیٹ کریں! (Please set the daily rate first)");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const payload = {
        date: selectedDate,
        readings: rows.map((r) => ({
          nozzleId: r.nozzleId,
          startTime: r.startTime,
          endTime: r.endTime,
          startReading: parseFloat(r.startReading as string) || 0,
          endReading: parseFloat(r.endReading as string) || 0,
          morningReading: parseFloat(r.startReading as string) || 0,
          eveningReading: parseFloat(r.endReading as string) || 0,
        })),
      };

      const res = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save readings");
      }

      setSuccessMessage(data.message || "تمام نوزل ریڈنگز کامیابی سے محفوظ ہو گئیں!");
      setTimeout(() => setSuccessMessage(""), 5000);
      fetchReadings(selectedDate);
    } catch (err: any) {
      setErrorMessage(err.message || "Error saving readings");
    } finally {
      setSaving(false);
    }
  };

  // Open modal for single nozzle
  const openSingleModal = (nozzleId?: number) => {
    if (nozzleId) {
      const target = rows.find((r) => r.nozzleId === nozzleId);
      if (target) {
        setModalNozzleId(target.nozzleId.toString());
        setModalStartTime(target.startTime || "08:00 AM");
        setModalEndTime(target.endTime || "08:00 PM");
        setModalStartReading(target.startReading?.toString() || target.prevClosing?.toString() || "0");
        setModalEndReading(target.endReading?.toString() || "");
      }
    } else if (rows.length > 0) {
      setModalNozzleId(rows[0].nozzleId.toString());
      setModalStartReading(rows[0].startReading?.toString() || "0");
      setModalEndReading(rows[0].endReading?.toString() || "");
    }
    setShowEntryModal(true);
  };

  // Save from modal
  const handleModalSave = (e: React.FormEvent) => {
    e.preventDefault();
    const idx = rows.findIndex((r) => r.nozzleId === Number(modalNozzleId));
    if (idx !== -1) {
      const updated = [...rows];
      const start = parseFloat(modalStartReading) || 0;
      const end = parseFloat(modalEndReading) || 0;
      const litres = Math.max(0, end - start);
      updated[idx] = {
        ...updated[idx],
        startTime: modalStartTime,
        endTime: modalEndTime,
        startReading: start,
        endReading: end,
        litresSold: litres,
        amount: litres * (updated[idx].rate || 0),
      };
      setRows(updated);
      setShowEntryModal(false);
      setSuccessMessage(`نوزل ${updated[idx].nozzleName} کی ریڈنگ شیٹ میں شامل کر دی گئی۔ اب نیچے سے 'محفوظ کریں' دبائیں`);
      setTimeout(() => setSuccessMessage(""), 5000);
    }
  };

  // Calculate Totals for Footer & Cards
  let totalPetrolLitres = 0;
  let totalDieselLitres = 0;
  let totalHiOctaneLitres = 0;
  let grandTotalLitres = 0;
  let grandTotalAmount = 0;

  for (const r of rows) {
    const ltr = r.litresSold || 0;
    const amt = r.amount || 0;
    grandTotalLitres += ltr;
    grandTotalAmount += amt;

    if (r.fuelType === "Diesel") totalDieselLitres += ltr;
    else if (r.fuelType === "HiOctane") totalHiOctaneLitres += ltr;
    else totalPetrolLitres += ltr;
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-700 shadow-xs">
              <Clock className="w-6 h-6" />
            </span>
            <span>24 گھنٹے نوزل میٹر ریڈنگ</span>
            <span className="text-slate-400 font-normal text-xl sm:text-2xl">| 24-Hour Time-Based Readings</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            وقت کے مطابق 24 گھنٹے شفٹ ریڈنگز (From Time - To Time 12h AM/PM) • گزشتہ بندش سے خودکار شروع میٹر اور ٹینک کٹوتی
          </p>
        </div>

        {/* Date Selector & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 shadow-sm">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <input
              type="text"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              placeholder="DD-MM-YYYY"
              className="bg-transparent text-slate-900 text-xs font-bold font-mono focus:outline-none w-28 text-center"
            />
          </div>

          <button
            onClick={() => openSingleModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>انفرادی شفٹ انٹری (Single Entry)</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-bold shadow-sm"
            title="Print Shift / Meter Sheet"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">پرنٹ شیٹ (Print)</span>
          </button>

          <button
            onClick={() => fetchReadings(selectedDate)}
            className="p-2 rounded-xl bg-white border border-slate-300 text-slate-600 hover:text-slate-900 shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* TOP 4 VIBRANT SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Petrol Sales */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-teal-100 rounded-2xl p-6 border-l-4 border-l-emerald-500 border border-emerald-200/60 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-900">کل پٹرول فروخت (Petrol)</span>
            <div className="w-12 h-12 rounded-2xl bg-emerald-200 text-emerald-800 flex items-center justify-center shadow-xs">
              <Fuel className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-950 mt-2 font-mono">
            {formatLitres(totalPetrolLitres)}
          </div>
          <div className="text-xs text-emerald-800 font-bold mt-2">
            ریٹ: {rate ? formatRs(rate.petrol_rate) : "—"} /L
          </div>
        </div>

        {/* Card 2: Diesel Sales */}
        <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-amber-100 rounded-2xl p-6 border-l-4 border-l-amber-500 border border-amber-200/60 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-900">کل ڈیزل فروخت (Diesel)</span>
            <div className="w-12 h-12 rounded-2xl bg-amber-200 text-amber-800 flex items-center justify-center shadow-xs">
              <Droplet className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-950 mt-2 font-mono">
            {formatLitres(totalDieselLitres)}
          </div>
          <div className="text-xs text-amber-800 font-bold mt-2">
            ریٹ: {rate ? formatRs(rate.diesel_rate) : "—"} /L
          </div>
        </div>

        {/* Card 3: Grand Total Litres */}
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 rounded-2xl p-6 border-l-4 border-l-blue-500 border border-blue-200/60 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-blue-900">مجموعی فروخت لیٹرز (Total Vol)</span>
            <div className="w-12 h-12 rounded-2xl bg-blue-200 text-blue-800 flex items-center justify-center shadow-xs">
              <Gauge className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-950 mt-2 font-mono">
            {formatLitres(grandTotalLitres)}
          </div>
          <div className="text-xs text-blue-800 font-bold mt-2">
            تمام نوزلز کا 24 گھنٹے مجموعہ
          </div>
        </div>

        {/* Card 4: Total Amount Rs */}
        <div className="bg-gradient-to-br from-purple-50 via-violet-50 to-violet-100 rounded-2xl p-6 border-l-4 border-l-purple-500 border border-purple-200/60 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-purple-900">کل سیل رقم (Total Revenue)</span>
            <div className="w-12 h-12 rounded-2xl bg-purple-200 text-purple-800 flex items-center justify-center shadow-xs">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-950 mt-2 font-mono">
            {formatRs(grandTotalAmount)}
          </div>
          <div className="text-xs text-purple-800 font-bold mt-2">
            فروخت لیٹرز × متعلقہ فیول ریٹ
          </div>
        </div>
      </div>

      {/* Warning Alert if Rate Not Set for Selected Date */}
      {!loading && !rate && (
        <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-300 text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600 text-white">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-red-950">
                ⚠️ اس تاریخ ({formatDate(selectedDate)}) کے ریٹس مقرر نہیں ہیں!
              </h3>
              <p className="text-xs text-red-700 font-medium">
                جب تک ریٹ سیٹ نہیں ہوں گے لیٹر فروخت کی رقم صفر ظاہر ہوگی۔ برائے مہربانی ریٹ سیٹ کریں۔
              </p>
            </div>
          </div>
          <Link
            href="/rates"
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs self-start sm:self-auto shadow-md"
          >
            ریٹ سیٹ کریں (Set Daily Rate)
          </Link>
        </div>
      )}

      {/* Rate Bar if Set */}
      {rate && (
        <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs overflow-x-auto">
          <span className="font-bold text-slate-700 whitespace-nowrap">
            لاگو فیول ریٹس ({formatDate(selectedDate)}):
          </span>
          <span className="text-emerald-800 font-mono font-bold whitespace-nowrap px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200">
            پٹرول: {formatRs(rate.petrol_rate)} /L
          </span>
          <span className="text-amber-800 font-mono font-bold whitespace-nowrap px-3 py-1 rounded-xl bg-amber-50 border border-amber-200">
            ڈیزل: {formatRs(rate.diesel_rate)} /L
          </span>
          <span className="text-pink-800 font-mono font-bold whitespace-nowrap px-3 py-1 rounded-xl bg-pink-50 border border-pink-200">
            اوکٹین: {formatRs(rate.hioctane_rate)} /L
          </span>
        </div>
      )}

      {/* Messages */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* NOZZLES READINGS TABLE - 24-HOUR TIME BASED */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-indigo-600" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              24-Hour Time-Based Reading Register ({formatDate(selectedDate)})
            </h2>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            ٹائم زون: <strong className="text-slate-800">Asia/Karachi (12h AM/PM)</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Nozzle / نوزل</th>
                <th className="py-3 px-2">ایندھن</th>
                <th className="py-3 px-2 text-right">
                  Previous Closing
                  <div className="text-[9px] text-slate-400 font-normal lowercase">گزشتہ کلوزنگ</div>
                </th>
                <th className="py-3 px-2 text-center min-w-[210px]">
                  From Time — To Time (12h)
                  <div className="text-[9px] text-indigo-600 font-bold lowercase">شروع وقت سے اختتام وقت</div>
                </th>
                <th className="py-3 px-2 text-center w-32">
                  Start Reading
                  <div className="text-[9px] text-slate-500 font-bold lowercase">شروع میٹر</div>
                </th>
                <th className="py-3 px-2 text-center w-32">
                  End Reading
                  <div className="text-[9px] text-indigo-600 font-bold lowercase">اختتام میٹر</div>
                </th>
                <th className="py-3 px-3 text-right">
                  Sale (L)
                  <div className="text-[9px] text-emerald-700 font-bold lowercase">فروخت شدہ لیٹرز</div>
                </th>
                <th className="py-3 px-2 text-right">ریٹ (Rs)</th>
                <th className="py-3 px-4 text-right">
                  Amount (Rs)
                  <div className="text-[9px] text-blue-700 font-bold lowercase">کل رقم</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    نوزل ریڈنگز لوڈ ہو رہی ہیں...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    کوئی نوزل نہیں ملی۔ سیٹنگز میں جا کر نوزلز بنائیں۔
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  let badgeBg = "bg-emerald-50 border-emerald-200 text-emerald-800";
                  if (row.fuelType === "Diesel") badgeBg = "bg-amber-50 border-amber-200 text-amber-800";
                  if (row.fuelType === "HiOctane") badgeBg = "bg-pink-50 border-pink-200 text-pink-800";

                  return (
                    <tr key={row.nozzleId} className="hover:bg-slate-50/70 transition-colors">
                      {/* Nozzle Name */}
                      <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                          <span>{row.nozzleName}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal ml-4">
                          {row.tankName}
                        </div>
                      </td>

                      {/* Fuel Type */}
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${badgeBg}`}>
                          {row.fuelType}
                        </span>
                      </td>

                      {/* Previous Closing */}
                      <td className="py-3 px-2 text-right font-mono font-bold text-slate-500 whitespace-nowrap">
                        {row.prevClosing > 0 ? row.prevClosing.toLocaleString() : "0"}
                      </td>

                      {/* Time Range Input with Presets */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="text"
                            value={row.startTime}
                            onChange={(e) => handleReadingChange(idx, "startTime", e.target.value)}
                            placeholder="08:00 AM"
                            className="w-24 text-center py-1 px-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 text-xs focus:border-indigo-500 bg-white"
                          />
                          <span className="text-slate-400 font-bold text-xs">—</span>
                          <input
                            type="text"
                            value={row.endTime}
                            onChange={(e) => handleReadingChange(idx, "endTime", e.target.value)}
                            placeholder="08:00 PM"
                            className="w-24 text-center py-1 px-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 text-xs focus:border-indigo-500 bg-white"
                          />
                        </div>
                        {/* Quick Presets */}
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => applyShiftPreset(idx, "08:00 AM", "04:00 PM")}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold"
                          >
                            صبح
                          </button>
                          <button
                            type="button"
                            onClick={() => applyShiftPreset(idx, "04:00 PM", "12:00 AM")}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 hover:bg-indigo-100 font-bold"
                          >
                            شام
                          </button>
                          <button
                            type="button"
                            onClick={() => applyShiftPreset(idx, "12:00 AM", "08:00 AM")}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 hover:bg-purple-100 font-bold"
                          >
                            رات
                          </button>
                          <button
                            type="button"
                            onClick={() => applyShiftPreset(idx, "08:00 AM", "08:00 PM")}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 hover:bg-slate-200 font-bold"
                          >
                            12 گھنٹے
                          </button>
                        </div>
                      </td>

                      {/* Start Reading Input */}
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          step="0.01"
                          value={row.startReading}
                          onChange={(e) => handleReadingChange(idx, "startReading", e.target.value)}
                          placeholder="0.00"
                          className="w-full text-center py-1.5 px-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 bg-white"
                        />
                      </td>

                      {/* End Reading Input */}
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          step="0.01"
                          value={row.endReading}
                          onChange={(e) => handleReadingChange(idx, "endReading", e.target.value)}
                          placeholder="0.00"
                          className="w-full text-center py-1.5 px-2 rounded-xl border border-indigo-300 font-mono font-black text-indigo-900 text-xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-200 bg-indigo-50/40"
                        />
                      </td>

                      {/* Litres Sold Auto */}
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                        <span className={row.litresSold > 0 ? "text-emerald-700 font-black text-sm" : "text-slate-400"}>
                          {row.litresSold.toLocaleString()} L
                        </span>
                      </td>

                      {/* Rate */}
                      <td className="py-3 px-2 text-right font-mono text-slate-700 whitespace-nowrap font-bold">
                        {formatRs(row.rate)}
                      </td>

                      {/* Amount Auto */}
                      <td className="py-3 px-4 text-right font-mono font-black text-blue-800 whitespace-nowrap text-sm">
                        {formatRs(row.amount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* FOOTER TOTALS */}
            <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-xs font-bold">
              <tr className="text-slate-900">
                <td colSpan={6} className="py-4 px-4 font-black uppercase tracking-wider text-slate-900 text-sm">
                  مجموعی 24 گھنٹے ٹوٹل (24h Grand Totals)
                </td>
                <td className="py-4 px-3 text-right font-mono font-black text-emerald-800 text-base">
                  {grandTotalLitres.toLocaleString()} L
                </td>
                <td className="py-4 px-2 text-right text-slate-400">—</td>
                <td className="py-4 px-4 text-right font-mono font-black text-blue-900 text-lg">
                  {formatRs(grandTotalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <Link
          href="/"
          className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-bold shadow-sm"
        >
          ← ڈیش بورڈ واپس (Back)
        </Link>

        <button
          onClick={handleSaveAll}
          disabled={saving || rows.length === 0}
          className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm shadow-md shadow-indigo-900/20 disabled:opacity-50 transition-all hover:scale-102"
        >
          <Save className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
          <span>{saving ? "محفوظ ہو رہا ہے..." : "تمام ریڈنگز محفوظ کریں (Save All Readings)"}</span>
        </button>
      </div>

      {/* MODAL: SINGLE READING ENTRY */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Clock className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  انفرادی وقت ریڈنگ درج کریں
                </h3>
              </div>
              <button
                onClick={() => setShowEntryModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSave} className="space-y-4 mt-4">
              {/* Select Nozzle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  نوزل منتخب کریں (Select Nozzle)
                </label>
                <select
                  value={modalNozzleId}
                  onChange={(e) => {
                    const nId = e.target.value;
                    setModalNozzleId(nId);
                    const found = rows.find((r) => r.nozzleId === Number(nId));
                    if (found) {
                      setModalStartReading(found.startReading?.toString() || found.prevClosing?.toString() || "0");
                      setModalEndReading(found.endReading?.toString() || "");
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                >
                  {rows.map((r) => (
                    <option key={r.nozzleId} value={r.nozzleId}>
                      {r.nozzleName} ({r.fuelType}) — پچھلی کلوزنگ: {r.prevClosing}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Time & End Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    شروع وقت (Start Time)
                  </label>
                  <input
                    type="text"
                    value={modalStartTime}
                    onChange={(e) => setModalStartTime(e.target.value)}
                    placeholder="08:00 AM"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    اختتام وقت (End Time)
                  </label>
                  <input
                    type="text"
                    value={modalEndTime}
                    onChange={(e) => setModalEndTime(e.target.value)}
                    placeholder="08:00 PM"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Start Reading & End Reading */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    شروع میٹر (Start Reading)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={modalStartReading}
                    onChange={(e) => setModalStartReading(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    اختتام میٹر (End Reading)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={modalEndReading}
                    onChange={(e) => setModalEndReading(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full p-2.5 rounded-xl border border-indigo-400 text-sm font-mono font-black text-indigo-900 bg-indigo-50/30"
                  />
                </div>
              </div>

              {/* Live Preview Calculation */}
              {modalStartReading && modalEndReading && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-slate-500 font-bold">فروخت شدہ لیٹرز:</span>
                    <strong className="text-emerald-800 ml-1.5 font-mono text-sm font-black">
                      {Math.max(0, parseFloat(modalEndReading) - parseFloat(modalStartReading)).toLocaleString()} L
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold">وقت:</span>
                    <span className="ml-1 text-slate-800 font-mono font-bold">
                      {modalStartTime} - {modalEndTime}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  منسوخ (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all hover:scale-102"
                >
                  شیٹ میں شامل کریں (Apply to Sheet)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
