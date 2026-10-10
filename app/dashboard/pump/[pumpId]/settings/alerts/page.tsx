"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BellRing,
  Phone,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Droplet,
  Save,
  Clock,
  Sparkles,
  ArrowLeft
} from "lucide-react";
import { formatLitres } from "@/lib/formatters";

export default function PumpAlertSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const pumpId = (params?.pumpId as string) || "1";

  const [pumpName, setPumpName] = useState<string>("Nexeta Petrol");
  const [lowStockAlert, setLowStockAlert] = useState<boolean>(true);
  const [lowStockPercent, setLowStockPercent] = useState<number>(20);
  const [dailyReportAlert, setDailyReportAlert] = useState<boolean>(true);
  const [ownerPhone, setOwnerPhone] = useState<string>("923001234567");

  const [tanks, setTanks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Test alerts state
  const [testResult, setTestResult] = useState<any[] | null>(null);
  const [testing, setTesting] = useState<boolean>(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await fetch(`/api/pumps/${pumpId}/settings/alerts`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "سیٹنگز لوڈ نہیں ہو سکیں");
      }
      setPumpName(data.pump_name || "Nexeta Petrol");
      setLowStockAlert(data.settings.low_stock_alert);
      setLowStockPercent(data.settings.low_stock_percent);
      setDailyReportAlert(data.settings.daily_report_alert);
      setOwnerPhone(data.settings.owner_phone);
      setTanks(data.tanks || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load alert settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [pumpId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg("");
      const res = await fetch(`/api/pumps/${pumpId}/settings/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          low_stock_alert: lowStockAlert,
          low_stock_percent: lowStockPercent,
          daily_report_alert: dailyReportAlert,
          owner_phone: ownerPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "محفوظ کرنے میں ناکامی");
      }
      setSuccessMsg("سیٹنگز کامیابی سے محفوظ ہو گئیں!");
      setTimeout(() => setSuccessMsg(""), 3500);
      fetchSettings();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerTest = async () => {
    try {
      setTesting(true);
      setErrorMsg("");
      const res = await fetch(`/api/cron/check-alerts?pump_id=${pumpId}`);
      const data = await res.json();
      if (data.alerts && data.alerts.length > 0) {
        setTestResult(data.alerts);
        setSuccessMsg(`${data.alerts.length} الرٹس تیار ہو گئے ہیں! نیچے واٹس ایپ بٹن دبائیں`);
      } else {
        setSuccessMsg("کوئی ایمرجنسی الرٹ نہیں ہے (تمام ٹینکس محفوظ ہیں)");
      }
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg("الرٹ ٹیسٹ کرنے میں خرابی");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.push(`/dashboard/pump/${pumpId}/tanks`)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>واپس ٹینک مینیجمنٹ (Back to Tanks)</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700 shadow-xs">
              <BellRing className="w-6 h-6" />
            </span>
            <span>واٹس ایپ آٹو الرٹس سیٹنگز</span>
            <span className="text-slate-400 font-normal text-xl sm:text-2xl">| WhatsApp Alerts</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {pumpName} — ٹینک میں پٹرول/ڈیزل کم ہونے پر خودکار الرٹ اور روزانہ رات 9 بجے سیل سمری
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSettings}
            className="p-2.5 rounded-xl bg-white border border-slate-300 text-slate-600 hover:text-slate-900 shadow-sm transition-all"
            title="ریفریش کریں"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleTriggerTest}
            disabled={testing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{testing ? "چیک ہو رہا ہے..." : "ابھی الرٹ ٹیسٹ کریں (Test Now)"}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TEST ALERTS POPUP ACTION CARD */}
      {testResult && testResult.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-5 rounded-2xl border border-emerald-300 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-emerald-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>تیار شدہ واٹس ایپ الرٹس ({testResult.length})</span>
            </h3>
            <button
              onClick={() => setTestResult(null)}
              className="text-xs text-slate-400 hover:text-slate-700 font-bold"
            >
              بند کریں ×
            </button>
          </div>
          <div className="space-y-2">
            {testResult.map((al, idx) => (
              <div
                key={idx}
                className="bg-white p-3 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <span className="text-xs font-bold text-slate-800 block">{al.message}</span>
                  <span className="text-[10px] text-slate-400 font-mono">نمبر: {al.phone}</span>
                </div>
                <a
                  href={al.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all whitespace-nowrap self-start sm:self-center"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp پر بھیجیں</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SETTINGS CONFIGURATION FORM */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-md">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span>آٹو الرٹس سیٹنگز محفوظ کریں</span>
          </h2>

          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Owner Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                مالک کا واٹس ایپ نمبر (Owner WhatsApp Number) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="923001234567"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                بغیر صفر یا پلس کے درج کریں (مثلاً: 923001234567)
              </p>
            </div>

            {/* Toggle 1: Low Stock Alert */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-900">
                    1. کم اسٹاک الرٹ (Low Fuel Stock Alert)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    جب کسی ٹینک میں پٹرول یا ڈیزل مخصوص حد سے کم ہو تو فوری واٹس ایپ الرٹ بھیجیں
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lowStockAlert}
                    onChange={(e) => setLowStockAlert(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              {lowStockAlert && (
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>الرٹ فیصد تھریش ہولڈ (Alert Threshold Percentage):</span>
                    <span className="font-mono text-emerald-700 text-sm">{lowStockPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={lowStockPercent}
                    onChange={(e) => setLowStockPercent(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400">
                    جب اسٹاک {lowStockPercent}% سے کم ہوگا تو وارننگ الرٹ جاری ہوگا
                  </span>
                </div>
              )}
            </div>

            {/* Toggle 2: Daily 9 PM Summary */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>2. روزانہ 9 PM سمری الرٹ (Daily 9 PM WhatsApp Summary)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ہر روز رات 9 بجے دن کی کل سیل، آمدنی، پرافٹ اور خرچے کا خلاصہ مالک کو بھیجیں
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={dailyReportAlert}
                  onChange={(e) => setDailyReportAlert(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "محفوظ ہو رہا ہے..." : "سیٹنگز محفوظ کریں (Save Settings)"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* LIVE TANKS STATUS CARD */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-1.5">
              <Droplet className="w-4 h-4 text-cyan-600" />
              <span>ٹینک لائیو لیولز (Live Tanks Status)</span>
            </h3>
            <div className="space-y-4">
              {tanks.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">کوئی ٹینک موجود نہیں</div>
              ) : (
                tanks.map((t) => (
                  <div key={t.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>{t.name} ({t.fuel_type})</span>
                      <span className={`font-mono ${t.isLow ? "text-red-600 animate-pulse font-black" : "text-slate-700"}`}>
                        {formatLitres(t.current_stock)} ({t.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          t.isLow ? "bg-red-500" : t.percentage < 40 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, t.percentage)}%` }}
                      />
                    </div>
                    {t.isLow && (
                      <span className="text-[10px] text-red-600 font-bold block mt-1">
                        ⚠️ الرٹ تھریش ہولڈ ({lowStockPercent}%) سے کم ہے!
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
            جب بھی ٹینک کا لیول کم ہوگا تو کرون جاب `/api/cron/check-alerts` خودکار طور پر الرٹ جنریٹ کرے گی۔
          </div>
        </div>
      </div>
    </div>
  );
}
