import { Queue } from "bullmq";

import { env } from "@/config/env.js";

import { bullMqProducerConnection } from "@/lib/bullmq-connection.js";

export const BASE_JOB = "base-runs" as const;

type BaseResponseJobData = {
  runId: string;
};

export const baseQueue = new Queue<BaseResponseJobData>(env.BASE_QUEUE_NAME, {
  connection: bullMqProducerConnection,

  defaultJobOptions: {
    attempts: 3,

    backoff: {
      type: "exponential",

      delay: 5_000,
    },

    removeOnComplete: {
      age: 24 * 60 * 60,

      count: 10_000,
    },

    removeOnFail: {
      age: 7 * 24 * 60 * 60,

      count: 20_000,
    },
  },
});

export async function ensureBaseRunJob(runId: string): Promise<number> {
  const jobsToAdd: Array<{
    name: typeof BASE_JOB;

    data: BaseResponseJobData;

    opts: {
      jobId: string;
    };
  }> = [];

  const jobId = runId;
  const existingJob = await baseQueue.getJob(jobId);

  if (existingJob) {
    const state = await existingJob.getState();

    /*
     * Se il job è ancora realmente
     * in coda o in esecuzione, non ne
     * creiamo un duplicato.
     */
    if (
      state === "active" ||
      state === "waiting" ||
      state === "delayed" ||
      state === "prioritized" ||
      state === "waiting-children"
    ) {
      return 0;
    }

    /*
     * I vecchi job completed/failed
     * usano lo stesso jobId. Vanno
     * rimossi prima di poterli
     * riaccodare.
     */
    if (state === "completed" || state === "failed") {
      await existingJob.remove();
    } else {
      return 0;
    }
  }

  jobsToAdd.push({
    name: BASE_JOB,

    data: {
      runId,
    },

    opts: {
      jobId,
    },
  });

  if (jobsToAdd.length > 0) {
    await baseQueue.addBulk(jobsToAdd);
  }

  return jobsToAdd.length;
}
