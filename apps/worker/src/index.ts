import { serve } from "@hono/node-server";
import { sql } from "kysely";

import { app } from "@/app.js";
import { env } from "@/config/env.js";
import { registerShutdownHandlers } from "@/lifecycle/shutdown.js";
import { db } from "@/lib/db.js";
import { logger } from "@/lib/logger.js";
import { redis } from "@/lib/redis.js";

import {
  startBaseRunsReconciler,
  stopBaseRunsReconciler,
} from "@/reconcilers/base-tasks.reconciler.js";

import {
  closeBaseRunsWorker,
  createBaseRunsWorker,
} from "@/workers/base-tasks.worker.js";

import {
  closeLlmModelPullsWorker,
  createLlmModelPullsWorker,
} from "@/workers/llm-model-pulls.worker.js";
import { trackTime } from "./lib/timer.js";

async function checkDependencies(): Promise<void> {
  try {
    await Promise.all([redis.ping(), sql`select 1`.execute(db)]);
  } catch (error) {
    logger.fatal({ error }, "Dependency check failed");
    process.exit(1);
  }
}

async function startWorkers(): Promise<void> {
  await trackTime(() => createBaseRunsWorker(), "BaseRunsWorker");
  await trackTime(() => createLlmModelPullsWorker(), "LlmModelPullsWorker");
}

async function startReconcilers(): Promise<void> {
  await trackTime(() => startBaseRunsReconciler(), "BaseRunsReconciler");
}

async function startServer(): Promise<ReturnType<typeof serve>> {
  return serve(
    {
      fetch: app.fetch,
      hostname: "0.0.0.0",
      port: env.HEALTH_PORT,
    },
    (info) => {
      logger.info(
        {
          host: "0.0.0.0",
          port: info.port,
        },
        `${env.PROJECT_NAME} worker started`
      );
    }
  );
}

async function bootstrap(): Promise<void> {
  await checkDependencies();

  const server = await startServer();

  // Start the task execution worker
  await startWorkers();
  // Start the task execution reconciler
  await startReconcilers();

  registerShutdownHandlers(
    server,
    closeBaseRunsWorker,
    stopBaseRunsReconciler,
    closeLlmModelPullsWorker
  );
}

bootstrap().catch((error: unknown) => {
  logger.fatal({ error }, "Worker startup failed");
  process.exit(1);
});
