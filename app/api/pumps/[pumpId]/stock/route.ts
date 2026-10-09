import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tanks, dipCharts, stockLogs, tankKhata, dipVariations } from "@/lib/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { getStockFromDip, DipChartEntry } from "@/lib/stock";
import { getTodayDatePK } from "@/lib/formatters";

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

    const [allTanks, rawLogs] = await Promise.all([
      db.select().from(tanks).where(eq(tanks.pump_id, pumpId)),
      db
        .select()
        .from(stockLogs)
        .where(eq(stockLogs.pump_id, pumpId))
        .orderBy(desc(stockLogs.id)),
    ]);

    // Enrich logs with tank name & fuel type
    const tankMap = new Map<number, any>();
    allTanks.forEach((t) => tankMap.set(t.id, t));

    const enrichedLogs = rawLogs.map((log) => {
      const t = tankMap.get(log.tank_id);
      return {
        ...log,
        tank_name: t ? t.tank_name || t.name : `Tank #${log.tank_id}`,
        fuel_type: t ? t.product || t.fuel_type : "Fuel",
        capacity_liters: t ? t.capacity_liters || t.capacity : 40000,
      };
    });

    return NextResponse.json({
      success: true,
      tanks: allTanks.map((t) => ({
        id: t.id,
        pump_id: t.pump_id,
        name: t.tank_name || t.name,
        tank_name: t.tank_name || t.name,
        fuel_type: t.product || t.fuel_type,
        product: t.product || t.fuel_type,
        capacity_liters: t.capacity_liters || t.capacity,
        tank_height_mm: t.tank_height_mm || 2500,
        current_dip_mm: t.current_dip_mm || 0,
        current_stock_liters: t.current_stock_liters || t.current_stock,
      })),
      logs: enrichedLogs,
    });
  } catch (error: any) {
    console.error("GET stock logs error:", error);
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
    const tankId = Number(body.tank_id);
    const dipMm = parseFloat(body.dip_mm);
    const dateStr = (body.date || getTodayDatePK()).trim();
    const receivedLiters = parseFloat(body.received_liters || "0") || 0;
    const saleLiters = parseFloat(body.sale_liters || "0") || 0;
    const createdBy = (body.created_by || "Manager").trim();

    if (isNaN(tankId) || isNaN(dipMm) || dipMm < 0) {
      return NextResponse.json(
        { success: false, error: "درست ڈِپ پیمائش (mm) درج کریں (Valid dip measurement required)" },
        { status: 400 }
      );
    }

    // 1. Fetch Tank
    const [tank] = await db
      .select()
      .from(tanks)
      .where(and(eq(tanks.id, tankId), eq(tanks.pump_id, pumpId)));

    if (!tank) {
      return NextResponse.json({ success: false, error: "ٹینک نہیں ملا (Tank not found)" }, { status: 404 });
    }

    // 2. Fetch calibration chart for this specific tank
    const rawChart = await db
      .select()
      .from(dipCharts)
      .where(eq(dipCharts.tank_id, tankId))
      .orderBy(asc(dipCharts.dip_mm), asc(dipCharts.dip_value));

    const chartPoints: DipChartEntry[] = rawChart
      .map((r) => ({
        dip_mm: r.dip_mm !== null && r.dip_mm !== undefined ? Number(r.dip_mm) : Number(r.dip_value || 0),
        volume_liters: r.volume_liters !== null && r.volume_liters !== undefined ? Number(r.volume_liters) : Number(r.litres || 0),
      }))
      .filter((r) => !isNaN(r.dip_mm) && !isNaN(r.volume_liters));

    const capacity = tank.capacity_liters || tank.capacity || 40000;
    const previousStock = tank.current_stock_liters || tank.current_stock || 0;

    // 3. Interpolate stock using the custom dip chart
    const calculatedStock = getStockFromDip(dipMm, chartPoints, capacity);

    // Theoretical expected register stock
    const expectedRegisterStock = Math.max(0, previousStock + receivedLiters - saleLiters);
    // Difference (Gain/Loss variance)
    const differenceLiters = Math.round((calculatedStock - expectedRegisterStock) * 100) / 100;

    const nowIso = new Date().toISOString();

    // 4. Record into stock_logs
    const [newLog] = await db
      .insert(stockLogs)
      .values({
        tank_id: tankId,
        pump_id: pumpId,
        date: dateStr,
        dip_mm: dipMm,
        calculated_stock_liters: calculatedStock,
        received_liters: receivedLiters,
        sale_liters: saleLiters,
        difference_liters: differenceLiters,
        created_by: createdBy,
        created_at: nowIso,
      })
      .returning();

    // 5. Update Tank's current dip & stock
    await db
      .update(tanks)
      .set({
        current_dip_mm: dipMm,
        current_stock: calculatedStock,
        current_stock_liters: calculatedStock,
      })
      .where(eq(tanks.id, tankId));

    // 6. Also sync with tank_khata for backward compatibility
    try {
      await db.insert(tankKhata).values({
        pump_id: pumpId,
        date: dateStr,
        tank_id: tankId,
        fuel_type: (tank.product || tank.fuel_type || "Petrol") as any,
        dip_value: dipMm,
        dip_unit: "mm",
        dip_litres: calculatedStock,
        tank_stock: calculatedStock,
        register_stock: expectedRegisterStock,
        gain_loss: differenceLiters,
        remarks: `Daily Dip: ${dipMm}mm | Calc: ${calculatedStock}L | Rec: ${receivedLiters}L | Sale: ${saleLiters}L`,
      });
    } catch (khataErr) {
      console.warn("Tank khata sync notice:", khataErr);
    }

    // 7. Audit in dip_variations table
    try {
      const varType = body.variation_type || (differenceLiters < 0 ? "low" : differenceLiters > 0 ? "high" : "normal");
      const rType = body.reason_type || (differenceLiters < 0 ? "بخارات" : differenceLiters > 0 ? "نئی وصولی" : "فروخت");
      const rNote = (body.reason_note || body.notes || "").trim();

      await db.insert(dipVariations).values({
        tank_id: tankId,
        pump_id: pumpId,
        previous_dip_mm: tank.current_dip_mm || 0,
        current_dip_mm: dipMm,
        difference_liters: differenceLiters,
        variation_type: varType,
        reason_type: rType,
        reason_note: rNote,
        date: dateStr,
        created_by: createdBy,
        created_at: nowIso,
      });
    } catch (varErr) {
      console.warn("Dip variation sync notice:", varErr);
    }

    return NextResponse.json({
      success: true,
      message: "روزانہ ڈِپ انٹری محفوظ کر لی گئی ہے (Daily dip recorded successfully)",
      calculated_stock_liters: calculatedStock,
      difference_liters: differenceLiters,
      stockLog: newLog,
    });
  } catch (error: any) {
    console.error("POST stock log error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
