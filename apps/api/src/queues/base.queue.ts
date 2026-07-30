import { Queue } from "bullmq";

import { env } from "@/config/env.js";

import { bullMqProducerConnection } from "@/lib/bullmq-connection.js";

export const BASE_JOB = "base-response" as const;

type BaseResponseJobData = {
  runId: string;
  baseId: string;
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

function createJobId(runId: string, baseId: string): string {
  return `${runId}-${baseId}`;
}

export async function ensureBaseResponseJobs(
  runId: string,
  baseIds: string[]
): Promise<number> {
  const jobsToAdd: Array<{
    name: typeof BASE_JOB;

    data: BaseResponseJobData;

    opts: {
      jobId: string;
    };
  }> = [];

  for (const baseId of baseIds) {
    const jobId = createJobId(runId, baseId);

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
        continue;
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
        continue;
      }
    }

    jobsToAdd.push({
      name: BASE_JOB,

      data: {
        runId,
        baseId,
      },

      opts: {
        jobId,
      },
    });
  }

  if (jobsToAdd.length > 0) {
    await baseQueue.addBulk(jobsToAdd);
  }

  return jobsToAdd.length;
}
