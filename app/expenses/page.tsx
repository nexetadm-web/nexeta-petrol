"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ExpensesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/expenses");
  }, [router]);

  return (
    <div className="p-12 text-center text-slate-500 font-medium">
      اخراجات لوڈ ہو رہے ہیں...
    </div>
  );
}
