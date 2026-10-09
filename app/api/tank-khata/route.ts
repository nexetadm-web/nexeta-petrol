import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tankKhata, tanks, dailyReadings, nozzles, fuelPurchases } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import { getTodayDatePK, formatDate, toStandardYMD } from "@/lib/formatters";
import { calculateDipLitres } from "@/lib/dip-calculator";
import { getCurrentPumpId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);

    const query = db
      .select({
        id: tankKhata.id,
        date: tankKhata.date,
        tank_id: tankKhata.tank_id,
        tankName: tanks.name,
        fuel_type: tankKhata.fuel_type,
        dip_value: tankKhata.dip_value,
        dip_unit: tankKhata.dip_unit,
        dip_litres: tankKhata.dip_litres,
        tank_stock: tankKhata.tank_stock,
        register_stock: tankKhata.register_stock,
        gain_loss: tankKhata.gain_loss,
        remarks: tankKhata.remarks,
      })
      .from(tankKhata)
      .leftJoin(tanks, eq(tankKhata.tank_id, tanks.id))
      .where(eq(tankKhata.pump_id, pumpId))
      .orderBy(desc(tankKhata.id));

    const allRecords = await query;

    const dieselRecords = allRecords.filter((r) => r.fuel_type === "Diesel");
    const petrolRecords = allRecords.filter((r) => r.fuel_type === "Petrol" || r.fuel_type === "HiOctane");

    const allTanks = await db.select().from(tanks).where(eq(tanks.pump_id, pumpId));

    return NextResponse.json({
      success: true,
      records: allRecords,
      dieselRecords,
      petrolRecords,
      tanks: allTanks,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const body = await request.json();
    const { date, tank_id, fuel_type, dip_value, dip_unit, remarks } = body;

    if (!tank_id || dip_value == null) {
      return NextResponse.json(
        { success: false, error: "Tank and Dip measurement are required" },
        { status: 400 }
      );
    }

    const tId = Number(tank_id);
    const dipVal = parseFloat(dip_value);
    const unit = dip_unit || "inch";
    const entryDate = date ? formatDate(date) : getTodayDatePK();
    const ymdDate = toStandardYMD(entryDate);

    const tankList = await db.select().from(tanks).where(and(eq(tanks.id, tId), eq(tanks.pump_id, pumpId)));
    if (tankList.length === 0) {
      return NextResponse.json({ success: false, error: "Tank not found" }, { status: 404 });
    }
    const tank = tankList[0];
    const fuel = fuel_type || tank.fuel_type;

    const dipLitres = await calculateDipLitres(tId, fuel, dipVal);
    const tankStock = dipLitres;

    const prevKhataEntries = await db
      .select()
      .from(tankKhata)
      .where(and(eq(tankKhata.tank_id, tId), eq(tankKhata.pump_id, pumpId)))
      .orderBy(desc(tankKhata.id))
      .limit(1);

    let prevRegisterStock = tank.current_stock;
    if (prevKhataEntries.length > 0) {
      prevRegisterStock = prevKhataEntries[0].register_stock || prevKhataEntries[0].tank_stock;
    }

    const tankNozzles = await db.select().from(nozzles).where(and(eq(nozzles.tank_id, tId), eq(nozzles.pump_id, pumpId)));
    const nozzleIds = tankNozzles.map((n) => n.id);

    let todaySalesLitres = 0;
    if (nozzleIds.length > 0) {
      const allReadings = await db.select().from(dailyReadings).where(eq(dailyReadings.pump_id, pumpId));
      for (const r of allReadings) {
        if (nozzleIds.includes(r.nozzle_id) && (r.date === entryDate || r.date === ymdDate)) {
          todaySalesLitres += r.litres_sold || 0;
        }
      }
    }

    let todayPurchasesLitres = 0;
    const purchases = await db.select().from(fuelPurchases).where(eq(fuelPurchases.pump_id, pumpId));
    for (const p of purchases) {
      if (p.fuel_type === fuel && (p.date === entryDate || p.date === ymdDate)) {
        todayPurchasesLitres += p.qty || 0;
      }
    }

    const calculatedRegisterStock = Math.round(
      prevRegisterStock - todaySalesLitres + todayPurchasesLitres
    );

    const gainLoss = Math.round((tankStock - calculatedRegisterStock) * 100) / 100;

    const [newEntry] = await db
      .insert(tankKhata)
      .values({
        pump_id: pumpId,
        date: entryDate,
        tank_id: tId,
        fuel_type: fuel,
        dip_value: dipVal,
        dip_unit: unit,
        dip_litres: dipLitres,
        tank_stock: tankStock,
        register_stock: calculatedRegisterStock,
        gain_loss: gainLoss,
        remarks: remarks || "",
      })
      .returning();

    await db
      .update(tanks)
      .set({
        current_stock: tankStock,
      })
      .where(and(eq(tanks.id, tId), eq(tanks.pump_id, pumpId)));

    return NextResponse.json({
      success: true,
      message: `ٹینک کھاتہ انٹری کامیابی سے محفوظ ہو گئی! ڈپ: ${dipVal} ${unit} = ${dipLitres.toLocaleString()} L`,
      entry: newEntry,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    await db.delete(tankKhata).where(and(eq(tankKhata.id, Number(id)), eq(tankKhata.pump_id, pumpId)));
    return NextResponse.json({ success: true, message: "انٹری حذف کر دی گئی" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
