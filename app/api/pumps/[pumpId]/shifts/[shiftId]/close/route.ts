import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  shifts, 
  shiftNozzleReadings, 
  nozzles, 
  tanks, 
  fuelRates, 
  dailyRates,
  expenses, 
  cashClosings 
} from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { getTodayDatePK } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { pumpId: string; shiftId: string } }
) {
  try {
    const pumpId = Number(params.pumpId);
    const shiftId = Number(params.shiftId);

    if (isNaN(pumpId) || isNaN(shiftId)) {
      return NextResponse.json({ success: false, error: "Invalid parameters" }, { status: 400 });
    }

    const body = await request.json();
    const closingCash = parseFloat(body.closing_cash) || 0;
    const endTime = (body.end_time || "04:00 PM").trim();
    const submittedReadings: { nozzle_id: number; closing: number; rate?: number }[] = body.readings || [];

    // 1. Fetch shift
    const shiftRows = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.id, shiftId), eq(shifts.pump_id, pumpId)))
      .limit(1);

    if (shiftRows.length === 0) {
      return NextResponse.json({ success: false, error: "شفٹ ریکارڈ نہیں ملا" }, { status: 404 });
    }

    const shift = shiftRows[0];
    if (shift.status === "closed") {
      return NextResponse.json({ success: false, error: "یہ شفٹ پہلے ہی بند ہو چکی ہے" }, { status: 400 });
    }

    // 2. Fetch fuel rates dynamically for pump
    const [rateRows, dailyRateRows] = await Promise.all([
      db.select().from(fuelRates).where(eq(fuelRates.pump_id, pumpId)),
      db.select().from(dailyRates).where(eq(dailyRates.pump_id, pumpId)).orderBy(desc(dailyRates.id)).limit(1),
    ]);

    const latestDaily = dailyRateRows[0] || null;
    let petrolRate = latestDaily?.petrol_rate || 0;
    let dieselRate = latestDaily?.diesel_rate || 0;
    let hioctaneRate = latestDaily?.hioctane_rate || 0;

    for (const fr of rateRows) {
      const prod = (fr.product || "").toLowerCase();
      if ((prod.includes("petrol") || prod.includes("super")) && (!petrolRate || fr.current_rate > 0)) {
        petrolRate = fr.current_rate;
      } else if ((prod.includes("diesel") || prod.includes("hsd")) && (!dieselRate || fr.current_rate > 0)) {
        dieselRate = fr.current_rate;
      } else if ((prod.includes("hioctane") || prod.includes("hobc")) && (!hioctaneRate || fr.current_rate > 0)) {
        hioctaneRate = fr.current_rate;
      }
    }

    if (!petrolRate) petrolRate = 290.50;
    if (!dieselRate) dieselRate = 285.00;
    if (!hioctaneRate) hioctaneRate = 300.00;

    const ratesMap: Record<string, number> = {
      Petrol: petrolRate,
      Diesel: dieselRate,
      Super: petrolRate,
      HOBC: hioctaneRate,
      HiOctane: hioctaneRate,
    };
    rateRows.forEach((r) => {
      if (r.current_rate > 0) ratesMap[r.product] = r.current_rate;
    });

    // 3. Fetch existing shift nozzle readings joined with nozzles and tanks
    const currentReadings = await db
      .select({
        id: shiftNozzleReadings.id,
        shift_id: shiftNozzleReadings.shift_id,
        nozzle_id: shiftNozzleReadings.nozzle_id,
        opening: shiftNozzleReadings.opening,
        fuel_type: tanks.fuel_type,
      })
      .from(shiftNozzleReadings)
      .leftJoin(nozzles, eq(shiftNozzleReadings.nozzle_id, nozzles.id))
      .leftJoin(tanks, eq(nozzles.tank_id, tanks.id))
      .where(eq(shiftNozzleReadings.shift_id, shiftId));

    let totalSaleLiters = 0;
    let totalIncome = 0;

    for (const r of currentReadings) {
      const matchSub = submittedReadings.find((s) => s.nozzle_id === r.nozzle_id);
      const closing = matchSub !== undefined ? Number(matchSub.closing) : r.opening;
      const saleLiters = Math.max(0, Math.round((closing - r.opening) * 100) / 100);
      const fuel = r.fuel_type || "Petrol";
      const customRate = matchSub?.rate !== undefined && !isNaN(Number(matchSub.rate)) && Number(matchSub.rate) > 0
        ? Number(matchSub.rate)
        : null;
      const appliedRate = customRate ?? (ratesMap[fuel] || ratesMap["Petrol"] || petrolRate);
      const amount = Math.round(saleLiters * appliedRate * 100) / 100;

      totalSaleLiters += saleLiters;
      totalIncome += amount;

      await db
        .update(shiftNozzleReadings)
        .set({
          closing,
          sale_liters: saleLiters,
          rate: appliedRate,
          amount,
        })
        .where(eq(shiftNozzleReadings.id, r.id));
    }

    // 4. Fetch expenses or use submitted credit & expense
    const creditAmount = parseFloat(body.credit) || 0;
    const submittedExpense = body.expense !== undefined ? parseFloat(body.expense) : null;

    const dayExpenses = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.pump_id, pumpId), eq(expenses.date, shift.date)));

    const shiftExpensesTotal = submittedExpense !== null && !isNaN(submittedExpense)
      ? submittedExpense
      : dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // 5. Calculate Cash in Hand & Difference (Exact Master Formula)
    // cash_in_hand = total_amount - credit - expense
    const cashInHand = parseFloat((totalIncome - creditAmount - shiftExpensesTotal).toFixed(2));
    // difference = cash_received - cash_in_hand (negative = short, positive = extra)
    const difference = parseFloat((closingCash - cashInHand).toFixed(2));

    // 6. Update shift record
    await db
      .update(shifts)
      .set({
        end_time: endTime,
        closing_cash: closingCash,
        total_sale_liters: totalSaleLiters,
        total_income: totalIncome,
        status: "closed",
      })
      .where(eq(shifts.id, shiftId));

    // 7. Insert into cashClosings table for shift log archive
    try {
      await db.insert(cashClosings).values({
        pump_id: pumpId,
        date: shift.date,
        shift: shift.shift_name,
        total_nozzle_sale_rs: totalIncome,
        total_oil_products_sale_rs: 0,
        total_sale_rs: totalIncome,
        total_udhar_rs: creditAmount,
        total_kharcha_rs: shiftExpensesTotal,
        expected_cash_in_hand: cashInHand,
        actual_cash_submitted_rs: closingCash,
        difference_rs: difference,
        submitted_by: shift.staff_name || "Operator",
        receiver_name: "Manager",
        notes: `Shift ${shift.shift_name} (${shift.start_time} - ${endTime}) | Sale: ${totalIncome} - Udhar: ${creditAmount} - Kharcha: ${shiftExpensesTotal} = ${cashInHand}`,
        created_at: new Date().toISOString(),
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `شفٹ (${shift.shift_name}) کامیابی سے بند ہو گئی ہے`,
      audit: {
        shiftId,
        shiftName: shift.shift_name,
        openingCash: shift.opening_cash,
        totalSaleLiters,
        totalIncome,
        credit: creditAmount,
        shiftExpenses: shiftExpensesTotal,
        expectedCash: cashInHand,
        cashInHand,
        closingCash,
        difference,
        status: difference === 0 ? "matched" : difference < 0 ? "short" : "extra",
      },
    });
  } catch (error: any) {
    console.error("POST close shift error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
