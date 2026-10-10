"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Calendar, 
  Printer, 
  RefreshCw, 
  TrendingUp, 
  Fuel, 
  Coins, 
  Receipt, 
  AlertTriangle,
  Download,
  Clock,
  Layers
} from "lucide-react";
import { formatRs, formatLitres, getTodayDatePK, formatDate } from "@/lib/formatters";
import { downloadDailyAuditPDF, downloadMonthlyAuditPDF } from "@/lib/pdf-generator";

export default function ReportsPage() {
  const [reportType, setReportType] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDatePK());
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-10");
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const fetchReport = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const url =
        reportType === "daily"
          ? `/api/reports?date=${selectedDate}`
          : `/api/reports?month=${selectedMonth}`;

      const res = await fetch(url);
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to load report");

      setData(resData);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to fetch report data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, selectedDate, selectedMonth]);

  const handleDownloadPDF = () => {
    if (!data) return;
    if (reportType === "daily") {
      downloadDailyAuditPDF(data, selectedDate);
    } else {
      downloadMonthlyAuditPDF(data, selectedMonth);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-purple-100 text-purple-700 shadow-xs">
              <BarChart3 className="w-6 h-6" />
            </span>
            <span>پورے حساب کتاب کی رپورٹ</span>
            <span className="text-slate-400 font-normal text-xl sm:text-2xl">| Daily & Monthly Audit</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            روزانہ و ماہانہ نفع و نقصان، 24 گھنٹے نوزل ریڈنگز، فیول و موبل آئل سیلز اور اخراجات
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Daily / Monthly Toggle */}
          <div className="flex rounded-xl bg-white p-1 border border-slate-300 shadow-sm">
            <button
              onClick={() => setReportType("daily")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                reportType === "daily"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              روزانہ (Daily)
            </button>
            <button
              onClick={() => setReportType("monthly")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                reportType === "monthly"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ماہانہ (Monthly)
            </button>
          </div>

          {/* Date / Month Picker */}
          {reportType === "daily" ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 shadow-sm text-xs">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <input
                type="text"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                placeholder="DD-MM-YYYY"
                className="bg-transparent text-slate-900 font-bold font-mono focus:outline-none w-28 text-center"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 shadow-sm text-xs">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-slate-900 font-bold focus:outline-none"
              />
            </div>
          )}

          {/* Action Buttons: Print & Download PDF & Rate-Wise Report */}
          <a
            href={`/dashboard/pump/1/reports/daily?date=${selectedDate}`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-bold transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-purple-700" />
            <span>24h ریٹ وائز سیکشنز</span>
          </a>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-bold shadow-sm hover:shadow transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>پرنٹ رپورٹ (Print)</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF (ڈاؤن لوڈ پی ڈی ایف)</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 shadow-md">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
          <p className="text-sm font-bold text-slate-600">رپورٹ تیار ہو رہی ہے...</p>
        </div>
      ) : reportType === "daily" && data?.summary ? (
        /* DAILY REPORT VIEW */
        <div className="space-y-6">
          {/* Top 4 Beautiful Attractive Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Fuel Litres (Emerald) */}
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-teal-100 rounded-2xl p-6 border-l-4 border-l-emerald-500 border border-emerald-200/60 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800">کل تیل فروخت (Fuel Sold)</span>
                <div className="w-12 h-12 rounded-2xl bg-emerald-200 text-emerald-800 flex items-center justify-center shadow-xs">
                  <Fuel className="w-6 h-6" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-950 mt-2 font-mono">
                {formatLitres(data.summary.totalFuelLitres)}
              </div>
              <div className="text-xs text-emerald-700 font-bold mt-2">
                آمدنی: {formatRs(data.summary.totalFuelAmount)}
              </div>
            </div>

            {/* Card 2: Total Sales (Blue) */}
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 rounded-2xl p-6 border-l-4 border-l-blue-500 border border-blue-200/60 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-blue-800">مجموعی فروخت (Total Revenue)</span>
                <div className="w-12 h-12 rounded-2xl bg-blue-200 text-blue-800 flex items-center justify-center shadow-xs">
                  <Coins className="w-6 h-6" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-blue-950 mt-2 font-mono">
                {formatRs(data.summary.grandTotalSales)}
              </div>
              <div className="text-xs text-blue-700 font-bold mt-2">
                تیل + موبل آئل و دکان سامان
              </div>
            </div>

            {/* Card 3: Total Expenses (Rose) */}
            <div className="bg-gradient-to-br from-rose-50 via-red-50 to-pink-100 rounded-2xl p-6 border-l-4 border-l-rose-500 border border-rose-200/60 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-rose-800">روزانہ کل خرچہ (Expenses)</span>
                <div className="w-12 h-12 rounded-2xl bg-rose-200 text-rose-800 flex items-center justify-center shadow-xs">
                  <Receipt className="w-6 h-6" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-950 mt-2 font-mono">
                {formatRs(data.summary.totalExpenses)}
              </div>
              <div className="text-xs text-rose-700 font-bold mt-2">
                بجلی، تنخواہ، جنریٹر و متفرق
              </div>
            </div>

            {/* Card 4: Net Estimated Profit (Purple) */}
            <div className="bg-gradient-to-br from-purple-50 via-violet-50 to-violet-100 rounded-2xl p-6 border-l-4 border-l-purple-500 border border-purple-200/60 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-purple-800">خالص منافع (Net Profit)</span>
                <div className="w-12 h-12 rounded-2xl bg-purple-200 text-purple-800 flex items-center justify-center shadow-xs">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
              <div
                className={`text-2xl sm:text-3xl font-black mt-2 font-mono ${
                  data.summary.netProfit >= 0 ? "text-emerald-800" : "text-rose-800"
                }`}
              >
                {formatRs(data.summary.netProfit)}
              </div>
              <div className="text-xs text-purple-700 font-bold mt-2">
                تیل مارجن + سامان نفع - خرچہ
              </div>
            </div>
          </div>

          {/* Daily Nozzle Readings Sheet */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>1. نوزل میٹر ریڈنگ تفصیل (24-Hour Time-Based) - {formatDate(selectedDate)}</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">Asia/Karachi</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">نوزل (Nozzle)</th>
                    <th className="py-2.5 px-3">ایندھن</th>
                    <th className="py-2.5 px-3 text-center">وقت / شفٹ (Time Range)</th>
                    <th className="py-2.5 px-3 text-right">شروع میٹر</th>
                    <th className="py-2.5 px-3 text-right">اختتام میٹر</th>
                    <th className="py-2.5 px-3 text-right">فروخت شدہ لیٹرز</th>
                    <th className="py-2.5 px-3 text-right">ریٹ</th>
                    <th className="py-2.5 px-4 text-right">کل رقم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {data.readings?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400">
                        اس تاریخ کی کوئی ریڈنگ درج نہیں ہے
                      </td>
                    </tr>
                  ) : (
                    data.readings.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{r.nozzleName}</td>
                        <td className="py-2.5 px-3">{r.fuelType}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600 bg-slate-50/60 rounded">
                          {r.startTime || "08:00 AM"} - {r.endTime || "08:00 PM"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {(r.startReading !== undefined ? r.startReading : r.morningReading)?.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {(r.endReading !== undefined ? r.endReading : r.eveningReading)?.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                          {formatLitres(r.litresSold)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {formatRs(r.rate)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-black text-blue-700">
                          {formatRs(r.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Product Sales & Expenses 2-Column Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Products Sold */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  2. موبل آئل و سامان فروخت
                </span>
                <span className="text-xs font-mono font-black text-emerald-700">
                  نفع: +{formatRs(data.summary.totalProductProfit)}
                </span>
              </div>
              <div className="p-3 divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {data.productSales?.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    کوئی سامان فروخت نہیں ہوا
                  </div>
                ) : (
                  data.productSales.map((ps: any) => (
                    <div key={ps.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{ps.productName}</div>
                        <div className="text-[10px] text-slate-500">تعداد: {ps.qty} دانہ</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900">{formatRs(ps.total)}</div>
                        <div className="text-[10px] text-emerald-700 font-bold">+{formatRs(ps.profit)} نفع</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Expenses */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  3. روزمرہ اخراجات (Kharcha)
                </span>
                <span className="text-xs font-mono font-black text-rose-600">
                  کل: {formatRs(data.summary.totalExpenses)}
                </span>
              </div>
              <div className="p-3 divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {data.expenses?.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    کوئی خرچہ درج نہیں ہوا
                  </div>
                ) : (
                  data.expenses.map((ex: any) => (
                    <div key={ex.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{ex.type}</div>
                        <div className="text-[10px] text-slate-500">{ex.note || "—"}</div>
                      </div>
                      <div className="font-mono font-bold text-rose-600">
                        {formatRs(ex.amount)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : reportType === "monthly" && data?.monthlyTotals ? (
        /* MONTHLY REPORT VIEW */
        <div className="space-y-6">
          {/* Monthly Grand Totals Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-teal-100 rounded-2xl p-6 border-l-4 border-l-emerald-500 border border-emerald-200/60 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                  ماہانہ کل فیول فروخت
                </span>
                <div className="w-12 h-12 rounded-2xl bg-emerald-200 text-emerald-800 flex items-center justify-center shadow-xs">
                  <Fuel className="w-6 h-6" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-950 mt-2 font-mono">
                {formatLitres(data.monthlyTotals.fuelLitres)}
              </div>
              <div className="text-xs text-emerald-700 font-bold mt-2">
                آمدنی: {formatRs(data.monthlyTotals.fuelAmount)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 rounded-2xl p-6 border-l-4 border-l-blue-500 border border-blue-200/60 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-blue-800">
                  ماہانہ کل فروخت (Revenue)
                </span>
                <div className="w-12 h-12 rounded-2xl bg-blue-200 text-blue-800 flex items-center justify-center shadow-xs">
                  <Coins className="w-6 h-6" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-blue-950 mt-2 font-mono">
                {formatRs(data.monthlyTotals.totalSales)}
              </div>
              <div className="text-xs text-blue-700 font-bold mt-2">
                سامان: {formatRs(data.monthlyTotals.productAmount)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-rose-50 via-red-50 to-pink-100 rounded-2xl p-6 border-l-4 border-l-rose-500 border border-rose-200/60 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-rose-800">
                  ماہانہ مجموعی خرچہ
                </span>
                <div className="w-12 h-12 rounded-2xl bg-rose-200 text-rose-800 flex items-center justify-center shadow-xs">
                  <Receipt className="w-6 h-6" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-950 mt-2 font-mono">
                {formatRs(data.monthlyTotals.expenseAmount)}
              </div>
              <div className="text-xs text-rose-700 font-bold mt-2">
                تمام اخراجات کا مجموعہ
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 via-violet-50 to-violet-100 rounded-2xl p-6 border-l-4 border-l-purple-500 border border-purple-200/60 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-purple-800">
                  ماہانہ خالص منافع (Net Profit)
                </span>
                <div className="w-12 h-12 rounded-2xl bg-purple-200 text-purple-800 flex items-center justify-center shadow-xs">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
              <div
                className={`text-2xl sm:text-3xl font-black mt-2 font-mono ${
                  data.monthlyTotals.netProfit >= 0 ? "text-emerald-800" : "text-rose-800"
                }`}
              >
                {formatRs(data.monthlyTotals.netProfit)}
              </div>
              <div className="text-xs text-purple-700 font-bold mt-2">
                مارجن + نفع - اخراجات
              </div>
            </div>
          </div>

          {/* Day-by-Day Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <div className="text-xs font-black uppercase tracking-wider text-slate-800">
                روزانہ کی کارکردگی و آمدنی بریک ڈاؤن ({selectedMonth})
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">تاریخ (Date)</th>
                    <th className="py-3 px-3 text-right">فیول لیٹرز (L)</th>
                    <th className="py-3 px-3 text-right">فیول فروخت (Rs.)</th>
                    <th className="py-3 px-3 text-right">سامان سیل (Rs.)</th>
                    <th className="py-3 px-3 text-right">کل سیل (Rs.)</th>
                    <th className="py-3 px-3 text-right">خرچہ (Rs.)</th>
                    <th className="py-3 px-4 text-right">خالص نفع (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                  {data.dailyBreakdown?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        اس مہینے کا کوئی ڈیٹا موجود نہیں
                      </td>
                    </tr>
                  ) : (
                    data.dailyBreakdown.map((row: any) => (
                      <tr key={row.date} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {formatDate(row.date)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                          {formatLitres(row.fuelLitres)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {formatRs(row.fuelAmount)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {formatRs(row.productAmount)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-blue-700">
                          {formatRs(row.totalSales)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-rose-600">
                          {formatRs(row.expenseAmount)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-black ${
                            row.netProfit >= 0 ? "text-emerald-700" : "text-rose-600"
                          }`}
                        >
                          {formatRs(row.netProfit)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
