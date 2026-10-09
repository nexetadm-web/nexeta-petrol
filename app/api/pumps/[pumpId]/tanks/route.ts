import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tanks, dipCharts } from "@/lib/schema";
import { getCurrentPumpId, getSession, getSuperAdminSession } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { generateLinearDipChart } from "@/lib/stock";

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

    const pumpTanks = await db.select().from(tanks).where(eq(tanks.pump_id, pumpId));

    // Map fields so both old and new properties are populated
    const formatted = pumpTanks.map((t) => ({
      id: t.id,
      pump_id: t.pump_id,
      name: t.tank_name || t.name,
      tank_name: t.tank_name || t.name,
      fuel_type: t.product || t.fuel_type,
      product: t.product || t.fuel_type,
      capacity: t.capacity_liters || t.capacity,
      capacity_liters: t.capacity_liters || t.capacity,
      tank_height_mm: t.tank_height_mm || 2500,
      current_dip_mm: t.current_dip_mm || 0,
      current_stock: t.current_stock_liters || t.current_stock,
      current_stock_liters: t.current_stock_liters || t.current_stock,
      fill_percentage: Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((t.current_stock_liters || t.current_stock) / (t.capacity_liters || t.capacity || 1)) * 100
          )
        )
      ),
      created_at: t.created_at,
    }));

    return NextResponse.json({ success: true, tanks: formatted });
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
    const tankName = (body.tank_name || body.name || "").trim();
    const product = (body.product || body.fuel_type || "Petrol").trim();
    const capacityLiters = parseFloat(body.capacity_liters || body.capacity || "40000");
    const tankHeightMm = parseFloat(body.tank_height_mm || "2500");

    if (!tankName) {
      return NextResponse.json({ success: false, error: "ٹینک کا نام درج کریں (Tank name required)" }, { status: 400 });
    }

    if (isNaN(capacityLiters) || capacityLiters <= 0) {
      return NextResponse.json({ success: false, error: "درست گنجائش درج کریں (Valid capacity required)" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    const [newTank] = await db
      .insert(tanks)
      .values({
        pump_id: pumpId,
        name: tankName,
        tank_name: tankName,
        fuel_type: product,
        product: product,
        capacity: capacityLiters,
        capacity_liters: capacityLiters,
        tank_height_mm: tankHeightMm > 0 ? tankHeightMm : 2500,
        current_dip_mm: 0,
        current_stock: 0,
        current_stock_liters: 0,
        created_at: nowIso,
      })
      .returning();

    // Optionally auto-generate an initial linear chart so the tank is ready immediately
    try {
      const initialPoints = generateLinearDipChart(
        tankHeightMm > 0 ? tankHeightMm : 2500,
        capacityLiters,
        100
      );

      for (const pt of initialPoints) {
        await db.insert(dipCharts).values({
          pump_id: pumpId,
          tank_id: newTank.id,
          fuel_type: product,
          dip_value: pt.dip_mm,
          dip_mm: pt.dip_mm,
          unit: "mm",
          litres: pt.volume_liters,
          volume_liters: pt.volume_liters,
        });
      }
    } catch (chartErr) {
      console.warn("Initial chart generate notice:", chartErr);
    }

    return NextResponse.json({ success: true, tank: newTank });
  } catch (error: any) {
    console.error("POST pump tank error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
