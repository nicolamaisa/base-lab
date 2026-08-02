import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import { env } from "@/config/env.js";
import { logger } from "@/lib/logger.js";
import type { DB } from "@/types/db.types.js";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
});

pool.on("error", (error) => {
  logger.error({ error }, "Unexpected worker PostgreSQL pool error");
});

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool,
  }),
});

export async function closeDatabase(): Promise<void> {
  await db.destroy();
}
