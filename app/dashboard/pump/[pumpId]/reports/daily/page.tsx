"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Layers, 
  CheckCircle2, 
  Truck, 
  ArrowLeft 
} from "lucide-react";
import { formatRs, formatLitres, getTodayDatePK, formatDate } from "@/lib/formatters";

export default function DailyRateWiseReportPage() {
  const params = useParams();
  const router = useRouter();
  const pumpId = params?.pumpId as string || "1";

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDatePK());
  const [loading, setLoading] = useState<boolean>(true);
  const [report, setReport] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const fetchReport = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await fetch(`/api/pumps/${pumpId}/reports/daily?date=${selectedDate}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load rate-wise report");
      }
      setReport(data);
    } catch (err: any) {
      setErrorMsg(err.message || "رپورٹ لوڈ کرنے میں خرابی پیش آگئی");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [pumpId, selectedDate]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <button
            onClick={() => router.push(`/dashboard/pump/${pumpId}/rates`)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>واپس فیول ریٹس (Back to Rates)</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-700 shadow-xs">
              <Layers className="w-6 h-6" />
            </span>
            <span>24 گھنٹے ریٹ وائز تفصیلی رپورٹ</span>
            <span className="text-slate-400 font-normal text-xl sm:text-2xl">| Rate-Wise 24h Audit</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {report?.pump?.pump_name || "پٹرول پمپ"} — دن میں ریٹ تبدیل ہونے پر ہر وقفے کی الگ الگ کیلکولیشن
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Date Picker */}
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

          <button
            onClick={() => setSelectedDate(getTodayDatePK())}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            آج (Today)
          </button>

          {/* Action Buttons */}
          <button
            onClick={fetchReport}
            className="p-2 rounded-xl bg-white border border-slate-300 text-slate-600 hover:text-slate-900 shadow-sm transition-all"
            title="ریفریش کریں"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>پرنٹ یا PDF (Print Report)</span>
          </button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-2xl font-black text-slate-900">{report?.pump?.pump_name || "Nexeta Petrol"}</h1>
        <p className="text-xs text-slate-600">{report?.pump?.city || "Pakistan"} — 24 گھنٹے ریٹ وائز آڈٹ رپورٹ</p>
        <p className="text-xs font-mono font-bold text-slate-800 mt-1">تاریخ: {selectedDate}</p>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center bg-white rounded-2xl border border-slate-200 shadow-md">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
          <p className="text-sm font-bold text-slate-600">24 گھنٹے کی ریٹ وائز رپورٹ تیار ہو رہی ہے...</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Top 4 Grand Totals KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Fuel Litres */}
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-teal-100 rounded-2xl p-5 border-l-4 border-l-emerald-500 border border-emerald-200/60 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                  کل فیول فروخت (Total Litres)
                </span>
                <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-800 flex items-center justify-center">
                  <Fuel className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-950 mt-2 font-mono">
                {formatLitres(report.grandTotals.totalFuelLitres)}
              </div>
              <div className="text-xs text-emerald-700 font-bold mt-1">
                آمدنی: {formatRs(report.grandTotals.totalFuelAmount)}
              </div>
            </div>

            {/* Card 2: Total Revenue */}
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 rounded-2xl p-5 border-l-4 border-l-blue-500 border border-blue-200/60 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-blue-800">
                  مجموعی فروخت (Total Revenue)
                </span>
                <div className="w-10 h-10 rounded-xl bg-blue-200 text-blue-800 flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-950 mt-2 font-mono">
                {formatRs(report.grandTotals.totalFuelAmount + (report.grandTotals.totalProductRevenue || 0))}
              </div>
              <div className="text-xs text-blue-700 font-bold mt-1">
                فیول + موبل آئل و دیگر سامان
              </div>
            </div>

            {/* Card 3: Total Expenses */}
            <div className="bg-gradient-to-br from-rose-50 via-red-50 to-pink-100 rounded-2xl p-5 border-l-4 border-l-rose-500 border border-rose-200/60 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-rose-800">
                  کل خرچہ (Total Expenses)
                </span>
                <div className="w-10 h-10 rounded-xl bg-rose-200 text-rose-800 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-950 mt-2 font-mono">
                {formatRs(report.grandTotals.totalExpenses)}
              </div>
              <div className="text-xs text-rose-700 font-bold mt-1">
                بجلی، تنخواہیں، جنریٹر وغیرہ
              </div>
            </div>

            {/* Card 4: Net Estimated Profit */}
            <div className="bg-gradient-to-br from-purple-50 via-violet-50 to-violet-100 rounded-2xl p-5 border-l-4 border-l-purple-500 border border-purple-200/60 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-purple-800">
                  خالص منافع (Net Profit)
                </span>
                <div className="w-10 h-10 rounded-xl bg-purple-200 text-purple-800 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div
                className={`text-2xl font-black mt-2 font-mono ${
                  report.grandTotals.netProfit >= 0 ? "text-emerald-800" : "text-rose-800"
                }`}
              >
                {formatRs(report.grandTotals.netProfit)}
              </div>
              <div className="text-xs text-purple-700 font-bold mt-1">
                ڈیلر مارجن + سامان نفع - خرچہ
              </div>
            </div>
          </div>

          {/* RATE-WISE SECTIONS LIST */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>24 گھنٹے کے ریٹ کے مطابق سیکشنز (Rate-Wise Time Intervals)</span>
              </h2>
              <span className="text-xs font-bold text-slate-500">
                ٹوٹل سیکشنز: {report.sections?.length || 0}
              </span>
            </div>

            {report.sections?.map((section: any, idx: number) => (
              <div 
                key={section.id || idx} 
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md print:shadow-none print:border-slate-300"
              >
                {/* Section Header */}
                <div className="p-4 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-mono text-[11px] font-black">
                        سیکشن {section.sectionNumber}
                      </span>
                      <h3 className="text-sm font-black text-slate-900">
                        {section.title}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      وقت: {section.startTime} تا {section.endTime}
                    </p>
                  </div>

                  {/* Effective Rates Badges for this Section */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold">
                      Petrol: {formatRs(section.rates.Petrol)}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono font-bold">
                      Diesel: {formatRs(section.rates.Diesel)}
                    </span>
                    {section.rates.HOBC && (
                      <span className="px-2.5 py-1 rounded-lg bg-pink-50 border border-pink-200 text-pink-800 text-xs font-mono font-bold">
                        HOBC: {formatRs(section.rates.HOBC)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Section Readings Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">نوزل (Nozzle)</th>
                        <th className="py-2.5 px-3">پروڈکٹ (Product)</th>
                        <th className="py-2.5 px-3 text-right">شروع ریڈنگ (Opening)</th>
                        <th className="py-2.5 px-3 text-right">اختتام ریڈنگ (Closing)</th>
                        <th className="py-2.5 px-3 text-right">لیٹرز فروخت (Litres)</th>
                        <th className="py-2.5 px-3 text-right">لاگو ریٹ (Rate)</th>
                        <th className="py-2.5 px-4 text-right">کل رقم (Amount Rs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                      {section.readings?.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">
                            اس وقفے میں کوئی میٹر ریڈنگ ریکارڈ نہیں ہے
                          </td>
                        </tr>
                      ) : (
                        section.readings.map((r: any, rIdx: number) => (
                          <tr key={r.id || rIdx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-slate-900">
                              {r.nozzleName || `Nozzle ${r.nozzleId}`}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.fuelType === "Petrol" 
                                  ? "bg-emerald-100 text-emerald-800" 
                                  : r.fuelType === "Diesel" 
                                  ? "bg-amber-100 text-amber-800" 
                                  : "bg-pink-100 text-pink-800"
                              }`}>
                                {r.fuelType}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                              {Number(r.startReading || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                              {Number(r.endReading || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                              {formatLitres(r.litresSold)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-indigo-700 font-bold">
                              {formatRs(r.appliedRate)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-black text-blue-700">
                              {formatRs(r.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {/* Section Subtotal Footer */}
                    <tfoot className="bg-slate-50 border-t border-slate-200 text-xs font-black">
                      <tr>
                        <td colSpan={4} className="py-3 px-4 text-slate-700">
                          سیکشن {section.sectionNumber} سب ٹوٹل ({section.title}):
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-950">
                          {formatLitres(section.subtotalLitres)}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-400">—</td>
                        <td className="py-3 px-4 text-right font-mono text-indigo-700 text-sm">
                          {formatRs(section.subtotalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Grand Summary & Purchases Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fuel Purchases on Date */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    فیول سپلائی وصولی (Tankers Received on {selectedDate})
                  </span>
                </div>
                <span className="text-xs font-mono font-black text-amber-700">
                  {formatRs(report.grandTotals.totalPurchasesCost)}
                </span>
              </div>
              <div className="p-3 divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {report.purchases?.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    اس تاریخ کو کوئی ٹینکر موصول نہیں ہوا
                  </div>
                ) : (
                  report.purchases.map((p: any) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{p.fuel_type} — {p.supplier}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {formatLitres(p.qty)} @ {formatRs(p.rate)}
                        </div>
                      </div>
                      <div className="text-right font-mono font-bold text-slate-900">
                        {formatRs(p.total_cost)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Daily Expenses Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    روزمرہ اخراجات (Expenses on {selectedDate})
                  </span>
                </div>
                <span className="text-xs font-mono font-black text-rose-700">
                  {formatRs(report.grandTotals.totalExpenses)}
                </span>
              </div>
              <div className="p-3 divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {report.expenses?.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    اس تاریخ کا کوئی خرچہ درج نہیں ہے
                  </div>
                ) : (
                  report.expenses.map((e: any) => (
                    <div key={e.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{e.type}</div>
                        <div className="text-[10px] text-slate-500">{e.note || "—"}</div>
                      </div>
                      <div className="text-right font-mono font-bold text-rose-700">
                        {formatRs(e.amount)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
