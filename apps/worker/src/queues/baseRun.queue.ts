import { Queue } from "bullmq";
import { z } from "zod";

import { env } from "@/config/env.js";
import { bullMqWorkerConnection } from "@/lib/bullmq-connection.js";

export const PROCESS_BASE_RUN_JOB = "base-runs" as const;

export type ProcessBaseRunJobName = typeof PROCESS_BASE_RUN_JOB;

export const processBaseRunJobDataSchema = z.object({
  runId: z.uuid(),
});

export type ProcessBaseRunJobData = z.infer<typeof processBaseRunJobDataSchema>;

export const baseRunsQueue = new Queue<
  ProcessBaseRunJobData,
  unknown,
  ProcessBaseRunJobName
>(env.BASE_QUEUE_NAME, {
  connection: bullMqWorkerConnection,

  defaultJobOptions: {
    attempts: 1,

    removeOnComplete: {
      age: 24 * 60 * 60,
      count: 1_000,
    },

    removeOnFail: {
      age: 7 * 24 * 60 * 60,
      count: 5_000,
    },
  },
});

export async function enqueueBaseRunJob(runId: string): Promise<void> {
  baseRunsQueue.add(PROCESS_BASE_RUN_JOB, { runId }, { jobId: runId });
}

export async function ensureBaseRunJob(runId: string): Promise<boolean> {
  const existing = await baseRunsQueue.getJob(runId);

  if (existing) {
    const state = await existing.getState();

    if (state === "completed" || state === "failed") {
      await existing.remove();
    } else {
      return false;
    }
  }

  await enqueueBaseRunJob(runId);

  return true;
}
