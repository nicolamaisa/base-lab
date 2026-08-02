import { Redis } from "ioredis";

import { env } from "@/config/env.js";
import { logger } from "@/lib/logger.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on("ready", () => {
  logger.info("Redis connection established");
});

redis.on("error", (error) => {
  logger.error({ error }, "Redis connection error");
});

redis.on("close", () => {
  logger.warn("Redis connection closed");
});

export async function closeRedis(): Promise<void> {
  await redis.quit();
}
