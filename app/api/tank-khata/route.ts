import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tankKhata, tanks, dailyReadings, nozzles, fuelPurchases } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import { getTodayDatePK, formatDate, toStandardYMD } from "@/lib/formatters";
import { calculateDipLitres } from "@/lib/dip-calculator";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fuelType = searchParams.get("fuel_type"); // "Petrol" | "Diesel"

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
      .orderBy(desc(tankKhata.id));

    const allRecords = await query;

    // Filter into Diesel and Petrol lists
    const dieselRecords = allRecords.filter((r) => r.fuel_type === "Diesel");
    const petrolRecords = allRecords.filter((r) => r.fuel_type === "Petrol" || r.fuel_type === "HiOctane");

    // Fetch all tanks
    const allTanks = await db.select().from(tanks);

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
    const entryDate = date ? formatDate(date) : getTodayDatePK(); // DD-MM-YYYY
    const ymdDate = toStandardYMD(entryDate);

    // Fetch tank info
    const tankList = await db.select().from(tanks).where(eq(tanks.id, tId));
    if (tankList.length === 0) {
      return NextResponse.json({ success: false, error: "Tank not found" }, { status: 404 });
    }
    const tank = tankList[0];
    const fuel = fuel_type || tank.fuel_type;

    // 1. Calculate Dip Chart Litres (auto)
    const dipLitres = await calculateDipLitres(tId, fuel, dipVal);
    const tankStock = dipLitres; // Tank Stock from physical dip

    // 2. Calculate Register Stock:
    // Formula: Register Stock = Previous Register Stock - Today's Sales + Today's Purchases
    // Find most recent previous tank khata entry for this tank
    const prevKhataEntries = await db
      .select()
      .from(tankKhata)
      .where(eq(tankKhata.tank_id, tId))
      .orderBy(desc(tankKhata.id))
      .limit(1);

    let prevRegisterStock = tank.current_stock;
    if (prevKhataEntries.length > 0) {
      prevRegisterStock = prevKhataEntries[0].register_stock || prevKhataEntries[0].tank_stock;
    }

    // Today's Sales for this tank from daily readings (checking both YYYY-MM-DD and DD-MM-YYYY)
    const tankNozzles = await db.select().from(nozzles).where(eq(nozzles.tank_id, tId));
    const nozzleIds = tankNozzles.map((n) => n.id);

    let todaySalesLitres = 0;
    if (nozzleIds.length > 0) {
      const allReadings = await db.select().from(dailyReadings);
      for (const r of allReadings) {
        if (nozzleIds.includes(r.nozzle_id) && (r.date === entryDate || r.date === ymdDate)) {
          todaySalesLitres += r.litres_sold || 0;
        }
      }
    }

    // Today's Purchases for this fuel type
    let todayPurchasesLitres = 0;
    const purchases = await db.select().from(fuelPurchases);
    for (const p of purchases) {
      if (p.fuel_type === fuel && (p.date === entryDate || p.date === ymdDate)) {
        todayPurchasesLitres += p.qty || 0;
      }
    }

    // Register Stock = Previous Register Stock - Sale + Purchase
    const calculatedRegisterStock = Math.round(
      prevRegisterStock - todaySalesLitres + todayPurchasesLitres
    );

    // Gain / Loss = Tank Stock (Physical) - Register Stock (Book)
    const gainLoss = Math.round((tankStock - calculatedRegisterStock) * 100) / 100;

    // Save entry in tankKhata
    const [newEntry] = await db
      .insert(tankKhata)
      .values({
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

    // Update live tank current_stock to physical dip stock
    await db
      .update(tanks)
      .set({
        current_stock: tankStock,
      })
      .where(eq(tanks.id, tId));

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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }

    await db.delete(tankKhata).where(eq(tankKhata.id, Number(id)));
    return NextResponse.json({ success: true, message: "انٹری حذف کر دی گئی" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
