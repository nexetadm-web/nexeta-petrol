"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [session, setSession] = useState<any>(null);

  // Initialize DB tables and seed if not present
  useEffect(() => {
    fetch("/api/init")
      .then((res) => res.json())
      .catch((err) => console.error("Database init error:", err))
      .finally(() => setIsInitializing(false));

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.session) {
          setSession(data.session);
          if (data.isPaused && !data.session.impersonating) {
            window.location.href = "/login?error=paused";
          }
        }
      })
      .catch((err) => console.error("Session check error:", err));
  }, []);

  // Determine if this is a standalone landing or auth route (billing is now inside AppShell)
  const isStandaloneRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname?.startsWith("/super-admin");

  if (isStandaloneRoute) {
    return <div className="min-h-screen bg-slate-50 text-slate-800">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 relative">
      {/* Top Navbar with Purple-Blue Gradient */}
      <Navbar
        onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        mobileMenuOpen={mobileMenuOpen}
      />

      {/* Small top message when plan is expired - System remains 100% active and unblocked */}
      {session?.subscriptionStatus === "expired" && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 px-4 py-2 text-xs font-bold flex items-center justify-between gap-3 sticky top-16 z-20 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 text-sm">⚠️</span>
            <span>Aapka plan expire hai, payment ke liye Super Admin se rabta karein (آپ کا پلان ایکسپائر ہے، ادائیگی کے لیے سپر ایڈمن سے رابطہ کریں)</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/billing"
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition-colors shadow-xs"
            >
              بلنگ اسٹیٹس
            </Link>
            <a
              href="https://wa.me/923400072030"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors shadow-xs"
            >
              واٹس ایپ
            </a>
          </div>
        </div>
      )}

      {/* Main Container: Sidebar + Page View */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto relative z-10">
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
