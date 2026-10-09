import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";
import { pumps } from "./schema";
import { eq } from "drizzle-orm";
export * from "./jwt";
import { 
  SESSION_COOKIE_NAME, 
  SUPER_ADMIN_COOKIE_NAME, 
  verifyToken, 
  SessionData, 
  SuperAdminSessionData,
} from "./jwt";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Extracts session from either a Next.js Request object or next/headers cookies()
 */
export async function getSession(request?: Request): Promise<SessionData | null> {
  try {
    let token: string | undefined;

    if (request) {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`));
      token = match ? decodeURIComponent(match[1]) : undefined;
    } else {
      const cookieStore = cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    }

    if (!token) return null;
    const session = await verifyToken<SessionData>(token);
    return session;
  } catch (err) {
    return null;
  }
}

/**
 * Extracts super admin session
 */
export async function getSuperAdminSession(request?: Request): Promise<SuperAdminSessionData | null> {
  try {
    let token: string | undefined;

    if (request) {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(new RegExp(`(?:^|; )${SUPER_ADMIN_COOKIE_NAME}=([^;]*)`));
      token = match ? decodeURIComponent(match[1]) : undefined;
    } else {
      const cookieStore = cookies();
      token = cookieStore.get(SUPER_ADMIN_COOKIE_NAME)?.value;
    }

    if (!token) return null;
    const session = await verifyToken<SuperAdminSessionData>(token);
    return session && session.isSuperAdmin ? session : null;
  } catch (err) {
    return null;
  }
}

/**
 * Helper to get the active pump_id for API routes and queries.
 * Priority: Logged in pump session -> Fallback to default pump 1.
 */
export async function getCurrentPumpId(request?: Request): Promise<number> {
  const session = await getSession(request);
  if (session && session.pumpId) {
    return Number(session.pumpId);
  }
  return 1; // Default tenant
}
