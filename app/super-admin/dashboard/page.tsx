"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Building2, 
  Users, 
  CreditCard, 
  Calendar, 
  ExternalLink, 
  Clock, 
  Ban, 
  CheckCircle2, 
  AlertTriangle, 
  LogOut, 
  Search,
  PlusCircle,
  TrendingUp,
  RefreshCw,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import { formatPKDate } from "@/lib/formatters";

interface PumpItem {
  id: number;
  pump_name: string;
  owner_name: string;
  phone: string;
  email: string;
  city: string;
  cnic: string;
  subscription_status: string;
  trial_ends_at: string;
  created_at: string;
}

interface Stats {
  totalPumps: number;
  activePumps: number;
  trialPumps: number;
  expiredPumps: number;
  totalMonthlyRevenue: number;
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [pumps, setPumps] = useState<PumpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchPumps = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/pumps");
      if (res.status === 401) {
        router.push("/super-admin/login");
        return;
      }
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setPumps(data.pumps || []);
      }
    } catch (err) {
      console.error("Failed to load super admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPumps();
  }, []);

  const handleAction = async (action: "extend" | "block" | "unblock" | "impersonate", pumpId: number) => {
    setActionLoadingId(pumpId);
    try {
      const res = await fetch("/api/super-admin/pumps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, pumpId }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "کارروائی مکمل نہ ہو سکی۔");
        return;
      }

      if (action === "impersonate") {
        // Redirect to pump dashboard as impersonated owner
        window.location.href = "/dashboard";
        return;
      }

      // Refresh list
      await fetchPumps();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/super-admin/logout", { method: "POST" });
    router.push("/super-admin/login");
  };

  const filteredPumps = pumps.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.pump_name?.toLowerCase().includes(q) ||
      p.owner_name?.toLowerCase().includes(q) ||
      p.phone?.includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white leading-tight">
              Nexeta Super Admin Control
            </h1>
            <p className="text-xs text-slate-400">
              ملک بھر کے تمام رجسٹرڈ پٹرول پمپس کا مرکزی ڈیش بورڈ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPumps}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-bold border border-rose-500/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>لاگ آؤٹ</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* KPI Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Pumps */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
              <span>Total Pumps</span>
              <Building2 className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-white font-mono">
                {stats?.totalPumps ?? 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">کل پٹرول پمپس</div>
            </div>
          </div>

          {/* Card 2: Active Subscriptions */}
          <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-900/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-bold uppercase">
              <span>Active Paid</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-emerald-400 font-mono">
                {stats?.activePumps ?? 0}
              </div>
              <div className="text-[11px] text-emerald-300/80 mt-0.5">فعال ادا شدہ پمپس</div>
            </div>
          </div>

          {/* Card 3: Free Trials */}
          <div className="p-5 rounded-2xl bg-blue-950/40 border border-blue-900/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-400 text-xs font-bold uppercase">
              <span>In Free Trial</span>
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-blue-400 font-mono">
                {stats?.trialPumps ?? 0}
              </div>
              <div className="text-[11px] text-blue-300/80 mt-0.5">14 روزہ ٹرائل پر</div>
            </div>
          </div>

          {/* Card 4: Expired / Blocked */}
          <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-900/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-400 text-xs font-bold uppercase">
              <span>Expired / Blocked</span>
              <Ban className="w-5 h-5 text-rose-400" />
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-rose-400 font-mono">
                {stats?.expiredPumps ?? 0}
              </div>
              <div className="text-[11px] text-rose-300/80 mt-0.5">معطل یا ختم شدہ</div>
            </div>
          </div>

          {/* Card 5: Estimated SaaS Monthly Revenue */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900/60 to-purple-900/60 border border-indigo-700/50 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-indigo-300 text-xs font-bold uppercase">
              <span>Monthly SaaS MRR</span>
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white font-mono">
                Rs. {(stats?.totalMonthlyRevenue ?? 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-indigo-200 mt-0.5">@ Rs. 3,000 / ماہانہ</div>
            </div>
          </div>
        </div>

        {/* Pumps Management Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white">تمام پٹرول پمپس کی فہرست (Registered Stations)</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                سبسکرپشن میں 30 دن کا اضافہ کریں، اکاؤنٹ بلاک/بحال کریں یا خود لاگ ان کر کے چیک کریں
              </p>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="تلاش: نام، فون، شہر یا ای میل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">ID & نام پٹرول پمپ</th>
                  <th className="py-3 px-4 font-bold">مالک و رابطہ</th>
                  <th className="py-3 px-4 font-bold">شہر</th>
                  <th className="py-3 px-4 font-bold">اسٹیٹس</th>
                  <th className="py-3 px-4 font-bold">ٹرائل / آخری تاریخ</th>
                  <th className="py-3 px-4 font-bold text-right">انتظامی اختیارات (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredPumps.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      {loading ? "لوڈ ہو رہا ہے..." : "کوئی پٹرول پمپ نہیں ملا۔"}
                    </td>
                  </tr>
                ) : (
                  filteredPumps.map((pump) => {
                    const isBusy = actionLoadingId === pump.id;
                    const isExpired = pump.subscription_status === "expired";
                    const isTrial = pump.subscription_status === "trial";
                    const isActive = pump.subscription_status === "active";

                    return (
                      <tr key={pump.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* Pump Info */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-sm">{pump.pump_name}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-indigo-400">#{pump.id}</span>
                            <span>•</span>
                            <span className="font-mono">{pump.email}</span>
                          </div>
                        </td>

                        {/* Owner */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200">{pump.owner_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{pump.phone}</div>
                        </td>

                        {/* City */}
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium">
                            {pump.city || "Pakistan"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {isActive && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold text-[10px]">
                              Active (ادا شدہ)
                            </span>
                          )}
                          {isTrial && (
                            <span className="px-2.5 py-1 rounded-full bg-blue-950 text-blue-400 border border-blue-800 font-bold text-[10px]">
                              Trial (14 دن)
                            </span>
                          )}
                          {isExpired && (
                            <span className="px-2.5 py-1 rounded-full bg-rose-950 text-rose-400 border border-rose-800 font-bold text-[10px]">
                              Expired / معطل
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {pump.trial_ends_at ? formatPKDate(pump.trial_ends_at) : "-"}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Extend +30 Days */}
                            <button
                              onClick={() => handleAction("extend", pump.id)}
                              disabled={isBusy}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors disabled:opacity-50"
                              title="Extend subscription by 30 days"
                            >
                              +30 دن فیس جمع
                            </button>

                            {/* Block / Unblock */}
                            {pump.subscription_status === "expired" ? (
                              <button
                                onClick={() => handleAction("unblock", pump.id)}
                                disabled={isBusy}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition-colors disabled:opacity-50"
                              >
                                بحال کریں
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAction("block", pump.id)}
                                disabled={isBusy}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition-colors disabled:opacity-50"
                              >
                                بلاک کریں
                              </button>
                            )}

                            {/* Tanks & Dip Chart */}
                            <Link
                              href={`/super-admin/pump/${pump.id}/tanks`}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-[11px] transition-colors"
                              title="View Tanks & Dip Charts"
                            >
                              ٹینکس و ڈِپ
                            </Link>

                            {/* Login As Pump */}
                            <button
                              onClick={() => handleAction("impersonate", pump.id)}
                              disabled={isBusy}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition-colors disabled:opacity-50"
                            >
                              <span>اسٹیشن کھولیں</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
