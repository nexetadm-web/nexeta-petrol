"use client";

import React, { useState, useEffect } from "react";
import { 
  Wallet, 
  Coins, 
  Receipt, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Printer, 
  Download, 
  Trash2, 
  Calendar, 
  Clock, 
  ArrowRightLeft,
  UserCheck,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { formatRs, getTodayDatePK, formatDate } from "@/lib/formatters";
import { CashClosing } from "@/lib/types";
import { downloadCashClosingPDF } from "@/lib/pdf-generator";

export default function CashClosingPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDatePK());
  const [shift, setShift] = useState<string>("FullDay");
  const [closings, setClosings] = useState<CashClosing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Live Auto-fetched breakdown
  const [nozzleSale, setNozzleSale] = useState<number>(0);
  const [oilSale, setOilSale] = useState<number>(0);
  const [totalSale, setTotalSale] = useState<number>(0);
  const [udharGiven, setUdharGiven] = useState<number>(0);
  const [kharchaTotal, setKharchaTotal] = useState<number>(0);
  const [expectedCash, setExpectedCash] = useState<number>(0);

  // Form Inputs
  const [actualCash, setActualCash] = useState<string>("");
  const [submittedBy, setSubmittedBy] = useState<string>("");
  const [receiverName, setReceiverName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cash-closing?date=${selectedDate}`);
      const data = await res.json();
      if (data.success) {
        if (data.liveTotals) {
          setNozzleSale(data.liveTotals.total_nozzle_sale_rs || 0);
          setOilSale(data.liveTotals.total_oil_products_sale_rs || 0);
          setTotalSale(data.liveTotals.total_sale_rs || 0);
          setUdharGiven(data.liveTotals.total_udhar_rs || 0);
          setKharchaTotal(data.liveTotals.total_kharcha_rs || 0);
          setExpectedCash(data.liveTotals.expected_cash_in_hand || 0);
        }
        setClosings(data.closings || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load closing data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  // Calculations
  const enteredActual = parseFloat(actualCash) || 0;
  const difference = enteredActual - expectedCash;
  const isMatchOrSurplus = difference >= 0;

  const handleSubmitClosing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualCash) {
      alert("براہ کرم وصول شدہ رقم (Actual Cash) درج کریں");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg("");
      const res = await fetch("/api/cash-closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formatDate(selectedDate),
          shift,
          total_nozzle_sale_rs: nozzleSale,
          total_oil_products_sale_rs: oilSale,
          total_sale_rs: totalSale,
          total_udhar_rs: udharGiven,
          total_kharcha_rs: kharchaTotal,
          expected_cash_in_hand: expectedCash,
          actual_cash_submitted_rs: enteredActual,
          submitted_by: submittedBy,
          receiver_name: receiverName,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save closing");

      setSuccessMsg(data.message || "شفت ہینڈ اوور ریکارڈ محفوظ ہو گیا!");
      setActualCash("");
      setSubmittedBy("");
      setReceiverName("");
      setNotes("");
      fetchData();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || "Error saving closing");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClosing = async (id: number) => {
    if (!confirm("کیا آپ واقعی یہ کلوزنگ ریکارڈ حذف کرنا چاہتے ہیں؟")) return;

    try {
      const res = await fetch(`/api/cash-closing?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      fetchData();
      setSuccessMsg("ریکارڈ حذف کر دیا گیا");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      alert(err.message || "Error deleting");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    downloadCashClosingPDF(closings, selectedDate);
  };

  return (
    <div className="space-y-6 pb-16 bg-[#f8fafc] min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-violet-100 text-violet-700">
              <Wallet className="w-6 h-6" />
            </span>
            <span>روزانہ کیش کلوزنگ و شفت ہینڈ اوور</span>
            <span className="text-slate-400 font-normal text-xl sm:text-2xl">| Daily Cash Closing</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            نوزل و سامان فروخت، ادھار و اخراجات کی کٹوتی کے بعد کیش ان ہینڈ کا درست حساب و فرق
          </p>
        </div>

        {/* Action Buttons & Date Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 shadow-xs">
            <Calendar className="w-4 h-4 text-violet-600" />
            <input
              type="text"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              placeholder="DD-MM-YYYY"
              className="bg-transparent text-slate-900 text-xs font-bold font-mono focus:outline-none w-28 text-center"
            />
          </div>

          <button
            onClick={fetchData}
            title="ریفریش کریں"
            className="p-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-xs transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-violet-600" : ""}`} />
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>پرنٹ (Print)</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition-all hover:scale-102"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TOP 4 BEAUTIFUL VIBRANT GRADIENT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Sale Rs */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-teal-100 rounded-2xl p-6 border-l-4 border-emerald-500 border border-emerald-200/70 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-200 text-emerald-800 flex items-center justify-center shadow-xs">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block">
                  کل مجموعی فروخت
                </span>
                <span className="text-xs text-emerald-900/70 font-semibold">Total Gross Sale</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 border border-emerald-300 text-emerald-800 shadow-2xs">
              آمدنی
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-950 mt-4 font-mono tracking-tight">
            {formatRs(totalSale)}
          </div>
          <div className="mt-2 text-xs text-emerald-900 font-bold flex items-center justify-between">
            <span>تیل: {formatRs(nozzleSale)}</span>
            <span>سامان: {formatRs(oilSale)}</span>
          </div>
        </div>

        {/* Card 2: Total Udhar Rs */}
        <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-amber-100 rounded-2xl p-6 border-l-4 border-amber-500 border border-amber-200/70 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-200 text-amber-800 flex items-center justify-center shadow-xs">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 block">
                  آج کا ادھار (Udhar)
                </span>
                <span className="text-xs text-amber-900/70 font-semibold">Credit Given Today</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 border border-amber-300 text-amber-800 shadow-2xs">
              کٹوتی (-)
            </span>
          </div>
          <div className="text-3xl font-black text-amber-950 mt-4 font-mono tracking-tight">
            {formatRs(udharGiven)}
          </div>
          <p className="mt-2 text-xs text-amber-900 font-bold">
            ادھار پر دیا گیا تیل و سامان (غیر نقد)
          </p>
        </div>

        {/* Card 3: Total Kharcha Rs */}
        <div className="bg-gradient-to-br from-rose-50 via-red-50 to-pink-100 rounded-2xl p-6 border-l-4 border-rose-500 border border-rose-200/70 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-200 text-rose-800 flex items-center justify-center shadow-xs">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-800 block">
                  آج کا خرچہ (Kharcha)
                </span>
                <span className="text-xs text-rose-900/70 font-semibold">Expenses Deducted</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 border border-rose-300 text-rose-800 shadow-2xs">
              کٹوتی (-)
            </span>
          </div>
          <div className="text-3xl font-black text-rose-950 mt-4 font-mono tracking-tight">
            {formatRs(kharchaTotal)}
          </div>
          <p className="mt-2 text-xs text-rose-900 font-bold">
            بجلی بل، جنریٹر، تنخواہ و روزمرہ اخراجات
          </p>
        </div>

        {/* Card 4: Expected Cash in Hand (Large Bold) */}
        <div className="bg-gradient-to-br from-purple-50 via-violet-50 to-violet-100 rounded-2xl p-6 border-l-4 border-purple-500 border border-purple-200/70 shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-200 text-purple-800 flex items-center justify-center shadow-xs">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-800 block">
                  مطلوبہ کیش ان ہینڈ
                </span>
                <span className="text-xs text-purple-900/70 font-semibold">Expected Cash in Hand</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 border border-purple-300 text-purple-800 shadow-2xs">
              نیٹ کیش
            </span>
          </div>
          <div className="text-3xl font-black text-purple-950 mt-4 font-mono tracking-tight">
            {formatRs(expectedCash)}
          </div>
          <p className="mt-2 text-xs text-purple-900 font-bold">
            فروخت منہا ادھار و خرچہ = مطلوبہ وصولی رقم
          </p>
        </div>
      </div>

      {/* SHIFT HANDOVER FORM */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-lg">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-violet-100 text-violet-700">
              <ArrowRightLeft className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
                نیا شفت ہینڈ اوور فارم درج کریں (Shift Cash Handover Form)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                تاریخ {selectedDate} کے نوزل و دکان سیلز سے خودکار تصدیق
              </p>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-500">فارمولا: </span>
            <span className="text-xs font-mono font-bold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-200">
              کل سیل - ادھار - خرچہ = کیش
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmitClosing} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Shift Picker */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                شفت منتخب کریں (Shift)
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              >
                <option value="FullDay">پورے دن کا حساب (Full Day)</option>
                <option value="Morning">صبح کی شفت (Morning 08:00 AM - 04:00 PM)</option>
                <option value="Evening">شام کی شفت (Evening 04:00 PM - 12:00 AM)</option>
                <option value="Night">رات کی شفت (Night 12:00 AM - 08:00 AM)</option>
              </select>
            </div>

            {/* Expected Cash (Read-Only) */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                مطلوبہ رقم کیش (Expected Cash)
              </label>
              <div className="w-full p-2.5 rounded-xl border border-purple-200 bg-purple-50/70 text-sm font-black font-mono text-purple-900">
                {formatRs(expectedCash)}
              </div>
            </div>

            {/* Actual Cash Submitted (Input) */}
            <div>
              <label className="block text-xs font-black text-slate-900 uppercase mb-1.5 flex items-center justify-between">
                <span>وصول شدہ کیش (Actual Submitted)</span>
                <span className="text-rose-600 font-bold">* لازمی</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">Rs.</span>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="مثلاً 185000"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-violet-400 focus:border-violet-600 focus:ring-2 focus:ring-violet-100 text-base font-black font-mono text-slate-900 bg-white shadow-2xs"
                />
              </div>
            </div>

            {/* Live Difference Badge */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">
                کیش میں فرق (Cash Difference)
              </label>
              <div
                className={`w-full p-2.5 rounded-xl border text-sm font-black font-mono flex items-center justify-between ${
                  !actualCash
                    ? "bg-slate-50 border-slate-200 text-slate-400"
                    : isMatchOrSurplus
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-red-50 border-red-300 text-red-700"
                }`}
              >
                <span>{actualCash ? (difference >= 0 ? "+Rs. " : "-Rs. ") : "Rs. "}</span>
                <span>{actualCash ? Math.abs(difference).toLocaleString() : "0"}</span>
                <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-white/80">
                  {!actualCash ? "منتظر" : isMatchOrSurplus ? "درست / سرپلس" : "شارٹیج / کمی"}
                </span>
              </div>
            </div>
          </div>

          {/* Handover Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>کیش جمع کروانے والا (Handed Over By)</span>
              </label>
              <input
                type="text"
                placeholder="مثلاً: محمد اسلم (نوزل مین / شفٹ انچارج)"
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>کیش وصول کنندہ (Receiver / Cashier)</span>
              </label>
              <input
                type="text"
                placeholder="مثلاً: راشد محمود (کیشیئر / مینیجر)"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                وضاحتی نوٹ (Notes / Remarks)
              </label>
              <input
                type="text"
                placeholder="مثلاً: 500 روپے کا نوٹ تبدیل ہونا باقی ہے"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:border-violet-500"
              />
            </div>
          </div>

          {/* Submit Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              {actualCash && !isMatchOrSurplus && (
                <span className="text-red-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>توجہ: کیش میں {formatRs(Math.abs(difference))} کی کمی (Shortage) ہے۔</span>
                </span>
              )}
              {actualCash && isMatchOrSurplus && (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>بہترین! کیش کا حساب بالکل درست ہے۔</span>
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-violet-900/20 transition-all hover:scale-102 disabled:opacity-50"
            >
              {saving ? "محفوظ ہو رہا ہے..." : "شفت ہینڈ اوور محفوظ کریں (Save Cash Closing)"}
            </button>
          </div>
        </form>
      </div>

      {/* CLOSING HISTORY TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-lg">
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-violet-100 text-violet-700">
              <Clock className="w-4 h-4" />
            </span>
            <span className="text-sm font-black uppercase tracking-wider text-slate-900">
              کیش کلوزنگ و شفت ہینڈ اوور لاگ (Cash Closing Audit History)
            </span>
          </div>

          <span className="text-xs text-slate-500 font-mono font-bold">
            {closings.length} کلوزنگ ریکارڈز
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">تاریخ و شفت</th>
                <th className="py-3 px-3 text-right">کل فروخت (Sale)</th>
                <th className="py-3 px-3 text-right">ادھار (-)</th>
                <th className="py-3 px-3 text-right">خرچہ (-)</th>
                <th className="py-3 px-3 text-right">مطلوبہ کیش</th>
                <th className="py-3 px-3 text-right">وصول شدہ کیش</th>
                <th className="py-3 px-3 text-right">فرق (Difference)</th>
                <th className="py-3 px-4">ہینڈ اوور (جمع دہندہ ➔ وصول کنندہ)</th>
                <th className="py-3 px-3 text-center">ایکشن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {closings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    کوئی کلوزنگ ریکارڈ درج نہیں ہے۔ اوپر دیے گئے فارم سے محفوظ کریں۔
                  </td>
                </tr>
              ) : (
                closings.map((c) => {
                  const diff = c.difference_rs || 0;
                  const isPositive = diff >= 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="font-mono">{c.date}</div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-bold">
                          {c.shift}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-800">
                        {formatRs(c.total_sale_rs)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-amber-700">
                        {formatRs(c.total_udhar_rs)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-rose-700">
                        {formatRs(c.total_kharcha_rs)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatRs(c.expected_cash_in_hand)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-black text-indigo-950 text-sm">
                        {formatRs(c.actual_cash_submitted_rs)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono font-bold">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-xs ${
                            isPositive
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                              : "bg-red-50 text-red-700 border border-red-300"
                          }`}
                        >
                          {isPositive ? `+${diff.toLocaleString()}` : `${diff.toLocaleString()}`}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 text-xs">
                        <div className="font-bold">
                          {c.submitted_by || "نوزل مین"} <span className="text-violet-600">➔</span> {c.receiver_name || "کیشیئر"}
                        </div>
                        {c.notes && <div className="text-[11px] text-slate-500 italic mt-0.5">{c.notes}</div>}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleDeleteClosing(c.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="حذف کریں"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
