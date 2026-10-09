import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  dailyReadings, 
  dailyRates, 
  nozzles, 
  tanks, 
  productSales, 
  products, 
  creditSales, 
  creditCustomers, 
  expenses 
} from "@/lib/schema";
import { eq, like, and } from "drizzle-orm";
import { getTodayDateString } from "@/lib/formatters";
import { getCurrentPumpId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || getTodayDateString();
    const month = searchParams.get("month"); // e.g. "2026-10"

    // If month is requested, compile monthly report for this pump
    if (month) {
      const monthPattern = `${month}-%`;

      const mReadings = await db
        .select({
          date: dailyReadings.date,
          litresSold: dailyReadings.litres_sold,
          amount: dailyReadings.amount,
        })
        .from(dailyReadings)
        .where(and(like(dailyReadings.date, monthPattern), eq(dailyReadings.pump_id, pumpId)));

      const mProducts = await db
        .select({
          date: productSales.date,
          total: productSales.total,
          profit: productSales.profit,
        })
        .from(productSales)
        .where(and(like(productSales.date, monthPattern), eq(productSales.pump_id, pumpId)));

      const mExpenses = await db
        .select({
          date: expenses.date,
          amount: expenses.amount,
        })
        .from(expenses)
        .where(and(like(expenses.date, monthPattern), eq(expenses.pump_id, pumpId)));

      const mCredits = await db
        .select({
          date: creditSales.date,
          total: creditSales.total,
          isPayment: creditSales.is_payment,
        })
        .from(creditSales)
        .where(and(like(creditSales.date, monthPattern), eq(creditSales.pump_id, pumpId)));

      // Group by day
      const dailyMap = new Map<string, any>();

      for (const r of mReadings) {
        const d = r.date;
        const curr = dailyMap.get(d) || {
          date: d,
          fuelLitres: 0,
          fuelAmount: 0,
          productAmount: 0,
          productProfit: 0,
          expenseAmount: 0,
          creditGiven: 0,
          cashReceived: 0,
        };
        curr.fuelLitres += r.litresSold || 0;
        curr.fuelAmount += r.amount || 0;
        dailyMap.set(d, curr);
      }

      for (const p of mProducts) {
        const d = p.date;
        const curr = dailyMap.get(d) || {
          date: d,
          fuelLitres: 0,
          fuelAmount: 0,
          productAmount: 0,
          productProfit: 0,
          expenseAmount: 0,
          creditGiven: 0,
          cashReceived: 0,
        };
        curr.productAmount += p.total || 0;
        curr.productProfit += p.profit || 0;
        dailyMap.set(d, curr);
      }

      for (const e of mExpenses) {
        const d = e.date;
        const curr = dailyMap.get(d) || {
          date: d,
          fuelLitres: 0,
          fuelAmount: 0,
          productAmount: 0,
          productProfit: 0,
          expenseAmount: 0,
          creditGiven: 0,
          cashReceived: 0,
        };
        curr.expenseAmount += e.amount || 0;
        dailyMap.set(d, curr);
      }

      for (const c of mCredits) {
        const d = c.date;
        const curr = dailyMap.get(d) || {
          date: d,
          fuelLitres: 0,
          fuelAmount: 0,
          productAmount: 0,
          productProfit: 0,
          expenseAmount: 0,
          creditGiven: 0,
          cashReceived: 0,
        };
        if (c.isPayment === 1) {
          curr.cashReceived += c.total || 0;
        } else {
          curr.creditGiven += c.total || 0;
        }
        dailyMap.set(d, curr);
      }

      const dailyBreakdown = Array.from(dailyMap.values()).map((row) => {
        const fuelProfit = row.fuelLitres * 9.87;
        const totalSales = row.fuelAmount + row.productAmount;
        const netProfit = fuelProfit + row.productProfit - row.expenseAmount;
        return {
          ...row,
          fuelProfit,
          totalSales,
          netProfit,
        };
      }).sort((a, b) => b.date.localeCompare(a.date));

      const monthlyTotals = dailyBreakdown.reduce(
        (acc, row) => ({
          fuelLitres: acc.fuelLitres + row.fuelLitres,
          fuelAmount: acc.fuelAmount + row.fuelAmount,
          productAmount: acc.productAmount + row.productAmount,
          totalSales: acc.totalSales + row.totalSales,
          expenseAmount: acc.expenseAmount + row.expenseAmount,
          productProfit: acc.productProfit + row.productProfit,
          fuelProfit: acc.fuelProfit + row.fuelProfit,
          netProfit: acc.netProfit + row.netProfit,
          creditGiven: acc.creditGiven + row.creditGiven,
          cashReceived: acc.cashReceived + row.cashReceived,
        }),
        {
          fuelLitres: 0,
          fuelAmount: 0,
          productAmount: 0,
          totalSales: 0,
          expenseAmount: 0,
          productProfit: 0,
          fuelProfit: 0,
          netProfit: 0,
          creditGiven: 0,
          cashReceived: 0,
        }
      );

      return NextResponse.json({
        success: true,
        type: "monthly",
        month,
        monthlyTotals,
        dailyBreakdown,
      });
    }

    // Single Date Detailed Pump Report
    const ratesResult = await db.select().from(dailyRates).where(and(eq(dailyRates.date, date), eq(dailyRates.pump_id, pumpId)));
    const rate = ratesResult[0] || null;

    const readings = await db
      .select({
        id: dailyReadings.id,
        nozzleId: dailyReadings.nozzle_id,
        nozzleName: nozzles.name,
        tankId: nozzles.tank_id,
        tankName: tanks.name,
        fuelType: tanks.fuel_type,
        startTime: dailyReadings.start_time,
        endTime: dailyReadings.end_time,
        startReading: dailyReadings.start_reading,
        endReading: dailyReadings.end_reading,
        morningReading: dailyReadings.morning_reading,
        eveningReading: dailyReadings.evening_reading,
        litresSold: dailyReadings.litres_sold,
        rate: dailyReadings.rate,
        amount: dailyReadings.amount,
      })
      .from(dailyReadings)
      .leftJoin(nozzles, eq(dailyReadings.nozzle_id, nozzles.id))
      .leftJoin(tanks, eq(nozzles.tank_id, tanks.id))
      .where(and(eq(dailyReadings.date, date), eq(dailyReadings.pump_id, pumpId)));

    let petrolLitres = 0;
    let dieselLitres = 0;
    let hioctaneLitres = 0;
    let totalFuelAmount = 0;

    for (const r of readings) {
      if (r.fuelType === "Diesel") dieselLitres += r.litresSold || 0;
      else if (r.fuelType === "HiOctane") hioctaneLitres += r.litresSold || 0;
      else petrolLitres += r.litresSold || 0;
      totalFuelAmount += r.amount || 0;
    }
    const totalFuelLitres = petrolLitres + dieselLitres + hioctaneLitres;

    // Product Sales for date
    const pSales = await db
      .select({
        id: productSales.id,
        productName: products.name,
        category: products.category,
        qty: productSales.qty,
        total: productSales.total,
        profit: productSales.profit,
      })
      .from(productSales)
      .leftJoin(products, eq(productSales.product_id, products.id))
      .where(and(eq(productSales.date, date), eq(productSales.pump_id, pumpId)));

    const totalProductSales = pSales.reduce((acc, p) => acc + (p.total || 0), 0);
    const totalProductProfit = pSales.reduce((acc, p) => acc + (p.profit || 0), 0);

    // Expenses for date
    const dayExpenses = await db.select().from(expenses).where(and(eq(expenses.date, date), eq(expenses.pump_id, pumpId)));
    const totalExpenses = dayExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    // Credit transactions for date
    const dayCredit = await db
      .select({
        id: creditSales.id,
        customerName: creditCustomers.name,
        vehicleNo: creditCustomers.vehicle_no,
        type: creditSales.type,
        details: creditSales.details,
        total: creditSales.total,
        isPayment: creditSales.is_payment,
      })
      .from(creditSales)
      .leftJoin(creditCustomers, eq(creditSales.customer_id, creditCustomers.id))
      .where(and(eq(creditSales.date, date), eq(creditSales.pump_id, pumpId)));

    const creditGiven = dayCredit.filter((c) => c.isPayment === 0).reduce((acc, c) => acc + (c.total || 0), 0);
    const cashWasooli = dayCredit.filter((c) => c.isPayment === 1).reduce((acc, c) => acc + (c.total || 0), 0);

    const fuelProfit = totalFuelLitres * 9.87;
    const grandTotalSales = totalFuelAmount + totalProductSales;
    const netProfit = fuelProfit + totalProductProfit - totalExpenses;

    // Tanks Status
    const allTanks = await db.select().from(tanks).where(eq(tanks.pump_id, pumpId));

    return NextResponse.json({
      success: true,
      type: "daily",
      date,
      rate,
      summary: {
        petrolLitres,
        dieselLitres,
        hioctaneLitres,
        totalFuelLitres,
        totalFuelAmount,
        totalProductSales,
        totalProductProfit,
        grandTotalSales,
        totalExpenses,
        fuelProfit,
        netProfit,
        creditGiven,
        cashWasooli,
      },
      readings,
      productSales: pSales,
      expenses: dayExpenses,
      creditTransactions: dayCredit,
      tanks: allTanks,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
