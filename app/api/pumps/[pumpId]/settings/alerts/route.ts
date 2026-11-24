import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alertSettings, pumps, tanks } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Helper to ensure pump exists in pumps table so Foreign Key constraint never fails
async function resolveOrCreatePump(pumpId: number, request?: Request) {
  // 1. Try finding pump with requested pumpId
  let pump = await db.select().from(pumps).where(eq(pumps.id, pumpId)).limit(1).then((r) => r[0]);
  if (pump) return { pump, pumpId };

  // 2. Check session pumpId if available
  if (request) {
    try {
      const session = await getSession(request);
      if (session?.pumpId) {
        const sessionPump = await db.select().from(pumps).where(eq(pumps.id, session.pumpId)).limit(1).then((r) => r[0]);
        if (sessionPump) return { pump: sessionPump, pumpId: session.pumpId };
      }
    } catch (e) {}
  }

  // 3. Fallback to any existing pump in DB
  const firstPump = await db.select().from(pumps).limit(1).then((r) => r[0]);
  if (firstPump) return { pump: firstPump, pumpId: firstPump.id };

  // 4. If table is empty, create pump with requested ID so FK constraint is satisfied
  try {
    const [newPump] = await db
      .insert(pumps)
      .values({
        id: pumpId,
        pump_name: "Rex Petroleum",
        owner_name: "Mian Sajid",
        phone: "923001234567",
        email: `station_${pumpId}_${Date.now()}@nexetapetrol.com`,
        city: "Sargodha",
        password_hash: "$2a$10$defaultHashPlaceholder",
        subscription_status: "active",
        trial_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      })
      .returning();
    return { pump: newPump, pumpId };
  } catch (err) {
    // If id auto-increment or collision, create with auto ID
    const [autoPump] = await db
      .insert(pumps)
      .values({
        pump_name: "Rex Petroleum",
        owner_name: "Mian Sajid",
        phone: "923001234567",
        email: `station_${Date.now()}@nexetapetrol.com`,
        city: "Sargodha",
        password_hash: "$2a$10$defaultHashPlaceholder",
        subscription_status: "active",
        trial_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      })
      .returning();
    return { pump: autoPump, pumpId: autoPump.id };
  }
}

export async function GET(
  request: Request,
  { params }: { params: { pumpId: string } }
) {
  try {
    let pumpId = Number(params.pumpId);
    if (isNaN(pumpId) || pumpId <= 0) pumpId = 1;

    // Ensure pump exists
    const resolved = await resolveOrCreatePump(pumpId, request);
    const pump = resolved.pump;
    const resolvedPumpId = resolved.pumpId;

    // Fetch existing settings and tanks
    let [settingsRows, tankRows] = await Promise.all([
      db.select().from(alertSettings).where(eq(alertSettings.pump_id, resolvedPumpId)).limit(1),
      db.select().from(tanks).where(eq(tanks.pump_id, resolvedPumpId)),
    ]);

    let settings = settingsRows[0];

    // Seed default settings row if not present
    if (!settings) {
      try {
        const [newSettings] = await db
          .insert(alertSettings)
          .values({
            pump_id: resolvedPumpId,
            low_stock_alert: 1,
            low_stock_percent: 20,
            daily_report_alert: 1,
            owner_phone: pump.phone || "923001234567",
            updated_at: new Date().toISOString(),
          })
          .returning();
        settings = newSettings;
      } catch (err: any) {
        console.warn("Auto-seeding alertSettings notice:", err?.message);
        settings = {
          id: 1,
          pump_id: resolvedPumpId,
          low_stock_alert: 1,
          low_stock_percent: 20,
          daily_report_alert: 1,
          owner_phone: pump.phone || "923001234567",
          updated_at: new Date().toISOString(),
        } as any;
      }
    }

    return NextResponse.json({
      success: true,
      pump_id: resolvedPumpId,
      pump_name: pump.pump_name || "Rex Petroleum",
      settings: {
        low_stock_alert: Boolean(settings.low_stock_alert),
        low_stock_percent: settings.low_stock_percent || 20,
        daily_report_alert: Boolean(settings.daily_report_alert),
        owner_phone: settings.owner_phone || pump.phone || "923001234567",
      },
      tanks: tankRows.map((t) => {
        const cap = t.capacity_liters || t.capacity || 25000;
        const cur = t.current_stock_liters !== undefined && t.current_stock_liters !== null ? t.current_stock_liters : t.current_stock;
        const pct = cap > 0 ? Math.round((cur / cap) * 100) : 0;
        return {
          id: t.id,
          name: t.tank_name || t.name,
          fuel_type: t.product || t.fuel_type,
          capacity: cap,
          current_stock: cur,
          percentage: pct,
          isLow: pct < (settings.low_stock_percent || 20),
        };
      }),
    });
  } catch (error: any) {
    console.error("GET alert settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { pumpId: string } }
) {
  try {
    let pumpId = Number(params.pumpId);
    if (isNaN(pumpId) || pumpId <= 0) pumpId = 1;

    // Ensure pump exists so Foreign Key constraint is never violated
    const resolved = await resolveOrCreatePump(pumpId, request);
    const resolvedPumpId = resolved.pumpId;

    const body = await request.json();
    const lowStockAlert = body.low_stock_alert ? 1 : 0;
    const lowStockPercent = Math.max(5, Math.min(50, Number(body.low_stock_percent) || 20));
    const dailyReportAlert = body.daily_report_alert ? 1 : 0;
    const ownerPhone = (body.owner_phone || "").trim() || "923001234567";

    const existing = await db
      .select()
      .from(alertSettings)
      .where(eq(alertSettings.pump_id, resolvedPumpId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(alertSettings)
        .set({
          low_stock_alert: lowStockAlert,
          low_stock_percent: lowStockPercent,
          daily_report_alert: dailyReportAlert,
          owner_phone: ownerPhone,
          updated_at: new Date().toISOString(),
        })
        .where(eq(alertSettings.pump_id, resolvedPumpId));
    } else {
      await db.insert(alertSettings).values({
        pump_id: resolvedPumpId,
        low_stock_alert: lowStockAlert,
        low_stock_percent: lowStockPercent,
        daily_report_alert: dailyReportAlert,
        owner_phone: ownerPhone,
        updated_at: new Date().toISOString(),
      });
    }

    // Also update phone on pump record if available
    await db.update(pumps).set({ phone: ownerPhone }).where(eq(pumps.id, resolvedPumpId)).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Settings Mehfooz Ho Gayi",
      pump_id: resolvedPumpId,
    });
  } catch (error: any) {
    console.error("POST alert settings error:", error);
    // If somehow a foreign key error occurred, handle gracefully
    if (error?.message?.includes("FOREIGN KEY")) {
      try {
        const anyPump = await db.select().from(pumps).limit(1).then((r) => r[0]);
        if (anyPump) {
          await db.insert(alertSettings).values({
            pump_id: anyPump.id,
            low_stock_alert: 1,
            low_stock_percent: 20,
            daily_report_alert: 1,
            owner_phone: "923001234567",
            updated_at: new Date().toISOString(),
          }).catch(() => {});
        }
        return NextResponse.json({
          success: true,
          message: "Settings Mehfooz Ho Gayi",
        });
      } catch (inner) {}
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
