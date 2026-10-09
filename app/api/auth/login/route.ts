import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, pumps } from "@/lib/schema";
import { verifyPassword, signToken, SESSION_COOKIE_NAME, isSubscriptionExpired } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, isDemo } = body;

    // Handle One-Click Demo Mode
    if (isDemo || email === "demo@nexetapetrol.com" && (!password || password === "demo123456")) {
      const demoUsers = await db.select().from(users).where(eq(users.email, "demo@nexetapetrol.com"));
      if (demoUsers.length > 0) {
        const demoUser = demoUsers[0];
        const pumpList = await db.select().from(pumps).where(eq(pumps.id, demoUser.pump_id));
        const demoPump = pumpList[0] || {
          id: 1,
          pump_name: "Nexeta Petrol (Demo Station)",
          city: "Lahore",
          subscription_status: "active",
          trial_ends_at: new Date(Date.now() + 365 * 86400000).toISOString(),
        };

        const sessionPayload = {
          userId: demoUser.id,
          pumpId: demoPump.id,
          email: demoUser.email,
          name: demoUser.name,
          role: demoUser.role as "owner",
          pumpName: demoPump.pump_name,
          city: demoPump.city,
          subscriptionStatus: demoPump.subscription_status as "active",
          trialEndsAt: demoPump.trial_ends_at,
        };

        const token = await signToken(sessionPayload);
        const response = NextResponse.json({
          success: true,
          message: "ڈیمو اکاؤنٹ میں خوش آمدید!",
          user: sessionPayload,
          isExpired: false,
        });

        response.cookies.set(SESSION_COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
          sameSite: "lax",
        });

        return response;
      }
    }

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "ای میل اور پاس ورڈ دونوں درج کرنا لازمی ہیں۔" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userRecords = await db.select().from(users).where(eq(users.email, cleanEmail));

    if (userRecords.length === 0) {
      return NextResponse.json({ success: false, error: "ای میل یا پاس ورڈ درست نہیں ہے۔" }, { status: 401 });
    }

    const user = userRecords[0];
    const passwordMatch = await verifyPassword(password, user.password_hash);

    if (!passwordMatch) {
      return NextResponse.json({ success: false, error: "ای میل یا پاس ورڈ درست نہیں ہے۔" }, { status: 401 });
    }

    // Lookup Pump
    const pumpRecords = await db.select().from(pumps).where(eq(pumps.id, user.pump_id));
    if (pumpRecords.length === 0) {
      return NextResponse.json({ success: false, error: "پمپ ریکارڈ نہیں ملا۔" }, { status: 404 });
    }

    const pump = pumpRecords[0];
    const expired = isSubscriptionExpired(pump.subscription_status, pump.trial_ends_at);

    const sessionPayload = {
      userId: user.id,
      pumpId: pump.id,
      email: user.email,
      name: user.name,
      role: user.role as "owner",
      pumpName: pump.pump_name,
      city: pump.city,
      subscriptionStatus: expired ? ("expired" as const) : (pump.subscription_status as any),
      trialEndsAt: pump.trial_ends_at,
    };

    const token = await signToken(sessionPayload);
    const response = NextResponse.json({
      success: true,
      message: "کامیابی سے لاگ ان ہو گئے۔",
      user: sessionPayload,
      isExpired: expired,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ success: false, error: error.message || "Login failed" }, { status: 500 });
  }
}
