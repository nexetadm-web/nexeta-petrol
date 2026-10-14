"use client";

import React from "react";
import { RateBanner } from "./RateBanner";
import { DailyRate } from "@/lib/types";

export interface RateCardProps {
  initialRate: DailyRate | null;
  todayDateStr: string;
  onRatesUpdated?: (rate: any) => void;
}

export function RateCard(props: RateCardProps) {
  return <RateBanner {...props} />;
}

export default RateCard;
