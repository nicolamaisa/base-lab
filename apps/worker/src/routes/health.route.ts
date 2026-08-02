import { Hono } from "hono";
import { sql } from "kysely";

import { db } from "@/lib/db.js";
import { redis } from "@/lib/redis.js";
import { env } from "@/config/env.js";

export const healthRoutes = new Hono();

healthRoutes.get("/", async (context) => {
  try {
    const [redisResponse] = await Promise.all([
      redis.ping(),

      sql`
            select 1
          `.execute(db),
    ]);

    const redisHealthy = redisResponse === "PONG";

    return context.json(
      {
        status: redisHealthy ? "ok" : "degraded",

        service: `${env.PROJECT_SLUG}-worker`,

        checks: {
          redis: redisHealthy ? "up" : "down",

          database: "up",
        },

        timestamp: new Date().toISOString(),
      },
      redisHealthy ? 200 : 503
    );
  } catch {
    return context.json(
      {
        status: "degraded",

        service: `${env.PROJECT_SLUG}-worker`,

        checks: {
          redis: "unknown",
          database: "down",
        },

        timestamp: new Date().toISOString(),
      },
      503
    );
  }
});
