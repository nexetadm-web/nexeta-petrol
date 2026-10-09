import { createClient, Client } from "@libsql/client";

declare global {
  // eslint-disable-next-line no-var
  var __tursoClient: Client | undefined;
}

const DEFAULT_TURSO_URL = "libsql://nexeta-petrol-db-nexetadm-web.aws-ap-south-1.turso.io";
const DEFAULT_TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE0MjcxMjMsImlkIjoiMDFhMTE5NWItMDIwMS03ZDYzLTk4NTItMmQzMjc2NDQzYmE3Iiwia2lkIjoibUpsb3E4ckplSWxpUG50cHhPcUhCdGtOdXhITmN1ZHN6RGRkUnA1VGppQSIsInJpZCI6ImI1ZjNjZmExLTQ1ZGQtNGEwMS05MDM0LTNhYjVjMjc4ZDRmZCJ9.FsKukn4JnEQmDBW6lDHZXwaqWhREtpfXpohbNVtotbdoMnjX7PHr7w8D6mHWTiQ0ImnAS1hvQ4lofKqSsS7KCQ";

const url = process.env.TURSO_DATABASE_URL?.trim() || DEFAULT_TURSO_URL;
const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || DEFAULT_TURSO_TOKEN;

export const tursoClient: Client =
  global.__tursoClient ||
  createClient({
    url,
    authToken,
  });

if (process.env.NODE_ENV !== "production") {
  global.__tursoClient = tursoClient;
}
