"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  CreditCard, 
  Phone, 
  MessageCircle, 
  LogOut, 
  ArrowLeft,
  Sparkles,
  Building2,
  Clock,
  Fuel,
  RefreshCw
} from "lucide-react";
import { formatPKDate } from "@/lib/formatters";

export default function BillingPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.session) {
          setSession(data.session);
        }
      })
      .catch((err) => console.error("Error fetching session:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const isExpired = session?.subscriptionStatus === "expired";
  const isActive = session?.subscriptionStatus === "active";
  const isTrial = session?.subscriptionStatus === "trial";
  const isPaused = session?.subscriptionStatus === "paused";

  const whatsappMessage = encodeURIComponent(
    `السلام علیکم نوید صاحب! میں نے Nexeta Petrol SaaS کی فیس ادا کر دی ہے۔ براہ کرم میرا اکاؤنٹ چیک کریں۔\n\nپٹرول پمپ: ${session?.pumpName || "میرا پٹرول پمپ"}\nشہر: ${session?.city || ""}\nای میل: ${session?.email || ""}`
  );

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full text-slate-800 space-y-6">
      {/* 1. Small Top Notice if Expired (No screen block, just a clean message) */}
      {isExpired && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs sm:text-sm font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
            <span>Aapka plan expire hai, payment ke liye Super Admin se rabta karein (آپ کا پلان ایکسپائر ہے، ادائیگی کے لیے سپر ایڈمن سے رابطہ کریں)</span>
          </div>
          <a
            href={`https://wa.me/923400072030?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 transition-colors shadow-xs"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-white" />
            <span>واٹس ایپ رابطہ</span>
          </a>
        </div>
      )}

      {/* 2. Station & Subscription Status Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-2xl shadow-xs">
              ⛽
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {session?.pumpName || "Nexeta Petrol Station"}
                </h1>
                {/* Status Badges */}
                {isActive && (
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs">
                    ✓ Active (فعال)
                  </span>
                )}
                {isTrial && (
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-extrabold text-xs">
                    🎁 14-Day Free Trial (ٹرائل)
                  </span>
                )}
                {isExpired && (
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-extrabold text-xs">
                    ⚠️ Expired (پلان ختم)
                  </span>
                )}
                {isPaused && (
                  <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-extrabold text-xs">
                    ⛔ Paused (روک دیا گیا)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                شہر: <strong className="text-slate-700">{session?.city || "Pakistan"}</strong> • ای میل: <span className="font-mono">{session?.email || "-"}</span>
                {session?.trialEndsAt && (
                  <span> • آخری تاریخ: <strong className="text-slate-700 font-mono">{formatPKDate(session.trialEndsAt)}</strong></span>
                )}
              </p>
            </div>
          </div>

          {/* Go to Dashboard Button (User can always navigate & continue software usage) */}
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Fuel className="w-4 h-4" />
            <span>ڈیش بورڈ پر جائیں (Go to Dashboard)</span>
          </Link>
        </div>

        {/* Info Note: Software works 100% */}
        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
          <span>نوزل ریڈنگ، ادھار کھاتہ، یومیہ سیلز اور کیش کلوزنگ تمام فیچرز مکمل فعال ہیں۔</span>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            <span>اسٹیٹس ریفریش</span>
          </button>
        </div>
      </div>

      {/* 3. Pricing Plan & Bank Details */}
      <div className="bg-white rounded-3xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Official Monthly Plan • پٹرول پمپ سبسکرپشن
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-1">
              Nexeta Petrol Unlimited
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تمام ٹینک، تمام نوزلز، واٹس ایپ ادھار یاد دہانی اور کیش کلوزنگ
            </p>
          </div>
          <div className="sm:text-right">
            <div className="text-3xl font-black text-indigo-700 font-mono">
              Rs. 3,000 <span className="text-sm font-semibold text-slate-500">/ ماہانہ</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-block mt-1">
              کوئی اضافی چارجز نہیں
            </span>
          </div>
        </div>

        {/* Payment Methods */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <span>فیس جمع کروانے کے طریقے (Payment Accounts)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* JazzCash */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
              <div className="text-xs font-bold text-amber-800 uppercase">JazzCash</div>
              <div className="text-lg font-black text-slate-900 font-mono mt-1 select-all">
                0340-0072030
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                عنوان: <strong>Naveed Bhatti</strong>
              </div>
            </div>

            {/* EasyPaisa */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <div className="text-xs font-bold text-emerald-800 uppercase">EasyPaisa</div>
              <div className="text-lg font-black text-slate-900 font-mono mt-1 select-all">
                0340-0072030
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                عنوان: <strong>Naveed Bhatti</strong>
              </div>
            </div>

            {/* Bank Transfer */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 sm:col-span-2">
              <div className="text-xs font-bold text-indigo-800 uppercase">Bank Transfer (بینک اکاؤنٹ)</div>
              <div className="text-sm font-bold text-slate-900 mt-1 select-all">
                Bank Alfalah / Meezan Bank | A/C: 0123-1002345678
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Account Title: <strong>Nexeta Technologies / Naveed Bhatti</strong>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Activation Button */}
        <div className="pt-2">
          <a
            href={`https://wa.me/923400072030?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <MessageCircle className="w-5 h-5 fill-white" />
            <span>واٹس ایپ پر ادائیگی کی رسید بھیجیں اور کنفرم کروائیں</span>
          </a>
          <p className="text-center text-xs text-slate-500 mt-2">
            رسید ملتے ہی سپر ایڈمن آپ کا اکاؤنٹ فوری طور پر ری نیو کر دے گا۔
          </p>
        </div>

        {/* Bottom Actions: Re-check or Logout */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => window.location.reload()}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 py-2 px-3 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            🔄 ریفریش کر کے اسٹیٹس چیک کریں
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 py-2 px-3 rounded-xl hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>لاگ آؤٹ کریں (Sign Out)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
