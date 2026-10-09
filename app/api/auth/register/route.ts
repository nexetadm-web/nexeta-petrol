import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tursoClient } from "@/lib/turso";
import { pumps, users, tanks, nozzles, dailyRates } from "@/lib/schema";
import { hashPassword, signToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { getTodayDatePK } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { success: false, error: "درخواست میں ڈیٹا درست نہیں تھا (Invalid JSON payload)" },
        { status: 400 }
      );
    }

    const pump_name = (body.pump_name || body.pumpName || "").trim();
    const owner_name = (body.owner_name || body.ownerName || "").trim();
    const phone = (body.phone || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = (body.password || "").trim();
    const city = (body.city || "Lahore").trim();
    const cnic = body.cnic ? String(body.cnic).trim() : null;

    console.log("REGISTER ATTEMPT:", { pump_name, owner_name, email, city });

    if (!pump_name || !owner_name || !phone || !email || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: "تمام ضروری معلومات (پمپ نام، مالک نام، فون، ای میل، پاس ورڈ) درج کریں۔" 
        },
        { status: 400 }
      );
    }

    // Ensure core tables exist before querying (fail-safe for fresh deployment)
    try {
      await tursoClient.execute(`
        CREATE TABLE IF NOT EXISTS pumps (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pump_name TEXT NOT NULL,
          owner_name TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          city TEXT NOT NULL,
          cnic TEXT,
          password_hash TEXT NOT NULL,
          subscription_status TEXT NOT NULL DEFAULT 'trial',
          trial_ends_at TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
      await tursoClient.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pump_id INTEGER NOT NULL REFERENCES pumps(id) ON DELETE CASCADE,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'owner',
          name TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
    } catch (tblErr) {
      console.warn("Table ensure notice:", tblErr);
    }

    // Check if email already registered
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      return NextResponse.json(
        { success: false, error: "یہ ای میل پہلے سے رجسٹرڈ ہے۔ براہ کرم لاگ ان کریں۔" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    // 14 Days Free Trial
    const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    // 1. Create Pump Record
    const [newPump] = await db
      .insert(pumps)
      .values({
        pump_name,
        owner_name,
        phone,
        email,
        city,
        cnic,
        password_hash: passwordHash,
        subscription_status: "trial",
        trial_ends_at: trialEnds,
        created_at: nowIso,
      })
      .returning();

    // 2. Create Owner User
    const [newUser] = await db
      .insert(users)
      .values({
        pump_id: newPump.id,
        email,
        password_hash: passwordHash,
        role: "owner",
        name: owner_name,
        created_at: nowIso,
      })
      .returning();

    // 3. Auto-Provision Default Station Tanks & Nozzles for New Pump
    try {
      const [pTank] = await db.insert(tanks).values({
        pump_id: newPump.id,
        name: "Tank 1 (Super Petrol)",
        fuel_type: "Petrol",
        capacity: 30000,
        current_stock: 12500,
      }).returning();

      const [dTank] = await db.insert(tanks).values({
        pump_id: newPump.id,
        name: "Tank 2 (High Speed Diesel)",
        fuel_type: "Diesel",
        capacity: 40000,
        current_stock: 18000,
      }).returning();

      // Create 4 initial nozzles
      await db.insert(nozzles).values([
        { pump_id: newPump.id, name: "Nozzle 1 (Petrol)", tank_id: pTank.id },
        { pump_id: newPump.id, name: "Nozzle 2 (Petrol)", tank_id: pTank.id },
        { pump_id: newPump.id, name: "Nozzle 3 (Diesel)", tank_id: dTank.id },
        { pump_id: newPump.id, name: "Nozzle 4 (Diesel)", tank_id: dTank.id },
      ]);

      // Seed initial rate for today
      await db.insert(dailyRates).values({
        pump_id: newPump.id,
        date: getTodayDatePK(),
        petrol_rate: 333,
        diesel_rate: 323,
        hioctane_rate: 335,
      });
    } catch (e) {
      console.error("Default assets provisioning error for new pump:", e);
    }

    // 4. Generate Session Token
    const sessionPayload = {
      userId: newUser.id,
      pumpId: newPump.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role as "owner",
      pumpName: newPump.pump_name,
      city: newPump.city,
      subscriptionStatus: newPump.subscription_status as "trial",
      trialEndsAt: newPump.trial_ends_at,
    };

    const token = await signToken(sessionPayload);

    const response = NextResponse.json({
      success: true,
      message: "مبارک ہو! آپ کا پٹرول پمپ کامیابی سے رجسٹر ہو گیا ہے۔ 14 دن کا مفت ٹرائل شروع ہو چکا ہے۔",
      pump: newPump,
      user: sessionPayload,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("REGISTER ERROR:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "رجسٹریشن میں مسئلہ پیش آیا۔ دوبارہ کوشش کریں۔",
        details: String(error?.stack || error?.message || error),
        turso_configured: !!process.env.TURSO_DATABASE_URL
      },
      { status: 500 }
    );
  }
}
