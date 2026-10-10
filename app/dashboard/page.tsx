"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Fuel, 
  Coins, 
  Receipt, 
  BookOpen, 
  TrendingUp, 
  Droplet, 
  ArrowUpRight, 
  Gauge, 
  Truck, 
  Package, 
  RefreshCw,
  Sparkles,
  Users,
  Droplets,
  Calendar,
  Wallet,
  AlertTriangle,
  Building2,
  ShieldCheck,
  Eye,
  LogOut,
  CreditCard,
  Cpu,
  CheckCheck,
  Scale,
  Layers
} from "lucide-react";
import { RateBanner } from "@/components/RateBanner";
import { formatRs, formatLitres, getTodayDatePK, formatDate } from "@/lib/formatters";
import { Tank, DailyRate, AuthSession } from "@/lib/types";

export default function StationDashboard() {
  const [loading, setLoading] = useState(true);
  const [todayDateStr, setTodayDateStr] = useState("");
  const [todayRate, setTodayRate] = useState<DailyRate | null>(null);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(20);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [pumpProfile, setPumpProfile] = useState<any>(null);
  const [metrics, setMetrics] = useState({
    todayFuelLitres: 0,
    todayFuelSaleRs: 0,
    todayProductSaleRs: 0,
    todayTotalSaleRs: 0,
    totalCreditRemainingRs: 0,
    todayExpenseRs: 0,
    todayEstimatedNetProfitRs: 0,
    todayProductProfitRs: 0,
    estimatedFuelProfit: 0,
  });
  const [tanks, setTanks] = useState<Tank[]>([]);

  const fetchDashboardData = async () => {
    try {
      const today = getTodayDatePK();
      setTodayDateStr(today);
      const [resDash, resSettings, resMe] = await Promise.all([
        fetch(`/api/dashboard?date=${today}`),
        fetch("/api/settings"),
        fetch("/api/auth/me"),
      ]);

      const data = await resDash.json();
      const dataSettings = await resSettings.json();
      const dataMe = await resMe.json();

      if (dataMe.success && dataMe.session) {
        setSession(dataMe.session);
      }

      if (dataSettings.settings?.low_stock_threshold) {
        setLowStockThreshold(Number(dataSettings.settings.low_stock_threshold) || 20);
      }

      if (data.success) {
        if (data.pump) {
          setPumpProfile(data.pump);
        }
        setTodayRate(data.rates || null);
        setMetrics({
          todayFuelLitres: data.metrics.totalFuelSaleLitres || 0,
          todayFuelSaleRs: data.metrics.fuelRevenueRs || 0,
          todayProductSaleRs: data.metrics.goodsRevenueRs || 0,
          todayTotalSaleRs: data.metrics.totalRevenueRs || 0,
          totalCreditRemainingRs: data.metrics.creditOutstandingRs || 0,
          todayExpenseRs: data.metrics.totalExpensesRs || 0,
          todayEstimatedNetProfitRs: data.metrics.netProfitRs || 0,
          todayProductProfitRs: data.metrics.productProfitRs || 0,
          estimatedFuelProfit: data.metrics.estimatedFuelProfitRs || 0,
        });
        setTanks(data.metrics.tanks || []);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const lowStockTanks = tanks.filter((t) => {
    const pct = t.capacity > 0 ? (t.current_stock / t.capacity) * 100 : 100;
    return pct < lowStockThreshold;
  });

  const stationName = pumpProfile?.name || session?.pumpName || "Nexeta Petrol";
  const ownerName = pumpProfile?.owner || session?.name || "Station Owner";
  const city = pumpProfile?.city || session?.city || "Pakistan";
  const status = pumpProfile?.subscriptionStatus || session?.subscriptionStatus || "active";

  return (
    <div className="space-y-6 pb-12">
      {/* Super Admin Impersonation Banner */}
      {session?.impersonating && (
        <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-3.5 rounded-2xl shadow-lg flex items-center justify-between flex-wrap gap-2 animate-fadeIn border border-purple-500/50">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            <Eye className="w-5 h-5 text-amber-300 animate-pulse" />
            <span>
              سوپر ایڈمن ویو موڈ: آپ فی الحال <strong>{stationName} ({city})</strong> کا ڈیش بورڈ دیکھ رہے ہیں۔
            </span>
          </div>
          <Link
            href="/super-admin/dashboard"
            className="px-3.5 py-1.5 rounded-xl bg-white text-purple-900 font-extrabold text-xs shadow-sm hover:bg-amber-300 transition-all"
          >
            ← سوپر ایڈمن پورٹل پر واپس جائیں
          </Link>
        </div>
      )}

      {/* Station Brand & Subscription Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <Building2 className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {stationName}
            </h1>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{city} Station</span>
            </span>
            <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
              status === "active" 
                ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/40"
                : status === "trial"
                ? "bg-amber-500/30 text-amber-200 border border-amber-400/40"
                : "bg-rose-500/30 text-rose-200 border border-rose-400/40"
            }`}>
              {status === "active" ? "✓ سبسکرپشن فعال (Active)" : status === "trial" ? "🎁 14 دن کا مفت ٹرائل (Trial)" : "⚠️ ایکسپائرڈ (Expired)"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-indigo-200/80 mt-1.5 font-medium">
            پٹرول پمپ لائیو مانیٹرنگ اور خودکار حساب کتاب • مالک: <strong>{ownerName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/billing"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-sm transition-all"
          >
            <CreditCard className="w-4 h-4 text-amber-300" />
            <span>بلنگ (Rs. 3000/ماہانہ)</span>
          </Link>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>ریفریش (Refresh)</span>
          </button>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockTanks.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-50 to-rose-100 border-2 border-red-500 text-red-900 shadow-lg animate-fadeIn flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-red-600 text-white shadow-md animate-bounce">
              <AlertTriangle className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-red-900">
                ⚠️ کم اسٹاک الرٹ (Low Fuel Stock Alert):
              </h3>
              <p className="text-xs sm:text-sm text-red-800 font-bold mt-0.5">
                {lowStockTanks.map((t) => {
                  const pct = Math.round((t.current_stock / t.capacity) * 100);
                  return `${t.name} میں صرف ${formatLitres(t.current_stock)} باقی (${pct}%)`;
                }).join(" | ")} — فوری نئی لاری آرڈر کریں!
              </p>
            </div>
          </div>
          <Link
            href="/purchases"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all active:scale-95 whitespace-nowrap"
          >
            <Truck className="w-4 h-4" />
            <span>لاری آرڈر کریں / خریداری (Purchase Fuel)</span>
          </Link>
        </div>
      )}

      {/* Top Daily Rate Banner */}
      <RateBanner initialRate={todayRate} todayDateStr={todayDateStr} onRatesUpdated={fetchDashboardData} />

      {/* 6 MAIN METRIC CARDS (Vibrant Light SaaS Theme) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CARD 1: Fuel Sale (Litres) */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-100 border-l-4 border-l-emerald-500 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-emerald-200/60 group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <Fuel className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
              آج کا دن
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
              CARD 1 • فیول فروخت
            </span>
            <h3 className="text-sm font-bold text-emerald-900">Fuel Sale (Litres)</h3>
            <div className="text-3xl font-black text-emerald-700 font-mono mt-1">
              {formatLitres(metrics.todayFuelLitres)}
            </div>
            <p className="text-xs font-semibold text-emerald-800 mt-2">
              آمدنی: <strong className="font-mono text-emerald-950 font-bold">{formatRs(metrics.todayFuelSaleRs)}</strong>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-emerald-200/60 flex justify-end">
            <Link href="/readings" className="text-xs font-black text-emerald-700 hover:text-emerald-900 flex items-center gap-1 group-hover:underline">
              <span>نوزل میٹر ریڈنگ دیکھیں</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* CARD 2: Total Revenue (Fuel + Goods) */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border-l-4 border-l-indigo-500 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-indigo-200/60 group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <Coins className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200">
              Fuel + Goods
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-800">
              CARD 2 • کل فروخت
            </span>
            <h3 className="text-sm font-bold text-indigo-900">Total Revenue (Rs.)</h3>
            <div className="text-3xl font-black text-indigo-700 font-mono mt-1">
              {formatRs(metrics.todayTotalSaleRs)}
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-800 mt-2">
              <span>تیل: <strong className="font-mono text-indigo-950">{formatRs(metrics.todayFuelSaleRs)}</strong></span>
              <span>سامان: <strong className="font-mono text-indigo-950">{formatRs(metrics.todayProductSaleRs)}</strong></span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-indigo-200/60 flex justify-end">
            <Link href="/reports" className="text-xs font-black text-indigo-700 hover:text-indigo-900 flex items-center gap-1 group-hover:underline">
              <span>مکمل رپورٹ دیکھیں</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* CARD 3: Credit Outstanding (Udhar) */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-100 border-l-4 border-l-amber-500 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-amber-200/60 group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
              واجب الادا
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs font-black uppercase tracking-wider text-amber-800">
              CARD 3 • کل ادھار بقایا
            </span>
            <h3 className="text-sm font-bold text-amber-900">Credit Outstanding</h3>
            <div className="text-3xl font-black text-amber-700 font-mono mt-1">
              {formatRs(metrics.totalCreditRemainingRs)}
            </div>
            <p className="text-xs font-semibold text-amber-800 mt-2">
              مارکیٹ سے کسٹمرز سے وصول طلب رقم
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-200/60 flex justify-end">
            <Link href="/udhar-khata" className="text-xs font-black text-amber-700 hover:text-amber-900 flex items-center gap-1 group-hover:underline">
              <span>ادھار کھاتہ اور واٹس ایپ بل</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* CARD 4: Daily Expenses (Kharcha) */}
        <div className="bg-gradient-to-br from-red-50 to-pink-100 border-l-4 border-l-rose-500 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-rose-200/60 group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <Receipt className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-rose-800 bg-rose-100 px-3 py-1 rounded-full border border-rose-200">
              اخراجات
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs font-black uppercase tracking-wider text-rose-800">
              CARD 4 • روزانہ خرچہ
            </span>
            <h3 className="text-sm font-bold text-rose-900">Expenses (Rs.)</h3>
            <div className="text-3xl font-black text-rose-700 font-mono mt-1">
              {formatRs(metrics.todayExpenseRs)}
            </div>
            <p className="text-xs font-semibold text-rose-800 mt-2">
              بجلی، تنخواہ اور پمپ کے دیگر اخراجات
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-rose-200/60 flex justify-end">
            <Link href="/expenses" className="text-xs font-black text-rose-700 hover:text-rose-900 flex items-center gap-1 group-hover:underline">
              <span>نیا خرچہ شامل کریں</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* CARD 5: Estimated Net Profit */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-100 border-l-4 border-l-purple-500 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-purple-200/60 group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-purple-800 bg-purple-100 px-3 py-1 rounded-full border border-purple-200">
              Net Profit
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs font-black uppercase tracking-wider text-purple-800">
              CARD 5 • خالص منافع
            </span>
            <h3 className="text-sm font-bold text-purple-900">Estimated Net Profit</h3>
            <div className="text-3xl font-black text-purple-700 font-mono mt-1">
              {formatRs(metrics.todayEstimatedNetProfitRs)}
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-purple-800 mt-2">
              <span>تیل مارجن: <strong className="font-mono text-purple-950">{formatRs(metrics.estimatedFuelProfit)}</strong></span>
              <span>سامان نفع: <strong className="font-mono text-purple-950">{formatRs(metrics.todayProductProfitRs)}</strong></span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-purple-200/60 flex justify-end">
            <Link href="/reports" className="text-xs font-black text-purple-700 hover:text-purple-900 flex items-center gap-1 group-hover:underline">
              <span>مکمل نفع و نقصان دیکھیں</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* CARD 6: Live Tank Stock */}
        <div className="bg-gradient-to-br from-cyan-50 to-sky-100 border-l-4 border-l-cyan-500 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-cyan-200/60 group">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-full bg-cyan-200 text-cyan-700 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <Droplets className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-cyan-800 bg-cyan-100 px-3 py-1 rounded-full border border-cyan-200">
              Live Stock
            </span>
          </div>
          <div className="mt-4">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-800">
              CARD 6 • ٹینک کا موجودہ اسٹاک
            </span>
            <h3 className="text-sm font-bold text-cyan-900">Live Tank Stock</h3>
            <div className="space-y-2.5 mt-2">
              {tanks.slice(0, 2).map((t) => {
                const pct = t.capacity > 0 ? Math.min(100, Math.round((t.current_stock / t.capacity) * 100)) : 0;
                const isLow = pct < lowStockThreshold;
                return (
                  <div key={t.id}>
                    <div className="flex items-center justify-between text-xs font-bold text-cyan-950">
                      <span>{t.name}</span>
                      <span className={`font-mono ${isLow ? "text-red-600 animate-pulse font-black" : "text-cyan-800 font-bold"}`}>
                        {formatLitres(t.current_stock)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-cyan-200/60 rounded-full h-2 mt-1 overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isLow ? "bg-red-500" : pct < 40 ? "bg-amber-500" : "bg-cyan-600"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-cyan-200/60 flex justify-end">
            <Link href={`/dashboard/pump/${session?.pumpId || 1}/tanks`} className="text-xs font-black text-cyan-700 hover:text-cyan-900 flex items-center gap-1 group-hover:underline">
              <span>کسٹم ڈِپ چارٹ و ٹینک اسٹاک</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS BAR */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-md">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>فوری شارٹ کٹس (Quick Station Actions)</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Link
            href="/readings"
            className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-800 hover:text-indigo-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 text-center transition-all hover:scale-102"
          >
            <Gauge className="w-5 h-5 text-indigo-600" />
            <span>نوزل میٹر ریڈنگ</span>
          </Link>
          <Link
            href={`/dashboard/pump/${session?.pumpId || 1}/rates`}
            className="p-3 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-800 hover:text-amber-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 text-center transition-all hover:scale-102"
          >
            <TrendingUp className="w-5 h-5 text-amber-600" />
            <span>نیا ریٹ (ڈیٹ ٹائم)</span>
          </Link>
          <Link
            href={`/dashboard/pump/${session?.pumpId || 1}/reports/daily`}
            className="p-3 rounded-xl bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-slate-800 hover:text-purple-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 text-center transition-all hover:scale-102"
          >
            <Layers className="w-5 h-5 text-purple-600" />
            <span>24h ریٹ وائز رپورٹ</span>
          </Link>
          <Link
            href="/cash-loans"
            className="p-3 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-800 hover:text-rose-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 text-center transition-all hover:scale-102"
          >
            <Scale className="w-5 h-5 text-rose-600" />
            <span>کیش لون لیجر</span>
          </Link>
          <Link
            href="/nozzle-matching"
            className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-800 hover:text-emerald-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 text-center transition-all hover:scale-102"
          >
            <CheckCheck className="w-5 h-5 text-emerald-600" />
            <span>نوزل آٹو میچنگ</span>
          </Link>
          <Link
            href="/ai-detector"
            className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-800 hover:text-indigo-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 text-center transition-all hover:scale-102"
          >
            <Cpu className="w-5 h-5 text-indigo-600" />
            <span>AI لیکج ڈیٹیکٹر</span>
          </Link>
          <Link
            href="/parties"
            className="p-3 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-800 hover:text-amber-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 text-center transition-all hover:scale-102"
          >
            <CreditCard className="w-5 h-5 text-amber-600" />
            <span>پارٹی لیجر و بل</span>
          </Link>
          <Link
            href="/cash-closing"
            className="p-3 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-800 hover:text-teal-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 text-center transition-all hover:scale-102"
          >
            <Wallet className="w-5 h-5 text-teal-600" />
            <span>کیش کلوزنگ (Closing)</span>
          </Link>
          <Link
            href={`/dashboard/pump/${session?.pumpId || 1}/tanks`}
            className="p-3 rounded-xl bg-slate-50 hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 text-slate-800 hover:text-cyan-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 text-center transition-all hover:scale-102"
          >
            <Droplet className="w-5 h-5 text-cyan-600" />
            <span>کسٹم ڈِپ چارٹ</span>
          </Link>
          <Link
            href="/udhar-khata"
            className="p-3 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 text-slate-800 hover:text-orange-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 text-center transition-all hover:scale-102"
          >
            <BookOpen className="w-5 h-5 text-orange-600" />
            <span>ادھار کھاتہ (Udhar)</span>
          </Link>
          <Link
            href="/purchases"
            className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-800 hover:text-blue-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 text-center transition-all hover:scale-102"
          >
            <Truck className="w-5 h-5 text-blue-600" />
            <span>تیل خریداری (لاری)</span>
          </Link>
          <Link
            href="/employees"
            className="p-3 rounded-xl bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-300 text-slate-800 hover:text-violet-900 font-bold text-xs flex flex-col items-center justify-center gap-1.5 text-center transition-all hover:scale-102"
          >
            <Users className="w-5 h-5 text-violet-600" />
            <span>ملازمین ڈیوٹی</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
