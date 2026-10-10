"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Printer,
  RefreshCw,
  Coins,
  Truck,
  Receipt,
  Wallet,
  Clock,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { formatRs, formatLitres, getTodayDatePK, formatDate } from "@/lib/formatters";

export default function DailyProfitLossPage() {
  const params = useParams();
  const router = useRouter();
  const pumpId = (params?.pumpId as string) || "1";

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDatePK());
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const fetchProfitReport = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await fetch(`/api/pumps/${pumpId}/reports/profit?date=${selectedDate}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "رپورٹ لوڈ کرنے میں ناکامی");
      }
      setReport(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load profit report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfitReport();
  }, [pumpId, selectedDate]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <button
            onClick={() => router.push(`/dashboard/pump/${pumpId}/reports/daily`)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>واپس 24h ریٹ رپورٹ (Rate-Wise Report)</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700 shadow-xs">
              <TrendingUp className="w-6 h-6" />
            </span>
            <span>روزانہ خالص منافع و نقصان رپورٹ</span>
            <span className="text-slate-400 font-normal text-xl sm:text-2xl">| Profit & Loss Statement</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {report?.pump?.pump_name || "Nexeta Petrol"} — مجموعی سیل، خریداری لاگت، اخراجات اور خالص پرافٹ کا آڈٹ
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Date Picker */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 shadow-sm text-xs">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <input
              type="text"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              placeholder="DD-MM-YYYY"
              className="bg-transparent text-slate-900 font-bold font-mono focus:outline-none w-28 text-center"
            />
          </div>

          <button
            onClick={() => setSelectedDate(getTodayDatePK())}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            آج (Today)
          </button>

          <button
            onClick={fetchProfitReport}
            className="p-2 rounded-xl bg-white border border-slate-300 text-slate-600 hover:text-slate-900 shadow-sm transition-all"
            title="ریفریش کریں"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>پرنٹ یا PDF ایکسپورٹ</span>
          </button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-2xl font-black text-slate-900">{report?.pump?.pump_name || "Nexeta Petrol"}</h1>
        <p className="text-xs text-slate-600">{report?.pump?.city || "Pakistan"} — خالص نفع و نقصان (Daily Profit & Loss)</p>
        <p className="text-xs font-mono font-bold text-slate-800 mt-1">تاریخ: {selectedDate}</p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center bg-white rounded-2xl border border-slate-200 shadow-md">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
          <p className="text-sm font-bold text-slate-600">منافع و نقصان کا حساب تیار ہو رہا ہے...</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* 5 MAIN KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Gross Sale */}
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 rounded-2xl p-5 border-l-4 border-l-blue-500 border border-blue-200/70 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-blue-800">
                  مجموعی سیل (Gross Sale)
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-200 text-blue-800 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-950 mt-2 font-mono">
                {formatRs(report.summary.grossSale)}
              </div>
              <div className="text-[11px] text-blue-700 font-bold mt-1">
                فیول: {formatLitres(report.summary.totalFuelLitres)}
              </div>
            </div>

            {/* Card 2: Purchase Cost */}
            <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 rounded-2xl p-5 border-l-4 border-l-amber-500 border border-amber-200/70 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                  خریداری لاگت (Cost)
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-950 mt-2 font-mono">
                {formatRs(report.summary.purchaseCost)}
              </div>
              <div className="text-[11px] text-amber-700 font-bold mt-1">
                تیل خریداری / لاگت انورڈ
              </div>
            </div>

            {/* Card 3: Total Expenses */}
            <div className="bg-gradient-to-br from-rose-50 via-red-50 to-pink-100 rounded-2xl p-5 border-l-4 border-l-rose-500 border border-rose-200/70 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-rose-800">
                  کل اخراجات (Expenses)
                </span>
                <div className="w-9 h-9 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-rose-950 mt-2 font-mono">
                {formatRs(report.summary.totalExpenses)}
              </div>
              <div className="text-[11px] text-rose-700 font-bold mt-1">
                بجلی، تنخواہ و دیگر
              </div>
            </div>

            {/* Card 4: NET PROFIT / LOSS (Highlight Vibrant) */}
            <div
              className={`rounded-2xl p-5 border-l-4 shadow-lg transition-all ${
                report.summary.isProfitable
                  ? "bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 border-l-emerald-600 border border-emerald-300"
                  : "bg-gradient-to-br from-red-50 via-rose-50 to-red-100 border-l-red-600 border border-red-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-black uppercase tracking-wider ${
                    report.summary.isProfitable ? "text-emerald-900" : "text-red-900"
                  }`}
                >
                  {report.summary.isProfitable ? "خالص منافع (Net Profit)" : "خالص نقصان (Net Loss)"}
                </span>
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    report.summary.isProfitable ? "bg-emerald-200 text-emerald-900" : "bg-red-200 text-red-900"
                  }`}
                >
                  {report.summary.isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
              </div>
              <div
                className={`text-xl sm:text-2xl font-black font-mono mt-2 ${
                  report.summary.isProfitable ? "text-emerald-950" : "text-red-950"
                }`}
              >
                {formatRs(report.summary.netProfit)}
              </div>
              <div
                className={`text-[11px] font-bold mt-1 ${
                  report.summary.isProfitable ? "text-emerald-700" : "text-red-700"
                }`}
              >
                {report.summary.isProfitable ? "منافع میں پمپ ہے ✓" : "اخراجات زیادہ رہے ⚠️"}
              </div>
            </div>

            {/* Card 5: Estimated Cash in Hand */}
            <div className="bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100 rounded-2xl p-5 border-l-4 border-l-purple-500 border border-purple-200/70 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-purple-800">
                  کیش ان ہینڈ (Cash)
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-200 text-purple-800 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-purple-950 mt-2 font-mono">
                {formatRs(report.summary.estimatedCashInHand)}
              </div>
              <div className="text-[11px] text-purple-700 font-bold mt-1">
                وصول شدہ کیش بیلنس
              </div>
            </div>
          </div>

          {/* PER SHIFT BREAKDOWN (MORNING VS EVENING VS NIGHT) */}
          {report.shiftBreakdown?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>شفٹ وائز منافع و فروخت (Shift-Wise Profit Breakdown)</span>
                </h3>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {report.shiftBreakdown.length} شفٹس
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-100 p-4">
                {report.shiftBreakdown.map((s: any) => (
                  <div key={s.shiftId} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-xs font-black bg-indigo-100 text-indigo-800">
                        {s.shiftName === "Morning" ? "صبح شفٹ" : s.shiftName === "Evening" ? "شام شفٹ" : "رات شفٹ"}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">{s.staffName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      وقت: {s.startTime} - {s.endTime}
                    </div>
                    <div className="pt-2 border-t flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-bold">فروخت لیٹرز:</span>
                      <span className="font-mono font-bold text-slate-900">{formatLitres(s.litres)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-bold">سیل رقم:</span>
                      <span className="font-mono font-bold text-blue-700">{formatRs(s.income)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-bold">تخمینہ منافع:</span>
                      <span className="font-mono font-black text-emerald-700">+{formatRs(s.estimatedProfit)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROFIT & LOSS STATEMENT DETAILED TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                مکمل مالیاتی گوشوارہ (Detailed Profit & Loss Statement) — {formatDate(selectedDate)}
              </h3>
            </div>
            <div className="p-4 divide-y divide-slate-100 text-xs">
              {/* Gross Fuel Sale */}
              <div className="py-3 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900">1. پٹرول، ڈیزل و ہائی اوکٹین سیل (Fuel Sales)</span>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Petrol: {formatLitres(report.fuelBreakdown?.Petrol?.litres || 0)} | Diesel: {formatLitres(report.fuelBreakdown?.Diesel?.litres || 0)}
                  </div>
                </div>
                <span className="font-mono font-black text-blue-700 text-sm">+{formatRs(report.summary.fuelSaleIncome)}</span>
              </div>

              {/* Product Profit */}
              <div className="py-3 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900">2. موبل آئل و سامان نفع (Lubricants Profit)</span>
                  <div className="text-[11px] text-slate-500">کاؤنٹر و دکان سامان سے خالص منافع</div>
                </div>
                <span className="font-mono font-black text-emerald-700 text-sm">+{formatRs(report.summary.productProfitTotal)}</span>
              </div>

              {/* COGS */}
              <div className="py-3 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900">3. خریداری لاگت (Cost of Goods Sold - COGS)</span>
                  <div className="text-[11px] text-slate-500">اوگرا سرکاری مارجن کے مطابق بنیادی فیول لاگت</div>
                </div>
                <span className="font-mono font-black text-amber-700 text-sm">-{formatRs(report.summary.purchaseCost)}</span>
              </div>

              {/* Operational Expenses */}
              <div className="py-3 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900">4. روزمرہ اخراجات (Operating Expenses)</span>
                  <div className="text-[11px] text-slate-500">بجلی بل، چائے، کھانا، ملازمین الاؤنس و مرمت</div>
                </div>
                <span className="font-mono font-black text-rose-700 text-sm">-{formatRs(report.summary.totalExpenses)}</span>
              </div>

              {/* Loans paid */}
              {report.summary.loansPaidOut > 0 && (
                <div className="py-3 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900">5. کیش ادھار واپسی (Cash Loans Paid)</span>
                    <div className="text-[11px] text-slate-500">بینک یا افراد کو واپس کیا گیا قرضہ</div>
                  </div>
                  <span className="font-mono font-black text-purple-700 text-sm">-{formatRs(report.summary.loansPaidOut)}</span>
                </div>
              )}

              {/* Final Net Profit Row */}
              <div className="py-4 flex justify-between items-center bg-slate-50/80 -mx-4 px-4 font-black">
                <span className="text-sm text-slate-900">
                  خالص منافع / نقصان (Net Estimated Profit for {selectedDate})
                </span>
                <span
                  className={`text-base font-mono ${
                    report.summary.isProfitable ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {formatRs(report.summary.netProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
