"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Gauge,
  Droplets,
  Calendar,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Sliders,
  TrendingUp,
  TrendingDown,
  Printer,
  History,
  FileSpreadsheet
} from "lucide-react";
import { getTodayDatePK, formatLitres, formatPKDate } from "@/lib/formatters";
import { getStockFromDip, DipChartEntry } from "@/lib/stock";

interface TankItem {
  id: number;
  pump_id: number;
  name: string;
  tank_name: string;
  fuel_type: string;
  product: string;
  capacity: number;
  capacity_liters: number;
  tank_height_mm: number;
  current_dip_mm: number;
  current_stock: number;
  current_stock_liters: number;
}

interface StockLogItem {
  id: number;
  tank_id: number;
  date: string;
  dip_mm: number;
  calculated_stock_liters: number;
  received_liters: number;
  sale_liters: number;
  difference_liters: number;
  created_by?: string;
  tank_name?: string;
  fuel_type?: string;
  created_at?: string;
}

export default function DailyDipStockPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pumpId = params?.pumpId as string;
  const initialTankId = searchParams?.get("tank");

  const [tanks, setTanks] = useState<TankItem[]>([]);
  const [logs, setLogs] = useState<StockLogItem[]>([]);
  const [tankCharts, setTankCharts] = useState<Map<number, DipChartEntry[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Form State
  const [selectedTankId, setSelectedTankId] = useState<string>("");
  const [dipMmInput, setDipMmInput] = useState<string>("");
  const [receivedInput, setReceivedInput] = useState<string>("0");
  const [saleInput, setSaleInput] = useState<string>("0");
  const [dateStr, setDateStr] = useState<string>("");
  const [createdBy, setCreatedBy] = useState<string>("Manager / کیشیئر");

  const loadData = async () => {
    if (!pumpId) return;
    setLoading(true);
    try {
      setDateStr(getTodayDatePK());

      const res = await fetch(`/api/pumps/${pumpId}/stock`);
      const data = await res.json();
      if (data.success) {
        setTanks(data.tanks || []);
        setLogs(data.logs || []);

        if (data.tanks && data.tanks.length > 0) {
          const defaultId = initialTankId && data.tanks.some((t: any) => String(t.id) === initialTankId)
            ? initialTankId
            : String(data.tanks[0].id);
          setSelectedTankId(defaultId);
        }

        // Fetch charts for all tanks to allow instant offline interpolation preview
        const chartMap = new Map<number, DipChartEntry[]>();
        await Promise.all(
          (data.tanks || []).map(async (t: any) => {
            try {
              const cRes = await fetch(`/api/pumps/${pumpId}/tanks/${t.id}/dip-chart`);
              const cData = await cRes.json();
              if (cData.success && cData.chart) {
                chartMap.set(t.id, cData.chart);
              }
            } catch (e) {}
          })
        );
        setTankCharts(chartMap);
      }
    } catch (err) {
      console.error("Failed to load stock data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [pumpId]);

  // Selected Tank Details
  const selectedTank = useMemo(() => {
    return tanks.find((t) => String(t.id) === selectedTankId);
  }, [tanks, selectedTankId]);

  // Real-time live interpolation calculation as user types!
  const liveCalculatedStock = useMemo(() => {
    if (!selectedTank) return 0;
    const dip = parseFloat(dipMmInput);
    if (isNaN(dip) || dip <= 0) return 0;

    const chart = tankCharts.get(selectedTank.id) || [];
    return getStockFromDip(dip, chart, selectedTank.capacity_liters || selectedTank.capacity);
  }, [selectedTank, dipMmInput, tankCharts]);

  // Expected register stock = previous stock + received - sale
  const expectedStock = useMemo(() => {
    if (!selectedTank) return 0;
    const prev = selectedTank.current_stock_liters || selectedTank.current_stock || 0;
    const rec = parseFloat(receivedInput) || 0;
    const sale = parseFloat(saleInput) || 0;
    return Math.max(0, prev + rec - sale);
  }, [selectedTank, receivedInput, saleInput]);

  // Live difference / variance
  const liveDifference = useMemo(() => {
    if (!liveCalculatedStock) return 0;
    return Math.round((liveCalculatedStock - expectedStock) * 100) / 100;
  }, [liveCalculatedStock, expectedStock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const dipMm = parseFloat(dipMmInput);
    if (isNaN(dipMm) || dipMm <= 0) {
      setFeedback({ type: "error", msg: "براہ کرم درست ڈِپ پیمائش درج کریں (Valid dip mm required)" });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/pumps/${pumpId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tank_id: selectedTankId,
          date: dateStr,
          dip_mm: dipMm,
          received_liters: parseFloat(receivedInput) || 0,
          sale_liters: parseFloat(saleInput) || 0,
          created_by: createdBy,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "ڈِپ انٹری محفوظ نہ ہو سکی");
      }

      setFeedback({
        type: "success",
        msg: `ڈِپ انٹری کامیابی سے محفوظ ہو گئی! نیا اسٹاک: ${formatLitres(data.calculated_stock_liters)}`,
      });

      setDipMmInput("");
      setReceivedInput("0");
      setSaleInput("0");
      await loadData();
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Failed to save stock log" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 print:p-0">
      {/* Page Header */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">
            <Link href={`/dashboard/pump/${pumpId}/tanks`} className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Tanks List</span>
            </Link>
            <span>/</span>
            <span>Daily Dip Stock Entry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            روزانہ ٹینک ڈِپ انٹری و اسٹاک کا حساب (Daily Dip & Stock Log)
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            پیمائش شدہ ڈِپ (mm) درج کریں • کیلیبریشن چارٹ سے آٹومیٹک لیٹرز کا حساب • بک اسٹاک بمقابلہ فزیکل ویریئنس
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>پرنٹ لاگ (Print)</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`print:hidden p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Daily Dip Form + Live Calculation Panel */}
      <div className="print:hidden grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-md p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 font-black">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  آج کی ڈِپ پیمائش درج کریں (Enter Measured Dip)
                </h3>
                <span className="text-xs text-slate-400">
                  شفت کے اختتام پر راڈ یا اسکیل سے لی گئی ڈِپ
                </span>
              </div>
            </div>

            {selectedTank && (
              <Link
                href={`/dashboard/pump/${pumpId}/tanks/${selectedTank.id}/dip-chart`}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>View Dip Chart</span>
              </Link>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Select Tank */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  ٹینک منتخب کریں (Select Tank) *
                </label>
                <select
                  value={selectedTankId}
                  onChange={(e) => setSelectedTankId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {tanks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tank_name || t.name} ({t.product}) - Capacity: {t.capacity_liters}L
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  تاریخ (Date DD-MM-YYYY) *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Dip Measurement (mm) */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
              <label className="block text-xs font-black uppercase tracking-wider text-indigo-950 mb-1.5 flex items-center justify-between">
                <span>پیمائش شدہ ڈِپ (Measured Dip in MM) *</span>
                <span className="text-[11px] text-indigo-600 font-normal">
                  ٹینک کی کل اونچائی: {selectedTank?.tank_height_mm || 2500} mm
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  max={selectedTank?.tank_height_mm || 5000}
                  required
                  placeholder="مثال: 850 (850 ملی میٹر)"
                  value={dipMmInput}
                  onChange={(e) => setDipMmInput(e.target.value)}
                  className="w-full pl-4 pr-16 py-3 rounded-xl border border-indigo-300 text-slate-900 text-lg font-black font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                  mm
                </span>
              </div>
            </div>

            {/* Inward Received & Sale Liters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  تیل وصولی / لاری (Received Liters)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={receivedInput}
                    onChange={(e) => setReceivedInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                    L
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  نوزلز سے کل سیل (Sale Liters)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={saleInput}
                    onChange={(e) => setSaleInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                    L
                  </span>
                </div>
              </div>
            </div>

            {/* Created By */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                ڈِپ چیک کرنے والا اہلکار (Created By)
              </label>
              <input
                type="text"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? "محفوظ ہو رہا ہے..." : "ڈِپ انٹری لاگ محفوظ کریں (Save Stock Log)"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Card: Live Automatic Calculation Panel */}
        <div className="space-y-4">
          {/* Main Calculated Stock Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-xl border border-indigo-800/50">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 inline-block mb-1">
              Live Chart Interpolation • خودکار حساب
            </span>
            <div className="text-xs text-indigo-200 mb-3">
              ٹینک کی کیلیبریشن شیٹ کے مطابق حقیقی تیل:
            </div>

            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white mb-2">
              {liveCalculatedStock > 0 ? formatLitres(liveCalculatedStock) : "0 L"}
            </div>

            <div className="text-xs text-indigo-300 font-medium">
              {selectedTank?.tank_name} • Dip:{" "}
              <strong className="text-amber-300">{dipMmInput || 0} mm</strong>
            </div>

            {/* Progress fill */}
            {selectedTank && (
              <div className="mt-4 pt-4 border-t border-indigo-800/60">
                <div className="flex items-center justify-between text-xs text-indigo-200 mb-1.5 font-medium">
                  <span>Tank Level</span>
                  <span>
                    {Math.min(
                      100,
                      Math.round(
                        (liveCalculatedStock / (selectedTank.capacity_liters || selectedTank.capacity || 1)) * 100
                      )
                    )}
                    %
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          2,
                          Math.round(
                            (liveCalculatedStock / (selectedTank.capacity_liters || selectedTank.capacity || 1)) * 100
                          )
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Variance / Gain-Loss Card */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-md">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              اسٹاک کا موازنہ (Register vs Physical)
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">پچھلا اسٹاک (Previous):</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatLitres(selectedTank?.current_stock_liters || selectedTank?.current_stock || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">توقع شدہ رجسٹر اسٹاک:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatLitres(expectedStock)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 font-bold">
                <span className="text-slate-700">ویریئنس (Gain / Loss):</span>
                <span
                  className={`font-mono text-sm flex items-center gap-1 ${
                    liveDifference >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {liveDifference >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <span>{liveDifference > 0 ? `+${liveDifference}` : liveDifference} L</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Stock Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-base text-slate-900">
              ماضی کی ڈِپ انٹریز کا ریکارڈ (Stock Log History)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400 font-bold">
            Total {logs.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-black tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-4">تاریخ (Date)</th>
                <th className="py-2.5 px-4">ٹینک (Tank)</th>
                <th className="py-2.5 px-4">ڈِپ پیمائش (Dip mm)</th>
                <th className="py-2.5 px-4">حقیقی اسٹاک (Physical L)</th>
                <th className="py-2.5 px-4">وصولی (Rec L)</th>
                <th className="py-2.5 px-4">سیل (Sale L)</th>
                <th className="py-2.5 px-4">ویریئنس (Gain/Loss)</th>
                <th className="py-2.5 px-4">اہلکار</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    کوئی ریکارڈ موجود نہیں۔ اوپر فارم سے پہلی ڈِپ انٹری درج کریں۔
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isGain = log.difference_liters >= 0;
                  return (
                    <tr key={log.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {log.date}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {log.tank_name} <span className="text-[10px] text-slate-400">({log.fuel_type})</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                        {log.dip_mm} mm
                      </td>
                      <td className="py-2.5 px-4 font-mono font-black text-indigo-700 whitespace-nowrap">
                        {formatLitres(log.calculated_stock_liters)}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-emerald-600 whitespace-nowrap">
                        {log.received_liters > 0 ? `+${log.received_liters} L` : "—"}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {log.sale_liters > 0 ? `${log.sale_liters} L` : "—"}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded-full text-[11px] ${
                            isGain
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {log.difference_liters > 0 ? `+${log.difference_liters}` : log.difference_liters} L
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {log.created_by || "—"}
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
