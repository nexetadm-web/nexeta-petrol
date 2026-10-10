"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BadgeDollarSign,
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingUp,
  Fuel,
  Sparkles,
  Info,
  X
} from "lucide-react";
import { formatRs, getTodayDatePK, formatPKDate } from "@/lib/formatters";
import { FuelRate, FuelRateHistory } from "@/lib/types";

export default function PumpRatesPage() {
  const params = useParams();
  const pumpId = params?.pumpId as string;

  const [currentRates, setCurrentRates] = useState<FuelRate[]>([]);
  const [history, setHistory] = useState<FuelRateHistory[]>([]);
  const [pumpName, setPumpName] = useState<string>("Nexeta Petrol");
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form states
  const [product, setProduct] = useState<string>("Petrol");
  const [newRate, setNewRate] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState<string>(getTodayDatePK());
  const [effectiveTime, setEffectiveTime] = useState<string>("12:00 AM");
  const [reason, setReason] = useState<string>("حکومتی نوٹیفکیشن / OGRA Price Revision");
  const [changedBy, setChangedBy] = useState<string>("Manager / کیشیئر");

  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchRatesData = async () => {
    if (!pumpId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pumps/${pumpId}/rates`);
      const data = await res.json();
      if (data.success) {
        setCurrentRates(data.current_rates || []);
        setHistory(data.history || []);
        if (data.pump_name) setPumpName(data.pump_name);
      }
    } catch (err) {
      console.error("Rates fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatesData();
  }, [pumpId]);

  // Set default time to current formatted time when opening modal
  const handleOpenModal = (prod = "Petrol") => {
    setProduct(prod);
    const existing = currentRates.find((r) => r.product === prod);
    setNewRate(existing ? existing.current_rate.toString() : "264.50");
    setEffectiveDate(getTodayDatePK());

    // Current time formatted as "hh:mm AM/PM"
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    setEffectiveTime(`${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`);

    setWarningMsg(null);
    setSuccessMsg(null);
    setShowModal(true);
  };

  // Quick preset buttons for Effective Time
  const handleSetPresetTime = (preset: "now" | "midnight" | "morning") => {
    const today = getTodayDatePK();
    setEffectiveDate(today);

    if (preset === "midnight") {
      setEffectiveTime("12:00 AM (آدھی رات)");
    } else if (preset === "morning") {
      setEffectiveTime("08:00 AM (صبح)");
    } else {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      setEffectiveTime(`${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`);
    }
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setWarningMsg(null);
    setSuccessMsg(null);

    const rateVal = parseFloat(newRate);
    if (isNaN(rateVal) || rateVal <= 0) {
      alert("درست ریٹ درج کریں");
      setSubmitting(false);
      return;
    }

    const effectiveCombined = `${effectiveDate} ${effectiveTime}`;

    // Optimistic UI (<50ms instant card & history update)
    const existing = currentRates.find((r) => r.product === product);
    const oldRateVal = existing ? existing.current_rate : rateVal;

    setCurrentRates((prev) =>
      prev.map((r) =>
        r.product === product
          ? { ...r, current_rate: rateVal, last_effective_from: effectiveCombined }
          : r
      )
    );

    const optimisticHistoryEntry: FuelRateHistory = {
      id: Date.now(),
      pump_id: Number(pumpId),
      product,
      old_rate: oldRateVal,
      new_rate: rateVal,
      effective_from: effectiveCombined,
      effective_to: null,
      reason,
      changed_by: changedBy,
      created_at: new Date().toISOString(),
    };

    setHistory((prev) => [optimisticHistoryEntry, ...prev]);
    setShowModal(false);

    try {
      const res = await fetch(`/api/pumps/${pumpId}/rates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          new_rate: rateVal,
          effective_from: effectiveCombined,
          reason,
          changed_by: changedBy,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.warning) {
          setWarningMsg(data.warning);
        } else {
          setSuccessMsg(data.message || "نیا ریٹ کامیابی سے لاگو ہو گیا!");
        }
        await fetchRatesData();
      } else {
        alert(data.error || "ریٹ محفوظ نہ ہو سکا");
      }
    } catch (err: any) {
      console.error("Save rate error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const getProductColor = (prod: string) => {
    switch (prod) {
      case "Petrol":
        return {
          cardBg: "from-emerald-50 to-teal-100",
          border: "border-l-emerald-500",
          badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
          iconBg: "bg-emerald-200 text-emerald-700",
          text: "text-emerald-800",
        };
      case "Diesel":
        return {
          cardBg: "from-amber-50 to-orange-100",
          border: "border-l-amber-500",
          badge: "bg-amber-100 text-amber-800 border-amber-300",
          iconBg: "bg-amber-200 text-amber-700",
          text: "text-amber-800",
        };
      case "HOBC":
      case "Super":
        return {
          cardBg: "from-purple-50 to-indigo-100",
          border: "border-l-purple-500",
          badge: "bg-purple-100 text-purple-800 border-purple-300",
          iconBg: "bg-purple-200 text-purple-700",
          text: "text-purple-800",
        };
      default:
        return {
          cardBg: "from-blue-50 to-cyan-100",
          border: "border-l-blue-500",
          badge: "bg-blue-100 text-blue-800 border-blue-300",
          iconBg: "bg-blue-200 text-blue-700",
          text: "text-blue-800",
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1">
            <Link
              href={`/dashboard/pump/${pumpId}/tanks`}
              className="hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ڈیش بورڈ پر واپس جائیں</span>
            </Link>
            <span>•</span>
            <span>ریٹ مینجمنٹ سسٹم</span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BadgeDollarSign className="w-8 h-8 text-amber-500" />
            <span>روزانہ ایندھن ریٹ مینجمنٹ (Rate Effective Date & Time)</span>
          </h1>

          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            ریٹ لاگو ہونے کی قطعی تاریخ اور وقت منتخب کریں۔ اگر مینیجر صبح دیر سے بھی ریٹ درج کرے تو پچھلی رات 12 بجے کا وقت منتخب کر سکتا ہے تاکہ 24 گھنٹے کی رپورٹ خود بخود ریٹ وائز تقسیم ہو جائے۔
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/pump/${pumpId}/reports/daily`}
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors shadow-2xs"
          >
            <History className="w-4 h-4 text-indigo-600" />
            <span>24 گھنٹے ریٹ وائز رپورٹ دیکھیں</span>
          </Link>

          <button
            onClick={() => handleOpenModal("Petrol")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ نیا ریٹ لگائیں (Change Rate)</span>
          </button>
        </div>
      </div>

      {/* Warnings & Success Banners */}
      {warningMsg && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-center gap-3 text-xs font-bold animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{warningMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 flex items-center gap-3 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Top 4 Current Rates Cards */}
      <div>
        <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-3">
          موجودہ نافذ العمل ریٹس (Current Live Fuel Rates)
        </h2>

        {loading ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
            <span className="text-slate-400 text-xs font-semibold">ریٹس لوڈ ہو رہے ہیں...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {currentRates.map((item) => {
              const colors = getProductColor(item.product);

              return (
                <div
                  key={item.product}
                  className={`bg-gradient-to-br ${colors.cardBg} border-l-4 ${colors.border} rounded-3xl p-6 shadow-md hover:shadow-lg transition-all border border-slate-200/60 relative group`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl ${colors.iconBg} flex items-center justify-center font-black shadow-inner`}>
                      <Fuel className="w-6 h-6" />
                    </div>
                    <span className={`text-xs font-black px-3 py-1 rounded-full border ${colors.badge}`}>
                      {item.product}
                    </span>
                  </div>

                  <div className="mt-4">
                    <span className="text-xs font-black uppercase text-slate-500">
                      فی لیٹر قیمت (Per Litre)
                    </span>
                    <div className="text-3xl lg:text-4xl font-black font-mono text-slate-900 mt-1">
                      Rs. {item.current_rate.toFixed(2)}
                    </div>

                    <div className="mt-3 pt-3 border-t border-black/10 flex items-start gap-1.5 text-xs text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] text-slate-400 block font-semibold">لاگو ہوا بذریعہ:</span>
                        <strong className="font-bold text-slate-800 font-mono text-[11px]">
                          {item.last_effective_from || "12-10-2026 12:00 AM"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenModal(item.product)}
                    className="mt-4 w-full py-2 bg-white/80 hover:bg-white text-slate-800 hover:text-indigo-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition-colors"
                  >
                    ریٹ تبدیل کریں
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Rates History Timeline Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-base text-slate-900">
              ریٹ تبدیلی کی مکمل ٹائم لائن و تاریخ (Effective Datetime History)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400 font-bold">
            Total {history.length} Changes Recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 text-center">#</th>
                <th className="py-3.5 px-4 text-right">پروڈکٹ</th>
                <th className="py-3.5 px-4 text-right">پچھلا ریٹ</th>
                <th className="py-3.5 px-4 text-right">نیا ریٹ</th>
                <th className="py-3.5 px-4 text-right">کب سے لاگو ہوا (Effective From) *</th>
                <th className="py-3.5 px-4 text-right">کب تک لاگو رہا (Effective To)</th>
                <th className="py-3.5 px-4 text-right">تبدیلی کی وجہ</th>
                <th className="py-3.5 px-4 text-right">درج کنندہ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    ابھی تک ریٹ ہسٹری میں کوئی تبدیلی لاگ نہیں ہوئی
                  </td>
                </tr>
              ) : (
                history.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                      {row.product}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                      Rs. {row.old_rate ? row.old_rate.toFixed(2) : "—"}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-black text-emerald-600 text-sm">
                      Rs. {row.new_rate.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700 bg-indigo-50/40 rounded-lg whitespace-nowrap">
                      {row.effective_from}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {row.effective_to ? (
                        <span>{row.effective_to}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          موجودہ فعال (Current)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium max-w-xs truncate">
                      {row.reason || "حکومتی نوٹیفکیشن"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {row.changed_by || "Manager"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rate Change Modal with Precise Effective Datetime */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BadgeDollarSign className="w-6 h-6 text-amber-500" />
                <h3 className="font-black text-lg text-slate-900">نیا ریٹ لگائیں (Update Fuel Rate)</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    پروڈکٹ (Product) *
                  </label>
                  <select
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Petrol">Petrol (پٹرول)</option>
                    <option value="Diesel">Diesel (ڈیزل)</option>
                    <option value="Super">Super (سپر پٹرول)</option>
                    <option value="HOBC">HOBC (ہائی اوکٹین)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    نیا ریٹ فی لیٹر (Rs.) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    placeholder="مثال: 264.50"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-300 bg-indigo-50/30 font-black font-mono text-base text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Effective From Date & Time Section */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase text-indigo-950 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>یہ ریٹ کب سے لاگو کرنا ہے؟ (Effective Date & Time) *</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">تاریخ (Date DD-MM-YYYY)</span>
                    <input
                      type="text"
                      required
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      placeholder="DD-MM-YYYY"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">وقت (Time hh:mm AM/PM)</span>
                    <input
                      type="text"
                      required
                      value={effectiveTime}
                      onChange={(e) => setEffectiveTime(e.target.value)}
                      placeholder="12:00 AM یا 11:00 AM"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-bold text-slate-400">فوری انتخاب:</span>
                  <button
                    type="button"
                    onClick={() => handleSetPresetTime("midnight")}
                    className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700"
                  >
                    رات 12:00 بجے (Midnight)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPresetTime("morning")}
                    className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700"
                  >
                    صبح 08:00 بجے
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPresetTime("now")}
                    className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700"
                  >
                    ابھی (Now)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تبدیلی کی وجہ (Reason)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="حکومتی نوٹیفکیشن / OGRA Price Revision"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">درج کنندہ (Changed By)</label>
                <input
                  type="text"
                  value={changedBy}
                  onChange={(e) => setChangedBy(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100"
                >
                  منسوخ کریں
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? "محفوظ ہو رہا ہے..." : "نیا ریٹ نافذ کریں"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
