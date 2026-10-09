"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Fuel, 
  Gauge, 
  Truck, 
  Package, 
  BookOpen, 
  Receipt, 
  BarChart3, 
  Settings,
  X,
  BadgeDollarSign,
  Droplets,
  Users,
  Wallet,
  Sliders,
  ShieldAlert
} from "lucide-react";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  {
    name: "Dashboard",
    urdu: "ڈیش بورڈ",
    href: "/dashboard",
    icon: LayoutDashboard,
    iconColor: "text-indigo-600",
  },
  {
    name: "Cash Closing",
    urdu: "شفت کیش ہینڈ اوور",
    href: "/cash-closing",
    icon: Wallet,
    iconColor: "text-violet-600",
  },
  {
    name: "Daily Rates",
    urdu: "آج کا ریٹ",
    href: "/rates",
    icon: BadgeDollarSign,
    iconColor: "text-amber-500",
  },
  {
    name: "Daily Readings",
    urdu: "نوزل میٹر ریڈنگ",
    href: "/readings",
    icon: Gauge,
    iconColor: "text-blue-600",
  },
  {
    name: "Tanks & Dip Chart",
    urdu: "ٹینکس و کسٹم ڈِپ چارٹ",
    href: "/tanks",
    icon: Sliders,
    iconColor: "text-indigo-600",
  },
  {
    name: "Tank Khata (Dip)",
    urdu: "روزانہ ٹینک کھاتہ و ڈپ",
    href: "/tank-khata",
    icon: Droplets,
    iconColor: "text-cyan-600",
  },
  {
    name: "Employee Duty",
    urdu: "ملازمین کی ڈیوٹی و تنخواہ",
    href: "/employees",
    icon: Users,
    iconColor: "text-blue-600",
  },
  {
    name: "Fuel Purchases",
    urdu: "تیل خریداری (انورڈ)",
    href: "/purchases",
    icon: Truck,
    iconColor: "text-emerald-600",
  },
  {
    name: "Products & Oil",
    urdu: "موبل آئل و سامان",
    href: "/products",
    icon: Package,
    iconColor: "text-teal-600",
  },
  {
    name: "Udhar Khata",
    urdu: "ادھار کھاتہ و واٹس ایپ",
    href: "/khata",
    icon: BookOpen,
    iconColor: "text-orange-500",
  },
  {
    name: "Kharcha",
    urdu: "روزانہ خرچہ جات",
    href: "/expenses",
    icon: Receipt,
    iconColor: "text-rose-600",
  },
  {
    name: "Reports",
    urdu: "پورے حساب کی رپورٹ",
    href: "/reports",
    icon: BarChart3,
    iconColor: "text-purple-600",
  },
  {
    name: "Settings & Nozzles",
    urdu: "ٹینک و نوزل سیٹنگز",
    href: "/settings",
    icon: Settings,
    iconColor: "text-slate-600",
  },
];

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.isSuperAdmin || data?.session?.isSuperAdmin || data?.session?.role === "super_admin") {
          setIsSuperAdmin(true);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 lg:w-64 bg-white border-r border-slate-200 shadow-sm p-4 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:static lg:block`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-black text-white">
                N
              </div>
              <span className="font-bold text-slate-900">Nexeta Petrol</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Super Admin Access Banner */}
          {isSuperAdmin && (
            <div className="mb-3 px-1">
              <Link
                href="/super-admin/dashboard"
                onClick={onClose}
                className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-md hover:shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all group"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-purple-200 group-hover:scale-110 transition-transform" />
                  <span>🛡️ سپر ایڈمن پورٹل</span>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                  Admin
                </span>
              </Link>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Main Menu • مینو
            </div>

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 group relative ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-bold shadow-xs border-l-4 border-indigo-600 rounded-l-none"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform duration-150 group-hover:scale-110 ${
                      isActive ? "text-indigo-600" : item.iconColor
                    }`}
                  />
                  <div className="flex flex-col">
                    <span className="leading-tight text-slate-800 font-semibold">{item.name}</span>
                    <span className="text-[11px] text-slate-400 group-hover:text-slate-500 font-normal leading-none mt-0.5">
                      {item.urdu}
                    </span>
                  </div>

                  {isActive && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-indigo-600" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer Info */}
          <div className="pt-3 mt-auto border-t border-slate-200">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span className="font-medium">System Status</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Turso LibSQL Active
              </p>
              <div className="mt-1 text-[10px] text-slate-400 text-center font-mono">
                v2.0 • Light School SaaS Edition
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
