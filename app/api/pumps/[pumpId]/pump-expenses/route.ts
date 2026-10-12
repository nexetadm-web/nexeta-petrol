import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pumpExpenses, pumps, dailyReadings, expenses } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { getTodayDatePK } from "@/lib/formatters";

export const dynamic = "force-dynamic";

const ALL_CATEGORIES = [
  { key: "fuel_purchase", labelUrdu: "تیل خریداری", labelEn: "Fuel Purchase", emoji: "⛽", color: "#f59e0b" },
  { key: "staff_salaries", labelUrdu: "سٹاف تنخواہیں", labelEn: "Staff Salaries", emoji: "👨‍🔧", color: "#8b5cf6" },
  { key: "electricity_bill", labelUrdu: "بجلی کا بل", labelEn: "Electricity Bill", emoji: "💡", color: "#3b82f6" },
  { key: "rent", labelUrdu: "کرایہ پمپ", labelEn: "Rent", emoji: "🏠", color: "#6366f1" },
  { key: "maintenance", labelUrdu: "مرمت و مینٹیننس", labelEn: "Maintenance", emoji: "🔧", color: "#ec4899" },
  { key: "oil_lubricants", labelUrdu: "موبل آئل و سامان", labelEn: "Oil & Lubricants", emoji: "🛢️", color: "#14b8a6" },
  { key: "office_misc", labelUrdu: "دفتر و متفرق", labelEn: "Office & Misc", emoji: "☕", color: "#f97316" },
  { key: "bank_charges", labelUrdu: "بینک چارجز", labelEn: "Bank Charges", emoji: "🏦", color: "#64748b" },
];

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
    const period = searchParams.get("period") || "all"; // 'today' | 'week' | 'month' | 'last_month' | 'custom' | 'all'
    const startDate = searchParams.get("start_date"); // DD-MM-YYYY
    const endDate = searchParams.get("end_date"); // DD-MM-YYYY
    const categoryFilter = searchParams.get("category"); // specific category or 'all'
    const supplierFilter = searchParams.get("supplier"); // supplier search or 'all'

    const todayStr = getTodayDatePK(); // e.g. "12-10-2026"
    const todayParts = todayStr.split("-");
    const currentMonth = todayParts.length === 3 ? `${todayParts[1]}-${todayParts[2]}` : "";
    const lastMonthNum = todayParts.length === 3 ? String(Number(todayParts[1]) - 1).padStart(2, "0") : "";
    const lastMonth = lastMonthNum !== "00" ? `${lastMonthNum}-${todayParts[2]}` : "";

    // 1. Fetch pump profile
    const pumpRows = await db.select().from(pumps).where(eq(pumps.id, pumpId)).limit(1);
    const pump = pumpRows[0] || {
      id: pumpId,
      pump_name: "Nexeta Petrol",
      owner_name: "Owner",
      phone: "0300-1234567",
      city: "Lahore",
      address: "GT Road, Lahore, Pakistan",
      logo_url: null,
    };

    // 2. Fetch all expenses for this pump
    const allExpenses = await db
      .select()
      .from(pumpExpenses)
      .where(eq(pumpExpenses.pump_id, pumpId))
      .orderBy(desc(pumpExpenses.id));

    // Also get today's fuel sales to calculate Cash in Hand
    const todaySales = await db
      .select({ amount: dailyReadings.amount })
      .from(dailyReadings)
      .where(and(eq(dailyReadings.pump_id, pumpId), eq(dailyReadings.date, todayStr)));
    const todayFuelSaleRs = todaySales.reduce((sum, s) => sum + (s.amount || 0), 0);

    // 3. Calculate Top KPI Summary
    let todayExpense = 0;
    let thisMonthTotal = 0;

    allExpenses.forEach((e) => {
      if (e.expense_date === todayStr) {
        todayExpense += e.amount || 0;
      }
      if (currentMonth && e.expense_date.includes(currentMonth)) {
        thisMonthTotal += e.amount || 0;
      }
    });

    // 4. Calculate Category Analytics for current month
    const categoryTotalsMap: Record<string, { total: number; count: number; recent: any[] }> = {};
    ALL_CATEGORIES.forEach((c) => {
      categoryTotalsMap[c.key] = { total: 0, count: 0, recent: [] };
    });

    allExpenses.forEach((e) => {
      const catKey = e.category || "office_misc";
      if (!categoryTotalsMap[catKey]) {
        categoryTotalsMap[catKey] = { total: 0, count: 0, recent: [] };
      }
      // Month-wise total for cards
      if (!currentMonth || e.expense_date.includes(currentMonth)) {
        categoryTotalsMap[catKey].total += e.amount || 0;
        categoryTotalsMap[catKey].count += 1;
      }
      // Recent transactions (up to 3)
      if (categoryTotalsMap[catKey].recent.length < 3) {
        categoryTotalsMap[catKey].recent.push(e);
      }
    });

    // Determine Highest Category
    let highestCat = { name: "کوئی نہیں", category: "none", amount: 0, emoji: "📊" };
    ALL_CATEGORIES.forEach((c) => {
      const catData = categoryTotalsMap[c.key];
      if (catData && catData.total > highestCat.amount) {
        highestCat = {
          name: `${c.labelUrdu} (${c.labelEn})`,
          category: c.key,
          amount: catData.total,
          emoji: c.emoji,
        };
      }
    });

    const categoryCards = ALL_CATEGORIES.map((c) => {
      const catData = categoryTotalsMap[c.key] || { total: 0, count: 0, recent: [] };
      const pct = thisMonthTotal > 0 ? Math.round((catData.total / thisMonthTotal) * 100) : 0;
      return {
        key: c.key,
        labelUrdu: c.labelUrdu,
        labelEn: c.labelEn,
        emoji: c.emoji,
        color: c.color,
        thisMonthTotal: catData.total,
        percentage: pct,
        transactionCount: catData.count,
        recentTransactions: catData.recent,
      };
    });

    // Cash in Hand calculation (Estimated today's sales minus today's expenses)
    const cashInHand = Math.max(0, Math.round((todayFuelSaleRs - todayExpense) * 100) / 100);

    // 5. Filter expenses list according to selected period and filters
    let filteredList = allExpenses;

    if (period === "today") {
      filteredList = filteredList.filter((e) => e.expense_date === todayStr);
    } else if (period === "month") {
      filteredList = filteredList.filter((e) => currentMonth && e.expense_date.includes(currentMonth));
    } else if (period === "last_month") {
      filteredList = filteredList.filter((e) => lastMonth && e.expense_date.includes(lastMonth));
    } else if (period === "custom" && startDate && endDate) {
      filteredList = filteredList.filter(
        (e) => e.expense_date >= startDate && e.expense_date <= endDate
      );
    }

    if (categoryFilter && categoryFilter !== "all") {
      filteredList = filteredList.filter((e) => e.category === categoryFilter);
    }

    if (supplierFilter && supplierFilter !== "all") {
      filteredList = filteredList.filter((e) =>
        (e.supplier_name || "").toLowerCase().includes(supplierFilter.toLowerCase())
      );
    }

    const totalFilteredAmount = filteredList.reduce((sum, e) => sum + (e.amount || 0), 0);

    // 6. Chart Data Generation
    // Bar Chart: Category vs Amount for the filtered period
    const filteredCatSums: Record<string, number> = {};
    filteredList.forEach((e) => {
      const k = e.category || "office_misc";
      filteredCatSums[k] = (filteredCatSums[k] || 0) + (e.amount || 0);
    });

    const barChartData = ALL_CATEGORIES.map((c) => ({
      name: `${c.emoji} ${c.labelEn}`,
      category: c.key,
      amount: filteredCatSums[c.key] || 0,
      fill: c.color,
    }));

    // Pie Chart: Distribution
    const pieChartData = ALL_CATEGORIES.filter((c) => (filteredCatSums[c.key] || 0) > 0).map((c) => ({
      name: `${c.emoji} ${c.labelEn}`,
      value: filteredCatSums[c.key] || 0,
      color: c.color,
    }));

    // Daily Trend (Group filtered by date)
    const dateMap: Record<string, number> = {};
    filteredList.forEach((e) => {
      dateMap[e.expense_date] = (dateMap[e.expense_date] || 0) + (e.amount || 0);
    });
    const dailyTrend = Object.keys(dateMap)
      .sort()
      .map((d) => ({
        date: d,
        expense: dateMap[d],
      }));

    return NextResponse.json({
      success: true,
      pump: {
        id: pump.id,
        name: pump.pump_name,
        pump_name: pump.pump_name,
        owner_name: pump.owner_name,
        phone: pump.phone,
        city: pump.city,
        address: (pump as any).address || `${pump.city}, Pakistan`,
        logo_url: (pump as any).logo_url || null,
      },
      summary: {
        todayExpense,
        thisMonthTotal,
        highestCategory: highestCat,
        todaySale: todayFuelSaleRs,
        cashInHand,
        totalEntries: allExpenses.length,
        filteredCount: filteredList.length,
        totalFilteredAmount,
      },
      categoryCards,
      barChartData,
      pieChartData,
      dailyTrend,
      expenses: filteredList,
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
    const category = (body.category || "office_misc").trim();
    const amount = parseFloat(body.amount);
    const expenseDate = (body.expense_date || body.date || getTodayDatePK()).trim();
    const description = (body.description || body.note || "").trim();
    const supplierName = (body.supplier_name || body.supplier || "").trim();
    const billNo = (body.bill_no || "").trim();
    const paymentMethod = (body.payment_method || "cash").trim();
    const billImageUrl = (body.bill_image_url || "").trim();

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "درست رقم درج کریں" }, { status: 400 });
    }

    const [newExpense] = await db
      .insert(pumpExpenses)
      .values({
        pump_id: pumpId,
        category,
        amount,
        description: description || null,
        expense_date: expenseDate,
        supplier_name: supplierName || null,
        bill_no: billNo || null,
        payment_method: paymentMethod,
        bill_image_url: billImageUrl || null,
        created_at: new Date().toISOString(),
      })
      .returning();

    // Also sync to legacy expenses table for backwards compatibility
    try {
      await db.insert(expenses).values({
        pump_id: pumpId,
        date: expenseDate,
        type: category,
        category,
        amount,
        description: description || null,
        note: description || null,
        bill_image_url: billImageUrl || null,
        created_by: "Owner",
        created_at: new Date().toISOString(),
      });
    } catch (e) {}

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

    await db.delete(pumpExpenses).where(and(eq(pumpExpenses.id, id), eq(pumpExpenses.pump_id, pumpId)));

    return NextResponse.json({
      success: true,
      message: "خرچہ حذف کر دیا گیا",
    });
  } catch (error: any) {
    console.error("DELETE pump expense error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
