"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  RefreshCw,
  ArrowLeft,
  Share2,
  Sparkles,
  Fuel,
  Cpu,
  Layers,
  Activity,
  History,
  Check
} from "lucide-react";
import { formatLitres, formatPKDate } from "@/lib/formatters";

interface TankStat {
  tank_id: number;
  tank_no: number;
  tank_name: string;
  product: string;
  capacity: number;
  current_stock: number;
  days_analyzed: number;
  total_loss_liters: number;
  avg_daily_loss: number;
  risk_level: "normal" | "warning" | "critical";
  alert_message: string;
  recent_variations_count: number;
}

interface AlertItem {
  id: number;
  pump_id: number;
  tank_id: number;
  tank_name: string;
  product: string;
  alert_type: string;
  avg_loss: number;
  days: number;
  severity: string;
  message: string;
  status: string;
  date: string;
  created_at?: string;
}

export default function AiAlertsPage() {
  const params = useParams();
  const pumpId = params?.pumpId as string;

  const [tankStats, setTankStats] = useState<TankStat[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [pumpName, setPumpName] = useState<string>("Nexeta Petrol");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchAiData = async (showScan = false) => {
    if (!pumpId) return;
    if (showScan) setScanning(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/pumps/${pumpId}/ai-alerts`);
      const data = await res.json();
      if (data.success) {
        setTankStats(data.tankStats || []);
        setAlerts(data.alerts || []);
        if (data.pump_name) setPumpName(data.pump_name);
      }
    } catch (err) {
      console.error("AI alert fetch error:", err);
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchAiData();
  }, [pumpId]);

  // Optimistic UI for Resolving Alert (<50ms)
  const handleResolveAlert = async (alertId: number) => {
    // Instant optimistic removal from active
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: "resolved" } : a))
    );

    try {
      await fetch(`/api/pumps/${pumpId}/ai-alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve", alert_id: alertId }),
      });
    } catch (e) {
      console.error("Resolve error:", e);
    }
  };

  // WhatsApp Alert Generator
  const handleSendWhatsApp = (stat: TankStat) => {
    const text = `🚨 *حفاظتی الرٹ - NEXETA AI LEAKAGE DETECTOR*\n\n` +
      `پمپ: *${pumpName}*\n` +
      `ٹینک: *${stat.tank_name} (${stat.product})*\n` +
      `خطرے کی نوعیت: *${stat.risk_level === "critical" ? "شدید خطرہ (CRITICAL)" : "احتیاطی الرٹ"}*\n` +
      `روزانہ اوسط کمی: *${stat.avg_daily_loss} Litres / Day*\n` +
      `تفصیل: ${stat.alert_message}\n\n` +
      `براہ کرم پمپ کے پائپ، والوز اور نوزل میٹرز کو فوری چیک کروائیں۔\n` +
      `_جنریٹڈ بذریعہ Nexeta Petrol 5-Year AI Engine_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const activeAlertsCount = alerts.filter((a) => a.status === "active").length;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 p-4 lg:p-8 space-y-6">
      {/* Top AI Navigation Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/40 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-black tracking-wider text-indigo-400 uppercase mb-1">
            <Link
              href={`/dashboard/pump/${pumpId}/tanks`}
              className="hover:underline flex items-center gap-1 text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ٹینکس ڈیش بورڈ</span>
            </Link>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              AI Neural Monitor Live
            </span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Cpu className="w-8 h-8 text-indigo-400" />
            <span>AI لیکج و چوری ڈیٹیکٹر (AI Leakage & Theft Detector)</span>
          </h1>

          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            ماڈل پچھلے 7 دنوں کی ڈِپ ویریئیشنز اور اسٹاک ڈیٹا کا لائیو تجزیہ کرتا ہے۔ روزانہ 50 لیٹر سے زائد غیر معمولی فرق پر خودکار الرٹ اور واٹس ایپ نوٹیفکیشن جاری کرتا ہے۔
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAiData(true)}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
            <span>{scanning ? "AI اسکین جاری ہے..." : "دوبارہ AI اسکین کریں"}</span>
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">زیر نگرانی ٹینکس</div>
            <div className="text-2xl font-black text-white mt-1">{tankStats.length} Tanks</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-950 flex items-center justify-center text-indigo-400">
            <Fuel className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">فعال AI الرٹس</div>
            <div className={`text-2xl font-black mt-1 ${activeAlertsCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {activeAlertsCount} Alerts
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-950 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">سسٹم پروٹیکشن اسٹیٹس</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">100% Protected</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-950 flex items-center justify-center text-emerald-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tank Diagnostic Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          <span>ٹینک وائز AI تجزیہ و رسک اسیسمنٹ (Live Diagnostics)</span>
        </h2>

        {loading ? (
          <div className="p-16 text-center bg-slate-900 rounded-3xl border border-slate-800">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-semibold">AI ماڈل ڈیٹا کا تجزیہ کر رہا ہے...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {tankStats.map((stat) => {
              const isCrit = stat.risk_level === "critical";
              const isWarn = stat.risk_level === "warning";
              const isNorm = stat.risk_level === "normal";

              return (
                <div
                  key={stat.tank_id}
                  className={`rounded-3xl p-6 border transition-all duration-200 shadow-xl ${
                    isCrit
                      ? "bg-rose-950/20 border-rose-500/80 shadow-rose-900/20 ring-2 ring-rose-500/30"
                      : isWarn
                      ? "bg-amber-950/20 border-amber-500/80 shadow-amber-900/20"
                      : "bg-slate-900/90 border-slate-800 shadow-slate-950/40"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between pb-4 border-b border-white/10">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400 uppercase font-black">
                          Tank #{stat.tank_no}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                          {stat.product}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-white mt-1">{stat.tank_name}</h3>
                    </div>

                    <div>
                      {isCrit && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-500 text-white animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>شدید خطرہ (CRITICAL)</span>
                        </span>
                      )}
                      {isWarn && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>احتیاط (WARNING)</span>
                        </span>
                      )}
                      {isNorm && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>نارمل (NORMAL)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-3 my-4 p-4 rounded-2xl bg-black/30 border border-white/5 text-xs">
                    <div>
                      <span className="text-slate-400 block">7 روزہ اوسط کمی</span>
                      <strong className={`text-base font-black font-mono ${stat.avg_daily_loss > 50 ? "text-rose-400" : "text-white"}`}>
                        {stat.avg_daily_loss} L/Day
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">کل ضائع لیٹرز</span>
                      <strong className="text-base font-black font-mono text-white">
                        {formatLitres(stat.total_loss_liters)} L
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">موجودہ اسٹاک</span>
                      <strong className="text-base font-black font-mono text-indigo-400">
                        {formatLitres(stat.current_stock)} L
                      </strong>
                    </div>
                  </div>

                  {/* AI Message */}
                  <div
                    className={`p-4 rounded-2xl text-xs font-semibold leading-relaxed border ${
                      isCrit
                        ? "bg-rose-950/60 border-rose-800 text-rose-200"
                        : isWarn
                        ? "bg-amber-950/60 border-amber-800 text-amber-200"
                        : "bg-slate-800/60 border-slate-700 text-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <span>{stat.alert_message}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t border-white/10">
                    <Link
                      href={`/dashboard/pump/${pumpId}/variations?tank=${stat.tank_id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-colors"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>ویرینشن ہسٹری دیکھیں</span>
                    </Link>

                    {(isCrit || isWarn) && (
                      <button
                        onClick={() => handleSendWhatsApp(stat)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>📲 واٹس ایپ الرٹ بھیجیں</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Alerts Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            <h3 className="font-extrabold text-base text-white">
              AI الرٹ ہسٹری و ایکشن لاگ (Alert Records)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400 font-bold">
            Total {alerts.length} Incidents
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-black tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 text-center">#</th>
                <th className="py-3 px-4 text-right">تاریخ</th>
                <th className="py-3 px-4 text-right">ٹینک</th>
                <th className="py-3 px-4 text-center">شدت</th>
                <th className="py-3 px-4 text-right">AI الرٹ میسج</th>
                <th className="py-3 px-4 text-center">اوسط کمی</th>
                <th className="py-3 px-4 text-center">اسٹیٹس</th>
                <th className="py-3 px-4 text-center">ایکشن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-medium">
                    کوئی فعال الرٹ موجود نہیں ہے۔ تمام ٹینکس محفوظ ہیں۔
                  </td>
                </tr>
              ) : (
                alerts.map((alert, idx) => (
                  <tr key={alert.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                      {formatPKDate(alert.date)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-indigo-300 block">{alert.tank_name}</span>
                      <span className="text-[10px] text-slate-400">{alert.product}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          alert.severity === "critical"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-md font-medium">
                      {alert.message}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-rose-400">
                      -{alert.avg_loss} L/Day
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          alert.status === "active"
                            ? "bg-rose-950 text-rose-300 border border-rose-800"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {alert.status === "active" ? "فعال (Active)" : "حل شدہ (Resolved)"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {alert.status === "active" ? (
                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
                        >
                          حل شدہ کریں
                        </button>
                      ) : (
                        <span className="text-slate-500 text-xs font-semibold">مکمل</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
