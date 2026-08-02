import { db } from "@/lib/db.js";

import type { CreateBaseRunInput } from "./baseRun.schema.js";

export async function insertBaseRun(
  ownerId: string,
  input: CreateBaseRunInput
) {
  return db
    .insertInto("base_run")
    .values({
      owner_id: ownerId,
      prompt: input.prompt,
      configuration: {
        provider: input.provider,
        model: input.model ?? null,
        temperature: input.temperature,
        max_tokens: input.max_tokens,
      },
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function listBaseRuns(ownerId: string) {
  return db
    .selectFrom("base_run")
    .selectAll()
    .where("owner_id", "=", ownerId)
    .orderBy("created_at", "desc")
    .execute();
}

export function findBaseRunById(ownerId: string, runId: string) {
  return db
    .selectFrom("base_run")
    .selectAll()
    .where("owner_id", "=", ownerId)
    .where("id", "=", runId)
    .executeTakeFirst();
}
