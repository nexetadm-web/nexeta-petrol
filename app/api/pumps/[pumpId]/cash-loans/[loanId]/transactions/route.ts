import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cashLoans, cashLoanTransactions } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { getTodayDatePK } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { pumpId: string; loanId: string } }
) {
  try {
    const pumpId = Number(params.pumpId);
    const loanId = Number(params.loanId);

    if (isNaN(pumpId) || isNaN(loanId)) {
      return NextResponse.json({ success: false, error: "Invalid parameters" }, { status: 400 });
    }

    const [loanRows, txRows] = await Promise.all([
      db.select().from(cashLoans).where(and(eq(cashLoans.id, loanId), eq(cashLoans.pump_id, pumpId))).limit(1),
      db
        .select()
        .from(cashLoanTransactions)
        .where(and(eq(cashLoanTransactions.loan_id, loanId), eq(cashLoanTransactions.pump_id, pumpId)))
        .orderBy(desc(cashLoanTransactions.id)),
    ]);

    if (loanRows.length === 0) {
      return NextResponse.json({ success: false, error: "ادھار ریکارڈ نہیں ملا" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      loan: loanRows[0],
      transactions: txRows,
    });
  } catch (error: any) {
    console.error("GET loan transactions error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { pumpId: string; loanId: string } }
) {
  try {
    const pumpId = Number(params.pumpId);
    const loanId = Number(params.loanId);

    if (isNaN(pumpId) || isNaN(loanId)) {
      return NextResponse.json({ success: false, error: "Invalid parameters" }, { status: 400 });
    }

    const body = await request.json();
    const amount = parseFloat(body.amount);
    const date = (body.date || getTodayDatePK()).trim();
    const note = (body.note || "").trim();
    const proofImageUrl = (body.proof_image_url || "").trim();

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "درست رقم درج کریں" }, { status: 400 });
    }

    // 1. Fetch current loan
    const loanRows = await db
      .select()
      .from(cashLoans)
      .where(and(eq(cashLoans.id, loanId), eq(cashLoans.pump_id, pumpId)))
      .limit(1);

    if (loanRows.length === 0) {
      return NextResponse.json({ success: false, error: "ادھار ریکارڈ نہیں ملا" }, { status: 404 });
    }

    const loan = loanRows[0];
    const currentRemaining = Number(loan.remaining_amount) || 0;

    if (currentRemaining <= 0) {
      return NextResponse.json({ success: false, error: "یہ ادھار پہلے ہی مکمل ادا شدہ ہے" }, { status: 400 });
    }

    const newRemaining = Math.max(0, Math.round((currentRemaining - amount) * 100) / 100);
    const newStatus = newRemaining <= 0 ? "paid" : "partial";
    const txType = loan.loan_type === "lena" ? "pay" : "receive";

    // 2. Insert transaction
    const newTx = await db
      .insert(cashLoanTransactions)
      .values({
        loan_id: loanId,
        pump_id: pumpId,
        type: txType,
        amount,
        date,
        note: note || (txType === "pay" ? "واپس ادائیگی" : "وصولی"),
        proof_image_url: proofImageUrl || null,
        created_at: new Date().toISOString(),
      })
      .returning();

    // 3. Update loan remaining amount & status
    await db
      .update(cashLoans)
      .set({
        remaining_amount: newRemaining,
        status: newStatus,
      })
      .where(eq(cashLoans.id, loanId));

    return NextResponse.json({
      success: true,
      message: txType === "pay" ? "ادائیگی کامیابی سے درج ہو گئی" : "وصولی کامیابی سے درج ہو گئی",
      transaction: newTx[0],
      updatedLoan: {
        ...loan,
        remaining_amount: newRemaining,
        status: newStatus,
      },
    });
  } catch (error: any) {
    console.error("POST loan transaction error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
