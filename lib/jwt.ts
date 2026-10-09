export interface SessionData {
  userId: number;
  pumpId: number;
  email: string;
  name: string;
  role: "owner" | "manager" | "cashier";
  pumpName: string;
  city: string;
  subscriptionStatus: "active" | "trial" | "expired";
  trialEndsAt: string;
  impersonating?: boolean;
}

export interface SuperAdminSessionData {
  id: number;
  email: string;
  name: string;
  isSuperAdmin: true;
}

export const SESSION_COOKIE_NAME = "nexeta_pump_session";
export const SUPER_ADMIN_COOKIE_NAME = "nexeta_super_admin_session";

const JWT_SECRET = process.env.JWT_SECRET || "nexeta-petrol-saas-super-secure-token-2026-pk-asia";

function base64UrlEncode(str: string): string {
  if (typeof btoa === "function") {
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return Buffer.from(str).toString("base64url");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  if (typeof atob === "function") {
    return atob(base64);
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

export async function signToken(payload: any): Promise<string> {
  const enc = new TextEncoder();
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const data = base64UrlEncode(JSON.stringify({ ...payload, iat: Date.now() }));
  const message = `${header}.${data}`;

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const signatureBytes = new Uint8Array(signatureBuffer);
  let binary = "";
  for (let i = 0; i < signatureBytes.length; i++) {
    binary += String.fromCharCode(signatureBytes[i]);
  }
  const signature = base64UrlEncode(binary);
  return `${message}.${signature}`;
}

export async function verifyToken<T>(token: string): Promise<T | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, data, signature] = parts;
    const message = `${header}.${data}`;
    const enc = new TextEncoder();

    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigStr = base64UrlDecode(signature);
    const sigBytes = new Uint8Array(sigStr.length);
    for (let i = 0; i < sigStr.length; i++) {
      sigBytes[i] = sigStr.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(message));
    if (!isValid) return null;

    const payload = JSON.parse(base64UrlDecode(data));
    return payload as T;
  } catch (err) {
    return null;
  }
}

export function isSubscriptionExpired(status: string, trialEndsAt?: string): boolean {
  if (status === "expired") return true;
  if (status === "active") return false;
  if (status === "trial" && trialEndsAt) {
    const end = new Date(trialEndsAt).getTime();
    if (!isNaN(end) && end < Date.now()) {
      return true;
    }
  }
  return false;
}
