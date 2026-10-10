import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parties, partyTransactions } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { getTodayDatePK } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { pumpId: string; partyId: string } }
) {
  try {
    const pumpId = Number(params.pumpId);
    const partyId = Number(params.partyId);

    if (isNaN(pumpId) || isNaN(partyId)) {
      return NextResponse.json({ success: false, error: "Invalid parameters" }, { status: 400 });
    }

    const [partyRows, txRows] = await Promise.all([
      db
        .select()
        .from(parties)
        .where(and(eq(parties.id, partyId), eq(parties.pump_id, pumpId))),
      db
        .select()
        .from(partyTransactions)
        .where(and(eq(partyTransactions.party_id, partyId), eq(partyTransactions.pump_id, pumpId)))
        .orderBy(desc(partyTransactions.id)),
    ]);

    const party = partyRows[0];
    if (!party) {
      return NextResponse.json({ success: false, error: "پارٹی نہیں ملی" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      party,
      transactions: txRows,
    });
  } catch (error: any) {
    console.error("GET party transactions error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { pumpId: string; partyId: string } }
) {
  try {
    const pumpId = Number(params.pumpId);
    const partyId = Number(params.partyId);

    if (isNaN(pumpId) || isNaN(partyId)) {
      return NextResponse.json({ success: false, error: "Invalid parameters" }, { status: 400 });
    }

    const body = await request.json();
    const type = body.type === "debit" ? "debit" : "credit"; // credit = fuel issued, debit = payment received
    const liters = parseFloat(body.liters) || 0;
    const rate = parseFloat(body.rate) || 0;
    const amount = parseFloat(body.amount) || Math.round(liters * rate);
    const dateStr = (body.date || getTodayDatePK()).trim();
    const description = (body.description || (type === "credit" ? `ادھار تیل ${liters}L @ Rs. ${rate}` : "ادائیگی موصول")).trim();

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "درست رقم (Amount) درج کریں" }, { status: 400 });
    }

    const [party] = await db
      .select()
      .from(parties)
      .where(and(eq(parties.id, partyId), eq(parties.pump_id, pumpId)));

    if (!party) {
      return NextResponse.json({ success: false, error: "پارٹی نہیں ملی" }, { status: 404 });
    }

    // New Balance: If credit (fuel issued), balance increases. If debit (payment received), balance decreases.
    const newBalance =
      type === "credit"
        ? Math.round((party.balance + amount) * 100) / 100
        : Math.round((party.balance - amount) * 100) / 100;

    // 1. Insert transaction
    const [tx] = await db
      .insert(partyTransactions)
      .values({
        pump_id: pumpId,
        party_id: partyId,
        type,
        liters,
        rate,
        amount,
        date: dateStr,
        description,
        created_at: new Date().toISOString(),
      })
      .returning();

    // 2. Update Party balance
    await db
      .update(parties)
      .set({ balance: newBalance })
      .where(eq(parties.id, partyId));

    return NextResponse.json({
      success: true,
      message:
        type === "credit"
          ? `Rs. ${amount.toLocaleString()} کا ادھار تیل جاری ہو گیا`
          : `Rs. ${amount.toLocaleString()} کی وصولی جمع ہو گئی`,
      new_balance: newBalance,
      transaction: tx,
    });
  } catch (error: any) {
    console.error("POST party transaction error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
