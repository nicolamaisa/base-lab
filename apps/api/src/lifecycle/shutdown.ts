import type { ServerType } from "@hono/node-server";

import { logger } from "@/lib/logger.js";
import { baseQueue } from "@/queues/base.queue.js";

let shuttingDown = false;

export function registerShutdownHandlers(server: ServerType): void {
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    logger.info(
      {
        signal,
      },
      "API shutdown requested"
    );

    server.close();

    const results = await Promise.allSettled([baseQueue.close()]);

    const queueNames = ["base-response"];

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        logger.error(
          {
            error: result.reason,

            queue: queueNames[index],
          },
          "Failed to close queue"
        );
      }
    });

    process.exit(0);
  };

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
}
