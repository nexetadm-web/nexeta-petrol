import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, SUPER_ADMIN_COOKIE_NAME, verifyToken, SessionData, SuperAdminSessionData, isSubscriptionExpired } from "./lib/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Static Assets & Next.js Internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/init") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg" ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next();
  }

  // 2. Super Admin Routes
  if (pathname.startsWith("/super-admin")) {
    if (pathname === "/super-admin/login") {
      // If already logged in as super admin, redirect to super-admin dashboard
      const superToken = request.cookies.get(SUPER_ADMIN_COOKIE_NAME)?.value;
      if (superToken) {
        const adminSession = await verifyToken<SuperAdminSessionData>(superToken);
        if (adminSession?.isSuperAdmin) {
          return NextResponse.redirect(new URL("/super-admin/dashboard", request.url));
        }
      }
      return NextResponse.next();
    }

    // Require super admin authentication
    const superToken = request.cookies.get(SUPER_ADMIN_COOKIE_NAME)?.value;
    if (!superToken) {
      return NextResponse.redirect(new URL("/super-admin/login", request.url));
    }
    const adminSession = await verifyToken<SuperAdminSessionData>(superToken);
    if (!adminSession?.isSuperAdmin) {
      return NextResponse.redirect(new URL("/super-admin/login", request.url));
    }
    return NextResponse.next();
  }

  // 3. Public Auth Pages (/login, /register, /billing)
  if (pathname === "/login" || pathname === "/register") {
    const pumpToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (pumpToken) {
      const session = await verifyToken<SessionData>(pumpToken);
      if (session?.pumpId) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  if (pathname === "/billing") {
    return NextResponse.next();
  }

  // 4. Landing Page (/)
  if (pathname === "/") {
    // If logged in, redirect straight to dashboard
    const pumpToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (pumpToken) {
      const session = await verifyToken<SessionData>(pumpToken);
      if (session?.pumpId) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  // 5. Protected Dashboard Routes
  const protectedPrefixes = [
    "/dashboard",
    "/rates",
    "/readings",
    "/tanks",
    "/purchases",
    "/products",
    "/udhar-khata",
    "/khata",
    "/expenses",
    "/tank-khata",
    "/employees",
    "/cash-closing",
    "/reports",
    "/settings",
  ];

  const isProtected = protectedPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isProtected) {
    const pumpToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!pumpToken) {
      return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url));
    }

    const session = await verifyToken<SessionData>(pumpToken);
    if (!session || !session.pumpId) {
      return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url));
    }

    // Check if subscription has expired (impersonating super admin gets bypass)
    const expired = isSubscriptionExpired(session.subscriptionStatus, session.trialEndsAt);
    if (expired && !session.impersonating) {
      return NextResponse.redirect(new URL("/billing", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
