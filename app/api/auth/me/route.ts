import { NextResponse } from "next/server";
import { getSession, isSubscriptionExpired, isSuperAdminEmail } from "@/lib/auth";
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

    const isSuper = (session.role as string) === "super_admin" || isSuperAdminEmail(session.email);
    (session as any).isSuperAdmin = isSuper;

    return NextResponse.json({
      success: true,
      session,
      isExpired: session.subscriptionStatus === "expired",
      isSuperAdmin: isSuper,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, session: null }, { status: 500 });
  }
}
