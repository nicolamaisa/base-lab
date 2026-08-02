import { db } from "@/lib/db.js";

import type {
  LlmModelPullCompletedEvent,
  LlmModelPullProgressEvent,
} from "./llmModelPull.schema.js";

export function claimLlmModelPullById(pullId: string) {
  return db.transaction().execute(async (transaction) => {
    const pull = await transaction
      .selectFrom("llm_model_pulls")
      .selectAll()
      .where("id", "=", pullId)
      .where("status", "in", ["pending", "running"])
      .forUpdate()
      .skipLocked()
      .executeTakeFirst();

    if (!pull) {
      return undefined;
    }

    return transaction
      .updateTable("llm_model_pulls")
      .set({
        status: "running",

        started_at: pull.started_at ?? new Date(),

        completed_at: null,

        error_code: null,

        error_message: null,
      })
      .where("id", "=", pull.id)
      .returningAll()
      .executeTakeFirst();
  });
}

export function setLlmModelPullRequestId(pullId: string, requestId: string) {
  return db
    .updateTable("llm_model_pulls")
    .set({
      gateway_request_id: requestId,
    })
    .where("id", "=", pullId)
    .where("status", "=", "running")
    .execute();
}

export function updateLlmModelPullProgress(
  pullId: string,
  event: LlmModelPullProgressEvent
) {
  return db
    .updateTable("llm_model_pulls")
    .set({
      gateway_request_id: event.request_id,

      progress_status: event.status,

      layer_digest: event.digest,

      layer_completed_bytes: event.completed_bytes,

      layer_total_bytes: event.total_bytes,

      layer_percent: event.percent,
    })
    .where("id", "=", pullId)
    .where("status", "=", "running")
    .execute();
}

export function completeLlmModelPull(
  pullId: string,
  event: LlmModelPullCompletedEvent
) {
  return db
    .updateTable("llm_model_pulls")
    .set({
      status: "completed",

      gateway_request_id: event.request_id,

      progress_status: event.status,

      layer_completed_bytes: event.completed_bytes,

      layer_total_bytes: event.total_bytes,

      layer_percent: event.percent,

      error_code: null,

      error_message: null,

      completed_at: new Date(),
    })
    .where("id", "=", pullId)
    .where("status", "=", "running")
    .execute();
}

export function failLlmModelPull(
  pullId: string,
  error: {
    code: string;

    message: string;
  }
) {
  return db
    .updateTable("llm_model_pulls")
    .set({
      status: "failed",

      progress_status: "Pull failed",

      error_code: error.code,

      error_message: error.message.slice(0, 2_000),

      completed_at: new Date(),
    })
    .where("id", "=", pullId)
    .where("status", "in", ["pending", "running"])
    .execute();
}
