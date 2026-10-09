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
  AlertTriangle
} from "lucide-react";
import { RateBanner } from "@/components/RateBanner";
import { formatRs, formatLitres, getTodayDatePK, formatDate } from "@/lib/formatters";
import { Tank, DailyRate } from "@/lib/types";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [todayDateStr, setTodayDateStr] = useState("");
  const [todayRate, setTodayRate] = useState<DailyRate | null>(null);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(20);
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
      const today = getTodayDatePK(); // DD-MM-YYYY
      setTodayDateStr(today);
      const [resDash, resSettings] = await Promise.all([
        fetch(`/api/dashboard?date=${today}`),
        fetch("/api/settings"),
      ]);

      const data = await resDash.json();
      const dataSettings = await resSettings.json();

      if (dataSettings.settings?.low_stock_threshold) {
        setLowStockThreshold(Number(dataSettings.settings.low_stock_threshold) || 20);
      }

      if (data.success) {
        setMetrics(data.metrics);
        setTanks(data.tanks || []);
        setTodayRate(data.todayRate || null);
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

  // Calculate tanks with low stock (< threshold %)
  const lowStockTanks = tanks.filter((t) => {
    if (!t.capacity || t.capacity <= 0) return false;
    const pct = (t.current_stock / t.capacity) * 100;
    return pct < lowStockThreshold;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title & Quick Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <span>ڈیش بورڈ</span>
            <span className="text-slate-400 font-normal text-xl sm:text-2xl">| Main Dashboard</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Nexeta Petrol Pump Automation • ریئل ٹائم مانیٹرنگ اور خودکار حساب کتاب • تاریخ: {todayDateStr || getTodayDatePK()}
          </p>
        </div>

        <button
          onClick={() => {
            setLoading(true);
            fetchDashboardData();
          }}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-indigo-600 hover:border-indigo-300 shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          <span>ریفریش (Refresh)</span>
        </button>
      </div>

      {/* TOP LOW STOCK ALERT BANNERS (Red Alert as requested) */}
      {lowStockTanks.length > 0 && (
        <div className="space-y-3">
          {lowStockTanks.map((tank) => {
            const pct = Math.round((tank.current_stock / tank.capacity) * 100);
            return (
              <div
                key={tank.id}
                className="p-4 sm:p-5 rounded-2xl bg-red-50 border-2 border-red-500 text-red-950 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-red-200 text-red-800 flex items-center justify-center font-black text-xl shrink-0 shadow-xs animate-bounce">
                    ⚠️
                  </div>
                  <div>
                    <div className="font-black text-sm sm:text-base text-red-900 flex items-center gap-2 flex-wrap">
                      <span>الرٹ:</span>
                      <span className="underline decoration-red-400 decoration-2">{tank.name}</span>
                      <span>میں صرف</span>
                      <span className="font-mono font-black text-red-950 text-base">{formatLitres(tank.current_stock)}</span>
                      <span>باقی ({pct}%)، فوری لاری / ٹینکر آرڈر کریں!</span>
                    </div>
                    <div className="text-xs text-red-700 font-medium mt-1">
                      ٹینک کی کل گنجائش {formatLitres(tank.capacity)} ہے اور موجودہ اسٹاک مقررہ حد ({lowStockThreshold}%) سے خطرناک حد تک نیچے ہے۔
                    </div>
                  </div>
                </div>

                <Link
                  href="/purchases"
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md transition-all self-start sm:self-auto hover:scale-102"
                >
                  <Truck className="w-4 h-4" />
                  <span>ٹینکر خریداری درج کریں (Add Tanker) →</span>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* TOP BANNER 'Aaj Ka Rate Set Karain' with Warning if not set */}
      <RateBanner
        initialRate={todayRate}
        todayDateStr={todayDateStr || getTodayDatePK()}
        onRatesUpdated={fetchDashboardData}
      />

      {/* 6 COLORFUL DASHBOARD CARDS (School SaaS Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* CARD 1: Aaj Ki Fuel Sale Litre - EMERALD GRADIENT */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-teal-100 rounded-2xl p-6 border-l-4 border-emerald-500 border border-emerald-200/70 shadow-lg hover:shadow-xl transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-200 text-emerald-800 flex items-center justify-center shadow-sm">
                <Fuel className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block">
                  Card 1 • فیول فروخت
                </span>
                <span className="text-xs text-emerald-900/70 font-semibold">Fuel Sale (Litres)</span>
              </div>
            </div>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-white/90 border border-emerald-300 text-emerald-800 shadow-sm">
              آج کا دن
            </span>
          </div>

          <div className="mt-4">
            <div className="text-3xl font-black text-emerald-950 font-mono tracking-tight">
              {formatLitres(metrics.todayFuelLitres)}
            </div>
            <div className="text-xs text-emerald-900 mt-2 flex items-center gap-1 font-bold">
              <span>آمدنی:</span>
              <span className="text-emerald-800 font-extrabold font-mono text-sm">{formatRs(metrics.todayFuelSaleRs)}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs">
            <Link href="/readings" className="text-emerald-800 hover:text-emerald-950 flex items-center gap-1 font-bold">
              <span>نوزل میٹر ریڈنگ دیکھیں</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* CARD 2: Aaj Ki Total Sale Rs - BLUE TO INDIGO GRADIENT */}
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 rounded-2xl p-6 border-l-4 border-blue-500 border border-blue-200/70 shadow-lg hover:shadow-xl transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-200 text-blue-800 flex items-center justify-center shadow-sm">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-800 block">
                  Card 2 • کل فروخت کیش
                </span>
                <span className="text-xs text-blue-900/70 font-semibold">Total Revenue (Rs.)</span>
              </div>
            </div>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-white/90 border border-blue-300 text-blue-800 shadow-sm">
              Fuel + Goods
            </span>
          </div>

          <div className="mt-4">
            <div className="text-3xl font-black text-blue-950 font-mono tracking-tight">
              {formatRs(metrics.todayTotalSaleRs)}
            </div>
            <div className="text-xs text-blue-900 mt-2 flex items-center justify-between font-bold">
              <span>تیل: {formatRs(metrics.todayFuelSaleRs)}</span>
              <span>سامان: {formatRs(metrics.todayProductSaleRs)}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-blue-200/60 flex items-center justify-between text-xs">
            <Link href="/reports" className="text-blue-800 hover:text-blue-950 flex items-center gap-1 font-bold">
              <span>مکمل رپورٹ دیکھیں</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* CARD 3: Kul Udhar Baqi Rs - ORANGE TO AMBER GRADIENT */}
        <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-amber-100 rounded-2xl p-6 border-l-4 border-amber-500 border border-amber-200/70 shadow-lg hover:shadow-xl transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-200 text-amber-800 flex items-center justify-center shadow-sm">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 block">
                  Card 3 • کل ادھار بقایا
                </span>
                <span className="text-xs text-amber-900/70 font-semibold">Credit Outstanding</span>
              </div>
            </div>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-white/90 border border-amber-300 text-amber-800 shadow-sm">
              واجب الادا
            </span>
          </div>

          <div className="mt-4">
            <div className="text-3xl font-black text-amber-950 font-mono tracking-tight">
              {formatRs(metrics.totalCreditRemainingRs)}
            </div>
            <div className="text-xs text-amber-900 mt-2 font-bold">
              مارکیٹ سے کسٹمرز سے وصول طلب رقم
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between text-xs">
            <Link href="/khata" className="text-amber-800 hover:text-amber-950 flex items-center gap-1 font-bold">
              <span>ادھار کھاتہ اور واٹس ایپ بل</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* CARD 4: Aaj Ka Kharcha Rs - RED TO PINK GRADIENT */}
        <div className="bg-gradient-to-br from-rose-50 via-red-50 to-pink-100 rounded-2xl p-6 border-l-4 border-rose-500 border border-rose-200/70 shadow-lg hover:shadow-xl transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-200 text-rose-800 flex items-center justify-center shadow-sm">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-800 block">
                  Card 4 • روزانہ خرچہ
                </span>
                <span className="text-xs text-rose-900/70 font-semibold">Expenses (Rs.)</span>
              </div>
            </div>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-white/90 border border-rose-300 text-rose-800 shadow-sm">
              اخراجات
            </span>
          </div>

          <div className="mt-4">
            <div className="text-3xl font-black text-rose-950 font-mono tracking-tight">
              {formatRs(metrics.todayExpenseRs)}
            </div>
            <div className="text-xs text-rose-900 mt-2 font-bold">
              بجلی، تنخواہ اور پمپ کے دیگر اخراجات
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-rose-200/60 flex items-center justify-between text-xs">
            <Link href="/expenses" className="text-rose-800 hover:text-rose-950 flex items-center gap-1 font-bold">
              <span>نیا خرچہ شامل کریں</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* CARD 5: Aaj Ka Net Profit Rs - PURPLE TO VIOLET GRADIENT */}
        <div className="bg-gradient-to-br from-purple-50 via-violet-50 to-violet-100 rounded-2xl p-6 border-l-4 border-purple-500 border border-purple-200/70 shadow-lg hover:shadow-xl transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-200 text-purple-800 flex items-center justify-center shadow-sm">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-800 block">
                  Card 5 • خالص منافع
                </span>
                <span className="text-xs text-purple-900/70 font-semibold">Estimated Net Profit</span>
              </div>
            </div>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-white/90 border border-purple-300 text-purple-800 shadow-sm">
              Net Profit
            </span>
          </div>

          <div className="mt-4">
            <div
              className={`text-3xl font-black font-mono tracking-tight ${
                metrics.todayEstimatedNetProfitRs >= 0 ? "text-purple-950" : "text-rose-950"
              }`}
            >
              {formatRs(metrics.todayEstimatedNetProfitRs)}
            </div>
            <div className="text-xs text-purple-900 mt-2 flex items-center justify-between font-bold">
              <span>تیل مارجن: {formatRs(metrics.estimatedFuelProfit)}</span>
              <span>سامان نفع: {formatRs(metrics.todayProductProfitRs)}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-200/60 flex items-center justify-between text-xs">
            <Link href="/reports" className="text-purple-800 hover:text-purple-950 flex items-center gap-1 font-bold">
              <span>مکمل نفع و نقصان دیکھیں</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* CARD 6: Tank Stock - CYAN TO SKY GRADIENT */}
        <div className="bg-gradient-to-br from-cyan-50 via-sky-50 to-sky-100 rounded-2xl p-6 border-l-4 border-cyan-500 border border-cyan-200/70 shadow-lg hover:shadow-xl transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-200 text-cyan-800 flex items-center justify-center shadow-sm">
                <Droplet className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-cyan-800 block">
                  Card 6 • ٹینک کا موجودہ اسٹاک
                </span>
                <span className="text-xs text-cyan-900/70 font-semibold">Live Tank Stock</span>
              </div>
            </div>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-white/90 border border-cyan-300 text-cyan-800 shadow-sm">
              Live Stock
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            {tanks.length === 0 ? (
              <div className="text-xs text-cyan-800/70 py-2">کوئی ٹینک سیٹ نہیں ہے۔ سیٹنگ میں شامل کریں۔</div>
            ) : (
              tanks.slice(0, 3).map((tank) => {
                const pct = Math.min(100, Math.round((tank.current_stock / tank.capacity) * 100));
                return (
                  <div key={tank.id} className="p-2.5 rounded-xl bg-white/80 border border-cyan-200/80 shadow-xs">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-800">
                        {tank.name.split("(")[0]}
                      </span>
                      <span className="font-mono font-black text-slate-900">
                        {formatLitres(tank.current_stock)}
                        <span className="text-[10px] text-cyan-800 font-bold ml-1">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          tank.fuel_type === "Diesel"
                            ? "bg-amber-500"
                            : tank.fuel_type === "HiOctane"
                            ? "bg-pink-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-cyan-200/60 flex items-center justify-between text-xs">
            <Link href="/tank-khata" className="text-cyan-800 hover:text-cyan-950 flex items-center gap-1 font-bold">
              <span>روزانہ ٹینک کھاتہ (Dip)</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS BAR (School SaaS Style) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md">
        <div className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3.5 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Quick Actions • فوری کارروائی کے بٹن</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <Link
            href="/cash-closing"
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-violet-50/80 hover:bg-violet-100/90 border border-violet-200 hover:border-violet-400 group transition-all text-center shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-200 text-violet-800 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-black text-violet-950">Cash Closing</span>
            <span className="text-[10px] text-violet-700 font-bold">شفت ہینڈ اوور</span>
          </Link>

          <Link
            href="/readings"
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 group transition-all text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
              <Gauge className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Nozzle Reading</span>
            <span className="text-[10px] text-slate-500">میٹر ریڈنگ</span>
          </Link>

          <Link
            href="/tank-khata"
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-50 hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 group transition-all text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
              <Droplets className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Tank Khata</span>
            <span className="text-[10px] text-slate-500">روزانہ ٹینک کھاتہ و ڈپ</span>
          </Link>

          <Link
            href="/employees"
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 group transition-all text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Employee Duty</span>
            <span className="text-[10px] text-slate-500">ڈیوٹی و تنخواہ</span>
          </Link>

          <Link
            href="/khata"
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 group transition-all text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Udhar / Khata</span>
            <span className="text-[10px] text-slate-500">ادھار و واٹس ایپ</span>
          </Link>

          <Link
            href="/expenses"
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 group transition-all text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Add Kharcha</span>
            <span className="text-[10px] text-slate-500">روزانہ خرچہ</span>
          </Link>

          <Link
            href="/purchases"
            className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 group transition-all text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-900">Fuel Purchase</span>
            <span className="text-[10px] text-slate-500">گاڑی ٹینکر خرید</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
