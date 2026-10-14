import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailyRates, dailyReadings, nozzles, tanks, fuelRates } from "@/lib/schema";
import { eq, desc, and, or } from "drizzle-orm";
import { getTodayDateString, getTodayDatePK, formatDate, toStandardYMD } from "@/lib/formatters";
import { getCurrentPumpId } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getAlternateDateFormat(d: string): string {
  const dmRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
  const matchDm = d.match(dmRegex);
  if (matchDm) {
    return `${matchDm[3]}-${matchDm[2]}-${matchDm[1]}`;
  }
  const ymRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const matchYm = d.match(ymRegex);
  if (matchYm) {
    return `${matchYm[3]}-${matchYm[2]}-${matchYm[1]}`;
  }
  return d;
}

export async function GET(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const history = searchParams.get("history");

    if (history === "true") {
      const allRates = await db
        .select()
        .from(dailyRates)
        .where(eq(dailyRates.pump_id, pumpId))
        .orderBy(desc(dailyRates.date))
        .limit(30);
      return NextResponse.json({ success: true, rates: allRates });
    }

    const targetDate = date || getTodayDateString();
    const altDate = getAlternateDateFormat(targetDate);

    let rateRecords = await db
      .select()
      .from(dailyRates)
      .where(
        and(
          eq(dailyRates.pump_id, pumpId),
          or(eq(dailyRates.date, targetDate), eq(dailyRates.date, altDate))
        )
      )
      .limit(1);

    // If no daily rate found for today, check latest fuelRates as fallback
    let rate = rateRecords.length > 0 ? rateRecords[0] : null;
    if (!rate) {
      const liveFuelRates = await db
        .select()
        .from(fuelRates)
        .where(eq(fuelRates.pump_id, pumpId));

      if (liveFuelRates.length > 0) {
        const pRate = liveFuelRates.find((f) => f.product === "Petrol" || f.product === "Super")?.current_rate || 285.5;
        const dRate = liveFuelRates.find((f) => f.product === "Diesel")?.current_rate || 292.0;
        const hRate = liveFuelRates.find((f) => f.product === "HOBC" || f.product === "HiOctane")?.current_rate || 312.0;

        rate = {
          id: 0,
          pump_id: pumpId,
          date: targetDate,
          petrol_rate: pRate,
          diesel_rate: dRate,
          hioctane_rate: hRate,
        } as any;
      }
    }

    return NextResponse.json({
      success: true,
      date: targetDate,
      rate,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
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
    const targetDate = String(date).trim();
    const altDate = getAlternateDateFormat(targetDate);

    // Check if record exists for this pump and date (matching either YYYY-MM-DD or DD-MM-YYYY)
    const existing = await db
      .select()
      .from(dailyRates)
      .where(
        and(
          eq(dailyRates.pump_id, pumpId),
          or(eq(dailyRates.date, targetDate), eq(dailyRates.date, altDate))
        )
      )
      .limit(1);

    let savedRate;
    if (existing.length > 0) {
      const [updated] = await db
        .update(dailyRates)
        .set({
          petrol_rate: pRate,
          diesel_rate: dRate,
          hioctane_rate: hRate,
        })
        .where(eq(dailyRates.id, existing[0].id))
        .returning();
      savedRate = updated;
    } else {
      const [created] = await db
        .insert(dailyRates)
        .values({
          pump_id: pumpId,
          date: targetDate,
          petrol_rate: pRate,
          diesel_rate: dRate,
          hioctane_rate: hRate,
        })
        .returning();
      savedRate = created;
    }

    // Also sync to fuelRates table for live nozzle calculations
    try {
      const fuelProducts = [
        { product: "Petrol", rate: pRate },
        { product: "Diesel", rate: dRate },
        { product: "Super", rate: pRate },
        { product: "HOBC", rate: hRate },
        { product: "HiOctane", rate: hRate },
      ];

      for (const fp of fuelProducts) {
        const existF = await db
          .select()
          .from(fuelRates)
          .where(and(eq(fuelRates.pump_id, pumpId), eq(fuelRates.product, fp.product)))
          .limit(1);

        if (existF.length > 0) {
          await db
            .update(fuelRates)
            .set({
              current_rate: fp.rate,
              last_effective_from: targetDate,
              updated_at: new Date().toISOString(),
            })
            .where(eq(fuelRates.id, existF[0].id));
        } else {
          await db.insert(fuelRates).values({
            pump_id: pumpId,
            product: fp.product,
            current_rate: fp.rate,
            last_effective_from: targetDate,
            updated_at: new Date().toISOString(),
          });
        }
      }
    } catch (errSync) {
      console.warn("fuelRates sync note:", errSync);
    }

    // Refresh any existing dailyReadings for this pump & date to match new rates
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
      .where(
        and(
          eq(dailyReadings.pump_id, pumpId),
          or(eq(dailyReadings.date, targetDate), eq(dailyReadings.date, altDate))
        )
      );

    for (const r of readingsForDate) {
      let applicableRate = pRate;
      if (r.fuelType === "Diesel") applicableRate = dRate;
      else if (r.fuelType === "HiOctane" || r.fuelType === "HOBC") applicableRate = hRate;

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
      rate: {
        ...savedRate,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
