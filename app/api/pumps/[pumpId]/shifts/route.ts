import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shifts, shiftNozzleReadings, nozzles, tanks, fuelRates, dailyRates, employees, pumps, expenses } from "@/lib/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
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
    const dateFilter = searchParams.get("date"); // e.g. "12-10-2026"

    const [pumpRows, staffRows, nozzleRows, shiftRows, dailyRateRows, liveFuelRates] = await Promise.all([
      db.select({ id: pumps.id, pump_name: pumps.pump_name }).from(pumps).where(eq(pumps.id, pumpId)).limit(1),
      db.select().from(employees).where(eq(employees.pump_id, pumpId)),
      db
        .select({
          id: nozzles.id,
          name: nozzles.name,
          tank_id: nozzles.tank_id,
          fuel_type: tanks.fuel_type,
          product: tanks.product,
        })
        .from(nozzles)
        .leftJoin(tanks, eq(nozzles.tank_id, tanks.id))
        .where(eq(nozzles.pump_id, pumpId)),
      db
        .select()
        .from(shifts)
        .where(eq(shifts.pump_id, pumpId))
        .orderBy(desc(shifts.id))
        .limit(50),
      db
        .select()
        .from(dailyRates)
        .where(eq(dailyRates.pump_id, pumpId))
        .orderBy(desc(dailyRates.id))
        .limit(1),
      db
        .select()
        .from(fuelRates)
        .where(eq(fuelRates.pump_id, pumpId)),
    ]);

    const pumpName = pumpRows[0]?.pump_name || "Nexeta Petrol";

    // Dynamic rates resolution
    const latestDaily = dailyRateRows[0] || null;
    let petrolRate = latestDaily?.petrol_rate || 0;
    let dieselRate = latestDaily?.diesel_rate || 0;
    let hioctaneRate = latestDaily?.hioctane_rate || 0;

    for (const fr of liveFuelRates) {
      const prod = (fr.product || "").toLowerCase();
      if ((prod.includes("petrol") || prod.includes("super")) && (!petrolRate || fr.current_rate > 0)) {
        petrolRate = fr.current_rate;
      } else if ((prod.includes("diesel") || prod.includes("hsd")) && (!dieselRate || fr.current_rate > 0)) {
        dieselRate = fr.current_rate;
      } else if ((prod.includes("hioctane") || prod.includes("hobc")) && (!hioctaneRate || fr.current_rate > 0)) {
        hioctaneRate = fr.current_rate;
      }
    }

    if (!petrolRate) petrolRate = 290.50;
    if (!dieselRate) dieselRate = 285.00;
    if (!hioctaneRate) hioctaneRate = 300.00;

    const dynamicRates = {
      petrol_rate: petrolRate,
      diesel_rate: dieselRate,
      hioctane_rate: hioctaneRate,
      petrol: petrolRate,
      diesel: dieselRate,
      HSD: dieselRate,
      Petrol: petrolRate,
    };

    // Active shift (if any)
    const activeShift = shiftRows.find((s) => s.status === "active") || null;

    // Attach nozzle readings to active shift and recent shifts
    let activeShiftWithReadings = null;
    if (activeShift) {
      const rawReadings = await db
        .select({
          id: shiftNozzleReadings.id,
          shift_id: shiftNozzleReadings.shift_id,
          nozzle_id: shiftNozzleReadings.nozzle_id,
          opening: shiftNozzleReadings.opening,
          closing: shiftNozzleReadings.closing,
          sale_liters: shiftNozzleReadings.sale_liters,
          rate: shiftNozzleReadings.rate,
          amount: shiftNozzleReadings.amount,
          nozzle_name: nozzles.name,
          fuel_type: tanks.fuel_type,
          product: tanks.product,
        })
        .from(shiftNozzleReadings)
        .leftJoin(nozzles, eq(shiftNozzleReadings.nozzle_id, nozzles.id))
        .leftJoin(tanks, eq(nozzles.tank_id, tanks.id))
        .where(eq(shiftNozzleReadings.shift_id, activeShift.id));

      const readings = rawReadings.map((r) => {
        const prod = (r.product || r.fuel_type || "").toLowerCase();
        const fallbackRate = prod.includes("diesel") || prod.includes("hsd")
          ? dieselRate
          : prod.includes("hioctane") || prod.includes("hobc")
          ? hioctaneRate
          : petrolRate;

        const effectiveRate = r.rate && Number(r.rate) > 0 ? Number(r.rate) : fallbackRate;
        return {
          ...r,
          rate: effectiveRate,
        };
      });

      activeShiftWithReadings = {
        ...activeShift,
        readings,
      };
    }

    // Filter shift history if date provided
    let history = shiftRows;
    if (dateFilter) {
      history = history.filter((s) => s.date === dateFilter);
    }

    return NextResponse.json({
      success: true,
      pump_name: pumpName,
      activeShift: activeShiftWithReadings,
      shifts: history,
      nozzles: nozzleRows,
      staff: staffRows,
      rates: dynamicRates,
      petrol_rate: petrolRate,
      diesel_rate: dieselRate,
      hioctane_rate: hioctaneRate,
    });
  } catch (error: any) {
    console.error("GET shifts error:", error);
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
    const shiftName = (body.shift_name || "Morning").trim(); // 'Morning' | 'Evening' | 'Night'
    const staffId = body.staff_id ? Number(body.staff_id) : null;
    const staffName = (body.staff_name || "").trim();
    const startTime = (body.start_time || "08:00 AM").trim();
    const date = (body.date || getTodayDatePK()).trim();
    const openingCash = parseFloat(body.opening_cash) || 0;
    const customOpenings = body.nozzle_openings || {}; // map nozzle_id -> opening

    // Check if an active shift is already running
    const existingActive = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.pump_id, pumpId), eq(shifts.status, "active")))
      .limit(1);

    if (existingActive.length > 0) {
      return NextResponse.json({
        success: false,
        error: `پہلے ہی ایک شفٹ (${existingActive[0].shift_name}) فعال ہے۔ پہلے پرانی شفٹ بند کریں۔`,
      }, { status: 400 });
    }

    // 1. Create shift
    const [newShift] = await db
      .insert(shifts)
      .values({
        pump_id: pumpId,
        shift_name: shiftName,
        start_time: startTime,
        end_time: null,
        staff_id: staffId,
        staff_name: staffName || "Staff Member",
        date,
        opening_cash: openingCash,
        closing_cash: 0,
        total_sale_liters: 0,
        total_income: 0,
        status: "active",
        created_at: new Date().toISOString(),
      })
      .returning();

    // 2. Fetch nozzles with tanks to determine fuel types
    const pumpNozzles = await db
      .select({
        id: nozzles.id,
        name: nozzles.name,
        fuel_type: tanks.fuel_type,
        product: tanks.product,
      })
      .from(nozzles)
      .leftJoin(tanks, eq(nozzles.tank_id, tanks.id))
      .where(eq(nozzles.pump_id, pumpId));

    // Dynamic rates resolution
    const [postDailyRates, postFuelRates] = await Promise.all([
      db.select().from(dailyRates).where(eq(dailyRates.pump_id, pumpId)).orderBy(desc(dailyRates.id)).limit(1),
      db.select().from(fuelRates).where(eq(fuelRates.pump_id, pumpId)),
    ]);

    let postPetrolRate = postDailyRates[0]?.petrol_rate || 0;
    let postDieselRate = postDailyRates[0]?.diesel_rate || 0;
    let postHioctaneRate = postDailyRates[0]?.hioctane_rate || 0;

    for (const fr of postFuelRates) {
      const prod = (fr.product || "").toLowerCase();
      if ((prod.includes("petrol") || prod.includes("super")) && (!postPetrolRate || fr.current_rate > 0)) {
        postPetrolRate = fr.current_rate;
      } else if ((prod.includes("diesel") || prod.includes("hsd")) && (!postDieselRate || fr.current_rate > 0)) {
        postDieselRate = fr.current_rate;
      } else if ((prod.includes("hioctane") || prod.includes("hobc")) && (!postHioctaneRate || fr.current_rate > 0)) {
        postHioctaneRate = fr.current_rate;
      }
    }

    if (!postPetrolRate) postPetrolRate = 290.50;
    if (!postDieselRate) postDieselRate = 285.00;
    if (!postHioctaneRate) postHioctaneRate = 300.00;

    // For each nozzle, determine opening reading and active fuel rate
    for (const nz of pumpNozzles) {
      let openingMeter = customOpenings[nz.id] !== undefined ? Number(customOpenings[nz.id]) : 0;

      // If not supplied, try to fetch closing reading from previous shift
      if (!openingMeter) {
        const prevReadings = await db
          .select()
          .from(shiftNozzleReadings)
          .where(eq(shiftNozzleReadings.nozzle_id, nz.id))
          .orderBy(desc(shiftNozzleReadings.id))
          .limit(1);

        if (prevReadings.length > 0 && prevReadings[0].closing > 0) {
          openingMeter = prevReadings[0].closing;
        }
      }

      const prod = (nz.product || nz.fuel_type || "").toLowerCase();
      const initialRate = prod.includes("diesel") || prod.includes("hsd")
        ? postDieselRate
        : prod.includes("hioctane") || prod.includes("hobc")
        ? postHioctaneRate
        : postPetrolRate;

      await db.insert(shiftNozzleReadings).values({
        shift_id: newShift.id,
        nozzle_id: nz.id,
        opening: openingMeter,
        closing: openingMeter,
        sale_liters: 0,
        rate: initialRate,
        amount: 0,
      });
    }

    return NextResponse.json({
      success: true,
      message: `نئی شفٹ (${shiftName}) کامیابی سے شروع ہو گئی`,
      shift: newShift,
    });
  } catch (error: any) {
    console.error("POST start shift error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
