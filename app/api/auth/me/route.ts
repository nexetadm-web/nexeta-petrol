import { NextResponse } from "next/server";
import { getSession, isSubscriptionExpired } from "@/lib/auth";
import { db } from "@/lib/db";
import { pumps } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ success: false, session: null }, { status: 401 });
    }

    // Refresh pump status directly from DB to catch real-time admin extensions or blocks
    const pumpRows = await db.select().from(pumps).where(eq(pumps.id, session.pumpId));
    if (pumpRows.length > 0) {
      const p = pumpRows[0];
      const expired = isSubscriptionExpired(p.subscription_status, p.trial_ends_at);
      session.subscriptionStatus = expired ? "expired" : (p.subscription_status as any);
      session.trialEndsAt = p.trial_ends_at;
      session.pumpName = p.pump_name;
    }

    return NextResponse.json({
      success: true,
      session,
      isExpired: session.subscriptionStatus === "expired",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, session: null }, { status: 500 });
  }
}
