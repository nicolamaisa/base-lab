import type { ConnectionOptions } from "bullmq";

import { env } from "@/config/env.js";

function parseRedisDatabase(pathname: string): number {
  if (pathname === "" || pathname === "/") {
    return 0;
  }

  const database = Number(pathname.slice(1));

  if (!Number.isInteger(database) || database < 0) {
    throw new Error(`Invalid Redis database in REDIS_URL: ${pathname}`);
  }

  return database;
}

function createRedisConnectionOptions(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);

  if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
    throw new Error(`Unsupported Redis protocol: ${url.protocol}`);
  }

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: parseRedisDatabase(url.pathname),

    /*
     * BullMQ workers need maxRetriesPerRequest=null.
     * Otherwise blocking commands can fail under load/reconnect.
     */
    maxRetriesPerRequest: null,

    ...(url.protocol === "rediss:"
      ? {
          tls: {},
        }
      : {}),
  };
}

export const bullMqWorkerConnection = createRedisConnectionOptions(
  env.REDIS_URL
);
