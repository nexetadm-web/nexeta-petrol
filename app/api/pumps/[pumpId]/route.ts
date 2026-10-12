import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pumps, pumpSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";

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

    const pumpRows = await db.select().from(pumps).where(eq(pumps.id, pumpId)).limit(1);
    if (pumpRows.length === 0) {
      return NextResponse.json({ success: false, error: "پمپ نہیں ملا" }, { status: 404 });
    }

    const p = pumpRows[0];
    const pumpData = {
      id: p.id,
      name: p.pump_name,
      pump_name: p.pump_name,
      owner_name: p.owner_name,
      phone: p.phone,
      email: p.email,
      city: p.city,
      address: p.address || `${p.city || "Main Highway"}, Pakistan`,
      logo_url: p.logo_url || null,
      subscription_status: p.subscription_status,
      created_at: p.created_at,
    };

    return NextResponse.json({
      success: true,
      pump: pumpData,
    });
  } catch (error: any) {
    console.error("GET pump error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { pumpId: string } }
) {
  try {
    const pumpId = Number(params.pumpId);
    if (isNaN(pumpId)) {
      return NextResponse.json({ success: false, error: "Invalid pump ID" }, { status: 400 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body.pump_name || body.name) updateData.pump_name = (body.pump_name || body.name).trim();
    if (body.owner_name) updateData.owner_name = body.owner_name.trim();
    if (body.phone) updateData.phone = body.phone.trim();
    if (body.city) updateData.city = body.city.trim();
    if (body.address !== undefined) updateData.address = body.address ? body.address.trim() : null;
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url ? body.logo_url.trim() : null;

    if (Object.keys(updateData).length > 0) {
      await db.update(pumps).set(updateData).where(eq(pumps.id, pumpId));
    }

    const updated = await db.select().from(pumps).where(eq(pumps.id, pumpId)).limit(1);
    const p = updated[0];

    return NextResponse.json({
      success: true,
      message: "پمپ تفصیلات کامیابی سے تبدیل ہو گئیں",
      pump: {
        id: p.id,
        name: p.pump_name,
        pump_name: p.pump_name,
        owner_name: p.owner_name,
        phone: p.phone,
        email: p.email,
        city: p.city,
        address: p.address || `${p.city || "Main Highway"}, Pakistan`,
        logo_url: p.logo_url || null,
      },
    });
  } catch (error: any) {
    console.error("PATCH pump error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
