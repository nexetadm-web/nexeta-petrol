"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { 
  History, 
  ArrowLeft, 
  Filter, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  Fuel, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Search,
  Calendar,
  Layers
} from "lucide-react";
import { formatLitres, formatPKDate } from "@/lib/formatters";

interface VariationRow {
  id: number;
  tank_id: number;
  pump_id: number;
  previous_dip_mm: number;
  current_dip_mm: number;
  difference_liters: number;
  variation_type: string;
  reason_type: string;
  reason_note: string | null;
  date: string;
  created_by: string;
  created_at: string;
  tank_name: string;
  product: string;
  capacity_liters: number;
}

interface TankOption {
  id: number;
  tank_no: number;
  tank_name: string;
  product: string;
}

export default function VariationsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pumpId = params?.pumpId as string;
  const initialTankId = searchParams.get("tank") || "all";

  const [variations, setVariations] = useState<VariationRow[]>([]);
  const [tanks, setTanks] = useState<TankOption[]>([]);
  const [selectedTankFilter, setSelectedTankFilter] = useState<string>(initialTankId);
  const [loading, setLoading] = useState(true);

  const fetchVariations = async () => {
    if (!pumpId) return;
    setLoading(true);
    try {
      const url =
        selectedTankFilter && selectedTankFilter !== "all"
          ? `/api/pumps/${pumpId}/variations?tankId=${selectedTankFilter}`
          : `/api/pumps/${pumpId}/variations`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setVariations(data.variations || []);
        if (Array.isArray(data.tanks)) {
          setTanks(data.tanks);
        }
      }
    } catch (err) {
      console.error("Failed to load variations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVariations();
  }, [pumpId, selectedTankFilter]);

  // KPI Calculations
  const totalCount = variations.length;
  const lowCount = variations.filter((v) => v.variation_type === "low" || v.difference_liters < 0).length;
  const highCount = variations.filter((v) => v.variation_type === "high" || v.difference_liters > 0).length;
  const netVariance = variations.reduce((acc, v) => acc + (v.difference_liters || 0), 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 space-y-6 print:p-0 print:bg-white">
      {/* Top Header */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
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
            <Link
              href={`/dashboard/pump/${pumpId}/stock`}
              className="hover:underline"
            >
              روزانہ ڈِپ انٹری
            </Link>
            <span>•</span>
            <span>ویرینشن ہسٹری لاگز</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>ٹینک ڈِپ ویریئنس و آڈٹ لاگ (Dip Variations Audit)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            کم اور زیادہ ڈِپ کی تمام وجوہات (بخارات، لیکج، نئی وصولی، وغیرہ) کا مکمل تاریخی ریکارڈ۔
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

          <Link
            href={`/dashboard/pump/${pumpId}/stock`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
          >
            <History className="w-4 h-4" />
            <span>نئی ڈِپ درج کریں</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        {/* Card 1: Total */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>ٹوٹل ویرینشن لاگز</span>
            <History className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-slate-900">
            {totalCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">تمام اندراجات</div>
        </div>

        {/* Card 2: Low Dips */}
        <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 shadow-sm text-rose-950">
          <div className="flex items-center justify-between text-xs font-bold mb-1 text-rose-700">
            <span>کم ڈِپ واقعات (Low Dip)</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-rose-700">
            {lowCount}
          </div>
          <div className="text-[11px] text-rose-600/80 mt-1">بخارات / لیکج / سیل</div>
        </div>

        {/* Card 3: High Dips */}
        <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-sm text-emerald-950">
          <div className="flex items-center justify-between text-xs font-bold mb-1 text-emerald-700">
            <span>زیادہ ڈِپ واقعات (High Dip)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-emerald-700">
            {highCount}
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-1">نئی وصولی / واپسی</div>
        </div>

        {/* Card 4: Net Variance */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>نیٹ ویریئنس (Net Liters)</span>
            <Fuel className="w-4 h-4 text-indigo-600" />
          </div>
          <div
            className={`text-2xl lg:text-3xl font-black ${
              netVariance >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {netVariance > 0 ? `+${formatLitres(netVariance)}` : formatLitres(netVariance)} L
          </div>
          <div className="text-[11px] text-slate-400 mt-1">مجموعی فرق لیٹرز میں</div>
        </div>
      </div>

      {/* Tank Filter Bar */}
      <div className="print:hidden bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700">ٹینک فلٹر:</span>
          <select
            value={selectedTankFilter}
            onChange={(e) => setSelectedTankFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs font-bold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">تمام ٹینکس (All Tanks)</option>
            {tanks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.tank_name} ({t.product})
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-400 font-semibold">
          ظاہر کردہ ریکارڈز: <strong>{variations.length}</strong>
        </div>
      </div>

      {/* Main Variations Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-black uppercase text-[11px]">
              <tr>
                <th className="py-3.5 px-4 text-center w-12">#</th>
                <th className="py-3.5 px-4 text-right">تاریخ</th>
                <th className="py-3.5 px-4 text-right">ٹینک کا نام</th>
                <th className="py-3.5 px-4 text-center">پچھلی ڈِپ (mm)</th>
                <th className="py-3.5 px-4 text-center">موجودہ ڈِپ (mm)</th>
                <th className="py-3.5 px-4 text-center">ویریئنس فرق (L)</th>
                <th className="py-3.5 px-4 text-center">نوعیت</th>
                <th className="py-3.5 px-4 text-right">فرق کی وجہ (Reason)</th>
                <th className="py-3.5 px-4 text-right">وضاحتی نوٹ</th>
                <th className="py-3.5 px-4 text-right">درج کنندہ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>ریکارڈز لوڈ ہو رہے ہیں...</span>
                  </td>
                </tr>
              ) : variations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                    اس فلٹر کے تحت کوئی ڈِپ ویرینشن لاگ نہیں ملا
                  </td>
                </tr>
              ) : (
                variations.map((row, idx) => {
                  const isHigh = row.difference_liters > 0 || row.variation_type === "high";
                  const isLow = row.difference_liters < 0 || row.variation_type === "low";

                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {formatPKDate(row.date)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{row.tank_name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{row.product}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-600">
                        {row.previous_dip_mm} mm
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-indigo-700 bg-indigo-50/50 rounded-lg">
                        {row.current_dip_mm} mm
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs ${
                            isHigh
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : isLow
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {isHigh ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : isLow ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : null}
                          <span>
                            {row.difference_liters > 0
                              ? `+${row.difference_liters}`
                              : row.difference_liters}{" "}
                            L
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            isHigh
                              ? "bg-emerald-50 text-emerald-700"
                              : isLow
                              ? "bg-rose-50 text-rose-700"
                              : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          {row.variation_type === "high"
                            ? "زیادہ (High)"
                            : row.variation_type === "low"
                            ? "کم (Low)"
                            : "نارمل"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <span className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200">
                          {row.reason_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs max-w-xs truncate">
                        {row.reason_note || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {row.created_by || "Manager"}
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
