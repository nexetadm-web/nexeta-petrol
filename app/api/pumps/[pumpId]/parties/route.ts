import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parties, pumps } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";

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
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    const [pumpRows, partyList] = await Promise.all([
      db.select({ id: pumps.id, pump_name: pumps.pump_name }).from(pumps).where(eq(pumps.id, pumpId)),
      db
        .select()
        .from(parties)
        .where(eq(parties.pump_id, pumpId))
        .orderBy(desc(parties.balance), desc(parties.id)),
    ]);

    const pumpName = pumpRows[0]?.pump_name || "Nexeta Petrol";

    // Instant filter if search query provided
    const filtered = q
      ? partyList.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.phone.includes(q) ||
            (p.vehicle_no && p.vehicle_no.toLowerCase().includes(q))
        )
      : partyList;

    const totalReceivable = partyList.reduce((acc, p) => acc + (p.balance > 0 ? p.balance : 0), 0);

    return NextResponse.json({
      success: true,
      pump_name: pumpName,
      parties: filtered,
      total_parties: partyList.length,
      total_receivable: totalReceivable,
    });
  } catch (error: any) {
    console.error("GET parties error:", error);
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
    const name = (body.name || "").trim();
    const phone = (body.phone || "").trim();
    const vehicleNo = (body.vehicle_no || "").trim();
    const openingBalance = parseFloat(body.opening_balance) || 0;
    const creditLimit = parseFloat(body.credit_limit) || 0;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: "نام اور فون نمبر درج کرنا لازمی ہے" },
        { status: 400 }
      );
    }

    const [newParty] = await db
      .insert(parties)
      .values({
        pump_id: pumpId,
        name,
        phone,
        vehicle_no: vehicleNo || null,
        balance: openingBalance,
        credit_limit: creditLimit,
        status: "active",
        created_at: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: `پارٹی "${name}" کامیابی سے شامل ہو گئی`,
      party: newParty,
    });
  } catch (error: any) {
    console.error("POST party error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
