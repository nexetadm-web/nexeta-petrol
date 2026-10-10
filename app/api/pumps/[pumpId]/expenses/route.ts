import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses, pumps } from "@/lib/schema";
import { eq, and, desc, like } from "drizzle-orm";
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
    const dateFilter = searchParams.get("date"); // e.g. "12-10-2026"
    const categoryFilter = searchParams.get("category"); // 'electricity' | 'tea' ...
    const today = getTodayDatePK();

    // Fetch pump name
    const pumpRows = await db.select({ id: pumps.id, pump_name: pumps.pump_name }).from(pumps).where(eq(pumps.id, pumpId)).limit(1);
    const pumpName = pumpRows[0]?.pump_name || "Nexeta Petrol";

    // Fetch all expenses for this pump
    const allPumpExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.pump_id, pumpId))
      .orderBy(desc(expenses.id));

    // Calculate Today's Expense
    const todayExpense = allPumpExpenses
      .filter((e) => e.date === today)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Calculate This Month's Expense (matches current month part: MM-YYYY or YYYY-MM)
    const currentMonthParts = today.split("-"); // ["12", "10", "2026"]
    const monthKey = currentMonthParts.length === 3 ? `${currentMonthParts[1]}-${currentMonthParts[2]}` : "";
    const thisMonthExpense = allPumpExpenses
      .filter((e) => monthKey && e.date.includes(monthKey))
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Apply filters for the list
    let filtered = allPumpExpenses;
    if (dateFilter) {
      filtered = filtered.filter((e) => e.date === dateFilter);
    }
    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter(
        (e) => (e.category || "").toLowerCase() === categoryFilter.toLowerCase() ||
               (e.type || "").toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    return NextResponse.json({
      success: true,
      pump_name: pumpName,
      today,
      summary: {
        todayExpense,
        thisMonthExpense,
        totalEntries: allPumpExpenses.length,
        filteredCount: filtered.length,
      },
      expenses: filtered,
    });
  } catch (error: any) {
    console.error("GET pump expenses error:", error);
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
    const category = (body.category || "other").trim().toLowerCase();
    const amount = parseFloat(body.amount);
    const date = (body.date || getTodayDatePK()).trim();
    const description = (body.description || body.note || "").trim();
    const billImageUrl = (body.bill_image_url || "").trim();
    const createdBy = (body.created_by || "Manager").trim();

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "درست رقم درج کریں" }, { status: 400 });
    }

    // Map Urdu / standard display category to type for backwards compatibility
    const categoryMap: Record<string, string> = {
      electricity: "Bijli",
      tea: "Tea/Khaba",
      repair: "Maintenance",
      staff_advance: "Salary",
      cleaning: "Other",
      rent: "Other",
      other: "Other",
    };
    const legacyType = categoryMap[category] || "Other";

    const [newExpense] = await db
      .insert(expenses)
      .values({
        pump_id: pumpId,
        date,
        type: legacyType,
        category,
        amount,
        description: description || legacyType,
        note: description || legacyType,
        bill_image_url: billImageUrl || null,
        created_by: createdBy,
        created_at: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "خرچہ کامیابی سے درج ہو گیا ہے",
      expense: newExpense,
    });
  } catch (error: any) {
    console.error("POST pump expense error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { pumpId: string } }
) {
  try {
    const pumpId = Number(params.pumpId);
    if (isNaN(pumpId)) {
      return NextResponse.json({ success: false, error: "Invalid pump ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!id || isNaN(id)) {
      return NextResponse.json({ success: false, error: "Invalid expense ID" }, { status: 400 });
    }

    await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.pump_id, pumpId)));

    return NextResponse.json({
      success: true,
      message: "خرچہ حذف کر دیا گیا",
    });
  } catch (error: any) {
    console.error("DELETE pump expense error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
