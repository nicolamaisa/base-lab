import type { ServerType } from "@hono/node-server";

import { closeDatabase } from "@/lib/db.js";
import { logger } from "@/lib/logger.js";
import { closeRedis } from "@/lib/redis.js";

export type ShutdownHook = () => Promise<void> | void;

let shuttingDown = false;

function closeServer(server: ServerType): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export function registerShutdownHandlers(
  server: ServerType,
  ...hooks: ShutdownHook[]
): void {
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info({ signal }, "Worker shutdown requested");

    try {
      for (const hook of hooks) {
        await hook();
      }
      await closeServer(server);
      await closeRedis();
      await closeDatabase();
      logger.info("Worker shutdown completed");
      process.exit(0);
    } catch (error) {
      logger.error({ error }, "Worker shutdown failed");
      process.exit(1);
    }
  };

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}
