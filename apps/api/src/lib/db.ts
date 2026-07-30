import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import { env } from "@/config/env.js";
//import type { Database } from "@/types/database.types.js"; // Uncomment this line and provide the correct path to your Database type definition

//TODO remove this temporary Database type definition
type Database = {
  base: {
    owner_id: string;
  };
};

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error", error);
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool,
  }),
});

export async function closeDatabase(): Promise<void> {
  await db.destroy();
}
