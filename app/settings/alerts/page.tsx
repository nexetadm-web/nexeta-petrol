"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsAlertsRedirect() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        const pumpId = data?.session?.pumpId || 1;
        router.replace(`/dashboard/pump/${pumpId}/settings/alerts`);
      })
      .catch(() => {
        router.replace("/dashboard/pump/1/settings/alerts");
      });
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-bold">لوڈ ہو رہا ہے...</p>
      </div>
    </div>
  );
}
