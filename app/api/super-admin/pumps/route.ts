import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pumps, users, tanks, dailyReadings } from "@/lib/schema";
import { getSuperAdminSession, signToken, SESSION_COOKIE_NAME, isSubscriptionExpired } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const admin = await getSuperAdminSession(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "غیر مجاز رسائی (Unauthorized)" }, { status: 401 });
    }

    const allPumps = await db.select().from(pumps).orderBy(desc(pumps.id));
    const allUsers = await db.select().from(users);
    const allTanks = await db.select().from(tanks);

    // Compute live metrics
    let activeCount = 0;
    let trialCount = 0;
    let expiredCount = 0;

    const enrichedPumps = allPumps.map((p) => {
      const expired = isSubscriptionExpired(p.subscription_status, p.trial_ends_at);
      const effectiveStatus = expired ? "expired" : p.subscription_status;

      if (effectiveStatus === "active") activeCount++;
      else if (effectiveStatus === "trial") trialCount++;
      else expiredCount++;

      const pUsers = allUsers.filter((u) => u.pump_id === p.id);
      const pTanks = allTanks.filter((t) => t.pump_id === p.id);

      return {
        ...p,
        effectiveStatus,
        isExpired: expired,
        usersCount: pUsers.length,
        tanksCount: pTanks.length,
      };
    });

    return NextResponse.json({
      success: true,
      pumps: enrichedPumps,
      metrics: {
        totalPumps: allPumps.length,
        activePumps: activeCount,
        trialPumps: trialCount,
        expiredPumps: expiredCount,
        estimatedMonthlyRevenue: activeCount * 3000, // Rs. 3,000 / month
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getSuperAdminSession(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "غیر مجاز رسائی (Unauthorized)" }, { status: 401 });
    }

    const body = await request.json();
    const { action, pump_id } = body;

    if (!action || !pump_id) {
      return NextResponse.json({ success: false, error: "Missing action or pump_id" }, { status: 400 });
    }

    const targetPumpRows = await db.select().from(pumps).where(eq(pumps.id, Number(pump_id)));
    if (targetPumpRows.length === 0) {
      return NextResponse.json({ success: false, error: "Pump not found" }, { status: 404 });
    }
    const targetPump = targetPumpRows[0];

    // 1. EXTEND SUBSCRIPTION (+30 Days)
    if (action === "extend") {
      const currentExpiry = new Date(targetPump.trial_ends_at).getTime();
      const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
      const newExpiry = new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString();

      await db
        .update(pumps)
        .set({ subscription_status: "active", trial_ends_at: newExpiry })
        .where(eq(pumps.id, targetPump.id));

      return NextResponse.json({
        success: true,
        message: `${targetPump.pump_name} کی سبسکرپشن 30 دن کے لیے بڑھا دی گئی ہے۔`,
      });
    }

    // 2. BLOCK PUMP (Set expired)
    if (action === "block") {
      await db
        .update(pumps)
        .set({ subscription_status: "expired" })
        .where(eq(pumps.id, targetPump.id));

      return NextResponse.json({
        success: true,
        message: `${targetPump.pump_name} کو بلاک کر دیا گیا ہے۔`,
      });
    }

    // 3. UNBLOCK PUMP (Set active for 30 days)
    if (action === "unblock") {
      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await db
        .update(pumps)
        .set({ subscription_status: "active", trial_ends_at: newExpiry })
        .where(eq(pumps.id, targetPump.id));

      return NextResponse.json({
        success: true,
        message: `${targetPump.pump_name} کو فعال (Active) کر دیا گیا ہے۔`,
      });
    }

    // 4. IMPERSONATE (Login as Pump to view dashboard)
    if (action === "impersonate") {
      const ownerUsers = await db.select().from(users).where(eq(users.pump_id, targetPump.id));
      const targetUser = ownerUsers[0] || {
        id: 9999,
        email: targetPump.email,
        name: targetPump.owner_name,
        role: "owner" as const,
      };

      const sessionPayload = {
        userId: targetUser.id,
        pumpId: targetPump.id,
        email: targetPump.email,
        name: targetPump.owner_name,
        role: (targetUser.role || "owner") as "owner",
        pumpName: targetPump.pump_name,
        city: targetPump.city,
        subscriptionStatus: targetPump.subscription_status as any,
        trialEndsAt: targetPump.trial_ends_at,
        impersonating: true,
      };

      const token = await signToken(sessionPayload);
      const response = NextResponse.json({
        success: true,
        message: `بطور "${targetPump.pump_name}" لاگ ان ہو گئے۔`,
        redirect: "/dashboard",
      });

      response.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24, // 1 day
        sameSite: "lax",
      });

      return response;
    }

    // 5. DELETE PUMP
    if (action === "delete") {
      if (targetPump.id === 1) {
        return NextResponse.json({ success: false, error: "بنیادی ڈیمو پمپ حذف نہیں کیا جا سکتا۔" }, { status: 400 });
      }
      await db.delete(pumps).where(eq(pumps.id, targetPump.id));
      return NextResponse.json({ success: true, message: "پمپ حذف کر دیا گیا۔" });
    }

    return NextResponse.json({ success: false, error: "نامعلوم ایکشن" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
