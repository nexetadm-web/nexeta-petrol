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
  FileSpreadsheet
} from "lucide-react";
import { formatLitres } from "@/lib/formatters";

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
  fill_percentage: number;
  created_at?: string;
}

export default function PumpTanksPage() {
  const params = useParams();
  const router = useRouter();
  const pumpId = params?.pumpId as string;

  const [tanks, setTanks] = useState<TankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [tankName, setTankName] = useState("");
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
          tank_name: tankName,
          product,
          capacity_liters: finalCapacity,
          tank_height_mm: parseFloat(tankHeightMm) || 2500,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "ٹینک شامل کرنے میں مسئلہ پیش آیا");
      }

      setShowAddModal(false);
      setTankName("");
      setCustomCapacity("");
      await fetchTanks();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add tank");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">
            <Link href="/dashboard" className="hover:underline">Dashboard</Link>
            <span>/</span>
            <span>Tanks & Calibration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            زیرِ زمین ٹینکس و ڈِپ چارٹ سسٹم (Underground Tanks)
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            ہر ٹینک کا الگ کسٹم ڈِپ چارٹ • درست لیٹرز کا حساب • PSO / Shell سرٹیفائیڈ کیلیبریشن
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/pump/${pumpId}/stock`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-xs transition-colors"
          >
            <Gauge className="w-4 h-4 text-indigo-600" />
            <span>روزانہ ڈِپ انٹری (Daily Dip)</span>
          </Link>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-bold text-xs shadow-md transition-all hover:scale-102 active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>نیا ٹینک شامل کریں (+ Add Tank)</span>
          </button>
        </div>
      </div>

      {/* Tanks Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          <p className="text-sm font-medium">ٹینکس لوڈ ہو رہے ہیں...</p>
        </div>
      ) : tanks.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
          <Droplets className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">اس پمپ کے لیے کوئی ٹینک موجود نہیں</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            پہلا ٹینک شامل کر کے اس کا مخصوص ڈِپ چارٹ سیٹ کریں۔
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-sm hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            <span>ابھی ٹینک ایڈ کریں</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tanks.map((tank) => {
            const isPetrol = tank.product?.toLowerCase().includes("petrol") || tank.product?.toLowerCase().includes("super");
            const isDiesel = tank.product?.toLowerCase().includes("diesel");
            const isLow = tank.fill_percentage < 20;

            const badgeColor = isPetrol
              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
              : isDiesel
              ? "bg-amber-100 text-amber-800 border-amber-200"
              : "bg-blue-100 text-blue-800 border-blue-200";

            const progressColor = isLow
              ? "bg-rose-500"
              : isPetrol
              ? "bg-emerald-500"
              : "bg-amber-500";

            return (
              <div
                key={tank.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-lg hover:shadow-xl transition-all p-6 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Top Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shadow-inner">
                        <Droplets className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-lg text-slate-900 leading-tight">
                          {tank.tank_name || tank.name}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Tank ID: #{tank.id} • Height: {tank.tank_height_mm}mm
                        </span>
                      </div>
                    </div>

                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${badgeColor}`}>
                      {tank.product}
                    </span>
                  </div>

                  {/* Stock Metrics Display */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 mb-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Current Dip (ڈِپ پیمائش)
                      </div>
                      <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
                        {tank.current_dip_mm > 0 ? `${tank.current_dip_mm} mm` : "Not measured"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Live Stock (موجودہ تیل)
                      </div>
                      <div className="text-xl font-black text-indigo-700 font-mono mt-0.5">
                        {formatLitres(tank.current_stock_liters)}
                      </div>
                    </div>
                  </div>

                  {/* Visual Fill Gauge */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
                      <span>ٹینک لیول (Capacity: {formatLitres(tank.capacity_liters)})</span>
                      <span className={isLow ? "text-rose-600" : "text-emerald-600"}>
                        {tank.fill_percentage}%
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                        style={{ width: `${Math.min(100, Math.max(4, tank.fill_percentage))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/dashboard/pump/${pumpId}/tanks/${tank.id}/dip-chart`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors border border-indigo-200/60"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Manage Dip Chart (ڈِپ چارٹ ایڈ کریں)</span>
                  </Link>

                  <Link
                    href={`/dashboard/pump/${pumpId}/stock?tank=${tank.id}`}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    title="Enter Today Dip"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Tank */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-xl font-black text-slate-900 mb-1">
              نیا زیرِ زمین ٹینک شامل کریں (+ Add Tank)
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              ٹینک کی تفصیلات اور کل گنجائش منتخب کریں، اس کے بعد ڈِپ چارٹ اپلوڈ کیا جا سکتا ہے۔
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddTank} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  ٹینک کا نام (Tank Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: Tank 1 (Main Petrol)"
                  value={tankName}
                  onChange={(e) => setTankName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    پروڈکٹ (Fuel Type) *
                  </label>
                  <select
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Petrol">Petrol Super (پٹرول)</option>
                    <option value="Diesel">High Speed Diesel (ڈیزل)</option>
                    <option value="HiOctane">Hi-Octane HOBC (اوکٹین)</option>
                    <option value="Super">Super (سپر)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    ٹینک اونچائی (Height mm) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="2500"
                    value={tankHeightMm}
                    onChange={(e) => setTankHeightMm(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-medium font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  کل گنجائش (Capacity Liters) *
                </label>
                <select
                  value={capacityChoice}
                  onChange={(e) => setCapacityChoice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="40000">40,000 Litres (معیاری بڑا ٹینک)</option>
                  <option value="30000">30,000 Litres (معیاری درمیانہ)</option>
                  <option value="23500">23,500 Litres (چھوٹا ٹینک)</option>
                  <option value="50000">50,000 Litres (اضافی بڑا ٹینک)</option>
                  <option value="custom">دیگر کسٹم گنجائش درج کریں (Custom)</option>
                </select>
              </div>

              {capacityChoice === "custom" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    کسٹم گنجائش لیٹرز (Custom Capacity L) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="35000"
                    value={customCapacity}
                    onChange={(e) => setCustomCapacity(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-medium font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  منسوخ (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? "محفوظ ہو رہا ہے..." : "ٹینک محفوظ کریں (Save Tank)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
