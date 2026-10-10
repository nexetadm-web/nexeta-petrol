import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  pumps, 
  dailyReadings, 
  fuelPurchases, 
  expenses, 
  productSales, 
  cashLoans, 
  cashLoanTransactions, 
  shifts, 
  nozzles, 
  tanks, 
  fuelRates 
} from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
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
    const date = searchParams.get("date") || getTodayDatePK();

    // 1. Pump Info
    const pumpRows = await db.select().from(pumps).where(eq(pumps.id, pumpId)).limit(1);
    const pumpInfo = pumpRows[0] || { pump_name: "Nexeta Petrol", city: "Lahore" };

    // 2. Daily Fuel Readings on this date
    const readings = await db
      .select({
        id: dailyReadings.id,
        litresSold: dailyReadings.litres_sold,
        rate: dailyReadings.rate,
        amount: dailyReadings.amount,
        fuelType: tanks.fuel_type,
      })
      .from(dailyReadings)
      .leftJoin(nozzles, eq(dailyReadings.nozzle_id, nozzles.id))
      .leftJoin(tanks, eq(nozzles.tank_id, tanks.id))
      .where(and(eq(dailyReadings.pump_id, pumpId), eq(dailyReadings.date, date)));

    let totalFuelLitres = 0;
    let totalSaleIncome = 0;
    const fuelBreakdown: Record<string, { litres: number; amount: number }> = {
      Petrol: { litres: 0, amount: 0 },
      Diesel: { litres: 0, amount: 0 },
      HOBC: { litres: 0, amount: 0 },
    };

    readings.forEach((r) => {
      const l = r.litresSold || 0;
      const amt = r.amount || 0;
      totalFuelLitres += l;
      totalSaleIncome += amt;
      const fType = r.fuelType || "Petrol";
      if (!fuelBreakdown[fType]) fuelBreakdown[fType] = { litres: 0, amount: 0 };
      fuelBreakdown[fType].litres += l;
      fuelBreakdown[fType].amount += amt;
    });

    // 3. Shifts on this date (Morning vs Evening vs Night)
    const dayShifts = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.pump_id, pumpId), eq(shifts.date, date)))
      .orderBy(shifts.id);

    // If dayShifts exist, calculate per-shift sales and estimated profit
    const shiftBreakdown = dayShifts.map((s) => {
      const sLitres = s.total_sale_liters || 0;
      const sIncome = s.total_income || 0;
      const sProfit = Math.round(sLitres * 9.87 * 100) / 100;
      return {
        shiftId: s.id,
        shiftName: s.shift_name,
        staffName: s.staff_name,
        startTime: s.start_time,
        endTime: s.end_time || "Active",
        litres: sLitres,
        income: sIncome,
        estimatedProfit: sProfit,
        openingCash: s.opening_cash,
        closingCash: s.closing_cash,
      };
    });

    // 4. Fuel Purchases on that date
    const purchases = await db
      .select()
      .from(fuelPurchases)
      .where(and(eq(fuelPurchases.pump_id, pumpId), eq(fuelPurchases.date, date)));

    const actualPurchaseCost = purchases.reduce((sum, p) => sum + (p.total_cost || 0), 0);
    const actualPurchaseLitres = purchases.reduce((sum, p) => sum + (p.qty || 0), 0);

    // Fuel COGS: If tanker purchased today, we record actualPurchaseCost;
    // Standard dealership profit margin in Pakistan is Rs. 9.87 per Litre
    const dealerFuelMargin = Math.round(totalFuelLitres * 9.87 * 100) / 100;
    const estimatedCOGS = Math.max(0, Math.round((totalSaleIncome - dealerFuelMargin) * 100) / 100);
    const purchaseCostApplied = actualPurchaseCost > 0 ? actualPurchaseCost : estimatedCOGS;

    // 5. Total Expenses on that date
    const expenseRows = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.pump_id, pumpId), eq(expenses.date, date)));

    const totalExpenses = expenseRows.reduce((sum, e) => sum + (e.amount || 0), 0);

    // 6. Product Sales (Mobil Oil, etc.)
    const pSales = await db
      .select()
      .from(productSales)
      .where(and(eq(productSales.pump_id, pumpId), eq(productSales.date, date)));

    const productSalesTotal = pSales.reduce((sum, p) => sum + (p.total || 0), 0);
    const productProfitTotal = pSales.reduce((sum, p) => sum + (p.profit || 0), 0);

    // 7. Cash Loans Repayments paid on that date
    const loanTxRows = await db
      .select()
      .from(cashLoanTransactions)
      .where(and(eq(cashLoanTransactions.pump_id, pumpId), eq(cashLoanTransactions.date, date)));

    const loansPaidOut = loanTxRows
      .filter((t) => t.type === "pay")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // 8. FINAL NET PROFIT & CASH IN HAND CALCULATION:
    // Net Profit = (Fuel Dealer Margin + Product Profit) - Total Expenses - (Loans Interest/Paid if applicable)
    const grossFuelProfit = Math.round((totalSaleIncome - estimatedCOGS) * 100) / 100;
    const grossTotalRevenue = totalSaleIncome + productSalesTotal;
    const netProfit = Math.round((grossFuelProfit + productProfitTotal - totalExpenses) * 100) / 100;

    // Cash In Hand = Gross Sale - Expenses - Loans Paid Out - (Actual Purchases Paid if any)
    const estimatedCashInHand = Math.round(
      (grossTotalRevenue - totalExpenses - loansPaidOut - actualPurchaseCost) * 100
    ) / 100;

    return NextResponse.json({
      success: true,
      pump: pumpInfo,
      date,
      summary: {
        grossSale: grossTotalRevenue,
        fuelSaleIncome: totalSaleIncome,
        totalFuelLitres,
        productSalesTotal,
        productProfitTotal,
        purchaseCost: purchaseCostApplied,
        actualTankerPurchases: actualPurchaseCost,
        totalExpenses,
        loansPaidOut,
        netProfit,
        isProfitable: netProfit >= 0,
        estimatedCashInHand,
      },
      fuelBreakdown,
      shiftBreakdown,
      expenses: expenseRows,
      purchases,
    });
  } catch (error: any) {
    console.error("GET daily profit report error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
