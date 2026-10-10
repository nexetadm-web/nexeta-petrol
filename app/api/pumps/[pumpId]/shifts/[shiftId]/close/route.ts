import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  shifts, 
  shiftNozzleReadings, 
  nozzles, 
  tanks, 
  fuelRates, 
  expenses, 
  cashClosings 
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";
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
    const submittedReadings: { nozzle_id: number; closing: number }[] = body.readings || [];

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

    // 2. Fetch fuel rates for pump
    const rateRows = await db
      .select()
      .from(fuelRates)
      .where(eq(fuelRates.pump_id, pumpId));

    const ratesMap: Record<string, number> = {
      Petrol: 260.0,
      Diesel: 268.0,
      Super: 265.0,
      HOBC: 295.0,
    };
    rateRows.forEach((r) => {
      ratesMap[r.product] = r.current_rate;
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
      const appliedRate = ratesMap[fuel] || 260.0;
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

    // 4. Fetch expenses for that date
    const dayExpenses = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.pump_id, pumpId), eq(expenses.date, shift.date)));

    const shiftExpensesTotal = dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // 5. Calculate Expected Cash & Difference
    // Expected = opening_cash + total_income - expenses
    const expectedCash = Math.round((shift.opening_cash + totalIncome - shiftExpensesTotal) * 100) / 100;
    const difference = Math.round((closingCash - expectedCash) * 100) / 100;

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
        total_udhar_rs: 0,
        total_kharcha_rs: shiftExpensesTotal,
        expected_cash_in_hand: expectedCash,
        actual_cash_submitted_rs: closingCash,
        difference_rs: difference,
        submitted_by: shift.staff_name || "Operator",
        receiver_name: "Manager",
        notes: `Shift ${shift.shift_name} (${shift.start_time} - ${endTime})`,
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
        shiftExpenses: shiftExpensesTotal,
        expectedCash,
        closingCash,
        difference,
        status: difference === 0 ? "balanced" : difference < 0 ? "short" : "excess",
      },
    });
  } catch (error: any) {
    console.error("POST close shift error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
