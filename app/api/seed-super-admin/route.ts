import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { superAdmins } from "@/lib/schema";
import { hashPassword, SUPER_ADMIN_EMAILS } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const defaultPasswordHash = await hashPassword("admin123456");
    const results: string[] = [];

    for (const email of SUPER_ADMIN_EMAILS) {
      const existing = await db.select().from(superAdmins).where(eq(superAdmins.email, email));
      if (existing.length === 0) {
        await db.insert(superAdmins).values({
          email,
          password_hash: defaultPasswordHash,
          name: "Muhammad Naveed UL Hassan",
          created_at: new Date().toISOString(),
        });
        results.push(`Created super admin: ${email}`);
      } else {
        results.push(`Already exists: ${email}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Super admins seeded successfully",
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
