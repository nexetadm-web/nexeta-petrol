import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  cashClosings, 
  dailyReadings, 
  productSales, 
  creditSales, 
  expenses 
} from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getTodayDatePK, formatDate, toStandardYMD } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const targetDate = dateParam ? formatDate(dateParam) : getTodayDatePK();
    const ymdDate = toStandardYMD(targetDate);

    // 1. Calculate Live Day Totals for the specified date
    // A. Nozzle Sales
    const allReadings = await db.select().from(dailyReadings);
    const dateReadings = allReadings.filter((r) => r.date === targetDate || r.date === ymdDate);
    const totalNozzleSaleRs = dateReadings.reduce((sum, r) => sum + (r.amount || 0), 0);

    // B. Oil & Products Sales
    const allProductSales = await db.select().from(productSales);
    const dateProductSales = allProductSales.filter((p) => p.date === targetDate || p.date === ymdDate);
    const totalOilProductsSaleRs = dateProductSales.reduce((sum, p) => sum + (p.total || 0), 0);

    // C. Total Sale = Nozzle + Products
    const totalSaleRs = totalNozzleSaleRs + totalOilProductsSaleRs;

    // D. Udhar Given on this date
    const allCreditSales = await db.select().from(creditSales);
    const dateUdharSales = allCreditSales.filter(
      (c) => (c.date === targetDate || c.date === ymdDate) && c.is_payment === 0
    );
    const totalUdharRs = dateUdharSales.reduce((sum, c) => sum + (c.total || 0), 0);

    // E. Kharcha / Expenses on this date
    const allExpenses = await db.select().from(expenses);
    const dateExpenses = allExpenses.filter((e) => e.date === targetDate || e.date === ymdDate);
    const totalKharchaRs = dateExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // F. Expected Cash In Hand = Total Sale - Udhar - Kharcha
    const expectedCashInHand = Math.max(0, totalSaleRs - totalUdharRs - totalKharchaRs);

    // 2. Fetch all saved Cash Closing records
    const closings = await db
      .select()
      .from(cashClosings)
      .orderBy(desc(cashClosings.id));

    return NextResponse.json({
      success: true,
      date: targetDate,
      liveTotals: {
        total_nozzle_sale_rs: totalNozzleSaleRs,
        total_oil_products_sale_rs: totalOilProductsSaleRs,
        total_sale_rs: totalSaleRs,
        total_udhar_rs: totalUdharRs,
        total_kharcha_rs: totalKharchaRs,
        expected_cash_in_hand: expectedCashInHand,
      },
      closings,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      date,
      shift,
      total_nozzle_sale_rs,
      total_oil_products_sale_rs,
      total_sale_rs,
      total_udhar_rs,
      total_kharcha_rs,
      expected_cash_in_hand,
      actual_cash_submitted_rs,
      submitted_by,
      receiver_name,
      notes,
    } = body;

    const targetDate = date ? formatDate(date) : getTodayDatePK();
    const targetShift = shift || "FullDay";

    const nNozzle = parseFloat(total_nozzle_sale_rs) || 0;
    const nOil = parseFloat(total_oil_products_sale_rs) || 0;
    const nSale = parseFloat(total_sale_rs) || (nNozzle + nOil);
    const nUdhar = parseFloat(total_udhar_rs) || 0;
    const nKharcha = parseFloat(total_kharcha_rs) || 0;
    const nExpected = parseFloat(expected_cash_in_hand) || (nSale - nUdhar - nKharcha);
    const nActual = parseFloat(actual_cash_submitted_rs) || 0;
    const nDiff = nActual - nExpected;

    const now = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" });

    const [newClosing] = await db
      .insert(cashClosings)
      .values({
        date: targetDate,
        shift: targetShift,
        total_nozzle_sale_rs: nNozzle,
        total_oil_products_sale_rs: nOil,
        total_sale_rs: nSale,
        total_udhar_rs: nUdhar,
        total_kharcha_rs: nKharcha,
        expected_cash_in_hand: nExpected,
        actual_cash_submitted_rs: nActual,
        difference_rs: nDiff,
        submitted_by: submitted_by || "",
        receiver_name: receiver_name || "",
        notes: notes || "",
        created_at: now,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "کیش کلوزنگ اور شفت ہینڈ اوور کامیابی سے محفوظ ہو گیا!",
      closing: newClosing,
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
      return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });
    }

    await db.delete(cashClosings).where(eq(cashClosings.id, Number(id)));

    return NextResponse.json({
      success: true,
      message: "کلوزنگ ریکارڈ کامیابی سے خارج کر دیا گیا",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
