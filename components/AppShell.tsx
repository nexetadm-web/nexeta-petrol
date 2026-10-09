"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize DB tables and seed if not present
  useEffect(() => {
    fetch("/api/init")
      .then((res) => res.json())
      .catch((err) => console.error("Database init error:", err))
      .finally(() => setIsInitializing(false));
  }, []);

  // Determine if this is a standalone landing or auth route
  const isStandaloneRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/billing" ||
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
