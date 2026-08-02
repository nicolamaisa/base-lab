import type { Kysely } from "kysely";

import { db } from "@/lib/db.js";

import type { DB } from "@/types/db.types.js";

import type {
  CreateLlmModelInput,
  ListLlmModelsQuery,
  UpdateLlmModelInput,
} from "./llmModels.schema.js";

type DatabaseExecutor = Kysely<DB>;

export function listLlmModels(
  ownerId: string,
  filters: ListLlmModelsQuery,
  database: DatabaseExecutor = db
) {
  let query = database
    .selectFrom("llm_model_catalog")
    .selectAll()
    .where("owner_id", "=", ownerId);

  if (filters.provider !== undefined) {
    query = query.where("provider", "=", filters.provider);
  }

  if (filters.enabled !== undefined) {
    query = query.where("enabled", "=", filters.enabled);
  }

  return query
    .orderBy("is_default", "desc")
    .orderBy("display_name", "asc")
    .execute();
}

export function findLlmModelById(
  ownerId: string,
  modelId: string,
  database: DatabaseExecutor = db
) {
  return database
    .selectFrom("llm_model_catalog")
    .selectAll()
    .where("owner_id", "=", ownerId)
    .where("id", "=", modelId)
    .executeTakeFirst();
}

export function findLlmModelByKey(
  ownerId: string,
  provider: string,
  modelKey: string,
  database: DatabaseExecutor = db
) {
  return database
    .selectFrom("llm_model_catalog")
    .selectAll()
    .where("owner_id", "=", ownerId)
    .where("provider", "=", provider)
    .where("model_key", "=", modelKey)
    .executeTakeFirst();
}

export function insertLlmModel(
  ownerId: string,
  input: CreateLlmModelInput,
  database: DatabaseExecutor = db
) {
  return database
    .insertInto("llm_model_catalog")
    .values({
      owner_id: ownerId,

      provider: input.provider,

      model_key: input.model_key,

      display_name: input.display_name,

      enabled: input.enabled,

      is_default: input.is_default,

      metadata: input.metadata,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function updateLlmModel(
  ownerId: string,
  modelId: string,
  input: UpdateLlmModelInput,
  database: DatabaseExecutor = db
) {
  return database
    .updateTable("llm_model_catalog")
    .set({
      display_name: input.display_name,

      enabled: input.enabled,

      is_default: input.is_default,

      metadata: input.metadata,
    })
    .where("owner_id", "=", ownerId)
    .where("id", "=", modelId)
    .returningAll()
    .executeTakeFirst();
}

export function clearDefaultLlmModels(
  ownerId: string,
  provider: string,
  exceptModelId?: string,
  database: DatabaseExecutor = db
) {
  let query = database
    .updateTable("llm_model_catalog")
    .set({
      is_default: false,
    })
    .where("owner_id", "=", ownerId)
    .where("provider", "=", provider)
    .where("is_default", "=", true);

  if (exceptModelId !== undefined) {
    query = query.where("id", "!=", exceptModelId);
  }

  return query.execute();
}

export function deleteLlmModel(
  ownerId: string,
  modelId: string,
  database: DatabaseExecutor = db
) {
  return database
    .deleteFrom("llm_model_catalog")
    .where("owner_id", "=", ownerId)
    .where("id", "=", modelId)
    .returningAll()
    .executeTakeFirst();
}

export function findLlmModelByIdForUpdate(
  ownerId: string,
  modelId: string,
  database: DatabaseExecutor
) {
  return database
    .selectFrom("llm_model_catalog")
    .selectAll()
    .where("owner_id", "=", ownerId)
    .where("id", "=", modelId)
    .forUpdate()
    .executeTakeFirst();
}
