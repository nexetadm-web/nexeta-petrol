"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  ShieldCheck, 
  Droplets, 
  ArrowLeft, 
  Sliders, 
  RefreshCw, 
  Calendar,
  Layers,
  Eye,
  FileSpreadsheet
} from "lucide-react";
import { formatLitres } from "@/lib/formatters";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function SuperAdminPumpTanksViewPage() {
  const params = useParams();
  const userId = params?.userId as string;
  const pumpId = params?.pumpId as string;

  const [tanks, setTanks] = useState<any[]>([]);
  const [selectedTank, setSelectedTank] = useState<any>(null);
  const [chartRows, setChartRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    if (!pumpId) return;
    setLoading(true);
    fetch(`/api/pumps/${pumpId}/tanks`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTanks(data.tanks || []);
          if (data.tanks && data.tanks.length > 0) {
            loadTankChart(data.tanks[0]);
          }
        }
      })
      .catch((err) => console.error("Error loading tanks:", err))
      .finally(() => setLoading(false));
  }, [pumpId]);

  const loadTankChart = async (tank: any) => {
    setSelectedTank(tank);
    setChartLoading(true);
    try {
      const res = await fetch(`/api/pumps/${pumpId}/tanks/${tank.id}/dip-chart`);
      const data = await res.json();
      if (data.success) {
        setChartRows(data.chart || []);
      }
    } catch (err) {
      console.error("Error loading chart:", err);
    } finally {
      setChartLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">
            <Link href="/super-admin/dashboard" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Super Admin Dashboard</span>
            </Link>
            <span>/</span>
            <span>Station Tanks View</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Station #{pumpId} Tanks & Calibration Charts</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono">Read-Only</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            سپرہ ایڈمن ویو: پٹرول پمپ کے تمام ٹینکس اور ان کے کسٹم ڈِپ چارٹس کا مکمل معائنہ
          </p>
        </div>

        <Link
          href="/super-admin/dashboard"
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors w-fit"
        >
          ← واپس ایڈمن ڈیش بورڈ
        </Link>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
          <span>لوڈ ہو رہا ہے...</span>
        </div>
      ) : tanks.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 text-slate-400">
          اس اسٹیشن پر فی الحال کوئی ٹینک درج نہیں ہے۔
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tanks List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              ٹینکس کی فہرست (Tanks)
            </h3>
            {tanks.map((t) => {
              const isSelected = selectedTank?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => loadTankChart(t)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-950/60 border-indigo-500 shadow-md"
                      : "bg-slate-900 border-slate-800 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-white text-sm">{t.tank_name || t.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {t.product} • Cap: {formatLitres(t.capacity_liters)}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-bold">
                      {t.fill_percentage}%
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Dip: {t.current_dip_mm || 0}mm</span>
                    <span className="text-emerald-400 font-bold">{formatLitres(t.current_stock_liters)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dip Chart View */}
          <div className="lg:col-span-2 bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-extrabold text-base text-white">
                  {selectedTank?.tank_name} - کیلیبریشن ڈِپ چارٹ
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  کل کیلیبریشن پوائنٹس: {chartRows.length} • Tank Height: {selectedTank?.tank_height_mm}mm
                </p>
              </div>
            </div>

            {/* Visual Recharts Curve */}
            <div className="h-60 w-full bg-slate-950 p-4 rounded-2xl border border-slate-800/60">
              {chartLoading ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  چارٹ لوڈ ہو رہا ہے...
                </div>
              ) : chartRows.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  اس ٹینک کا کوئی ڈِپ چارٹ ڈیٹا موجود نہیں ہے۔
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartRows} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="dip_mm" unit="mm" stroke="#64748b" fontSize={10} />
                    <YAxis unit="L" stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v: any) => [`${Number(v).toLocaleString()} L`, "Volume"]}
                      labelFormatter={(l) => `Dip: ${l} mm`}
                      contentStyle={{ backgroundColor: "#020617", borderColor: "#334155", borderRadius: "10px", fontSize: "11px" }}
                    />
                    <Area type="monotone" dataKey="volume_liters" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Read-Only Table */}
            <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Dip (mm)</th>
                    <th className="py-2.5 px-4">Volume (Litres)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {chartRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="py-2 px-4 text-slate-500 font-mono">{i + 1}</td>
                      <td className="py-2 px-4 font-mono font-bold text-white">{r.dip_mm} mm</td>
                      <td className="py-2 px-4 font-mono font-bold text-indigo-400">{formatLitres(r.volume_liters)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
