import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/field_closeout";

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
}

export const pool =
  global.__dbPool ??
  new Pool({
    connectionString,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  global.__dbPool = pool;
}

export const db = drizzle(pool, { schema });
