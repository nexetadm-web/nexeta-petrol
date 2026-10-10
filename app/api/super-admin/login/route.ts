import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { superAdmins } from "@/lib/schema";
import { verifyPassword, hashPassword, signToken, SUPER_ADMIN_COOKIE_NAME, isSuperAdminEmail, SUPER_ADMIN_EMAILS } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "ای میل اور پاس ورڈ درج کریں" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    let adminRows = await db.select().from(superAdmins).where(eq(superAdmins.email, cleanEmail));

    // Auto-create / register if this email is in SUPER_ADMIN_EMAILS
    if (adminRows.length === 0 && isSuperAdminEmail(cleanEmail)) {
      const passHash = await hashPassword(password);
      const nowIso = new Date().toISOString();
      const [newAdmin] = await db
        .insert(superAdmins)
        .values({
          email: cleanEmail,
          password_hash: passHash,
          name: "Muhammad Naveed UL Hassan (Super Admin)",
          created_at: nowIso,
        })
        .returning();
      adminRows = [newAdmin];
    }

    if (adminRows.length === 0) {
      return NextResponse.json({ success: false, error: "سوپر ایڈمن اکاؤنٹ نہیں ملا" }, { status: 401 });
    }

    const admin = adminRows[0];
    let match = await verifyPassword(password, admin.password_hash);

    // Master password override for configured super admin emails
    if (!match && isSuperAdminEmail(cleanEmail) && (password === "admin123456" || password === "superadmin123")) {
      match = true;
    }

    if (!match) {
      return NextResponse.json({ success: false, error: "پاسورڈ غلط ہے (Incorrect Password)" }, { status: 401 });
    }

    const payload = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      isSuperAdmin: true,
    };

    const token = await signToken(payload);
    const response = NextResponse.json({
      success: true,
      message: "سوپر ایڈمن لاگ ان کامیاب",
      admin: payload,
    });

    response.cookies.set(SUPER_ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Login error" }, { status: 500 });
  }
}
