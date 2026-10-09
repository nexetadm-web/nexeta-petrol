import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nozzles, tanks } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentPumpId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const allNozzles = await db
      .select({
        id: nozzles.id,
        name: nozzles.name,
        tank_id: nozzles.tank_id,
        tankName: tanks.name,
        fuelType: tanks.fuel_type,
      })
      .from(nozzles)
      .leftJoin(tanks, eq(nozzles.tank_id, tanks.id))
      .where(eq(nozzles.pump_id, pumpId));

    return NextResponse.json({ success: true, nozzles: allNozzles });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const body = await request.json();
    const { name, tank_id } = body;

    if (!name || !tank_id) {
      return NextResponse.json(
        { success: false, error: "Nozzle name and linked tank are required" },
        { status: 400 }
      );
    }

    const existingNozzles = await db.select().from(nozzles).where(eq(nozzles.pump_id, pumpId));
    if (existingNozzles.length >= 20) {
      return NextResponse.json(
        {
          success: false,
          error: "زیادہ سے زیادہ 20 نوزلز شامل کیے جا سکتے ہیں (Maximum 20 nozzles supported)",
        },
        { status: 400 }
      );
    }

    const [newNozzle] = await db
      .insert(nozzles)
      .values({
        pump_id: pumpId,
        name,
        tank_id: Number(tank_id),
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "Nozzle added successfully",
      nozzle: newNozzle,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const body = await request.json();
    const { id, name, tank_id } = body;

    if (!id || !name || !tank_id) {
      return NextResponse.json(
        { success: false, error: "Nozzle ID, name, and linked tank are required" },
        { status: 400 }
      );
    }

    const [updatedNozzle] = await db
      .update(nozzles)
      .set({
        name,
        tank_id: Number(tank_id),
      })
      .where(and(eq(nozzles.id, Number(id)), eq(nozzles.pump_id, pumpId)))
      .returning();

    return NextResponse.json({
      success: true,
      message: "نوزل کامیابی سے اپ ڈیٹ ہو گئی!",
      nozzle: updatedNozzle,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Nozzle ID is required" }, { status: 400 });
    }

    const existingNozzles = await db.select().from(nozzles).where(eq(nozzles.pump_id, pumpId));
    if (existingNozzles.length <= 4) {
      return NextResponse.json(
        {
          success: false,
          error: "کم از کم 4 نوزلز لازمی ہیں (Minimum 4 nozzles must be maintained)",
        },
        { status: 400 }
      );
    }

    await db.delete(nozzles).where(and(eq(nozzles.id, Number(id)), eq(nozzles.pump_id, pumpId)));

    return NextResponse.json({
      success: true,
      message: "نوزل کامیابی سے ڈیلیٹ ہو گئی (Nozzle deleted successfully)",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
