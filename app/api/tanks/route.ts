import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tanks, nozzles } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentPumpId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const allTanks = await db.select().from(tanks).where(eq(tanks.pump_id, pumpId));
    const allNozzles = await db.select().from(nozzles).where(eq(nozzles.pump_id, pumpId));

    // Group nozzles by tank
    const tanksWithNozzles = allTanks.map((t) => ({
      ...t,
      nozzles: allNozzles.filter((n) => n.tank_id === t.id),
    }));

    return NextResponse.json({ success: true, tanks: tanksWithNozzles });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const body = await request.json();
    const { name, fuel_type, capacity, current_stock } = body;

    if (!name || !fuel_type) {
      return NextResponse.json(
        { success: false, error: "Tank name and fuel type are required" },
        { status: 400 }
      );
    }

    const [newTank] = await db
      .insert(tanks)
      .values({
        pump_id: pumpId,
        name,
        fuel_type,
        capacity: Number(capacity) || 25000,
        current_stock: Number(current_stock) || 0,
      })
      .returning();

    return NextResponse.json({ success: true, tank: newTank });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const body = await request.json();
    const { id, name, fuel_type, capacity, current_stock } = body;

    if (!id || !name || !fuel_type) {
      return NextResponse.json(
        { success: false, error: "Tank ID, name, and fuel type are required" },
        { status: 400 }
      );
    }

    const [updatedTank] = await db
      .update(tanks)
      .set({
        name,
        fuel_type,
        capacity: capacity ? Number(capacity) : 25000,
        ...(current_stock !== undefined ? { current_stock: Number(current_stock) } : {}),
      })
      .where(and(eq(tanks.id, Number(id)), eq(tanks.pump_id, pumpId)))
      .returning();

    return NextResponse.json({ success: true, message: "ٹینک کامیابی سے اپ ڈیٹ ہو گیا!", tank: updatedTank });
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
      return NextResponse.json({ success: false, error: "Tank ID required" }, { status: 400 });
    }

    const countResult = await db.select().from(tanks).where(eq(tanks.pump_id, pumpId));
    if (countResult.length <= 1) {
      return NextResponse.json(
        { success: false, error: "کم از کم ایک ٹینک لازمی ہونا چاہیے (At least 1 tank must exist)" },
        { status: 400 }
      );
    }

    await db.delete(tanks).where(and(eq(tanks.id, Number(id)), eq(tanks.pump_id, pumpId)));
    return NextResponse.json({ success: true, message: "Tank deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
