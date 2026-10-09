"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  Fuel, 
  Droplets, 
  Plus, 
  BarChart2, 
  Gauge, 
  ArrowRight, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Sliders,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  History,
  X,
  Layers,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { formatLitres } from "@/lib/formatters";

interface TankItem {
  id: number;
  pump_id: number;
  tank_no: number;
  name: string;
  tank_name: string;
  fuel_type: string;
  product: string;
  capacity: number;
  capacity_liters: number;
  height_mm: number;
  tank_height_mm: number;
  current_dip_mm: number;
  current_stock: number;
  current_stock_liters: number;
  fill_percentage: number;
  has_dip_chart: boolean;
  readings_count?: number;
  dip_chart_image_url?: string | null;
  created_at?: string;
}

export default function PumpTanksPage() {
  const params = useParams();
  const router = useRouter();
  const pumpId = params?.pumpId as string;

  const [tanks, setTanks] = useState<TankItem[]>([]);
  const [pumpName, setPumpName] = useState<string>("Nexeta Petrol");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [tankNo, setTankNo] = useState<number>(1);
  const [tankNameInput, setTankNameInput] = useState("");
  const [product, setProduct] = useState("Petrol");
  const [capacityChoice, setCapacityChoice] = useState("40000");
  const [customCapacity, setCustomCapacity] = useState("");
  const [tankHeightMm, setTankHeightMm] = useState("2500");

  const fetchTanks = async () => {
    if (!pumpId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pumps/${pumpId}/tanks`);
      const data = await res.json();
      if (data.success) {
        setTanks(data.tanks || []);
        if (data.pump?.pump_name) {
          setPumpName(data.pump.pump_name);
        }
        setTankNo((data.tanks?.length || 0) + 1);
      }
    } catch (err) {
      console.error("Failed to load tanks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTanks();
  }, [pumpId]);

  const handleOpenAddModal = () => {
    setTankNo(tanks.length + 1);
    setTankNameInput(`Tank ${tanks.length + 1} - ${product}`);
    setShowAddModal(true);
  };

  const handleProductChange = (prod: string) => {
    setProduct(prod);
    setTankNameInput(`Tank ${tankNo} - ${prod}`);
  };

  const handleAddTank = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    const finalCapacity = capacityChoice === "custom" ? parseFloat(customCapacity) : parseFloat(capacityChoice);

    if (isNaN(finalCapacity) || finalCapacity <= 0) {
      setErrorMsg("براہ کرم درست گنجائش درج کریں (Valid capacity required)");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/pumps/${pumpId}/tanks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tank_no: tankNo,
          tank_name: tankNameInput || `Tank ${tankNo} - ${product}`,
          product,
          capacity_liters: finalCapacity,
          height_mm: parseFloat(tankHeightMm) || 2500,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setTankNameInput("");
        setCustomCapacity("");
        await fetchTanks();
      } else {
        setErrorMsg(data.error || "ٹینک شامل کرنے میں مسئلہ پیش آیا");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "نیٹ ورک خرابی");
    } finally {
      setSubmitting(false);
    }
  };

  const getProductColor = (prod: string) => {
    const p = (prod || "").toLowerCase();
    if (p.includes("petrol") || p.includes("super")) {
      return {
        badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
        bar: "bg-emerald-500",
        icon: "text-emerald-600 bg-emerald-50",
      };
    }
    if (p.includes("diesel")) {
      return {
        badge: "bg-amber-100 text-amber-800 border-amber-300",
        bar: "bg-amber-500",
        icon: "text-amber-600 bg-amber-50",
      };
    }
    if (p.includes("hobc") || p.includes("octane")) {
      return {
        badge: "bg-purple-100 text-purple-800 border-purple-300",
        bar: "bg-purple-500",
        icon: "text-purple-600 bg-purple-50",
      };
    }
    return {
      badge: "bg-blue-100 text-blue-800 border-blue-300",
      bar: "bg-blue-500",
      icon: "text-blue-600 bg-blue-50",
    };
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1">
            <Sliders className="w-4 h-4" />
            <span>ملٹی ٹینک مینیجمنٹ اور ڈِپ چارٹ سسٹم</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span>پمپ: {pumpName}</span>
            <span className="text-sm font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200">
              ٹوٹل ٹینک: {tanks.length}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تمام پیمائشیں سختی سے صرف ملی میٹر (mm) میں ہیں۔ ہر ٹینک کا الگ ڈِپ چارٹ اور الگ اسٹاک حساب۔
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/pump/${pumpId}/tanks/dip-charts`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-sm rounded-xl border border-indigo-200 transition-all shadow-xs"
          >
            <Layers className="w-4 h-4" />
            <span>مرکزی ڈِپ چارٹ مینیجر</span>
          </Link>

          <Link
            href={`/dashboard/pump/${pumpId}/variations`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl border border-slate-300 transition-all shadow-xs"
          >
            <History className="w-4 h-4" />
            <span>ویرینشن لاگز</span>
          </Link>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-md transition-all hover:shadow-lg transform active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>+ نیا ٹینک شامل کریں</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold text-sm">ٹینکوں کی تفصیل لوڈ ہو رہی ہے...</p>
        </div>
      ) : tanks.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <Droplets className="w-16 h-16 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">اس پمپ کے لیے کوئی ٹینک موجود نہیں ہے</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            اپنے انڈر گراؤنڈ ٹینکس شامل کریں تاکہ ہر ٹینک کا کسٹم ڈِپ چارٹ اپلوڈ کر کے درست لیٹرز کا حساب کیا جا سکے۔
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>پہلا ٹینک شامل کریں</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tanks.map((tank) => {
            const colors = getProductColor(tank.product || tank.fuel_type);
            const hasChart = Boolean(tank.has_dip_chart);
            const height = tank.height_mm || tank.tank_height_mm || 2500;
            const cap = tank.capacity_liters || tank.capacity || 40000;
            const stock = tank.current_stock_liters ?? tank.current_stock ?? 0;
            const dip = tank.current_dip_mm ?? 0;
            const fillPct = cap > 0 ? Math.min(100, Math.round((stock / cap) * 100)) : 0;

            return (
              <div
                key={tank.id}
                className={`rounded-2xl p-6 transition-all duration-200 shadow-md hover:shadow-xl ${
                  !hasChart
                    ? "bg-rose-50/40 border-2 border-rose-500 ring-4 ring-rose-100"
                    : "bg-white border border-slate-200"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${colors.icon}`}>
                      <Fuel className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                          ٹینک نمبر {tank.tank_no || tank.id}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${colors.badge}`}>
                          {tank.product || tank.fuel_type}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mt-0.5">
                        {tank.tank_name || tank.name || `Tank #${tank.id}`}
                      </h3>
                    </div>
                  </div>

                  {/* Dip Chart Status Badge */}
                  <div className="text-right">
                    {hasChart ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>✅ اپلوڈ شدہ ({tank.readings_count || "فعال"} ریڈنگز)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white animate-pulse shadow-sm">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>❌ ڈِپ چارٹ نہیں لگا</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-3 my-4 p-3.5 bg-slate-50/80 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">کل گنجائش (Capacity)</span>
                    <span className="text-slate-800 font-bold text-sm">
                      {formatLitres(cap)} L
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">ٹینک کی اونچائی (Height)</span>
                    <span className="text-slate-800 font-bold text-sm">
                      {height.toLocaleString()} mm
                    </span>
                  </div>
                </div>

                {/* Stock & Dip Readings */}
                <div className="space-y-3 mb-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">
                      موجودہ ڈِپ: <strong className="text-slate-900 font-black text-sm">{dip} mm</strong>
                    </span>
                    <span className="font-semibold text-slate-600">
                      موجودہ اسٹاک: <strong className="text-indigo-600 font-black text-sm">{formatLitres(stock)} L</strong> ({fillPct}%)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                      style={{ width: `${Math.max(4, fillPct)}%` }}
                    />
                  </div>
                </div>

                {/* Alert Box for Missing Dip Chart */}
                {!hasChart && (
                  <div className="mb-4 p-3.5 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                      <div>
                        <strong className="block font-bold">ڈِپ چارٹ لگانا لازمی ہے!</strong>
                        <span className="text-[11px] text-rose-700">اس ٹینک کی ملی میٹر پیمائش کا چارٹ ابھی تک فیڈ نہیں ہوا۔</span>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/pump/${pumpId}/tanks/dip-charts?tank=${tank.id}`}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm whitespace-nowrap"
                    >
                      ڈِپ چارٹ لگائیں
                    </Link>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                  <Link
                    href={`/dashboard/pump/${pumpId}/tanks/dip-charts?tank=${tank.id}`}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                      !hasChart
                        ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md animate-pulse"
                        : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{hasChart ? "ڈِپ چارٹ دیکھیں / تبدیل" : "⚠️ ڈِپ چارٹ لگائیں"}</span>
                  </Link>

                  <Link
                    href={`/dashboard/pump/${pumpId}/stock?tank=${tank.id}`}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all"
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span>روزانہ ڈِپ درج کریں</span>
                  </Link>

                  <Link
                    href={`/dashboard/pump/${pumpId}/variations?tank=${tank.id}`}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>ویرینشن ہسٹری</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Tank Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-lg">
                <Plus className="w-5 h-5" />
                <span>نیا انڈر گراؤنڈ ٹینک شامل کریں</span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddTank} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ٹینک نمبر (Auto)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={tankNo}
                    onChange={(e) => setTankNo(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    پروڈکٹ (Fuel Type) *
                  </label>
                  <select
                    value={product}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Petrol">Petrol (پٹرول)</option>
                    <option value="Diesel">Diesel (ڈیزل)</option>
                    <option value="Super">Super (سپر پٹرول)</option>
                    <option value="HOBC">HOBC (ہائی اوکٹین)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ٹینک کا نام (Tank Label) *
                </label>
                <input
                  type="text"
                  value={tankNameInput}
                  onChange={(e) => setTankNameInput(e.target.value)}
                  placeholder="مثال: Tank 1 - Petrol"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    کل گنجائش (Capacity) *
                  </label>
                  <select
                    value={capacityChoice}
                    onChange={(e) => setCapacityChoice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="23500">23,500 L</option>
                    <option value="30000">30,000 L</option>
                    <option value="40000">40,000 L (معیاری)</option>
                    <option value="50000">50,000 L</option>
                    <option value="custom">کسٹم گنجائش...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ٹینک اونچائی (Height mm) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="500"
                    max="10000"
                    value={tankHeightMm}
                    onChange={(e) => setTankHeightMm(e.target.value)}
                    placeholder="مثال: 2500"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">صرف ملی میٹر mm</span>
                </div>
              </div>

              {capacityChoice === "custom" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    کسٹم گنجائش (لیٹرز) *
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={customCapacity}
                    onChange={(e) => setCustomCapacity(e.target.value)}
                    placeholder="لیٹرز درج کریں (مثال: 35000)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              )}

              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-800">
                💡 نیا ٹینک بننے کے بعد اس کا <strong>ڈِپ چارٹ</strong> لگانا ضروری ہوگا۔ آپ ٹیبل، CSV یا تصویر سے ڈِپ چارٹ لگا سکتے ہیں۔
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-100"
                >
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? "محفوظ ہو رہا ہے..." : "ٹینک محفوظ کریں"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
