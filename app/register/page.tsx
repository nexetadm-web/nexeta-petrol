"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Fuel, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  MapPin, 
  CreditCard, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    pumpName: "",
    ownerName: "",
    phone: "",
    email: "",
    password: "",
    city: "Lahore",
    cnic: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        pump_name: formData.pumpName,
        pumpName: formData.pumpName,
        owner_name: formData.ownerName,
        ownerName: formData.ownerName,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        city: formData.city,
        cnic: formData.cnic,
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type") || "";
      let data: any = {};

      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error("Non-JSON response from register API:", res.status, text);
        throw new Error(
          res.status === 404
            ? "سرور پر رجسٹریشن کا راستہ نہیں ملا (404 Not Found)"
            : `سرور کی طرف سے خرابی موصول ہوئی (${res.status})۔ دوبارہ کوشش کریں۔`
        );
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "رجسٹریشن میں مسئلہ پیش آیا۔ دوبارہ کوشش کریں۔");
      }

      // Successful registration & session created
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "رجسٹریشن میں مسئلہ پیش آیا۔");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-800">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center px-4 relative z-10">
        <Link href="/" className="inline-flex items-center gap-3 mb-4 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 flex items-center justify-center font-black text-slate-900 text-2xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            ⛽
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            NEXETA PETROL <span className="text-amber-400">SAAS</span>
          </span>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          اپنا نیا پٹرول پمپ رجسٹر کریں
        </h2>
        <p className="mt-2 text-sm text-indigo-200">
          14 دن کا مفت مکمل ٹرائل • 2 منٹ میں سیٹ اپ • کوئی کارڈ درکار نہیں
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 relative z-10">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-white/20">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-700 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Pump Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                پٹرول پمپ کا نام (Station / Pump Name) *
              </label>
              <div className="relative">
                <Building2 className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="pumpName"
                  required
                  placeholder="مثال: المدینہ پٹرولیم سروس"
                  value={formData.pumpName}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                />
              </div>
            </div>

            {/* Owner Name & City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  مالک کا نام (Owner Name) *
                </label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="ownerName"
                    required
                    placeholder="ملک نوید صاحب"
                    value={formData.ownerName}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  شہر (City) *
                </label>
                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium bg-white"
                  >
                    <option value="Lahore">Lahore (لاہور)</option>
                    <option value="Karachi">Karachi (کراچی)</option>
                    <option value="Islamabad">Islamabad (اسلام آباد)</option>
                    <option value="Rawalpindi">Rawalpindi (راولپنڈی)</option>
                    <option value="Faisalabad">Faisalabad (فیصل آباد)</option>
                    <option value="Multan">Multan (ملتان)</option>
                    <option value="Gujranwala">Gujranwala (گوجرانوالہ)</option>
                    <option value="Peshawar">Peshawar (پشاور)</option>
                    <option value="Quetta">Quetta (کوئٹہ)</option>
                    <option value="Sargodha">Sargodha (سرگودھا)</option>
                    <option value="Sialkot">Sialkot (سیالکوٹ)</option>
                    <option value="Bahawalpur">Bahawalpur (بہاولپور)</option>
                    <option value="Other">Other (دیگر شہر)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Phone & CNIC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  موبائل / واٹس ایپ نمبر (Phone) *
                </label>
                <div className="relative">
                  <Phone className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="phone"
                    required
                    placeholder="0300-1234567"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  شناختی کارڈ (CNIC اختیاری)
                </label>
                <div className="relative">
                  <CreditCard className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="cnic"
                    placeholder="35201-XXXXXXX-X"
                    value={formData.cnic}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Email & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  ای میل (Email Login) *
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="pump@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  پاس ورڈ (Password) *
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    placeholder="کم از کم 6 ہندسے"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Trial Feature Highlights */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
              <span className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                14 دن مفت ٹرائل شامل ہے
              </span>
              <span className="text-slate-500">بعد میں صرف Rs. 3,000 / ماہانہ</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-white font-bold bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 text-base"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>اکاؤنٹ بن رہا ہے...</span>
                </>
              ) : (
                <>
                  <span>نیا پٹرول پمپ بنائیں (Start Free 14-Day Trial)</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-600 font-medium">
              پہلے سے اکاؤنٹ موجود ہے؟{" "}
              <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline">
                یہاں لاگ ان کریں (Sign In)
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
