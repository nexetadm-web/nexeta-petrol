import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailyRates, dailyReadings, nozzles, tanks } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getTodayDateString } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const history = searchParams.get("history");

    if (history === "true") {
      const allRates = await db
        .select()
        .from(dailyRates)
        .orderBy(desc(dailyRates.date))
        .limit(30);
      return NextResponse.json({ success: true, rates: allRates });
    }

    const targetDate = date || getTodayDateString();
    const rateRecords = await db
      .select()
      .from(dailyRates)
      .where(eq(dailyRates.date, targetDate));

    return NextResponse.json({
      success: true,
      date: targetDate,
      rate: rateRecords.length > 0 ? rateRecords[0] : null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, petrol_rate, diesel_rate, hioctane_rate } = body;

    if (!date || petrol_rate == null || diesel_rate == null || hioctane_rate == null) {
      return NextResponse.json(
        { success: false, error: "Missing required rate parameters" },
        { status: 400 }
      );
    }

    const pRate = Number(petrol_rate);
    const dRate = Number(diesel_rate);
    const hRate = Number(hioctane_rate);

    // Check if record exists
    const existing = await db
      .select()
      .from(dailyRates)
      .where(eq(dailyRates.date, date));

    let savedRate;
    if (existing.length > 0) {
      const [updated] = await db
        .update(dailyRates)
        .set({
          petrol_rate: pRate,
          diesel_rate: dRate,
          hioctane_rate: hRate,
        })
        .where(eq(dailyRates.date, date))
        .returning();
      savedRate = updated;
    } else {
      const [created] = await db
        .insert(dailyRates)
        .values({
          date,
          petrol_rate: pRate,
          diesel_rate: dRate,
          hioctane_rate: hRate,
        })
        .returning();
      savedRate = created;
    }

    // Refresh any existing dailyReadings for this date to match new rates!
    const readingsForDate = await db
      .select({
        readingId: dailyReadings.id,
        nozzleId: dailyReadings.nozzle_id,
        litresSold: dailyReadings.litres_sold,
        fuelType: tanks.fuel_type,
      })
      .from(dailyReadings)
      .leftJoin(nozzles, eq(dailyReadings.nozzle_id, nozzles.id))
      .leftJoin(tanks, eq(nozzles.tank_id, tanks.id))
      .where(eq(dailyReadings.date, date));

    for (const r of readingsForDate) {
      let applicableRate = pRate;
      if (r.fuelType === "Diesel") applicableRate = dRate;
      else if (r.fuelType === "HiOctane") applicableRate = hRate;

      const newAmount = (r.litresSold || 0) * applicableRate;
      await db
        .update(dailyReadings)
        .set({
          rate: applicableRate,
          amount: newAmount,
        })
        .where(eq(dailyReadings.id, r.readingId));
    }

    return NextResponse.json({
      success: true,
      message: "Daily rate saved successfully",
      rate: savedRate,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
