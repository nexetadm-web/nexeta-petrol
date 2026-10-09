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
  Building2
} from "lucide-react";

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

  const whatsappMessage = encodeURIComponent(
    `السلام علیکم نوید صاحب! میں نے Nexeta Petrol SaaS کی فیس ادا کر دی ہے۔ براہ کرم میرا اکاؤنٹ فورا ایکٹیو کر دیں۔\n\nپٹرول پمپ: ${session?.pumpName || "میرا پٹرول پمپ"}\nای میل: ${session?.email || ""}\nفون: ${session?.phone || ""}`
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-800">
      <div className="max-w-2xl mx-auto w-full">
        {/* Top Notice */}
        <div className="bg-amber-500 text-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-amber-500/10 mb-8 border border-amber-400">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-2xl shrink-0">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-2">
                Subscription Status: Expired • پلان ختم
              </span>
              <h1 className="text-xl sm:text-2xl font-black leading-snug">
                آپ کے پٹرول پمپ کا ٹرائل یا ماہانہ سبسکرپشن پلان ختم ہو چکا ہے
              </h1>
              <p className="mt-2 text-sm text-amber-100 font-medium leading-relaxed">
                اسٹیشن: <strong className="text-white">{session?.pumpName || "Nexeta Petrol"}</strong> ({session?.city || "Pakistan"})
                <br />
                اپنے پٹرول پمپ کا کھاتہ، نوزل میٹر اور یومیہ کیش کلوزنگ جاری رکھنے کے لیے ماہانہ فیس ادا کریں۔
              </p>
            </div>
          </div>
        </div>

        {/* Pricing & Bank Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Offical Monthly Plan • پٹرول پمپ سبسکرپشن
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">
                Nexeta Petrol Unlimited
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تمام ٹینک، تمام نوزلز، واٹس ایپ ادھار یاد دہانی اور کیش کلوزنگ
              </p>
            </div>
            <div className="text-right">
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
              فیس جمع کروانے کے طریقے (Payment Accounts)
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
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <MessageCircle className="w-5 h-5 fill-white" />
              <span>واٹس ایپ پر ادائیگی کی رسید بھیجیں اور فورا ایکٹیو کروائیں</span>
            </a>
            <p className="text-center text-xs text-slate-500 mt-2">
              رسید ملتے ہی 5 منٹ کے اندر آپ کا اکاؤنٹ 30 دن کے لیے ری نیو کر دیا جائے گا۔
            </p>
          </div>

          {/* Actions: Re-check or Logout */}
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
    </div>
  );
}
