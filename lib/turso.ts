import { createClient, Client } from "@libsql/client";

declare global {
  // eslint-disable-next-line no-var
  var __tursoClient: Client | undefined;
}

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

export const tursoClient: Client =
  global.__tursoClient ||
  createClient({
    url,
    authToken,
  });

if (process.env.NODE_ENV !== "production") {
  global.__tursoClient = tursoClient;
}
