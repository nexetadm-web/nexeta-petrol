import { NextResponse } from "next/server";
import { SUPER_ADMIN_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "سوپر ایڈمن لاگ آؤٹ ہو گیا" });
  response.cookies.delete(SUPER_ADMIN_COOKIE_NAME);
  return response;
}
