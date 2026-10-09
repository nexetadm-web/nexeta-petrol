import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tanks, dipCharts } from "@/lib/schema";
import { eq, and, asc } from "drizzle-orm";
import { getStockFromDip, DipChartEntry } from "@/lib/stock";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { pumpId: string; tankId: string } }
) {
  try {
    const pumpId = Number(params.pumpId);
    const tankId = Number(params.tankId);

    if (isNaN(pumpId) || isNaN(tankId)) {
      return NextResponse.json({ success: false, error: "Invalid parameters" }, { status: 400 });
    }

    const [tank] = await db
      .select()
      .from(tanks)
      .where(and(eq(tanks.id, tankId), eq(tanks.pump_id, pumpId)));

    if (!tank) {
      return NextResponse.json({ success: false, error: "ٹینک نہیں ملا (Tank not found)" }, { status: 404 });
    }

    const rawRows = await db
      .select()
      .from(dipCharts)
      .where(eq(dipCharts.tank_id, tankId))
      .orderBy(asc(dipCharts.dip_mm), asc(dipCharts.dip_value));

    const rows: DipChartEntry[] = rawRows
      .map((r) => ({
        dip_mm: r.dip_mm !== null && r.dip_mm !== undefined ? Number(r.dip_mm) : Number(r.dip_value || 0),
        volume_liters: r.volume_liters !== null && r.volume_liters !== undefined ? Number(r.volume_liters) : Number(r.litres || 0),
      }))
      .filter((r) => !isNaN(r.dip_mm) && !isNaN(r.volume_liters))
      .sort((a, b) => a.dip_mm - b.dip_mm);

    return NextResponse.json({
      success: true,
      tank: {
        id: tank.id,
        pump_id: tank.pump_id,
        tank_name: tank.tank_name || tank.name,
        product: tank.product || tank.fuel_type,
        capacity_liters: tank.capacity_liters || tank.capacity,
        tank_height_mm: tank.tank_height_mm || 2500,
        current_dip_mm: tank.current_dip_mm || 0,
        current_stock_liters: tank.current_stock_liters || tank.current_stock,
      },
      chart: rows,
    });
  } catch (error: any) {
    console.error("GET dip chart error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { pumpId: string; tankId: string } }
) {
  try {
    const pumpId = Number(params.pumpId);
    const tankId = Number(params.tankId);

    if (isNaN(pumpId) || isNaN(tankId)) {
      return NextResponse.json({ success: false, error: "Invalid parameters" }, { status: 400 });
    }

    const [tank] = await db
      .select()
      .from(tanks)
      .where(and(eq(tanks.id, tankId), eq(tanks.pump_id, pumpId)));

    if (!tank) {
      return NextResponse.json({ success: false, error: "ٹینک نہیں ملا (Tank not found)" }, { status: 404 });
    }

    const body = await request.json();
    const rowsInput: DipChartEntry[] = body.rows || [];

    if (!Array.isArray(rowsInput) || rowsInput.length === 0) {
      return NextResponse.json(
        { success: false, error: "کم از کم ایک ڈِپ ریڈنگ شامل کریں (At least one dip reading required)" },
        { status: 400 }
      );
    }

    // Clean & sort rows
    const cleaned: DipChartEntry[] = rowsInput
      .map((r) => ({
        dip_mm: Number(r.dip_mm),
        volume_liters: Number(r.volume_liters),
      }))
      .filter((r) => !isNaN(r.dip_mm) && !isNaN(r.volume_liters) && r.dip_mm >= 0 && r.volume_liters >= 0)
      .sort((a, b) => a.dip_mm - b.dip_mm);

    // Remove duplicates by dip_mm (keep last)
    const map = new Map<number, number>();
    cleaned.forEach((r) => map.set(r.dip_mm, r.volume_liters));
    const uniqueRows: DipChartEntry[] = Array.from(map.entries())
      .map(([dip_mm, volume_liters]) => ({ dip_mm, volume_liters }))
      .sort((a, b) => a.dip_mm - b.dip_mm);

    // Replace existing chart for this tank
    await db.delete(dipCharts).where(eq(dipCharts.tank_id, tankId));

    const product = tank.product || tank.fuel_type || "Petrol";

    for (const r of uniqueRows) {
      await db.insert(dipCharts).values({
        pump_id: pumpId,
        tank_id: tankId,
        fuel_type: product,
        dip_value: r.dip_mm,
        dip_mm: r.dip_mm,
        unit: "mm",
        litres: r.volume_liters,
        volume_liters: r.volume_liters,
      });
    }

    // Recalculate current stock if current_dip_mm exists
    let updatedStock = tank.current_stock_liters || tank.current_stock || 0;
    if (tank.current_dip_mm && tank.current_dip_mm > 0) {
      updatedStock = getStockFromDip(
        tank.current_dip_mm,
        uniqueRows,
        tank.capacity_liters || tank.capacity
      );
    }

    // Update tank has_dip_chart flag and optional image
    await db
      .update(tanks)
      .set({
        has_dip_chart: 1,
        dip_chart_image_url: body.image_url || tank.dip_chart_image_url,
        current_stock: updatedStock,
        current_stock_liters: updatedStock,
      })
      .where(eq(tanks.id, tankId));

    return NextResponse.json({
      success: true,
      message: "ڈِپ چارٹ کامیابی سے محفوظ ہو گیا (Dip chart saved successfully)",
      count: uniqueRows.length,
      current_stock_liters: updatedStock,
    });
  } catch (error: any) {
    console.error("POST dip chart error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
