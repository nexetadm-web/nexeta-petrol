import { NextResponse } from "next/server";
import { db } from "@/lib/db";
 import { dipVariations, tanks } from "@/lib/schema";
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

    let whereClause = eq(dipVariations.pump_id, pumpId);
    if (tankIdParam) {
      const tankId = Number(tankIdParam);
      if (!isNaN(tankId)) {
        whereClause = and(eq(dipVariations.pump_id, pumpId), eq(dipVariations.tank_id, tankId)) as any;
      }
    }

    const [allTanks, variationsList] = await Promise.all([
      db.select().from(tanks).where(eq(tanks.pump_id, pumpId)),
      db
        .select()
        .from(dipVariations)
        .where(whereClause)
        .orderBy(desc(dipVariations.id)),
    ]);

    const tankMap = new Map<number, any>();
    allTanks.forEach((t) => tankMap.set(t.id, t));

    const enriched = variationsList.map((v) => {
      const t = tankMap.get(v.tank_id);
      return {
        ...v,
        tank_name: t ? t.tank_name || t.name : `Tank #${v.tank_id}`,
        product: t ? t.product || t.fuel_type : "Fuel",
        capacity_liters: t ? t.capacity_liters || t.capacity : 40000,
        height_mm: t ? t.height_mm || t.tank_height_mm || 2500 : 2500,
      };
    });

    return NextResponse.json({
      success: true,
      variations: enriched,
      tanks: allTanks.map((t) => ({
        id: t.id,
        tank_no: t.tank_no || t.id,
        tank_name: t.tank_name || t.name,
        product: t.product || t.fuel_type,
      })),
    });
  } catch (error: any) {
    console.error("GET dip variations error:", error);
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
    const currentDipMm = parseFloat(body.current_dip_mm);
    const previousDipMm = parseFloat(body.previous_dip_mm ?? "0") || 0;
    const differenceLiters = parseFloat(body.difference_liters ?? "0") || 0;
    const variationType = body.variation_type || (differenceLiters < 0 ? "low" : differenceLiters > 0 ? "high" : "normal");
    const reasonType = (body.reason_type || "دیگر").trim();
    const reasonNote = (body.reason_note || "").trim();
    const dateStr = (body.date || getTodayDatePK()).trim();
    const createdBy = (body.created_by || "Manager").trim();

    if (isNaN(tankId) || isNaN(currentDipMm)) {
      return NextResponse.json(
        { success: false, error: "ٹینک اور موجودہ ڈِپ (mm) ضروری ہیں" },
        { status: 400 }
      );
    }

    const [newRow] = await db
      .insert(dipVariations)
      .values({
        tank_id: tankId,
        pump_id: pumpId,
        previous_dip_mm: previousDipMm,
        current_dip_mm: currentDipMm,
        difference_liters: differenceLiters,
        variation_type: variationType,
        reason_type: reasonType,
        reason_note: reasonNote,
        date: dateStr,
        created_by: createdBy,
        created_at: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "ڈِپ ویرینشن کامیابی سے محفوظ ہو گئی",
      variation: newRow,
    });
  } catch (error: any) {
    console.error("POST dip variation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
