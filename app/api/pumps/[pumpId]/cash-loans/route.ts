import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cashLoans, pumps } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
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
    const typeFilter = searchParams.get("type"); // "lena" | "dena" | null

    const [pumpRows, loansList] = await Promise.all([
      db.select({ id: pumps.id, pump_name: pumps.pump_name }).from(pumps).where(eq(pumps.id, pumpId)).limit(1),
      db
        .select()
        .from(cashLoans)
        .where(eq(cashLoans.pump_id, pumpId))
        .orderBy(desc(cashLoans.id)),
    ]);

    const pumpName = pumpRows[0]?.pump_name || "Nexeta Petrol";

    // Calculate totals based on remaining amount
    let totalLena = 0; // Payable (Maine Liya - wapas dena hai)
    let totalDena = 0; // Receivable (Maine Diya - wapas lena hai)

    loansList.forEach((loan) => {
      const remaining = Number(loan.remaining_amount) || 0;
      if (loan.loan_type === "lena") {
        totalLena += remaining;
      } else if (loan.loan_type === "dena") {
        totalDena += remaining;
      }
    });

    const netBalance = totalDena - totalLena;

    // Filter if requested
    let filteredLoans = loansList;
    if (typeFilter === "lena" || typeFilter === "dena") {
      filteredLoans = loansList.filter((l) => l.loan_type === typeFilter);
    }

    return NextResponse.json({
      success: true,
      pump_name: pumpName,
      summary: {
        totalLena,
        totalDena,
        netBalance,
        totalLoansCount: loansList.length,
      },
      loans: filteredLoans,
    });
  } catch (error: any) {
    console.error("GET cash loans error:", error);
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
    const personType = (body.person_type || "person").trim();
    const personName = (body.person_name || "").trim();
    const phone = (body.phone || "").trim();
    const loanType = (body.loan_type || "lena").trim(); // "lena" | "dena"
    const amount = parseFloat(body.amount);
    const loanDate = (body.loan_date || getTodayDatePK()).trim();
    const dueDate = (body.due_date || "").trim();
    const reason = (body.reason || "").trim();
    const createdBy = (body.created_by || "Owner").trim();

    if (!personName) {
      return NextResponse.json({ success: false, error: "نام درج کرنا ضروری ہے" }, { status: 400 });
    }

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "درست رقم درج کریں" }, { status: 400 });
    }

    if (loanType !== "lena" && loanType !== "dena") {
      return NextResponse.json({ success: false, error: "درست ادھار قسم منتخب کریں" }, { status: 400 });
    }

    const newLoan = await db
      .insert(cashLoans)
      .values({
        pump_id: pumpId,
        person_type: personType,
        person_name: personName,
        phone,
        loan_type: loanType,
        amount,
        remaining_amount: amount,
        reason,
        loan_date: loanDate,
        due_date: dueDate || null,
        status: "pending",
        created_by: createdBy,
        created_at: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "نیا ادھار ریکارڈ کامیابی سے درج ہو گیا ہے",
      loan: newLoan[0],
    });
  } catch (error: any) {
    console.error("POST cash loan error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
