import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nozzles, tanks, dailyRates, dailyReadings } from "@/lib/schema";
import { eq, and, sql, desc, lt } from "drizzle-orm";
import { getTodayDateString, getTodayDatePK, formatDate, toStandardYMD } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const date = dateParam ? formatDate(dateParam) : getTodayDatePK(); // Normalized DD-MM-YYYY
    const ymdDate = toStandardYMD(date); // YYYY-MM-DD

    // 1. Fetch all nozzles with tank info
    const allNozzles = await db
      .select({
        id: nozzles.id,
        name: nozzles.name,
        tank_id: nozzles.tank_id,
        tankName: tanks.name,
        fuelType: tanks.fuel_type,
        currentStock: tanks.current_stock,
      })
      .from(nozzles)
      .leftJoin(tanks, eq(nozzles.tank_id, tanks.id));

    // 2. Fetch daily rates for this date (match both formats)
    const allRates = await db.select().from(dailyRates);
    const rate = allRates.find((r) => r.date === date || r.date === ymdDate) || null;

    // 3. Fetch all readings to find previous closing accurately for every nozzle
    const allStoredReadings = await db.select().from(dailyReadings);

    // Filter current day readings
    const currentDayReadings = allStoredReadings.filter(
      (r) => r.date === date || r.date === ymdDate
    );
    const currentMap = new Map<number, any>();
    for (const cr of currentDayReadings) {
      currentMap.set(cr.nozzle_id, cr);
    }

    // 4. Auto Previous Closing from yesterday / latest prior reading
    // Find prior readings where date is earlier than current date
    const prevMap = new Map<number, number>();
    for (const nz of allNozzles) {
      // Find readings for this nozzle with date < current date, sorted newest first
      const priorReadings = allStoredReadings
        .filter((r) => {
          if (r.nozzle_id !== nz.id) return false;
          // Compare YMD strings
          const rYmd = toStandardYMD(r.date);
          return rYmd < ymdDate;
        })
        .sort((a, b) => toStandardYMD(b.date).localeCompare(toStandardYMD(a.date)));

      if (priorReadings.length > 0) {
        prevMap.set(
          nz.id,
          priorReadings[0].end_reading || priorReadings[0].evening_reading || 0
        );
      } else {
        prevMap.set(nz.id, 0);
      }
    }

    // 5. Build consolidated nozzle readings array
    const nozzleReadings = allNozzles.map((nz) => {
      const prevClosing = prevMap.get(nz.id) || 0;
      const existing = currentMap.get(nz.id);

      // Determine rate for fuel type
      let fuelRate = 0;
      if (rate) {
        if (nz.fuelType === "Diesel") fuelRate = rate.diesel_rate;
        else if (nz.fuelType === "HiOctane") fuelRate = rate.hioctane_rate;
        else fuelRate = rate.petrol_rate;
      }

      // If existing recorded reading exists, use its start reading; otherwise auto-default from prevClosing!
      const startReading = existing
        ? (existing.start_reading ?? existing.morning_reading)
        : (prevClosing > 0 ? prevClosing : 0);
      const endReading = existing
        ? (existing.end_reading ?? existing.evening_reading)
        : (existing?.start_reading || startReading);
      const litresSold = existing ? existing.litres_sold : Math.max(0, endReading - startReading);
      const amount = existing ? existing.amount : litresSold * fuelRate;

      return {
        readingId: existing?.id || null,
        nozzleId: nz.id,
        nozzleName: nz.name,
        tankId: nz.tank_id,
        tankName: nz.tankName,
        fuelType: nz.fuelType,
        prevClosing,
        startTime: existing?.start_time || "08:00 AM",
        endTime: existing?.end_time || "08:00 PM",
        startReading,
        endReading,
        morningReading: startReading,
        eveningReading: endReading,
        litresSold,
        rate: fuelRate,
        amount,
        isRecorded: !!existing,
      };
    });

    return NextResponse.json({
      success: true,
      date,
      rate,
      isRateSet: !!rate,
      readings: nozzleReadings,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, readings } = body;

    if (!date || !Array.isArray(readings)) {
      return NextResponse.json(
        { success: false, error: "Date and readings array are required" },
        { status: 400 }
      );
    }

    const targetDate = formatDate(date);
    const ymdDate = toStandardYMD(date);

    // Fetch rate for this date
    const allRates = await db.select().from(dailyRates);
    const rate = allRates.find((r) => r.date === targetDate || r.date === ymdDate);

    if (!rate) {
      return NextResponse.json(
        {
          success: false,
          error: "پہلے اس تاریخ کا ریٹ سیٹ کریں (Daily rate must be set for this date first)",
        },
        { status: 400 }
      );
    }

    // Process each reading
    for (const item of readings) {
      const { 
        nozzleId, 
        startTime, 
        endTime, 
        startReading, 
        endReading, 
        morningReading, 
        eveningReading 
      } = item;

      const start = parseFloat(startReading !== undefined ? startReading : morningReading) || 0;
      const end = parseFloat(endReading !== undefined ? endReading : eveningReading) || 0;
      const litresSold = Math.max(0, end - start);
      const sTime = startTime || "08:00 AM";
      const eTime = endTime || "08:00 PM";

      // Find nozzle tank & fuel type
      const nzList = await db
        .select({
          tankId: nozzles.tank_id,
          fuelType: tanks.fuel_type,
          currentStock: tanks.current_stock,
        })
        .from(nozzles)
        .leftJoin(tanks, eq(nozzles.tank_id, tanks.id))
        .where(eq(nozzles.id, nozzleId));

      if (nzList.length === 0) continue;
      const nz = nzList[0];

      let fuelRate = rate.petrol_rate;
      if (nz.fuelType === "Diesel") fuelRate = rate.diesel_rate;
      else if (nz.fuelType === "HiOctane") fuelRate = rate.hioctane_rate;

      const amount = litresSold * fuelRate;

      // Check existing reading (match both date formats)
      const existing = await db
        .select()
        .from(dailyReadings)
        .where(
          and(
            eq(dailyReadings.nozzle_id, nozzleId),
            sql`(${dailyReadings.date} = ${targetDate} OR ${dailyReadings.date} = ${ymdDate})`
          )
        );

      let deltaLitres = litresSold;

      if (existing.length > 0) {
        const oldReading = existing[0];
        deltaLitres = litresSold - (oldReading.litres_sold || 0);

        await db
          .update(dailyReadings)
          .set({
            start_time: sTime,
            end_time: eTime,
            start_reading: start,
            end_reading: end,
            morning_reading: start,
            evening_reading: end,
            litres_sold: litresSold,
            rate: fuelRate,
            amount: amount,
          })
          .where(eq(dailyReadings.id, oldReading.id));
      } else {
        await db.insert(dailyReadings).values({
          date: targetDate,
          nozzle_id: nozzleId,
          start_time: sTime,
          end_time: eTime,
          start_reading: start,
          end_reading: end,
          morning_reading: start,
          evening_reading: end,
          litres_sold: litresSold,
          rate: fuelRate,
          amount: amount,
        });
      }

      // Automatically update tank stock if deltaLitres changed
      if (deltaLitres !== 0 && nz.tankId) {
        await db
          .update(tanks)
          .set({
            current_stock: sql`MAX(0, ${tanks.current_stock} - ${deltaLitres})`,
          })
          .where(eq(tanks.id, nz.tankId));
      }
    }

    return NextResponse.json({
      success: true,
      message: "تمام نوزل ریڈنگز محفوظ ہو گئیں اور ٹینک اسٹاک اپ ڈیٹ ہو گیا! (Readings saved & tank stock reduced)",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Reading ID is required" }, { status: 400 });
    }

    await db.delete(dailyReadings).where(eq(dailyReadings.id, Number(id)));
    return NextResponse.json({ success: true, message: "ریڈنگ کامیابی سے ڈیلیٹ ہو گئی" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
