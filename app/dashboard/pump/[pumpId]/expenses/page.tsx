"use client";

import React from "react";
import { useParams } from "next/navigation";
import ExpensesView from "@/components/ExpensesView";

export default function PumpExpensesRoute() {
  const params = useParams();
  const pumpId = (params?.pumpId as string) || "1";

  return <ExpensesView forcedPumpId={pumpId} />;
}
