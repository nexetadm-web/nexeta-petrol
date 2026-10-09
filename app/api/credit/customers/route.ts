import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { creditCustomers, creditSales } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getTodayDatePK, toStandardYMD } from "@/lib/formatters";
import { getCurrentPumpId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const customers = await db.select().from(creditCustomers).where(eq(creditCustomers.pump_id, pumpId));
    const allSales = await db.select().from(creditSales).where(eq(creditSales.pump_id, pumpId));

    // Calculate customer balances for this pump
    const customerLedgers = customers.map((c) => {
      const trans = allSales.filter((s) => s.customer_id === c.id);
      const totalCredit = trans
        .filter((t) => t.is_payment === 0)
        .reduce((sum, t) => sum + (t.total || 0), 0);
      const totalPaid = trans
        .filter((t) => t.is_payment === 1)
        .reduce((sum, t) => sum + (t.total || 0), 0);
      const balance = totalCredit - totalPaid;

      return {
        ...c,
        total_credit: totalCredit,
        total_paid: totalPaid,
        balance,
        transactionsCount: trans.length,
      };
    });

    const todayPk = getTodayDatePK();
    const todayYmd = toStandardYMD(todayPk);
    const todayRecovery = allSales
      .filter((s) => s.is_payment === 1 && (s.date === todayPk || s.date === todayYmd))
      .reduce((sum, s) => sum + (s.total || 0), 0);

    return NextResponse.json({
      success: true,
      customers: customerLedgers,
      todayRecovery,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const body = await request.json();
    const { name, company, vehicle_no, phone } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: "Customer name and phone number are required" },
        { status: 400 }
      );
    }

    const [newCustomer] = await db
      .insert(creditCustomers)
      .values({
        pump_id: pumpId,
        name,
        company: company || null,
        vehicle_no: vehicle_no || null,
        phone,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "کھاتہ دار / کسٹمر شامل کر دیا گیا",
      customer: newCustomer,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
