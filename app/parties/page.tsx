"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PartiesRedirect() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        const pumpId = data?.session?.pumpId || 1;
        router.replace(`/dashboard/pump/${pumpId}/parties`);
      })
      .catch(() => {
        router.replace("/dashboard/pump/1/parties");
      });
  }, [router]);

  return (
    <div className="p-12 text-center text-slate-500 font-bold min-h-screen flex items-center justify-center">
      پارٹی کھاتہ و واٹس ایپ بلنگ سسٹم لوڈ ہو رہا ہے...
    </div>
  );
}
