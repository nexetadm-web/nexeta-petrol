import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const allEmployees = await db
      .select()
      .from(employees)
      .orderBy(desc(employees.id));

    return NextResponse.json({ success: true, employees: allEmployees });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
        name,
        phone,
        duty_type,
        salary: salary ? parseFloat(salary) : 0,
        status: status || "Active",
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "ملازم کامیابی سے شامل کر لیا گیا (Employee added successfully)",
      employee: emp,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
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
      .where(eq(employees.id, Number(id)))
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    await db.delete(employees).where(eq(employees.id, Number(id)));
    return NextResponse.json({ success: true, message: "ملازم کا ریکارڈ حذف کر دیا گیا" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
