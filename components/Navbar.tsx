"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Fuel, 
  Database, 
  Calendar, 
  Download, 
  Menu, 
  X,
  Clock,
  Sparkles
} from "lucide-react";
import { getTodayDatePK, formatTime } from "@/lib/formatters";

interface NavbarProps {
  onMobileMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

export function Navbar({ onMobileMenuToggle, mobileMenuOpen }: NavbarProps) {
  const [todayStr, setTodayStr] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    setTodayStr(getTodayDatePK()); // DD-MM-YYYY format
    setCurrentTime(formatTime(new Date()));

    const timer = setInterval(() => {
      setCurrentTime(formatTime(new Date()));
    }, 30000);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      clearInterval(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      alert("ایپ تیار ہے! موبائل میں انسٹال کرنے کے لیے براؤزر کے مینو سے 'Add to Home screen' پر ٹیپ کریں۔");
      return;
    }
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setInstallPrompt(null);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 text-white shadow-md border-b border-indigo-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile hamburger & Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMobileMenuToggle}
              className="lg:hidden p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 focus:outline-none transition-colors"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-white shadow-md text-indigo-700 font-black text-xl group-hover:scale-105 transition-transform">
                <span>N</span>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white group-hover:text-amber-200 transition-colors">
                    NEXETA PETROL
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                    School SaaS
                  </span>
                </div>
                <p className="text-[11px] text-indigo-100 font-medium hidden sm:block">
                  باکمال پیٹرول پمپ مینیجر • Automated Fuel Station
                </p>
              </div>
            </Link>
          </div>

          {/* Right: Pakistan Date, Time, Currency, and PWA Install */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Currency Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              PKR (Rs.)
            </div>

            {/* Time Display (12h Asia/Karachi) */}
            {currentTime && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-xs font-medium backdrop-blur-sm font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-200" />
                <span>{currentTime}</span>
              </div>
            )}

            {/* Pakistan Date Display (DD-MM-YYYY) */}
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-indigo-900 font-bold text-xs shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span className="font-mono tracking-tight">{todayStr || getTodayDatePK()}</span>
            </div>

            {/* PWA App Install Button */}
            {!isInstalled && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95"
                title="Install App"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Install App</span>
                <span className="sm:hidden">Install</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
