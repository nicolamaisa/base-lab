import { db } from "@/lib/db.js";

import type {
  CreateLlmModelPullInput,
  ListLlmModelPullsQuery,
} from "./llmModelPulls.schema.js";

export function insertLlmModelPull(
  ownerId: string,
  input: CreateLlmModelPullInput
) {
  return db
    .insertInto("llm_model_pulls")
    .values({
      owner_id: ownerId,

      provider: input.provider,

      model_key: input.model,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function findLlmModelPullById(ownerId: string, pullId: string) {
  return db
    .selectFrom("llm_model_pulls")
    .selectAll()
    .where("owner_id", "=", ownerId)
    .where("id", "=", pullId)
    .executeTakeFirst();
}

export function findActiveLlmModelPull(
  ownerId: string,
  provider: string,
  model: string
) {
  return db
    .selectFrom("llm_model_pulls")
    .selectAll()
    .where("owner_id", "=", ownerId)
    .where("provider", "=", provider)
    .where("model_key", "=", model)
    .where("status", "in", ["pending", "running"])
    .executeTakeFirst();
}

export function listLlmModelPulls(
  ownerId: string,
  filters: ListLlmModelPullsQuery
) {
  let query = db
    .selectFrom("llm_model_pulls")
    .selectAll()
    .where("owner_id", "=", ownerId);

  if (filters.provider !== undefined) {
    query = query.where("provider", "=", filters.provider);
  }

  if (filters.model !== undefined) {
    query = query.where("model_key", "=", filters.model);
  }

  if (filters.status !== undefined) {
    query = query.where("status", "=", filters.status);
  }

  return query.orderBy("created_at", "desc").limit(filters.limit).execute();
}

export function markPendingLlmModelPullQueueFailed(
  pullId: string,
  message: string
) {
  return db
    .updateTable("llm_model_pulls")
    .set({
      status: "failed",

      progress_status: "Unable to queue model pull",

      error_code: "model_pull_queue_failed",

      error_message: message,

      completed_at: new Date(),
    })
    .where("id", "=", pullId)
    .where("status", "=", "pending")
    .returningAll()
    .executeTakeFirst();
}
