"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NozzleMatchingRedirect() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        const pumpId = data?.session?.pumpId || 1;
        router.replace(`/dashboard/pump/${pumpId}/nozzle`);
      })
      .catch(() => {
        router.replace("/dashboard/pump/1/nozzle");
      });
  }, [router]);

  return (
    <div className="p-12 text-center text-slate-500 font-bold min-h-screen flex items-center justify-center">
      نوزل میٹر و ٹینک ڈِپ آٹو میچنگ سسٹم لوڈ ہو رہا ہے...
    </div>
  );
}
