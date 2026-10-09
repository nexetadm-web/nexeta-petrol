import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import { getCurrentPumpId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const allEmployees = await db
      .select()
      .from(employees)
      .where(eq(employees.pump_id, pumpId))
      .orderBy(desc(employees.id));

    return NextResponse.json({ success: true, employees: allEmployees });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const body = await request.json();
    const { name, phone, duty_type, salary, status } = body;

    if (!name || !phone || !duty_type) {
      return NextResponse.json(
        { success: false, error: "Name, phone, and duty type are required" },
        { status: 400 }
      );
    }

    const [emp] = await db
      .insert(employees)
      .values({
        pump_id: pumpId,
        name,
        phone,
        duty_type,
        salary: salary ? parseFloat(salary) : 0,
        status: status || "Active",
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "ملازم کامیابی سے شامل کر لیا گیا",
      employee: emp,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const body = await request.json();
    const { id, name, phone, duty_type, salary, status } = body;

    if (!id || !name || !phone || !duty_type) {
      return NextResponse.json(
        { success: false, error: "ID, Name, phone, and duty type are required" },
        { status: 400 }
      );
    }

    const [emp] = await db
      .update(employees)
      .set({
        name,
        phone,
        duty_type,
        salary: salary ? parseFloat(salary) : 0,
        status: status || "Active",
      })
      .where(and(eq(employees.id, Number(id)), eq(employees.pump_id, pumpId)))
      .returning();

    return NextResponse.json({
      success: true,
      message: "ملازم کی معلومات کامیابی سے اپ ڈیٹ ہو گئیں!",
      employee: emp,
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
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    await db.delete(employees).where(and(eq(employees.id, Number(id)), eq(employees.pump_id, pumpId)));
    return NextResponse.json({ success: true, message: "ملازم کا ریکارڈ حذف کر دیا گیا" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
