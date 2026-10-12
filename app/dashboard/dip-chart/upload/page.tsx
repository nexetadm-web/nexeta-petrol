"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sliders, ArrowLeft, RefreshCw } from "lucide-react";
import { usePump } from "@/lib/usePump";
import DipChartUploader from "@/components/DipChartUploader";

export default function DipChartUploadPage() {
  const { pump, loading: pumpLoading } = usePump();
  const [tanks, setTanks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTanks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/pumps/${pump.id}/tanks`);
      if (res.ok) {
        const data = await res.json();
        if (data.tanks) {
          setTanks(data.tanks);
        }
      }
    } catch (err) {
      console.error("fetch tanks error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pump?.id) {
      fetchTanks();
    }
  }, [pump?.id]);

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-700 shadow-xs">
              <Sliders className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              ڈِپ چارٹ فوٹو اپلوڈر و مینوئل تصدیق
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            {pump?.name || "Nexeta Petrol"} — کاغذ کی تصویر سے آٹو ٹیبل بنائیں اور غلطیاں درست کریں
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/pump/${pump?.id || 1}/tanks/dip-charts`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-slate-950 font-bold text-xs shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>تمام ٹینکس کے ڈِپ چارٹس</span>
          </Link>
        </div>
      </div>

      {/* Main Dip Chart Uploader Component */}
      <DipChartUploader
        pumpId={pump.id}
        tanksList={tanks}
        onSaved={(count) => {
          fetchTanks();
        }}
      />
    </div>
  );
}
