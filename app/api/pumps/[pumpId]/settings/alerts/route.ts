import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alertSettings, pumps, tanks } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { pumpId: string } }
) {
  try {
    const pumpId = Number(params.pumpId);
    if (isNaN(pumpId)) {
      return NextResponse.json({ success: false, error: "Invalid pump ID" }, { status: 400 });
    }

    const [pumpRows, settingsRows, tankRows] = await Promise.all([
      db.select().from(pumps).where(eq(pumps.id, pumpId)).limit(1),
      db.select().from(alertSettings).where(eq(alertSettings.pump_id, pumpId)).limit(1),
      db.select().from(tanks).where(eq(tanks.pump_id, pumpId)),
    ]);

    const pump = pumpRows[0] || { pump_name: "Nexeta Petrol", phone: "923001234567" };
    let settings = settingsRows[0];

    // Seed default settings row if not present
    if (!settings) {
      const [newSettings] = await db
        .insert(alertSettings)
        .values({
          pump_id: pumpId,
          low_stock_alert: 1,
          low_stock_percent: 20,
          daily_report_alert: 1,
          owner_phone: pump.phone || "923001234567",
          updated_at: new Date().toISOString(),
        })
        .returning();
      settings = newSettings;
    }

    return NextResponse.json({
      success: true,
      pump_name: pump.pump_name,
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
    const pumpId = Number(params.pumpId);
    if (isNaN(pumpId)) {
      return NextResponse.json({ success: false, error: "Invalid pump ID" }, { status: 400 });
    }

    const body = await request.json();
    const lowStockAlert = body.low_stock_alert ? 1 : 0;
    const lowStockPercent = Math.max(5, Math.min(50, Number(body.low_stock_percent) || 20));
    const dailyReportAlert = body.daily_report_alert ? 1 : 0;
    const ownerPhone = (body.owner_phone || "").trim() || "923001234567";

    const existing = await db
      .select()
      .from(alertSettings)
      .where(eq(alertSettings.pump_id, pumpId))
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
        .where(eq(alertSettings.pump_id, pumpId));
    } else {
      await db.insert(alertSettings).values({
        pump_id: pumpId,
        low_stock_alert: lowStockAlert,
        low_stock_percent: lowStockPercent,
        daily_report_alert: dailyReportAlert,
        owner_phone: ownerPhone,
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: "واٹس ایپ الرٹس سیٹنگز کامیابی سے اپڈیٹ ہو گئیں",
    });
  } catch (error: any) {
    console.error("POST alert settings error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
