import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pumpSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await db.select().from(pumpSettings);
    const settingsMap: Record<string, any> = {
      low_stock_threshold: 20,
      pump_name: "Nexeta Petrol",
    };

    for (const r of rows) {
      if (r.key === "low_stock_threshold") {
        settingsMap.low_stock_threshold = parseFloat(r.value) || 20;
      } else {
        settingsMap[r.key] = r.value;
      }
    }

    return NextResponse.json({ success: true, settings: settingsMap });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: "Key and value required" }, { status: 400 });
    }

    const strValue = String(value);

    // Upsert key
    const existing = await db.select().from(pumpSettings).where(eq(pumpSettings.key, key));
    if (existing.length > 0) {
      await db.update(pumpSettings).set({ value: strValue }).where(eq(pumpSettings.key, key));
    } else {
      await db.insert(pumpSettings).values({ key, value: strValue });
    }

    return NextResponse.json({ success: true, message: "Setting updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
