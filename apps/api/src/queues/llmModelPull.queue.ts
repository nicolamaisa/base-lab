import { Queue } from "bullmq";

import { env } from "@/config/env.js";

import { bullMqProducerConnection } from "@/lib/bullmq-connection.js";

export const PROCESS_LLM_MODEL_PULL_JOB = "process-llm-model-pull" as const;

export type LlmModelPullJobData = {
  pullId: string;
};

export const llmModelPullQueue = new Queue<LlmModelPullJobData>(
  env.LLM_MODEL_PULL_QUEUE_NAME,
  {
    connection: bullMqProducerConnection,

    defaultJobOptions: {
      attempts: 2,

      backoff: {
        type: "exponential",

        delay: 5_000,
      },

      removeOnComplete: {
        age: 24 * 60 * 60,

        count: 2_000,
      },

      removeOnFail: {
        age: 7 * 24 * 60 * 60,

        count: 5_000,
      },
    },
  }
);

export async function ensureLlmModelPullJob(pullId: string): Promise<void> {
  const existingJob = await llmModelPullQueue.getJob(pullId);

  if (existingJob) {
    const state = await existingJob.getState();

    if (
      state === "active" ||
      state === "waiting" ||
      state === "delayed" ||
      state === "prioritized" ||
      state === "waiting-children"
    ) {
      return;
    }

    if (state === "completed" || state === "failed") {
      await existingJob.remove();
    } else {
      return;
    }
  }

  await llmModelPullQueue.add(
    PROCESS_LLM_MODEL_PULL_JOB,
    {
      pullId,
    },
    {
      jobId: pullId,
    }
  );
}
