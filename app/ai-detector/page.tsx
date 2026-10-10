"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AiDetectorRedirect() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        const pumpId = data?.session?.pumpId || 1;
        router.replace(`/dashboard/pump/${pumpId}/ai-alerts`);
      })
      .catch(() => {
        router.replace("/dashboard/pump/1/ai-alerts");
      });
  }, [router]);

  return (
    <div className="p-12 text-center text-slate-400 font-bold bg-[#090d16] min-h-screen flex items-center justify-center">
      AI لیکج و چوری ڈیٹیکٹر سسٹم لوڈ ہو رہا ہے...
    </div>
  );
}
