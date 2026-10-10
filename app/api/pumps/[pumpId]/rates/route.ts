import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fuelRates, fuelRatesHistory, dailyRates, pumps } from "@/lib/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
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

    const [pumpRows, currentRatesRows, historyRows, dailyRateRows] = await Promise.all([
      db.select({ id: pumps.id, pump_name: pumps.pump_name }).from(pumps).where(eq(pumps.id, pumpId)),
      db.select().from(fuelRates).where(eq(fuelRates.pump_id, pumpId)),
      db
        .select()
        .from(fuelRatesHistory)
        .where(eq(fuelRatesHistory.pump_id, pumpId))
        .orderBy(desc(fuelRatesHistory.effective_from), desc(fuelRatesHistory.id))
        .limit(100),
      db
        .select()
        .from(dailyRates)
        .where(eq(dailyRates.pump_id, pumpId))
        .orderBy(desc(dailyRates.id))
        .limit(1),
    ]);

    const pumpName = pumpRows[0]?.pump_name || "Nexeta Petrol";
    const lastDaily = dailyRateRows[0];

    // Seed starter defaults if fuelRates table is empty for this pump
    const standardProducts = ["Petrol", "Diesel", "Super", "HOBC"];
    let ratesMap = new Map<string, any>();
    currentRatesRows.forEach((r) => ratesMap.set(r.product, r));

    const defaultPrices: Record<string, number> = {
      Petrol: lastDaily?.petrol_rate || 260.0,
      Diesel: lastDaily?.diesel_rate || 268.0,
      Super: 265.0,
      HOBC: lastDaily?.hioctane_rate || 295.0,
    };

    const formattedCurrentRates = standardProducts.map((prod) => {
      const existing = ratesMap.get(prod);
      if (existing) {
        return {
          product: prod,
          current_rate: existing.current_rate,
          last_effective_from: existing.last_effective_from,
          updated_at: existing.updated_at,
        };
      }
      return {
        product: prod,
        current_rate: defaultPrices[prod] || 260.0,
        last_effective_from: `${getTodayDatePK()} 12:00 AM`,
        updated_at: new Date().toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      pump_name: pumpName,
      current_rates: formattedCurrentRates,
      history: historyRows,
    });
  } catch (error: any) {
    console.error("GET fuel rates error:", error);
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
    const product = (body.product || "Petrol").trim();
    const newRate = parseFloat(body.new_rate);
    const effectiveFrom = (body.effective_from || "").trim(); // format: "DD-MM-YYYY hh:mm A" or ISO
    const reason = (body.reason || "OGRA / Govt Notification").trim();
    const changedBy = (body.changed_by || "Manager").trim();

    if (isNaN(newRate) || newRate <= 0) {
      return NextResponse.json({ success: false, error: "درست ریٹ درج کریں" }, { status: 400 });
    }

    if (!effectiveFrom) {
      return NextResponse.json(
        { success: false, error: "ریٹ لاگو ہونے کی تاریخ اور وقت (Effective From) درج کریں" },
        { status: 400 }
      );
    }

    // 1. Fetch current active rate for this product
    const existingRateRows = await db
      .select()
      .from(fuelRates)
      .where(and(eq(fuelRates.pump_id, pumpId), eq(fuelRates.product, product)));

    const currentRateObj = existingRateRows[0];
    const oldRate = currentRateObj ? currentRateObj.current_rate : newRate;

    // 2. Close previous open history row: set effective_to = effectiveFrom
    const openHistoryRows = await db
      .select()
      .from(fuelRatesHistory)
      .where(
        and(
          eq(fuelRatesHistory.pump_id, pumpId),
          eq(fuelRatesHistory.product, product),
          isNull(fuelRatesHistory.effective_to)
        )
      );

    for (const row of openHistoryRows) {
      await db
        .update(fuelRatesHistory)
        .set({ effective_to: effectiveFrom })
        .where(eq(fuelRatesHistory.id, row.id));
    }

    const nowIso = new Date().toISOString();

    // 3. Insert new rate history row with effective_from = selected, effective_to = NULL
    const [newHistoryRow] = await db
      .insert(fuelRatesHistory)
      .values({
        pump_id: pumpId,
        product,
        old_rate: oldRate,
        new_rate: newRate,
        effective_from: effectiveFrom,
        effective_to: null,
        reason,
        changed_by: changedBy,
        created_at: nowIso,
      })
      .returning();

    // 4. Update or Insert current rate in fuel_rates table
    if (currentRateObj) {
      await db
        .update(fuelRates)
        .set({
          current_rate: newRate,
          last_effective_from: effectiveFrom,
          updated_at: nowIso,
        })
        .where(eq(fuelRates.id, currentRateObj.id));
    } else {
      await db.insert(fuelRates).values({
        pump_id: pumpId,
        product,
        current_rate: newRate,
        last_effective_from: effectiveFrom,
        updated_at: nowIso,
      });
    }

    // 5. Sync with daily_rates for today
    try {
      const today = getTodayDatePK();
      const [todayDailyRate] = await db
        .select()
        .from(dailyRates)
        .where(and(eq(dailyRates.pump_id, pumpId), eq(dailyRates.date, today)));

      const pRate = product === "Petrol" ? newRate : todayDailyRate?.petrol_rate || 260;
      const dRate = product === "Diesel" ? newRate : todayDailyRate?.diesel_rate || 268;
      const hRate = product === "HOBC" ? newRate : todayDailyRate?.hioctane_rate || 295;

      if (todayDailyRate) {
        await db
          .update(dailyRates)
          .set({ petrol_rate: pRate, diesel_rate: dRate, hioctane_rate: hRate })
          .where(eq(dailyRates.id, todayDailyRate.id));
      } else {
        await db.insert(dailyRates).values({
          pump_id: pumpId,
          date: today,
          petrol_rate: pRate,
          diesel_rate: dRate,
          hioctane_rate: hRate,
        });
      }
    } catch (syncErr) {
      console.warn("Daily rates sync notice:", syncErr);
    }

    // Check if effectiveFrom was in the past (e.g. manager entered rate late)
    let isPastEffective = false;
    try {
      // Parse effectiveFrom to compare
      const parsedTime = Date.parse(effectiveFrom);
      if (!isNaN(parsedTime) && parsedTime < Date.now() - 60000) {
        isPastEffective = true;
      }
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `نیا ریٹ Rs. ${newRate} (${product}) کامیابی سے لاگو ہو گیا!`,
      is_past_effective: isPastEffective,
      warning: isPastEffective
        ? "آپ نے ماضی کا ریٹ لگایا ہے، رپورٹس اور نوزل سیلز خود بخود درست ریٹ کے ساتھ اپڈیٹ ہو جائیں گی"
        : null,
      history_entry: newHistoryRow,
    });
  } catch (error: any) {
    console.error("POST fuel rate error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
