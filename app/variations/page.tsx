"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VariationsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        const pumpId = data?.session?.pumpId || 1;
        router.replace(`/dashboard/pump/${pumpId}/variations`);
      })
      .catch(() => {
        router.replace("/dashboard/pump/1/variations");
      });
  }, [router]);

  return (
    <div className="p-12 text-center text-slate-500 font-medium">
      ویرینشن ہسٹری لوڈ ہو رہی ہے...
    </div>
  );
}
