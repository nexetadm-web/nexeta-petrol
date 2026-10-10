import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailyReconciliation, tanks } from "@/lib/schema";
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
    const tankIdParam = searchParams.get("tankId");

    const [allTanks, reconRows] = await Promise.all([
      db.select().from(tanks).where(eq(tanks.pump_id, pumpId)),
      db
        .select()
        .from(dailyReconciliation)
        .where(
          tankIdParam
            ? and(
                eq(dailyReconciliation.pump_id, pumpId),
                eq(dailyReconciliation.tank_id, Number(tankIdParam))
              )
            : eq(dailyReconciliation.pump_id, pumpId)
        )
        .orderBy(desc(dailyReconciliation.id))
        .limit(50),
    ]);

    const tankMap = new Map<number, any>();
    allTanks.forEach((t) => tankMap.set(t.id, t));

    const enriched = reconRows.map((r) => {
      const t = tankMap.get(r.tank_id);
      return {
        ...r,
        tank_name: t ? t.tank_name || t.name : `Tank #${r.tank_id}`,
        product: t ? t.product || t.fuel_type : "Fuel",
      };
    });

    return NextResponse.json({
      success: true,
      reconciliations: enriched,
    });
  } catch (error: any) {
    console.error("GET reconciliations error:", error);
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
    const dateStr = (body.date || getTodayDatePK()).trim();
    const dipLossLiters = parseFloat(body.dip_loss_liters) || 0;
    const nozzleSaleLiters = parseFloat(body.nozzle_sale_liters) || 0;
    const notes = (body.notes || "").trim();

    if (isNaN(tankId)) {
      return NextResponse.json({ success: false, error: "Tank ID required" }, { status: 400 });
    }

    // Difference between physical dip loss and nozzle sales meters
    const difference = Math.round((dipLossLiters - nozzleSaleLiters) * 100) / 100;
    const status = Math.abs(difference) > 20 ? "mismatch" : "matched";

    const [saved] = await db
      .insert(dailyReconciliation)
      .values({
        pump_id: pumpId,
        tank_id: tankId,
        date: dateStr,
        dip_loss_liters: dipLossLiters,
        nozzle_sale_liters: nozzleSaleLiters,
        difference,
        status,
        notes,
        created_at: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      message:
        status === "matched"
          ? "✅ مبارک ہو! نوزل میٹر اور ٹینک ڈِپ مکمل میچ ہیں"
          : `⚠️ توجہ: نوزل میٹر اور ٹینک ڈِپ میں ${Math.abs(difference)} لیٹر کا فرق ہے`,
      difference,
      status,
      reconciliation: saved,
    });
  } catch (error: any) {
    console.error("POST reconciliation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
