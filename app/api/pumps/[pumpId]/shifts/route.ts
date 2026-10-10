import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shifts, shiftNozzleReadings, nozzles, tanks, fuelRates, employees, pumps, expenses } from "@/lib/schema";
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

    const [pumpRows, staffRows, nozzleRows, shiftRows] = await Promise.all([
      db.select({ id: pumps.id, pump_name: pumps.pump_name }).from(pumps).where(eq(pumps.id, pumpId)).limit(1),
      db.select().from(employees).where(eq(employees.pump_id, pumpId)),
      db
        .select({
          id: nozzles.id,
          name: nozzles.name,
          tank_id: nozzles.tank_id,
          fuel_type: tanks.fuel_type,
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
    ]);

    const pumpName = pumpRows[0]?.pump_name || "Nexeta Petrol";

    // Active shift (if any)
    const activeShift = shiftRows.find((s) => s.status === "active") || null;

    // Attach nozzle readings to active shift and recent shifts
    let activeShiftWithReadings = null;
    if (activeShift) {
      const readings = await db
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
        })
        .from(shiftNozzleReadings)
        .leftJoin(nozzles, eq(shiftNozzleReadings.nozzle_id, nozzles.id))
        .leftJoin(tanks, eq(nozzles.tank_id, tanks.id))
        .where(eq(shiftNozzleReadings.shift_id, activeShift.id));

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

    // 2. Fetch nozzles for this pump to initialize readings
    const pumpNozzles = await db
      .select()
      .from(nozzles)
      .where(eq(nozzles.pump_id, pumpId));

    // For each nozzle, determine opening reading
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

      await db.insert(shiftNozzleReadings).values({
        shift_id: newShift.id,
        nozzle_id: nz.id,
        opening: openingMeter,
        closing: openingMeter,
        sale_liters: 0,
        rate: 0,
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
