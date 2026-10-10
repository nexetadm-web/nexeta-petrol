"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ShiftsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        const pumpId = data?.session?.pumpId || 1;
        router.replace(`/dashboard/pump/${pumpId}/shifts`);
      })
      .catch(() => {
        router.replace("/dashboard/pump/1/shifts");
      });
  }, [router]);

  return (
    <div className="p-12 text-center text-slate-500 font-medium">
      شفٹ مینیجمنٹ لوڈ ہو رہا ہے...
    </div>
  );
}
