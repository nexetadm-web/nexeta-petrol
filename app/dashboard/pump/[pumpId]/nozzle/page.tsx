"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Gauge,
  Fuel,
  Droplets,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Printer,
  History,
  Save,
  Check,
  TrendingDown,
  TrendingUp,
  Sliders,
  Calendar
} from "lucide-react";
import { formatLitres, formatPKDate, getTodayDatePK } from "@/lib/formatters";

interface TankItem {
  id: number;
  tank_no: number;
  tank_name: string;
  product: string;
  current_stock: number;
  capacity: number;
}

interface NozzleItem {
  id: number;
  name: string;
  tank_id: number;
  tank_name: string;
  product: string;
  opening_reading: number;
  closing_reading: number;
  sale_liters: number;
  entered_by: string;
  has_entry: boolean;
}

interface ReconciliationItem {
  id: number;
  tank_id: number;
  tank_name: string;
  product: string;
  date: string;
  dip_loss_liters: number;
  nozzle_sale_liters: number;
  difference: number;
  status: "matched" | "mismatch" | string;
  notes?: string | null;
}

export default function NozzleMatchingPage() {
  const params = useParams();
  const pumpId = params?.pumpId as string;

  const [tanks, setTanks] = useState<TankItem[]>([]);
  const [selectedTankId, setSelectedTankId] = useState<number | null>(null);
  const [nozzles, setNozzles] = useState<NozzleItem[]>([]);
  const [reconciliations, setReconciliations] = useState<ReconciliationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [dateStr, setDateStr] = useState<string>(getTodayDatePK());
  const [dipLossInput, setDipLossInput] = useState<string>("0");
  const [nozzleReadings, setNozzleReadings] = useState<
    Map<string, { opening: number; closing: number; sale: number }>
  >(new Map());
  const [operatorName, setOperatorName] = useState<string>("Manager / کیشیئر");
  const [reconNotes, setReconNotes] = useState<string>("");

  // 1. Fetch initial data
  const loadData = async () => {
    if (!pumpId) return;
    setLoading(true);
    try {
      const [nozzleRes, reconRes] = await Promise.all([
        fetch(`/api/pumps/${pumpId}/nozzle-sales?date=${dateStr}`),
        fetch(`/api/pumps/${pumpId}/reconciliation`),
      ]);

      const nData = await nozzleRes.json();
      const rData = await reconRes.json();

      if (nData.success) {
        setTanks(nData.tanks || []);
        setNozzles(nData.nozzles || []);

        if (nData.tanks && nData.tanks.length > 0 && !selectedTankId) {
          setSelectedTankId(nData.tanks[0].id);
        }

        // Initialize local nozzle readings map
        const map = new Map<string, { opening: number; closing: number; sale: number }>();
        (nData.nozzles || []).forEach((noz: NozzleItem) => {
          map.set(noz.name, {
            opening: noz.opening_reading || 0,
            closing: noz.closing_reading || 0,
            sale: noz.sale_liters || 0,
          });
        });
        setNozzleReadings(map);
      }

      if (rData.success) {
        setReconciliations(rData.reconciliations || []);
      }
    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [pumpId, dateStr]);

  const currentTank = tanks.find((t) => t.id === selectedTankId);

  // Filter nozzles belonging to selected tank
  const tankNozzles = useMemo(() => {
    if (!selectedTankId) return [];
    return nozzles.filter((n) => n.tank_id === selectedTankId);
  }, [nozzles, selectedTankId]);

  // Handle individual nozzle meter reading input
  const handleReadingChange = (
    nozzleName: string,
    field: "opening" | "closing",
    value: number
  ) => {
    setNozzleReadings((prev) => {
      const next = new Map(prev);
      const current = next.get(nozzleName) || { opening: 0, closing: 0, sale: 0 };
      const updated = { ...current, [field]: value };
      updated.sale = Math.max(0, Math.round((updated.closing - updated.opening) * 100) / 100);
      next.set(nozzleName, updated);
      return next;
    });
  };

  // Calculate total nozzle sales for this tank
  const totalNozzleSales = useMemo(() => {
    let sum = 0;
    tankNozzles.forEach((noz) => {
      const r = nozzleReadings.get(noz.name);
      if (r) sum += r.sale;
    });
    return Math.round(sum * 100) / 100;
  }, [tankNozzles, nozzleReadings]);

  // Reconciliation Difference
  const dipLoss = parseFloat(dipLossInput) || 0;
  const reconDifference = Math.round((dipLoss - totalNozzleSales) * 100) / 100;
  const isMatch = Math.abs(reconDifference) <= 20;

  // Save Reconciliation & Nozzle readings (Instant Optimistic UI)
  const handleSaveReconciliation = async () => {
    if (!selectedTankId) {
      alert("پہلے ٹینک منتخب کریں");
      return;
    }

    setSaving(true);
    setFeedback(null);

    // Optimistic item in history
    const optimisticRecord: ReconciliationItem = {
      id: Date.now(),
      tank_id: selectedTankId,
      tank_name: currentTank?.tank_name || "Tank",
      product: currentTank?.product || "Petrol",
      date: dateStr,
      dip_loss_liters: dipLoss,
      nozzle_sale_liters: totalNozzleSales,
      difference: reconDifference,
      status: isMatch ? "matched" : "mismatch",
      notes: reconNotes,
    };

    setReconciliations((prev) => [optimisticRecord, ...prev]);

    try {
      // 1. Save all nozzle sales in background
      for (const noz of tankNozzles) {
        const r = nozzleReadings.get(noz.name);
        if (r && (r.opening > 0 || r.closing > 0)) {
          fetch(`/api/pumps/${pumpId}/nozzle-sales`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tank_id: selectedTankId,
              nozzle_no: noz.name,
              date: dateStr,
              opening_reading: r.opening,
              closing_reading: r.closing,
              entered_by: operatorName,
            }),
          }).catch(() => {});
        }
      }

      // 2. Save Reconciliation Record
      const res = await fetch(`/api/pumps/${pumpId}/reconciliation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tank_id: selectedTankId,
          date: dateStr,
          dip_loss_liters: dipLoss,
          nozzle_sale_liters: totalNozzleSales,
          notes: reconNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          text: data.message || "ریکونسیلیشن کامیابی سے محفوظ ہو گئی!",
        });
      } else {
        setFeedback({ type: "error", text: data.error || "محفوظ نہ ہو سکا" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "نیٹ ورک ایرر" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 space-y-6 print:p-0 print:bg-white">
      {/* Top Header */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1">
            <Link
              href={`/dashboard/pump/${pumpId}/tanks`}
              className="hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ٹینکس لسٹ</span>
            </Link>
            <span>•</span>
            <span>نوزل میٹر و ڈِپ میچنگ</span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Gauge className="w-8 h-8 text-indigo-600" />
            <span>نوزل میٹر ریڈنگ اور ٹینک ڈِپ آٹو میچنگ (Daily Reconciliation)</span>
          </h1>

          <p className="text-xs text-slate-500 mt-1">
            نوزلز کی اوپننگ/کلوزنگ ریڈنگ درج کریں — سسٹم خود بخود ٹینک کی فزیکل ڈِپ کمی کے ساتھ موازنہ کر کے میچ یا فرق بتائے گا۔
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition-all"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>پرنٹ لاگ</span>
          </button>
        </div>
      </div>

      {/* Tank Selector & Date Bar */}
      <div className="print:hidden bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2">
            <label className="block text-xs font-black uppercase text-slate-700 mb-1">
              مطلوبہ ٹینک منتخب کریں (Select Tank) *
            </label>
            <select
              value={selectedTankId || ""}
              onChange={(e) => setSelectedTankId(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border-2 border-indigo-200 bg-indigo-50/20 text-slate-900 font-bold text-sm focus:outline-none focus:border-indigo-600"
            >
              {tanks.map((t) => (
                <option key={t.id} value={t.id}>
                  ٹینک #{t.tank_no || t.id} - {t.tank_name} ({t.product}) - گنجائش: {formatLitres(t.capacity)}L
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-700 mb-1">
              تاریخ (Date)
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-300 font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        {/* Card 1: Dip Loss */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase block mb-1">
            ٹینک ڈِپ کمی (Dip Loss)
          </span>
          <div className="text-2xl lg:text-3xl font-black text-slate-900 font-mono">
            {formatLitres(dipLoss)} L
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            انڈر گراؤنڈ ٹینک سے نکلا تیل
          </span>
        </div>

        {/* Card 2: Nozzle Meters Sale */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase block mb-1">
            نوزلز سے کل سیل (Nozzle Meters)
          </span>
          <div className="text-2xl lg:text-3xl font-black text-indigo-600 font-mono">
            {formatLitres(totalNozzleSales)} L
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            تمام نوزلز کی مجموعی فروخت
          </span>
        </div>

        {/* Card 3: Difference */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase block mb-1">
            فرق (Difference / Variance)
          </span>
          <div
            className={`text-2xl lg:text-3xl font-black font-mono ${
              isMatch ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {reconDifference > 0 ? `+${reconDifference}` : reconDifference} L
          </div>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            (ڈِپ کمی منہا نوزل سیل)
          </span>
        </div>

        {/* Card 4: Match Status Badge */}
        <div
          className={`p-5 rounded-2xl border flex flex-col justify-between ${
            isMatch
              ? "bg-emerald-50 border-emerald-300 text-emerald-950"
              : "bg-rose-50 border-rose-300 text-rose-950"
          }`}
        >
          <span className="text-xs font-bold uppercase block">میچنگ اسٹیٹس</span>
          <div className="flex items-center gap-2 mt-1">
            {isMatch ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
            )}
            <span className="font-black text-base">
              {isMatch ? "✅ مکمل میچ (Matched)" : "⚠️ فرق موجود (Mismatch)"}
            </span>
          </div>
          <span className="text-[11px] font-medium opacity-80 mt-1">
            {isMatch ? "معیاری رواداری (±20L) کے اندر ہے" : "20 لیٹر سے زائد کا فرق ہے!"}
          </span>
        </div>
      </div>

      {/* Prominent Match / Mismatch Alert Box */}
      <div
        className={`p-6 rounded-3xl border-2 shadow-md transition-all ${
          isMatch
            ? "bg-emerald-50/90 border-emerald-500 text-emerald-950"
            : "bg-rose-50/90 border-rose-500 text-rose-950 animate-pulse"
        }`}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl ${isMatch ? "bg-emerald-200 text-emerald-800" : "bg-rose-200 text-rose-800"}`}>
            {isMatch ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black">
              {isMatch
                ? "✅ مکمل میچ (Matched) - نوزل میٹر اور ٹینک ڈِپ بالکل برابر ہیں"
                : `⚠️ ${Math.abs(reconDifference)} لیٹر فرق (Mismatch) - نوزل میٹر اور ٹینک ڈِپ میں تضاد ہے!`}
            </h3>
            <p className="text-xs font-semibold leading-relaxed opacity-90">
              {isMatch
                ? "ٹینک سے نکلا ہوا پٹرول نوزلز کے ڈیجیٹل میٹرز کی ریڈنگ سے 100% میچ ہے۔ کوئی چوری یا غیر قانونی ڈرین نہیں ہوئی۔"
                : "ٹینک ڈِپ کمی اور نوزل میٹرز کی فروخت آپس میں میچ نہیں کر رہیں۔ یا تو نوزل کی ریڈنگ غلط لکھی گئی ہے یا ٹینک سے کوئی غیر رجسٹرڈ اخراج ہوا ہے۔ فوری تصدیق کریں۔"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Reconciliation Entry Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        {/* Left 2 Cols: Nozzle Meters Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                اس ٹینک سے منسلک نوزلز کی میٹر ریڈنگز ({tankNozzles.length} Nozzles)
              </h3>
              <p className="text-xs text-slate-500">اوپننگ اور کلوزنگ ریڈنگ درج کریں</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
              {currentTank?.tank_name}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-right">نوزل نام</th>
                  <th className="py-3 px-3 text-right">اوپننگ ریڈنگ *</th>
                  <th className="py-3 px-3 text-right">کلوزنگ ریڈنگ *</th>
                  <th className="py-3 px-3 text-center">فروخت (Litres)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tankNozzles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 font-semibold">
                      اس ٹینک سے کوئی نوزل منسلک نہیں ہے
                    </td>
                  </tr>
                ) : (
                  tankNozzles.map((noz) => {
                    const r = nozzleReadings.get(noz.name) || { opening: 0, closing: 0, sale: 0 };

                    return (
                      <tr key={noz.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-bold text-slate-900">
                          <span className="block">{noz.name}</span>
                          <span className="text-[10px] text-slate-400">{noz.product}</span>
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={r.opening || ""}
                            onChange={(e) =>
                              handleReadingChange(noz.name, "opening", parseFloat(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="w-32 px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={r.closing || ""}
                            onChange={(e) =>
                              handleReadingChange(noz.name, "closing", parseFloat(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="w-32 px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-black font-mono text-sm border border-indigo-200">
                            {formatLitres(r.sale)} L
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Dip Loss Entry & Save Action */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 pb-2 border-b border-slate-100">
              ٹینک ڈِپ کمی اور توثیق
            </h3>

            <div>
              <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                ٹینک فزیکل ڈِپ کمی (Dip Loss Liters) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={dipLossInput}
                  onChange={(e) => setDipLossInput(e.target.value)}
                  placeholder="لیٹرز درج کریں"
                  className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-300 font-mono font-black text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                  L
                </span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                صبح کی ڈِپ اور شام کی ڈِپ کا فرق
              </span>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                اہلکار کا نام (Operator Name)
              </label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                وضاحتی نوٹ (Notes)
              </label>
              <textarea
                rows={2}
                value={reconNotes}
                onChange={(e) => setReconNotes(e.target.value)}
                placeholder="اگر کوئی فرق ہے تو وجہ یہاں لکھیں..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold border ${
                  feedback.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                {feedback.text}
              </div>
            )}
          </div>

          <button
            onClick={handleSaveReconciliation}
            disabled={saving}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? "محفوظ ہو رہا ہے..." : "آٹو ریکونسیلیشن محفوظ کریں (Save)"}
          </button>
        </div>
      </div>

      {/* Reconciliation History Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-base text-slate-900">
              ماضی کی آٹو ریکونسیلیشن ہسٹری (Matching Logs)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400 font-bold">
            Total {reconciliations.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center">#</th>
                <th className="py-3 px-3 text-right">تاریخ</th>
                <th className="py-3 px-3 text-right">ٹینک</th>
                <th className="py-3 px-3 text-center">ڈِپ کمی (L)</th>
                <th className="py-3 px-3 text-center">نوزل سیل (L)</th>
                <th className="py-3 px-3 text-center">فرق (L)</th>
                <th className="py-3 px-3 text-center">اسٹیٹس</th>
                <th className="py-3 px-3 text-right">نوٹ / تفصیل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reconciliations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    کوئی ریکونسیلیشن ریکارڈ موجود نہیں ہے
                  </td>
                </tr>
              ) : (
                reconciliations.map((item, idx) => {
                  const isM = item.status === "matched";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {formatPKDate(item.date)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{item.tank_name}</span>
                        <span className="text-[10px] text-slate-400">{item.product}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                        {formatLitres(item.dip_loss_liters)} L
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700">
                        {formatLitres(item.nozzle_sale_liters)} L
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            isM
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {item.difference > 0 ? `+${item.difference}` : item.difference} L
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                            isM
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-rose-100 text-rose-800 border border-rose-300"
                          }`}
                        >
                          {isM ? "✅ Matched" : "⚠️ Mismatch"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                        {item.notes || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
