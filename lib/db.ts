import { drizzle } from "drizzle-orm/libsql";
import { tursoClient } from "./turso";
import * as schema from "./schema";

export const db = drizzle(tursoClient, { schema });
