import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  tanks, 
  dailyRates, 
  dailyReadings, 
  fuelPurchases, 
  products, 
  productSales, 
  creditSales, 
  expenses,
  nozzles
} from "@/lib/schema";
import { eq, sql, desc } from "drizzle-orm";
import { getTodayDateString, getTodayDatePK, formatDate, toStandardYMD } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const pkDate = dateParam ? formatDate(dateParam) : getTodayDatePK();
    const ymdDate = toStandardYMD(pkDate);

    // 1. Fetch Today's Daily Rates (match both date representations)
    const allRates = await db.select().from(dailyRates);
    const todayRate = allRates.find((r) => r.date === pkDate || r.date === ymdDate) || null;

    // 2. Fetch Daily Readings for the date joined with nozzles and tanks
    const allReadings = await db
      .select({
        id: dailyReadings.id,
        date: dailyReadings.date,
        litresSold: dailyReadings.litres_sold,
        rate: dailyReadings.rate,
        amount: dailyReadings.amount,
        nozzleId: dailyReadings.nozzle_id,
        tankId: nozzles.tank_id,
        fuelType: tanks.fuel_type,
      })
      .from(dailyReadings)
      .leftJoin(nozzles, eq(dailyReadings.nozzle_id, nozzles.id))
      .leftJoin(tanks, eq(nozzles.tank_id, tanks.id));

    const todayReadings = allReadings.filter(
      (r) => r.date === pkDate || r.date === ymdDate
    );

    let petrolLitres = 0;
    let dieselLitres = 0;
    let hioctaneLitres = 0;
    let todayFuelSaleRs = 0;

    for (const r of todayReadings) {
      const ltr = r.litresSold || 0;
      const amt = r.amount || 0;
      todayFuelSaleRs += amt;

      if (r.fuelType === "Diesel") dieselLitres += ltr;
      else if (r.fuelType === "HiOctane") hioctaneLitres += ltr;
      else petrolLitres += ltr;
    }

    const todayFuelLitres = petrolLitres + dieselLitres + hioctaneLitres;

    // 3. Fetch Product Sales for the date
    const allPSales = await db.select().from(productSales);
    const todayPSales = allPSales.filter(
      (p) => p.date === pkDate || p.date === ymdDate
    );

    const todayProductSaleRs = todayPSales.reduce((acc, p) => acc + (p.total || 0), 0);
    const todayProductProfitRs = todayPSales.reduce((acc, p) => acc + (p.profit || 0), 0);

    // 4. Total Sale Rs = Fuel Sale + Product Sale
    const todayTotalSaleRs = todayFuelSaleRs + todayProductSaleRs;

    // 5. Kul Udhar Baqi Rs (Outstanding credit sales - wasooli)
    const allCreditRecords = await db.select().from(creditSales);
    const totalCreditGiven = allCreditRecords
      .filter((c) => c.is_payment === 0)
      .reduce((acc, c) => acc + (c.total || 0), 0);
    const totalPaymentsReceived = allCreditRecords
      .filter((c) => c.is_payment === 1)
      .reduce((acc, c) => acc + (c.total || 0), 0);
    const totalCreditRemainingRs = Math.max(0, totalCreditGiven - totalPaymentsReceived);

    // 6. Aaj Ka Kharcha (Today's Expenses)
    const allExpenses = await db.select().from(expenses);
    const todayExpenses = allExpenses.filter(
      (e) => e.date === pkDate || e.date === ymdDate
    );
    const todayExpenseRs = todayExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    // 7. Calculate Precise Fuel Profit:
    // Check latest purchase cost per fuel type to determine actual dealer margin
    const purchases = await db.select().from(fuelPurchases).orderBy(desc(fuelPurchases.id));
    const latestPetrolPurchase = purchases.find((p) => p.fuel_type === "Petrol");
    const latestDieselPurchase = purchases.find((p) => p.fuel_type === "Diesel");
    const latestHiOctanePurchase = purchases.find((p) => p.fuel_type === "HiOctane");

    // Dealer margins per litre (Actual or standard OM&C margin)
    const petrolMargin = (todayRate && latestPetrolPurchase && todayRate.petrol_rate > latestPetrolPurchase.rate)
      ? (todayRate.petrol_rate - latestPetrolPurchase.rate)
      : 10.50; // Standard dealer margin ~Rs. 10.50/L

    const dieselMargin = (todayRate && latestDieselPurchase && todayRate.diesel_rate > latestDieselPurchase.rate)
      ? (todayRate.diesel_rate - latestDieselPurchase.rate)
      : 10.50;

    const hioctaneMargin = (todayRate && latestHiOctanePurchase && todayRate.hioctane_rate > latestHiOctanePurchase.rate)
      ? (todayRate.hioctane_rate - latestHiOctanePurchase.rate)
      : 14.00;

    const estimatedFuelProfit = Math.round(
      petrolLitres * petrolMargin +
      dieselLitres * dieselMargin +
      hioctaneLitres * hioctaneMargin
    );

    // Net Profit Formula:
    // Net Profit = (Fuel Margin Profit + Product Profit) - Expenses
    const todayEstimatedNetProfitRs = estimatedFuelProfit + todayProductProfitRs - todayExpenseRs;

    // 8. Tanks Stock
    const allTanks = await db.select().from(tanks);

    return NextResponse.json({
      success: true,
      date: pkDate,
      todayRate,
      isRateSetToday: !!todayRate,
      metrics: {
        todayFuelLitres,
        todayFuelSaleRs,
        todayProductSaleRs,
        todayTotalSaleRs,
        totalCreditRemainingRs,
        todayExpenseRs,
        todayEstimatedNetProfitRs,
        todayProductProfitRs,
        estimatedFuelProfit,
        petrolLitres,
        dieselLitres,
        hioctaneLitres,
      },
      tanks: allTanks,
    });
  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
