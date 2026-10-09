import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tanks, dipCharts, pumps } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";

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

    const [pumpRows, pumpTanks, allCharts] = await Promise.all([
      db.select().from(pumps).where(eq(pumps.id, pumpId)),
      db.select().from(tanks).where(eq(tanks.pump_id, pumpId)),
      db.select({ tank_id: dipCharts.tank_id }).from(dipCharts).where(eq(dipCharts.pump_id, pumpId)),
    ]);

    const pump = pumpRows[0] || null;

    // Count readings per tank
    const chartCountMap = new Map<number, number>();
    allCharts.forEach((c) => {
      if (c.tank_id) {
        chartCountMap.set(c.tank_id, (chartCountMap.get(c.tank_id) || 0) + 1);
      }
    });

    const formatted = pumpTanks.map((t, idx) => {
      const readingsCount = chartCountMap.get(t.id) || 0;
      const hasChart = readingsCount > 0 || t.has_dip_chart === 1;
      const cap = t.capacity_liters || t.capacity || 25000;
      const stock = t.current_stock_liters !== null && t.current_stock_liters !== undefined ? t.current_stock_liters : t.current_stock;
      const height = t.height_mm || t.tank_height_mm || 2500;

      return {
        id: t.id,
        pump_id: t.pump_id,
        tank_no: t.tank_no || idx + 1,
        name: t.tank_name || t.name,
        tank_name: t.tank_name || t.name,
        fuel_type: t.product || t.fuel_type,
        product: t.product || t.fuel_type,
        capacity: cap,
        capacity_liters: cap,
        height_mm: height,
        tank_height_mm: height,
        current_dip_mm: t.current_dip_mm || 0,
        current_stock: stock,
        current_stock_liters: stock,
        dip_chart_image_url: t.dip_chart_image_url || null,
        has_dip_chart: hasChart,
        readings_count: readingsCount,
        fill_percentage: cap > 0 ? Math.min(100, Math.round((stock / cap) * 100)) : 0,
        created_at: t.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      pump: pump ? { id: pump.id, pump_name: pump.pump_name, city: pump.city } : null,
      tanks: formatted,
    });
  } catch (error: any) {
    console.error("GET pump tanks error:", error);
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
    const existingTanks = await db.select().from(tanks).where(eq(tanks.pump_id, pumpId));
    const nextTankNo = body.tank_no ? Number(body.tank_no) : existingTanks.length + 1;

    const tankName = (body.tank_name || body.name || `Tank ${nextTankNo} - ${body.product || "Petrol"}`).trim();
    const product = (body.product || body.fuel_type || "Petrol").trim();
    const capacityLiters = parseFloat(body.capacity_liters || body.capacity || "40000");
    const heightMm = parseInt(body.height_mm || body.tank_height_mm || "2500");

    if (isNaN(capacityLiters) || capacityLiters <= 0) {
      return NextResponse.json({ success: false, error: "درست گنجائش درج کریں (Valid capacity required)" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    const [newTank] = await db
      .insert(tanks)
      .values({
        pump_id: pumpId,
        tank_no: nextTankNo,
        name: tankName,
        tank_name: tankName,
        fuel_type: product,
        product: product,
        capacity: capacityLiters,
        capacity_liters: capacityLiters,
        height_mm: heightMm > 0 ? heightMm : 2500,
        tank_height_mm: heightMm > 0 ? heightMm : 2500,
        current_dip_mm: 0,
        current_stock: 0,
        current_stock_liters: 0,
        has_dip_chart: 0, // initially false until chart is assigned
        created_at: nowIso,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "ٹینک کامیابی سے شامل ہو گیا",
      tank: newTank,
    });
  } catch (error: any) {
    console.error("POST pump tank error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
