import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employeeDuty, employees, nozzles } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { formatDate, getTodayDatePK, toStandardYMD } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const targetDate = dateParam ? formatDate(dateParam) : getTodayDatePK();
    const ymdDate = toStandardYMD(targetDate);

    // Fetch duties for target date (supports both DD-MM-YYYY and YYYY-MM-DD stored dates)
    const duties = await db
      .select({
        id: employeeDuty.id,
        date: employeeDuty.date,
        employee_id: employeeDuty.employee_id,
        employeeName: employees.name,
        employeePhone: employees.phone,
        duty_type: employees.duty_type,
        salary: employees.salary,
        shift: employeeDuty.shift,
        nozzle_assigned: employeeDuty.nozzle_assigned,
        present: employeeDuty.present,
        notes: employeeDuty.notes,
      })
      .from(employeeDuty)
      .leftJoin(employees, eq(employeeDuty.employee_id, employees.id))
      .orderBy(desc(employeeDuty.id));

    // Filter by target date
    const filtered = duties.filter(
      (d) => d.date === targetDate || d.date === ymdDate || formatDate(d.date) === targetDate
    );

    // Also fetch all nozzles for easy assignment in UI
    const allNozzles = await db.select().from(nozzles);

    return NextResponse.json({
      success: true,
      date: targetDate,
      duties: filtered,
      nozzles: allNozzles,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, employee_id, shift, nozzle_assigned, present, notes } = body;

    if (!employee_id || !shift) {
      return NextResponse.json(
        { success: false, error: "Employee and Shift are required" },
        { status: 400 }
      );
    }

    const dutyDate = date ? formatDate(date) : getTodayDatePK();

    const [record] = await db
      .insert(employeeDuty)
      .values({
        date: dutyDate,
        employee_id: Number(employee_id),
        shift: shift || "Morning",
        nozzle_assigned: nozzle_assigned || "",
        present: present !== undefined ? (present ? 1 : 0) : 1,
        notes: notes || "",
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "ڈیوٹی کامیابی سے تفویض کر دی گئی (Duty assigned successfully)",
      duty: record,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, present } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Duty ID is required" }, { status: 400 });
    }

    await db
      .update(employeeDuty)
      .set({
        present: present ? 1 : 0,
      })
      .where(eq(employeeDuty.id, Number(id)));

    return NextResponse.json({
      success: true,
      message: "حاضری اپ ڈیٹ ہو گئی (Attendance updated)",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, shift, nozzle_assigned, present, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Duty ID is required" }, { status: 400 });
    }

    const [record] = await db
      .update(employeeDuty)
      .set({
        shift: shift || "Morning",
        nozzle_assigned: nozzle_assigned || "",
        present: present !== undefined ? (present ? 1 : 0) : 1,
        notes: notes || "",
      })
      .where(eq(employeeDuty.id, Number(id)))
      .returning();

    return NextResponse.json({
      success: true,
      message: "ڈیوٹی کی تفصیلات کامیابی سے اپ ڈیٹ ہو گئیں!",
      duty: record,
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

    await db.delete(employeeDuty).where(eq(employeeDuty.id, Number(id)));
    return NextResponse.json({ success: true, message: "ڈیوٹی کا ریکارڈ حذف کر دیا گیا" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
