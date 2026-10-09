import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tanks, dipCharts } from "@/lib/schema";
import { eq, and, asc } from "drizzle-orm";
import { getStockFromDip, DipChartEntry } from "@/lib/stock";

export const dynamic = "force-dynamic";

// GET /api/pumps/[pumpId]/tanks/dip-charts?tankId=X
export async function GET(
  request: Request,
  { params }: { params: { pumpId: string } }
) {
  try {
    const pumpId = Number(params.pumpId);
    if (isNaN(pumpId)) {
      return NextResponse.json({ success: false, error: "Invalid pump ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const tankIdParam = searchParams.get("tankId");

    // If specific tankId requested
    if (tankIdParam) {
      const tankId = Number(tankIdParam);
      if (isNaN(tankId)) {
        return NextResponse.json({ success: false, error: "Invalid tank ID" }, { status: 400 });
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
          tank_no: tank.tank_no || tank.id,
          tank_name: tank.tank_name || tank.name,
          product: tank.product || tank.fuel_type,
          capacity_liters: tank.capacity_liters || tank.capacity,
          height_mm: tank.height_mm || tank.tank_height_mm || 2500,
          current_dip_mm: tank.current_dip_mm || 0,
          current_stock_liters: tank.current_stock_liters || tank.current_stock,
          has_dip_chart: Boolean(tank.has_dip_chart || rows.length > 0),
          dip_chart_image_url: tank.dip_chart_image_url || null,
        },
        chart: rows,
        count: rows.length,
      });
    }

    // Otherwise return all tanks of this pump with row counts
    const allTanks = await db
      .select()
      .from(tanks)
      .where(eq(tanks.pump_id, pumpId))
      .orderBy(asc(tanks.tank_no), asc(tanks.id));

    const allCharts = await db
      .select({
        id: dipCharts.id,
        tank_id: dipCharts.tank_id,
      })
      .from(dipCharts)
      .where(eq(dipCharts.pump_id, pumpId));

    const countMap = new Map<number, number>();
    allCharts.forEach((c) => {
      if (c.tank_id !== null && c.tank_id !== undefined) {
        countMap.set(c.tank_id, (countMap.get(c.tank_id) || 0) + 1);
      }
    });

    const tanksWithCounts = allTanks.map((t) => {
      const rowCount = countMap.get(t.id) || 0;
      return {
        id: t.id,
        pump_id: t.pump_id,
        tank_no: t.tank_no || t.id,
        tank_name: t.tank_name || t.name,
        product: t.product || t.fuel_type,
        capacity_liters: t.capacity_liters || t.capacity,
        height_mm: t.height_mm || t.tank_height_mm || 2500,
        current_dip_mm: t.current_dip_mm || 0,
        current_stock_liters: t.current_stock_liters || t.current_stock,
        has_dip_chart: Boolean(t.has_dip_chart || rowCount > 0),
        dip_chart_image_url: t.dip_chart_image_url || null,
        chart_rows_count: rowCount,
      };
    });

    return NextResponse.json({
      success: true,
      tanks: tanksWithCounts,
    });
  } catch (error: any) {
    console.error("GET dip charts error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/pumps/[pumpId]/tanks/dip-charts
// Body: { tank_id: number, rows: [{ dip_mm, volume_liters }], image_url?: string }
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
    const tankId = Number(body.tank_id);
    const imageUrl = body.image_url || null;

    if (isNaN(tankId)) {
      return NextResponse.json({ success: false, error: "ٹینک منتخب کریں (Tank ID required)" }, { status: 400 });
    }

    const [tank] = await db
      .select()
      .from(tanks)
      .where(and(eq(tanks.id, tankId), eq(tanks.pump_id, pumpId)));

    if (!tank) {
      return NextResponse.json({ success: false, error: "ٹینک نہیں ملا (Tank not found for this pump)" }, { status: 404 });
    }

    const rowsInput: DipChartEntry[] = body.rows || [];
    if (!Array.isArray(rowsInput) || rowsInput.length === 0) {
      return NextResponse.json(
        { success: false, error: "کم از کم ایک ڈِپ ریڈنگ شامل کریں (At least one dip reading required)" },
        { status: 400 }
      );
    }

    // Clean, validate and sort rows
    const cleaned: DipChartEntry[] = rowsInput
      .map((r) => ({
        dip_mm: Math.round(Number(r.dip_mm)),
        volume_liters: Math.round(Number(r.volume_liters) * 100) / 100,
      }))
      .filter((r) => !isNaN(r.dip_mm) && !isNaN(r.volume_liters) && r.dip_mm >= 0 && r.volume_liters >= 0)
      .sort((a, b) => a.dip_mm - b.dip_mm);

    if (cleaned.length === 0) {
      return NextResponse.json(
        { success: false, error: "درست ڈِپ ڈیٹا نہیں ملا (Valid dip data not found)" },
        { status: 400 }
      );
    }

    // Remove duplicates by dip_mm (keep last)
    const map = new Map<number, number>();
    cleaned.forEach((r) => map.set(r.dip_mm, r.volume_liters));
    const uniqueRows: DipChartEntry[] = Array.from(map.entries())
      .map(([dip_mm, volume_liters]) => ({ dip_mm, volume_liters }))
      .sort((a, b) => a.dip_mm - b.dip_mm);

    // Delete existing chart rows for this specific tank ONLY
    await db.delete(dipCharts).where(eq(dipCharts.tank_id, tankId));

    const product = tank.product || tank.fuel_type || "Petrol";

    // Insert rows in batches for safety
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

    // Recalculate current stock if tank already has a current_dip_mm
    let updatedStock = tank.current_stock_liters || tank.current_stock || 0;
    if (tank.current_dip_mm && tank.current_dip_mm > 0) {
      updatedStock = getStockFromDip(
        tank.current_dip_mm,
        uniqueRows,
        tank.capacity_liters || tank.capacity
      );
    }

    // Update tanks table: has_dip_chart = 1, dip_chart_image_url
    await db
      .update(tanks)
      .set({
        has_dip_chart: 1,
        dip_chart_image_url: imageUrl || tank.dip_chart_image_url,
        current_stock: updatedStock,
        current_stock_liters: updatedStock,
      })
      .where(eq(tanks.id, tankId));

    return NextResponse.json({
      success: true,
      message: `ٹینک "${tank.tank_name || tank.name}" کا ڈِپ چارٹ کامیابی سے محفوظ ہو گیا (${uniqueRows.length} ریڈنگز)`,
      tank_id: tankId,
      count: uniqueRows.length,
      current_stock_liters: updatedStock,
    });
  } catch (error: any) {
    console.error("POST dip charts error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
