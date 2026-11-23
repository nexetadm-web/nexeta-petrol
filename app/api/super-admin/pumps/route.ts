import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/schema";
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
    let pausedCount = 0;
    let totalMonthlyRevenue = 0;

    const enrichedPumps = allPumps.map((p) => {
      let effectiveStatus = p.subscription_status;
      let expired = false;

      const customPrice = p.monthly_price ?? 3000;

      if (p.subscription_status === "paused") {
        effectiveStatus = "paused";
        pausedCount++;
      } else {
        expired = isSubscriptionExpired(p.subscription_status, p.trial_ends_at);
        effectiveStatus = expired ? "expired" : p.subscription_status;

        if (effectiveStatus === "active") {
          activeCount++;
          totalMonthlyRevenue += customPrice;
        } else if (effectiveStatus === "trial") {
          trialCount++;
        } else {
          expiredCount++;
        }
      }

      const pUsers = allUsers.filter((u) => u.pump_id === p.id);
      const pTanks = allTanks.filter((t) => t.pump_id === p.id);

      return {
        ...p,
        monthly_price: customPrice,
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
        pausedPumps: pausedCount,
        estimatedMonthlyRevenue: totalMonthlyRevenue,
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
    const action = body.action;
    const pumpId = Number(body.pump_id || body.pumpId);

    if (!action || !pumpId) {
      return NextResponse.json({ success: false, error: "Missing action or pumpId" }, { status: 400 });
    }

    const targetPumpRows = await db.select().from(pumps).where(eq(pumps.id, pumpId));
    if (targetPumpRows.length === 0) {
      return NextResponse.json({ success: false, error: "Pump not found" }, { status: 404 });
    }
    const targetPump = targetPumpRows[0];

    // 1. EXTEND SUBSCRIPTION (+30 Days)
    if (action === "extend") {
      const currentExpiry = new Date(targetPump.trial_ends_at).getTime();
      const baseTime = !isNaN(currentExpiry) && currentExpiry > Date.now() ? currentExpiry : Date.now();
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

    // 2. PAUSE PUMP (Login blocked, manual full control)
    if (action === "pause" || action === "block") {
      await db
        .update(pumps)
        .set({ subscription_status: "paused" })
        .where(eq(pumps.id, targetPump.id));

      return NextResponse.json({
        success: true,
        message: `${targetPump.pump_name} کو عارضی طور پر روک (PAUSED) دیا گیا ہے۔ اب اس کا لاگ ان بند رہے گا۔`,
      });
    }

    // 3. RESUME / UNPAUSE PUMP (Re-activate)
    if (action === "resume" || action === "unpause" || action === "unblock") {
      const currentExpiry = new Date(targetPump.trial_ends_at).getTime();
      const baseTime = !isNaN(currentExpiry) && currentExpiry > Date.now() ? currentExpiry : Date.now();
      const newExpiry = new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString();

      await db
        .update(pumps)
        .set({ subscription_status: "active", trial_ends_at: newExpiry })
        .where(eq(pumps.id, targetPump.id));

      return NextResponse.json({
        success: true,
        message: `${targetPump.pump_name} کو دوبارہ بحال (Active) کر دیا گیا ہے۔`,
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

    // 5. DELETE PUMP (Delete all associated records cleanly)
    if (action === "delete") {
      const pid = targetPump.id;
      const childTables = [
        schema.dailyReadings,
        schema.shiftNozzleReadings,
        schema.shifts,
        schema.nozzleSales,
        schema.nozzles,
        schema.tanks,
        schema.dailyRates,
        schema.fuelPurchases,
        schema.productSales,
        schema.products,
        schema.creditSales,
        schema.creditCustomers,
        schema.expenses,
        schema.pumpExpenses,
        schema.dipCharts,
        schema.stockLogs,
        schema.dipVariations,
        schema.tankKhata,
        schema.employeeDuty,
        schema.employees,
        schema.cashClosings,
        schema.pumpSettings,
        schema.aiAlerts,
        schema.dailyReconciliation,
        schema.partyTransactions,
        schema.parties,
        schema.fuelRatesHistory,
        schema.fuelRates,
        schema.cashLoanTransactions,
        schema.cashLoans,
        schema.alertSettings,
        schema.users,
      ];

      for (const tbl of childTables) {
        try {
          if (tbl && "pump_id" in tbl) {
            await db.delete(tbl).where(eq((tbl as any).pump_id, pid));
          }
        } catch (e) {
          // continue if table is missing pump_id or fails
        }
      }

      await db.delete(pumps).where(eq(pumps.id, pid));

      return NextResponse.json({
        success: true,
        message: `${targetPump.pump_name} اور اس کا تمام ڈیٹا کامیابی سے ڈیلیٹ کر دیا گیا۔`,
      });
    }

    // 6. UPDATE CUSTOM MONTHLY PRICE (Super Admin Only)
    if (action === "update_price" || action === "edit_price") {
      const newPrice = Number(body.price ?? body.monthly_price);
      if (isNaN(newPrice) || newPrice < 0) {
        return NextResponse.json({ success: false, error: "درست رقم درج کریں" }, { status: 400 });
      }

      await db
        .update(pumps)
        .set({ monthly_price: newPrice })
        .where(eq(pumps.id, targetPump.id));

      return NextResponse.json({
        success: true,
        message: `${targetPump.pump_name} کی ماہانہ فیس Rs. ${newPrice.toLocaleString()} کامیابی سے محفوظ ہو گئی۔`,
        price: newPrice,
      });
    }

    return NextResponse.json({ success: false, error: "نامعلوم ایکشن" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
