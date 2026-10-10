import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nozzleSales, nozzles, tanks } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
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

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || getTodayDatePK();
    const tankIdParam = searchParams.get("tankId");

    const [allTanks, allNozzles, salesRows] = await Promise.all([
      db.select().from(tanks).where(eq(tanks.pump_id, pumpId)),
      db.select().from(nozzles).where(eq(nozzles.pump_id, pumpId)),
      db
        .select()
        .from(nozzleSales)
        .where(
          and(
            eq(nozzleSales.pump_id, pumpId),
            eq(nozzleSales.date, date)
          )
        )
        .orderBy(desc(nozzleSales.id)),
    ]);

    const salesMap = new Map<string, any>();
    salesRows.forEach((s) => salesMap.set(`${s.tank_id}-${s.nozzle_no}`, s));

    // Format nozzles with today's readings if recorded
    const formattedNozzles = allNozzles
      .filter((n) => !tankIdParam || String(n.tank_id) === tankIdParam)
      .map((n) => {
        const existingSale = salesMap.get(`${n.tank_id}-${n.name}`);
        const t = allTanks.find((tank) => tank.id === n.tank_id);

        return {
          id: n.id,
          name: n.name,
          tank_id: n.tank_id,
          tank_name: t ? t.tank_name || t.name : `Tank #${n.tank_id}`,
          product: t ? t.product || t.fuel_type : "Fuel",
          opening_reading: existingSale ? existingSale.opening_reading : 0,
          closing_reading: existingSale ? existingSale.closing_reading : 0,
          sale_liters: existingSale ? existingSale.sale_liters : 0,
          entered_by: existingSale ? existingSale.entered_by : "Nozzle Operator",
          has_entry: Boolean(existingSale),
        };
      });

    return NextResponse.json({
      success: true,
      date,
      nozzles: formattedNozzles,
      tanks: allTanks.map((t) => ({
        id: t.id,
        tank_no: t.tank_no || t.id,
        tank_name: t.tank_name || t.name,
        product: t.product || t.fuel_type,
        current_stock: t.current_stock_liters || t.current_stock,
        capacity: t.capacity_liters || t.capacity,
      })),
    });
  } catch (error: any) {
    console.error("GET nozzle sales error:", error);
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
    const nozzleNo = (body.nozzle_no || "").trim();
    const dateStr = (body.date || getTodayDatePK()).trim();
    const opening = parseFloat(body.opening_reading) || 0;
    const closing = parseFloat(body.closing_reading) || 0;
    const saleLiters = Math.max(0, Math.round((closing - opening) * 100) / 100);
    const enteredBy = (body.entered_by || "Operator").trim();

    if (isNaN(tankId) || !nozzleNo) {
      return NextResponse.json({ success: false, error: "Tank ID & Nozzle Name required" }, { status: 400 });
    }

    // Check if reading for this nozzle on this date exists -> update or insert
    const existing = await db
      .select()
      .from(nozzleSales)
      .where(
        and(
          eq(nozzleSales.pump_id, pumpId),
          eq(nozzleSales.tank_id, tankId),
          eq(nozzleSales.nozzle_no, nozzleNo),
          eq(nozzleSales.date, dateStr)
        )
      );

    if (existing.length > 0) {
      await db
        .update(nozzleSales)
        .set({
          opening_reading: opening,
          closing_reading: closing,
          sale_liters: saleLiters,
          entered_by: enteredBy,
        })
        .where(eq(nozzleSales.id, existing[0].id));
    } else {
      await db.insert(nozzleSales).values({
        pump_id: pumpId,
        tank_id: tankId,
        nozzle_no: nozzleNo,
        date: dateStr,
        opening_reading: opening,
        closing_reading: closing,
        sale_liters: saleLiters,
        entered_by: enteredBy,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: `نوزل "${nozzleNo}" کی ریڈنگ محفوظ ہو گئی (${saleLiters} L)`,
      sale_liters: saleLiters,
    });
  } catch (error: any) {
    console.error("POST nozzle sale error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
