import { env } from "@/config/env.js";
import { findPendingRunsIds } from "@/modules/baseRun/baseRun.repository.js";
import { logger } from "@/lib/logger.js";
import { ensureBaseRunJob } from "@/queues/baseRun.queue.js";

export type StopBaseRunsReconciler = () => Promise<void>;

async function reconcileQueuedBaseRuns(): Promise<void> {
  const queuedRuns = await findPendingRunsIds(
    env.BASE_RUNS_RECONCILE_BATCH_SIZE
  );

  let jobsAdded = 0;

  for (const run of queuedRuns) {
    const added = await ensureBaseRunJob(run);

    if (added) {
      jobsAdded += 1;
    }
  }

  if (queuedRuns.length > 0) {
    logger.info(
      {
        queuedRuns: queuedRuns.length,
        jobsAdded,
      },
      "Queued runs reconciled"
    );
  }
}

async function reconcile(): Promise<void> {
  try {
    await reconcileQueuedBaseRuns();
  } catch (error) {
    logger.error(
      {
        error,
      },
      "Base tasks reconciliation failed"
    );
  }
}

let stopFn: (() => Promise<void>) | null = null;

export function startBaseRunsReconciler(): void {
  if (stopFn) return;
  if (!env.BASE_RUNS_RECONCILER_ENABLED) {
    logger.info("Base runs reconciler disabled");
    stopFn = async () => {};
    return;
  }

  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  let currentCycle: Promise<void> | null = null;

  function schedule(): void {
    if (stopped) {
      return;
    }

    currentCycle = reconcile().finally(() => {
      currentCycle = null;

      if (!stopped) {
        timer = setTimeout(schedule, env.BASE_RUNS_RECONCILE_INTERVAL_MS);
      }
    });
  }

  schedule();

  stopFn = async () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    if (currentCycle) await currentCycle;
  };
}

export async function stopBaseRunsReconciler(): Promise<void> {
  if (stopFn) {
    await stopFn();
    stopFn = null;
  }
}
