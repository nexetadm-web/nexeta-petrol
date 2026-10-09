"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StockRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        const pumpId = data?.session?.pumpId || 1;
        router.replace(`/dashboard/pump/${pumpId}/stock`);
      })
      .catch(() => {
        router.replace("/dashboard/pump/1/stock");
      });
  }, [router]);

  return (
    <div className="p-12 text-center text-slate-500 font-medium">
      روزانہ ڈِپ انٹری سسٹم لوڈ ہو رہا ہے...
    </div>
  );
}
