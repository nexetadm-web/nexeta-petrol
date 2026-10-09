"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Fuel, 
  Coins, 
  BookOpen, 
  Receipt, 
  TrendingUp, 
  Droplets, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  MessageCircle, 
  Clock, 
  Users, 
  Smartphone,
  Server,
  Zap,
  PhoneCall
} from "lucide-react";

export default function SaaSMarketingLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-indigo-600 selection:text-white">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white text-xs py-2 px-4 text-center font-bold shadow-xs">
        <span>🇵🇰 پاکستان بھر کے 100+ پٹرول پمپس کے لیے قابل اعتماد SaaS سسٹم — 14 دن کا مفت ٹرائل حاصل کریں!</span>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-black shadow-xs border border-indigo-200">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>نیکسیٹا پیٹرول پمپ مینیجر • Nexeta Petrol Pump SaaS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-tight">
            اپنے پٹرول پمپ کا پورا حساب کتاب اب <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">انگلیوں پر خودکار</span> کریں
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
            روزانہ نوزل میٹر ریڈنگ، ٹینک فزیکل ڈپ کھاتہ، ادھار پارٹی لیجر بمعہ واٹس ایپ ریمائنڈرز، شفٹ کیش کلوزنگ اور ملازمین کی ڈیوٹی — سب کچھ ایک جگہ۔
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-600 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/25 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <span>14 دن کا مفت ٹرائل شروع کریں (Register Station)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login?demo=true"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm shadow-md border border-slate-300 transition-all hover:scale-102 active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>🎮 ایک کلک لائیو ڈیمو دیکھیں (Live Demo)</span>
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto px-5 py-4 rounded-2xl text-indigo-600 hover:text-indigo-800 font-bold text-sm transition-colors text-center"
            >
              لاگ ان (Sign In)
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-slate-500 font-semibold pt-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              14 دن مفت
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              کوئی کریڈٹ کارڈ درکار نہیں
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              فوری ایکٹیویشن
            </span>
          </div>
        </div>

        {/* Dashboard Preview Banner */}
        <div className="mt-12 rounded-3xl p-3 bg-gradient-to-b from-indigo-500/20 via-purple-500/10 to-transparent border border-slate-200/80 shadow-2xl max-w-5xl mx-auto">
          <div className="rounded-2xl overflow-hidden border border-slate-300 shadow-lg bg-white relative">
            <img
              src="/dashboard-screenshot.jpg"
              alt="Nexeta Petrol Dashboard Preview"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </section>

      {/* 6 Cards Architecture Section */}
      <section className="py-16 bg-white border-y border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600">
              6 CARDS ARCHITECTURE
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900">
              مکمل شفافیت اور 6 کارڈز کا لائیو کنٹرول سسٹم
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              پٹرول پمپ کے ہر قطرے اور ہر روپے کا خودکار ریکارڈ روزانہ کی بنیاد پر
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-emerald-50/70 border-l-4 border-l-emerald-500 border border-emerald-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                <Fuel className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-emerald-950">1. فیول فروخت (Nozzle Readings)</h3>
              <p className="text-xs text-emerald-900/80 leading-relaxed font-medium">
                24 گھنٹے ٹائم بیسڈ یا صبح/شام نوزل میٹر ریڈنگز۔ پٹرول، ڈیزل اور ہائی اوکٹین کی سیل اور لٹرز خودکار طور پر رجسٹر ہوتے ہیں۔
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-blue-50/70 border-l-4 border-l-indigo-500 border border-indigo-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
                <Coins className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-indigo-950">2. کل ریونیو (Fuel + Goods)</h3>
              <p className="text-xs text-indigo-900/80 leading-relaxed font-medium">
                فیول سیل کے ساتھ موبل آئل، فلٹرز اور دیگر سامان کی فروخت کو ملا کر روزانہ کی مجموعی آمدنی کا مکمل حساب کتاب۔
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-amber-50/70 border-l-4 border-l-amber-500 border border-amber-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-700 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-amber-950">3. ادھار کھاتہ اور واٹس ایپ</h3>
              <p className="text-xs text-amber-900/80 leading-relaxed font-medium">
                ٹرانسپورٹ کمپنیوں، گاڑیوں اور کسانوں کا ادھار لیجر۔ ایک کلک پر بقایا رقم کا واٹس ایپ بل اور میسج ریمائنڈر۔
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-rose-50/70 border-l-4 border-l-rose-500 border border-rose-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-200 text-rose-700 flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-rose-950">4. روزانہ پمپ اخراجات (Kharcha)</h3>
              <p className="text-xs text-rose-900/80 leading-relaxed font-medium">
                بجلی کے بل، جنریٹر کا ڈیزل، عملے کا کھانا چائے، اور مینٹیننس کا الگ الگ ریکارڈ تاکہ کوئی خرچہ غائب نہ ہو۔
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-purple-50/70 border-l-4 border-l-purple-500 border border-purple-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-200 text-purple-700 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-purple-950">5. خالص منافع (Net Profit)</h3>
              <p className="text-xs text-purple-900/80 leading-relaxed font-medium">
                ڈیلر مارجن فی لٹر، سامان کی فروخت کا نفع منفی اخراجات۔ پمپ مالک کو معلوم ہوتا ہے کہ آج خالص کتنی بچت ہوئی۔
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-cyan-50/70 border-l-4 border-l-cyan-500 border border-cyan-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-200 text-cyan-700 flex items-center justify-center font-bold">
                <Droplets className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-cyan-950">6. لائیو ٹینک اسٹاک و ڈپ کیلیبریشن</h3>
              <p className="text-xs text-cyan-900/80 leading-relaxed font-medium">
                ڈپ پیمائش سے لٹرز خودکار کیلیبریشن۔ ٹینک اسٹاک بنام رجسٹر اسٹاک اور نفع/کمی (Gain/Loss) کا خودکار آڈٹ۔
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-black uppercase tracking-wider text-indigo-600">
            SIMPLE AFFORDABLE PRICING
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
            ہر پٹرول پمپ کے لیے آسان اور شفاف قیمت
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            کوئی خفیہ چارجز نہیں، کوئی سیٹ اپ فیس نہیں — صرف کام کا بہترین سافٹ ویئر
          </p>
        </div>

        <div className="max-w-md mx-auto rounded-3xl bg-white border-2 border-indigo-500 shadow-2xl overflow-hidden p-8 relative">
          <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-bl-xl tracking-wider">
            Most Popular
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-black text-slate-900">Nexeta Station SaaS Plan</h3>
            <p className="text-xs text-slate-500 font-medium">
              مکمل آٹومیشن پیکیج ایک پٹرول پمپ اسٹیشن کے لیے
            </p>

            <div className="flex items-baseline gap-2 pt-2">
              <span className="text-4xl sm:text-5xl font-black text-indigo-900 font-mono">Rs. 3,000</span>
              <span className="text-sm text-slate-500 font-bold">/ ماہانہ (Per Month)</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>پہلے 14 دن مکمل مفت ٹرائل (14 Days Free Trial)</span>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 text-xs font-medium text-slate-700">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>لامحدود نوزلز اور ٹینکس (Unlimited Nozzles & Tanks)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>24-Hour ٹائم بیسڈ ریڈنگز اور شفٹ کیش کلوزنگ</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>ادھار پارٹی کھاتہ اور ایک کلک واٹس ایپ ریمائنڈرز</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>روزانہ ٹینک فزیکل ڈپ اور کیلیبریشن چارٹ (Gain/Loss)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>ملازمین ڈیوٹی روسٹر، تنخواہیں اور حاضری</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>پی ڈی ایف آڈٹ رپورٹس اور کیش پرنٹ رسیدیں</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>بینک گریڈ کلاؤڈ ڈیٹا سیکیورٹی (Turso LibSQL)</span>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href="/register"
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-102"
              >
                <span>ابھی رجسٹر کریں (Start Free Trial)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-600 text-white font-black text-base">
              N
            </span>
            <div>
              <div className="text-white font-black text-base">NEXETA PETROL PUMP SAAS</div>
              <div className="text-[11px] text-slate-500">Automated Fuel Station Cloud Platform • Pakistan</div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold">
            <Link href="/login" className="hover:text-white transition-colors">لاگ ان</Link>
            <Link href="/register" className="hover:text-white transition-colors">رجسٹر کریں</Link>
            <Link href="/super-admin/login" className="hover:text-amber-400 transition-colors">سوپر ایڈمن پورٹل</Link>
            <a
              href="https://wa.me/923400072030"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>+92 340 0072030</span>
            </a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-800/80 text-center text-slate-500 text-[11px]">
          Developed by <strong>Naveed Bhatti</strong> • Nexeta Technologies • All Rights Reserved © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
