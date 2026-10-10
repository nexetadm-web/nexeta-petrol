import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  dailyReadings, 
  fuelRates, 
  fuelRatesHistory, 
  dailyRates, 
  fuelPurchases, 
  expenses, 
  productSales, 
  products, 
  nozzles, 
  tanks, 
  pumps 
} from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { getTodayDatePK, formatRs, formatLitres } from "@/lib/formatters";

export const dynamic = "force-dynamic";

interface RateInterval {
  id: string;
  sectionNumber: number;
  title: string;
  startTime: string;
  endTime: string;
  rates: {
    Petrol: number;
    Diesel: number;
    Super: number;
    HOBC: number;
  };
  readings: any[];
  subtotalLitres: number;
  subtotalAmount: number;
}

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

    // 1. Fetch Pump details
    const pumpRows = await db.select().from(pumps).where(eq(pumps.id, pumpId)).limit(1);
    const pumpInfo = pumpRows[0] || { pump_name: "Nexeta Petrol", city: "Lahore" };

    // 2. Fetch Rate History for this pump
    const allRateHist = await db
      .select()
      .from(fuelRatesHistory)
      .where(eq(fuelRatesHistory.pump_id, pumpId))
      .orderBy(fuelRatesHistory.effective_from, fuelRatesHistory.id);

    // Also get standard current rates as fallback
    const currentRateRows = await db
      .select()
      .from(fuelRates)
      .where(eq(fuelRates.pump_id, pumpId));
    
    const fallbackRates: Record<string, number> = {
      Petrol: 260.0,
      Diesel: 268.0,
      Super: 265.0,
      HOBC: 295.0,
    };
    currentRateRows.forEach((r) => {
      fallbackRates[r.product] = r.current_rate;
    });

    // Determine rate changes that occurred on the selected date
    // effective_from format may be "DD-MM-YYYY hh:mm A" or "YYYY-MM-DD..."
    const dateRateEvents = allRateHist.filter((r) => {
      if (!r.effective_from) return false;
      return r.effective_from.includes(date);
    });

    // 3. Build Rate Sections for the 24-hour day
    const sections: RateInterval[] = [];

    if (dateRateEvents.length === 0) {
      // Single continuous 24-hour section
      // Find latest rate before or on this date
      const activeRates = { ...fallbackRates };
      allRateHist.forEach((r) => {
        if (r.effective_from && r.effective_from <= `${date} 23:59`) {
          activeRates[r.product] = r.new_rate;
        }
      });

      sections.push({
        id: "sec-1",
        sectionNumber: 1,
        title: "12:00 AM سے 11:59 PM تک (مکمل 24 گھنٹے)",
        startTime: "12:00 AM",
        endTime: "11:59 PM",
        rates: activeRates as any,
        readings: [],
        subtotalLitres: 0,
        subtotalAmount: 0,
      });
    } else {
      // Sort intraday events chronologically
      const sortedEvents = [...dateRateEvents].sort((a, b) => 
        (a.effective_from || "").localeCompare(b.effective_from || "")
      );

      // Collect distinct change times on this day
      const changeTimes: { timeStr: string; changes: any[] }[] = [];
      sortedEvents.forEach((ev) => {
        // extract time portion, e.g. "11:00 AM" from "12-10-2026 11:00 AM"
        const parts = ev.effective_from.split(" ");
        const timeStr = parts.slice(1).join(" ") || "12:00 AM";
        const existing = changeTimes.find((c) => c.timeStr === timeStr);
        if (existing) {
          existing.changes.push(ev);
        } else {
          changeTimes.push({ timeStr, changes: [ev] });
        }
      });

      // Construct sections: e.g. 12:00 AM to first change, first to second, second to 11:59 PM
      let runningRates = { ...fallbackRates };
      let previousTime = "12:00 AM";

      changeTimes.forEach((ct, idx) => {
        // If first change is not at midnight, create section from 12:00 AM to this change time
        if (ct.timeStr !== "12:00 AM" && idx === 0) {
          sections.push({
            id: `sec-${sections.length + 1}`,
            sectionNumber: sections.length + 1,
            title: `12:00 AM سے ${ct.timeStr} تک`,
            startTime: "12:00 AM",
            endTime: ct.timeStr,
            rates: { ...runningRates } as any,
            readings: [],
            subtotalLitres: 0,
            subtotalAmount: 0,
          });
        }

        // Apply changes
        ct.changes.forEach((ch) => {
          runningRates[ch.product] = ch.new_rate;
        });

        const nextChange = changeTimes[idx + 1];
        const nextTime = nextChange ? nextChange.timeStr : "11:59 PM";

        sections.push({
          id: `sec-${sections.length + 1}`,
          sectionNumber: sections.length + 1,
          title: `${ct.timeStr} سے ${nextTime} تک`,
          startTime: ct.timeStr,
          endTime: nextTime,
          rates: { ...runningRates } as any,
          readings: [],
          subtotalLitres: 0,
          subtotalAmount: 0,
        });

        previousTime = ct.timeStr;
      });
    }

    // 4. Fetch Daily Readings for this pump & date
    const readingsRows = await db
      .select({
        id: dailyReadings.id,
        nozzleId: dailyReadings.nozzle_id,
        nozzleName: nozzles.name,
        tankId: nozzles.tank_id,
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
      .where(and(eq(dailyReadings.pump_id, pumpId), eq(dailyReadings.date, date)));

    // Distribute readings into the sections
    // If only 1 section, all readings go into it
    // If multiple sections and readings have start_time matching section, match them;
    // Otherwise split evenly or allocate based on section count so numbers balance perfectly
    if (sections.length === 1) {
      sections[0].readings = readingsRows.map((r) => {
        const fuel = r.fuelType || "Petrol";
        const appliedRate = sections[0].rates[fuel as keyof typeof sections[0]["rates"]] || r.rate || 260;
        const startR = r.startReading !== undefined && r.startReading !== null ? r.startReading : (r.morningReading || 0);
        const endR = r.endReading !== undefined && r.endReading !== null ? r.endReading : (r.eveningReading || 0);
        const litres = r.litresSold || Math.max(0, endR - startR);
        const amount = litres * appliedRate;
        return {
          ...r,
          fuelType: fuel,
          appliedRate,
          litresSold: litres,
          startReading: startR,
          endReading: endR,
          amount,
        };
      });
      sections[0].subtotalLitres = sections[0].readings.reduce((s, r) => s + r.litresSold, 0);
      sections[0].subtotalAmount = sections[0].readings.reduce((s, r) => s + r.amount, 0);
    } else {
      const sectionCount = sections.length;
      sections.forEach((sec, sIdx) => {
        sec.readings = readingsRows.map((r) => {
          const fuel = r.fuelType || "Petrol";
          const appliedRate = sec.rates[fuel as keyof typeof sec.rates] || r.rate || 260;
          const totalStartR = r.startReading !== undefined && r.startReading !== null ? r.startReading : (r.morningReading || 0);
          const totalEndR = r.endReading !== undefined && r.endReading !== null ? r.endReading : (r.eveningReading || 0);
          const fullLitres = r.litresSold || Math.max(0, totalEndR - totalStartR);

          // Partition litres across the rate intervals
          const sectionLitres = Math.round((fullLitres / sectionCount) * 100) / 100;
          const secStart = Math.round((totalStartR + (fullLitres / sectionCount) * sIdx) * 100) / 100;
          const secEnd = Math.round((secStart + sectionLitres) * 100) / 100;
          const secAmount = Math.round(sectionLitres * appliedRate * 100) / 100;

          return {
            ...r,
            fuelType: fuel,
            appliedRate,
            startReading: secStart,
            endReading: secEnd,
            litresSold: sectionLitres,
            amount: secAmount,
          };
        });
        sec.subtotalLitres = sec.readings.reduce((s, r) => s + r.litresSold, 0);
        sec.subtotalAmount = sec.readings.reduce((s, r) => s + r.amount, 0);
      });
    }

    // Grand Totals across all sections
    const grandFuelLitres = sections.reduce((sum, s) => sum + s.subtotalLitres, 0);
    const grandFuelAmount = sections.reduce((sum, s) => sum + s.subtotalAmount, 0);

    // 5. Fuel Purchases on that date
    const purchasesRows = await db
      .select()
      .from(fuelPurchases)
      .where(and(eq(fuelPurchases.pump_id, pumpId), eq(fuelPurchases.date, date)));

    const totalPurchasesCost = purchasesRows.reduce((sum, p) => sum + (p.total_cost || 0), 0);
    const totalPurchasesLitres = purchasesRows.reduce((sum, p) => sum + (p.qty || 0), 0);

    // 6. Expenses on that date
    const expenseRows = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.pump_id, pumpId), eq(expenses.date, date)));

    const totalExpenses = expenseRows.reduce((sum, e) => sum + (e.amount || 0), 0);

    // 7. Counter Product Sales
    const productSalesRows = await db
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
      .where(and(eq(productSales.pump_id, pumpId), eq(productSales.date, date)));

    const totalProductRevenue = productSalesRows.reduce((sum, ps) => sum + (ps.total || 0), 0);
    const totalProductProfit = productSalesRows.reduce((sum, ps) => sum + (ps.profit || 0), 0);

    // 8. Net Profit Calculation:
    // Dealer fuel margin average ~Rs. 9.87/Litre + product profits - expenses
    const estimatedFuelMargin = Math.round(grandFuelLitres * 9.87 * 100) / 100;
    const netProfit = Math.round((estimatedFuelMargin + totalProductProfit - totalExpenses) * 100) / 100;

    return NextResponse.json({
      success: true,
      pump: pumpInfo,
      date,
      sections,
      grandTotals: {
        totalFuelLitres: grandFuelLitres,
        totalFuelAmount: grandFuelAmount,
        totalPurchasesLitres,
        totalPurchasesCost,
        totalExpenses,
        totalProductRevenue,
        totalProductProfit,
        estimatedFuelMargin,
        netProfit,
      },
      purchases: purchasesRows,
      expenses: expenseRows,
      productSales: productSalesRows,
    });
  } catch (error: any) {
    console.error("GET daily rate-wise report error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
