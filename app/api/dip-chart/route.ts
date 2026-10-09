import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dipCharts } from "@/lib/schema";
import { asc } from "drizzle-orm";
import { calculateDipLitres } from "@/lib/dip-calculator";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fuelType = searchParams.get("fuel_type");
    const dipVal = searchParams.get("dip");
    const tankId = searchParams.get("tank_id");

    if (dipVal) {
      const dipNumber = parseFloat(dipVal);
      const targetFuel = fuelType || "Diesel";
      const tId = tankId ? parseInt(tankId) : 1;
      const calculatedLitres = await calculateDipLitres(tId, targetFuel, dipNumber);
      return NextResponse.json({
        success: true,
        dip: dipNumber,
        fuel_type: targetFuel,
        litres: calculatedLitres,
      });
    }

    let query = db.select().from(dipCharts).orderBy(asc(dipCharts.dip_value));
    const allCharts = await query;

    return NextResponse.json({
      success: true,
      charts: allCharts,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tank_id, fuel_type, dip_value, unit, litres } = body;

    if (!fuel_type || dip_value == null || litres == null) {
      return NextResponse.json(
        { success: false, error: "Fuel type, dip value, and litres are required" },
        { status: 400 }
      );
    }

    const [record] = await db
      .insert(dipCharts)
      .values({
        tank_id: tank_id ? Number(tank_id) : null,
        fuel_type,
        dip_value: parseFloat(dip_value),
        unit: unit || "inch",
        litres: parseFloat(litres),
      })
      .returning();

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
