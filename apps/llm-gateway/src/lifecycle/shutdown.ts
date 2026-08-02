import type { ServerType } from "@hono/node-server";

import { logger } from "@/lib/logger.js";

let shuttingDown = false;

export function registerShutdownHandlers(server: ServerType): void {
  const shutdown = (signal: string): void => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    logger.info({ signal }, "API shutdown requested");

    server.close(() => {
      process.exit(0);
    });
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}
