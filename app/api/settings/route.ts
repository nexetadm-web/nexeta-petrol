import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pumpSettings, pumps } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getCurrentPumpId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);

    // Fetch pump profile name
    const pumpRows = await db.select().from(pumps).where(eq(pumps.id, pumpId));
    const pumpName = pumpRows.length > 0 ? pumpRows[0].pump_name : "Nexeta Petrol";

    const rows = await db.select().from(pumpSettings);
    const settingsMap: Record<string, any> = {
      low_stock_threshold: 20,
      pump_name: pumpName,
    };

    // Check namespaced key `${pumpId}:${key}` first, else general key
    const prefix = `${pumpId}:`;
    for (const r of rows) {
      if (r.key.startsWith(prefix)) {
        const rawKey = r.key.slice(prefix.length);
        if (rawKey === "low_stock_threshold") {
          settingsMap.low_stock_threshold = parseFloat(r.value) || 20;
        } else {
          settingsMap[rawKey] = r.value;
        }
      } else if (!r.key.includes(":") && settingsMap[r.key] === undefined) {
        if (r.key === "low_stock_threshold") {
          settingsMap.low_stock_threshold = parseFloat(r.value) || 20;
        } else {
          settingsMap[r.key] = r.value;
        }
      }
    }

    return NextResponse.json({ success: true, settings: settingsMap });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const pumpId = await getCurrentPumpId(request);
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: "Key and value required" }, { status: 400 });
    }

    const strValue = String(value);
    const namespacedKey = `${pumpId}:${key}`;

    // If pump_name updated, also update pumps table
    if (key === "pump_name") {
      await db.update(pumps).set({ pump_name: strValue }).where(eq(pumps.id, pumpId));
    }

    const existing = await db.select().from(pumpSettings).where(eq(pumpSettings.key, namespacedKey));
    if (existing.length > 0) {
      await db.update(pumpSettings).set({ value: strValue }).where(eq(pumpSettings.key, namespacedKey));
    } else {
      await db.insert(pumpSettings).values({ key: namespacedKey, value: strValue });
    }

    return NextResponse.json({ success: true, message: "Setting updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
