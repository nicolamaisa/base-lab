import { UnrecoverableError, Worker } from "bullmq";

import { env } from "@/config/env.js";
import { bullMqWorkerConnection } from "@/lib/bullmq-connection.js";
import { logger } from "@/lib/logger.js";

import {
  PROCESS_BASE_RUN_JOB,
  processBaseRunJobDataSchema,
  type ProcessBaseRunJobData,
  type ProcessBaseRunJobName,
} from "@/queues/baseRun.queue.js";

import { processBaseRunById } from "@/modules/baseRun/baseRun.processor.js";

export type BaseRunsWorker = Worker<
  ProcessBaseRunJobData,
  unknown,
  ProcessBaseRunJobName
>;

let workerInstance: BaseRunsWorker | null = null;

export function createBaseRunsWorker(): BaseRunsWorker {
  const worker = new Worker<
    ProcessBaseRunJobData,
    unknown,
    ProcessBaseRunJobName
  >(
    env.BASE_QUEUE_NAME,

    async (job) => {
      if (job.name !== PROCESS_BASE_RUN_JOB) {
        throw new UnrecoverableError(`Unsupported job: ${job.name}`);
      }

      const parsed = processBaseRunJobDataSchema.safeParse(job.data);

      if (!parsed.success) {
        throw new UnrecoverableError("Invalid base run job payload");
      }

      logger.info(
        {
          jobId: job.id,
          runId: parsed.data.runId,
          attempt: job.attemptsMade + 1,
        },
        "Processing base run job"
      );

      return processBaseRunById(parsed.data.runId);
    },

    {
      connection: bullMqWorkerConnection,
      concurrency: env.BASE_RUN_WORKER_CONCURRENCY,
    }
  );

  worker.on("completed", (job, result) => {
    logger.info(
      {
        jobId: job.id,
        runId: job.data.runId,
        result,
      },
      "Base run job completed"
    );
  });

  worker.on("failed", (job, error) => {
    logger.error(
      {
        error,
        jobId: job?.id,
        runId: job?.data.runId,
        attemptsMade: job?.attemptsMade,
      },
      "Base run job failed"
    );
  });

  worker.on("error", (error) => {
    logger.error(
      {
        error,
      },
      "Base runs worker error"
    );
  });

  logger.info(
    {
      queueName: env.BASE_QUEUE_NAME,
      concurrency: env.BASE_RUN_WORKER_CONCURRENCY,
    },
    "Base runs BullMQ worker started"
  );

  return worker;
}

export async function closeBaseRunsWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
}
