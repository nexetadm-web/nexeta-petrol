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
  nozzles,
  pumps
} from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import { getTodayDatePK, formatDate, toStandardYMD } from "@/lib/formatters";
import { getCurrentPumpId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const pkDate = dateParam ? formatDate(dateParam) : getTodayDatePK();
    const ymdDate = toStandardYMD(pkDate);

    // Get current pump profile
    const pumpRows = await db.select().from(pumps).where(eq(pumps.id, pumpId));
    const currentPump = pumpRows[0] || null;

    // 1. Fetch Today's Daily Rates for this pump
    const allRates = await db.select().from(dailyRates).where(eq(dailyRates.pump_id, pumpId));
    const todayRate = allRates.find((r) => r.date === pkDate || r.date === ymdDate) || null;

    // 2. Fetch Daily Readings for the date joined with nozzles and tanks for this pump
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
        pumpId: dailyReadings.pump_id,
      })
      .from(dailyReadings)
      .leftJoin(nozzles, eq(dailyReadings.nozzle_id, nozzles.id))
      .leftJoin(tanks, eq(nozzles.tank_id, tanks.id))
      .where(eq(dailyReadings.pump_id, pumpId));

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

    // 3. Fetch Product Sales for the date for this pump
    const allPSales = await db.select().from(productSales).where(eq(productSales.pump_id, pumpId));
    const todayPSales = allPSales.filter(
      (p) => p.date === pkDate || p.date === ymdDate
    );

    const todayProductSaleRs = todayPSales.reduce((acc, p) => acc + (p.total || 0), 0);
    const todayProductProfitRs = todayPSales.reduce((acc, p) => acc + (p.profit || 0), 0);

    // 4. Total Sale Rs = Fuel Sale + Product Sale
    const todayTotalSaleRs = todayFuelSaleRs + todayProductSaleRs;

    // 5. Kul Udhar Baqi Rs for this pump
    const allCreditRecords = await db.select().from(creditSales).where(eq(creditSales.pump_id, pumpId));
    const totalCreditGiven = allCreditRecords
      .filter((c) => c.is_payment === 0)
      .reduce((acc, c) => acc + (c.total || 0), 0);
    const totalPaymentsReceived = allCreditRecords
      .filter((c) => c.is_payment === 1)
      .reduce((acc, c) => acc + (c.total || 0), 0);
    const totalCreditRemainingRs = Math.max(0, totalCreditGiven - totalPaymentsReceived);

    // 6. Aaj Ka Kharcha (Today's Expenses for this pump)
    const allExpenses = await db.select().from(expenses).where(eq(expenses.pump_id, pumpId));
    const todayExpenses = allExpenses.filter(
      (e) => e.date === pkDate || e.date === ymdDate
    );
    const todayExpenseRs = todayExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    // 7. Calculate Precise Fuel Profit
    const purchases = await db
      .select()
      .from(fuelPurchases)
      .where(eq(fuelPurchases.pump_id, pumpId))
      .orderBy(desc(fuelPurchases.id));
    const latestPetrolPurchase = purchases.find((p) => p.fuel_type === "Petrol");
    const latestDieselPurchase = purchases.find((p) => p.fuel_type === "Diesel");
    const latestHiOctanePurchase = purchases.find((p) => p.fuel_type === "HiOctane");

    const petrolMargin = (todayRate && latestPetrolPurchase && todayRate.petrol_rate > latestPetrolPurchase.rate)
      ? (todayRate.petrol_rate - latestPetrolPurchase.rate)
      : 10.50;

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

    // 8. Net Profit = Fuel Profit + Product Profit - Expenses
    const netProfitRs = estimatedFuelProfit + todayProductProfitRs - todayExpenseRs;

    // 9. Fetch Tanks for this pump
    const allTanks = await db.select().from(tanks).where(eq(tanks.pump_id, pumpId));
    const tanksFormatted = allTanks.map((t) => {
      const cap = t.capacity_liters || t.capacity || 25000;
      const stock = t.current_stock_liters !== null && t.current_stock_liters !== undefined ? t.current_stock_liters : t.current_stock;
      const fillPercentage = cap > 0 ? Math.min(100, Math.round((stock / cap) * 100)) : 0;
      return {
        id: t.id,
        name: t.tank_name || t.name,
        fuel_type: (t.product || t.fuel_type) as any,
        capacity: cap,
        current_stock: stock,
        current_dip_mm: t.current_dip_mm || 0,
        fill_percentage: fillPercentage,
      };
    });

    return NextResponse.json({
      success: true,
      pump: currentPump ? {
        id: currentPump.id,
        name: currentPump.pump_name,
        owner: currentPump.owner_name,
        city: currentPump.city,
        subscriptionStatus: currentPump.subscription_status,
        trialEndsAt: currentPump.trial_ends_at,
      } : null,
      date: pkDate,
      rates: todayRate,
      metrics: {
        totalFuelSaleLitres: todayFuelLitres,
        fuelRevenueRs: todayFuelSaleRs,
        goodsRevenueRs: todayProductSaleRs,
        totalRevenueRs: todayTotalSaleRs,
        creditOutstandingRs: totalCreditRemainingRs,
        totalExpensesRs: todayExpenseRs,
        netProfitRs: netProfitRs,
        estimatedFuelProfitRs: estimatedFuelProfit,
        productProfitRs: todayProductProfitRs,
        fuelBreakdown: {
          petrolLitres,
          dieselLitres,
          hioctaneLitres,
        },
        tanks: tanksFormatted,
      },
    });
  } catch (error: any) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
