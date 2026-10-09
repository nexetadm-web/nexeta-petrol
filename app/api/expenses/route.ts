import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses } from "@/lib/schema";
import { desc, eq, and } from "drizzle-orm";
import { getTodayDateString } from "@/lib/formatters";
import { getCurrentPumpId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (date) {
      const results = await db
        .select()
        .from(expenses)
        .where(and(eq(expenses.date, date), eq(expenses.pump_id, pumpId)))
        .orderBy(desc(expenses.id));
      return NextResponse.json({ success: true, expenses: results });
    }

    const allExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.pump_id, pumpId))
      .orderBy(desc(expenses.date), desc(expenses.id))
      .limit(100);

    return NextResponse.json({ success: true, expenses: allExpenses });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const body = await request.json();
    const { date, type, amount, note } = body;

    if (!type || amount == null) {
      return NextResponse.json(
        { success: false, error: "Expense category and amount are required" },
        { status: 400 }
      );
    }

    const targetDate = date || getTodayDateString();

    const [newExpense] = await db
      .insert(expenses)
      .values({
        pump_id: pumpId,
        date: targetDate,
        type,
        amount: Number(amount),
        note: note || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "خرچہ درج ہو گیا",
      expense: newExpense,
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
      return NextResponse.json({ success: false, error: "Expense ID is required" }, { status: 400 });
    }

    await db.delete(expenses).where(and(eq(expenses.id, Number(id)), eq(expenses.pump_id, pumpId)));

    return NextResponse.json({ success: true, message: "خرچہ حذف کر دیا گیا" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
