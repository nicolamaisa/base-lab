import { env } from "@/config/env.js";
import { logger } from "@/lib/logger.js";

import { processNextBaseRun } from "@/modules/baseRun/baseRun.processor.js";

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export type BaseRunRunner = {
  start: () => void;
  stop: () => Promise<void>;
};

export function createBaseRunRunner(): BaseRunRunner {
  let running = false;
  let stopping = false;
  let currentLoop: Promise<void> | null = null;

  async function loop() {
    logger.info(
      {
        intervalMs: env.BASE_WORKER_POLL_INTERVAL_MS,
        batchSize: env.BASE_WORKER_BATCH_SIZE,
      },
      "Base run runner started"
    );

    while (!stopping) {
      let processedAny = false;

      for (let index = 0; index < env.BASE_WORKER_BATCH_SIZE; index += 1) {
        if (stopping) {
          break;
        }

        const processed = await processNextBaseRun();

        if (processed) {
          processedAny = true;
        } else {
          break;
        }
      }

      if (!processedAny) {
        await sleep(env.BASE_WORKER_POLL_INTERVAL_MS);
      }
    }

    logger.info("Base run runner stopped");
  }

  return {
    start() {
      if (running || !env.BASE_WORKER_ENABLED) {
        return;
      }

      running = true;
      stopping = false;
      currentLoop = loop().catch((error: unknown) => {
        logger.fatal({ error }, "Base run runner crashed");
        process.exit(1);
      });
    },

    async stop() {
      stopping = true;

      if (currentLoop) {
        await currentLoop;
      }
    },
  };
}
