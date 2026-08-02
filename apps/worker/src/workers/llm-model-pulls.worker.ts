import { UnrecoverableError, Worker } from "bullmq";

import { env } from "@/config/env.js";

import { bullMqWorkerConnection } from "@/lib/bullmq-connection.js";

import { logger } from "@/lib/logger.js";

import { processLlmModelPullById } from "@/modules/llmModelPull/llmModelPull.processor.js";

import {
  PROCESS_LLM_MODEL_PULL_JOB,
  processLlmModelPullJobDataSchema,
  type ProcessLlmModelPullJobData,
  type ProcessLlmModelPullJobName,
} from "@/queues/llmModelPull.queue.js";

export type LlmModelPullsWorker = Worker<
  ProcessLlmModelPullJobData,
  boolean,
  ProcessLlmModelPullJobName
>;

let workerInstance: LlmModelPullsWorker | null = null;

export function createLlmModelPullsWorker(): LlmModelPullsWorker {
  if (workerInstance) {
    return workerInstance;
  }

  workerInstance = new Worker<
    ProcessLlmModelPullJobData,
    boolean,
    ProcessLlmModelPullJobName
  >(
    env.LLM_MODEL_PULL_QUEUE_NAME,

    async (job) => {
      if (job.name !== PROCESS_LLM_MODEL_PULL_JOB) {
        throw new UnrecoverableError(`Unsupported model pull job: ${job.name}`);
      }

      const result = processLlmModelPullJobDataSchema.safeParse(job.data);

      if (!result.success) {
        throw new UnrecoverableError("Invalid model pull job payload");
      }

      return processLlmModelPullById(result.data.pullId);
    },

    {
      connection: bullMqWorkerConnection,

      concurrency: env.LLM_MODEL_PULL_WORKER_CONCURRENCY,
    }
  );

  workerInstance.on("completed", (job, result) => {
    logger.info(
      {
        jobId: job.id,

        pullId: job.data.pullId,

        result,
      },
      "Model pull job completed"
    );
  });

  workerInstance.on("failed", (job, error) => {
    logger.error(
      {
        err: error,

        jobId: job?.id,

        pullId: job?.data.pullId,

        attemptsMade: job?.attemptsMade,
      },
      "Model pull job failed"
    );
  });

  workerInstance.on("error", (error) => {
    logger.error(
      {
        err: error,
      },
      "Model pulls worker error"
    );
  });

  logger.info(
    {
      queueName: env.LLM_MODEL_PULL_QUEUE_NAME,

      concurrency: env.LLM_MODEL_PULL_WORKER_CONCURRENCY,
    },
    "LLM model pulls worker started"
  );

  return workerInstance;
}

export async function closeLlmModelPullsWorker(): Promise<void> {
  if (!workerInstance) {
    return;
  }

  await workerInstance.close();

  workerInstance = null;
}
