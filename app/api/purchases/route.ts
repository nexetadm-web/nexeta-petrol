import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fuelPurchases, tanks } from "@/lib/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { getTodayDateString } from "@/lib/formatters";
import { getCurrentPumpId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const purchases = await db
      .select()
      .from(fuelPurchases)
      .where(eq(fuelPurchases.pump_id, pumpId))
      .orderBy(desc(fuelPurchases.date), desc(fuelPurchases.id));

    return NextResponse.json({ success: true, purchases });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const body = await request.json();
    const { date, fuel_type, qty, rate, supplier, tank_id } = body;

    if (!fuel_type || !qty || !rate || !supplier) {
      return NextResponse.json(
        { success: false, error: "Fuel type, quantity, rate, and supplier are required" },
        { status: 400 }
      );
    }

    const nQty = parseFloat(qty);
    const nRate = parseFloat(rate);
    const totalCost = nQty * nRate;
    const targetDate = date || getTodayDateString();

    const [purchase] = await db
      .insert(fuelPurchases)
      .values({
        pump_id: pumpId,
        date: targetDate,
        fuel_type,
        qty: nQty,
        rate: nRate,
        total_cost: totalCost,
        supplier,
      })
      .returning();

    // Auto update Tank current_stock for this pump
    if (tank_id) {
      await db
        .update(tanks)
        .set({
          current_stock: sql`${tanks.current_stock} + ${nQty}`,
        })
        .where(and(eq(tanks.id, Number(tank_id)), eq(tanks.pump_id, pumpId)));
    } else {
      const matchingTanks = await db
        .select()
        .from(tanks)
        .where(and(eq(tanks.fuel_type, fuel_type), eq(tanks.pump_id, pumpId)));

      if (matchingTanks.length > 0) {
        await db
          .update(tanks)
          .set({
            current_stock: sql`${tanks.current_stock} + ${nQty}`,
          })
          .where(and(eq(tanks.id, matchingTanks[0].id), eq(tanks.pump_id, pumpId)));
      }
    }

    return NextResponse.json({
      success: true,
      message: "فیول خریداری کا اندراج ہو گیا اور ٹینک کا اسٹاک بڑھا دیا گیا",
      purchase,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
