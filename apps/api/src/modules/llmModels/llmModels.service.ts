import { db } from "@/lib/db.js";

import {
  clearDefaultLlmModels,
  deleteLlmModel,
  findLlmModelById,
  findLlmModelByIdForUpdate,
  insertLlmModel,
  listLlmModels,
  updateLlmModel,
} from "./llmModels.repository.js";

import type {
  CreateLlmModelInput,
  ListLlmModelsQuery,
  UpdateLlmModelInput,
} from "./llmModels.schema.js";

import {
  fetchDiscoveredProviders,
  InvalidLlmGatewayResponseError,
  LlmGatewayRequestError,
} from "../llmDiscovery/llmDiscovery.client.js";

export class LlmModelNotFoundError extends Error {
  constructor() {
    super("LLM model was not found");

    this.name = "LlmModelNotFoundError";
  }
}

export class LlmModelConflictError extends Error {
  constructor(message: string) {
    super(message);

    this.name = "LlmModelConflictError";
  }
}

export class UnsupportedRemoteLlmProviderError extends Error {
  constructor(provider: string) {
    super(`Provider "${provider}" is not an available remote provider`);

    this.name = "UnsupportedRemoteLlmProviderError";
  }
}

export class LlmProviderDiscoveryError extends Error {
  constructor(options?: ErrorOptions) {
    super("Unable to validate the remote LLM provider", options);

    this.name = "LlmProviderDiscoveryError";
  }
}

async function ensureRemoteProvider(providerId: string): Promise<void> {
  try {
    const discovery = await fetchDiscoveredProviders();

    const provider = discovery.providers.find(
      (candidate) => candidate.id === providerId
    );

    if (!provider || provider.type !== "remote") {
      throw new UnsupportedRemoteLlmProviderError(providerId);
    }
  } catch (error) {
    if (error instanceof UnsupportedRemoteLlmProviderError) {
      throw error;
    }

    if (
      error instanceof LlmGatewayRequestError ||
      error instanceof InvalidLlmGatewayResponseError
    ) {
      throw new LlmProviderDiscoveryError({
        cause: error,
      });
    }

    throw error;
  }
}

function translateDatabaseWriteError(error: unknown): never {
  if (error && typeof error === "object") {
    const databaseError = error as {
      code?: string;
      constraint?: string;
    };

    if (databaseError.code === "23505") {
      if (
        databaseError.constraint ===
        "llm_model_catalog_owner_provider_model_unique"
      ) {
        throw new LlmModelConflictError(
          "This provider model is already configured"
        );
      }

      if (
        databaseError.constraint ===
        "llm_model_catalog_one_default_per_provider_idx"
      ) {
        throw new LlmModelConflictError(
          "Another default model was selected concurrently"
        );
      }

      throw new LlmModelConflictError(
        "The model catalog update conflicts with existing data"
      );
    }
  }

  throw error;
}

export function listLlmModelsService(
  ownerId: string,
  filters: ListLlmModelsQuery
) {
  return listLlmModels(ownerId, filters);
}

export async function getLlmModelService(ownerId: string, modelId: string) {
  const model = await findLlmModelById(ownerId, modelId);

  if (!model) {
    throw new LlmModelNotFoundError();
  }

  return model;
}

export async function createLlmModelService(
  ownerId: string,
  input: CreateLlmModelInput
) {
  await ensureRemoteProvider(input.provider);
  try {
    return await db.transaction().execute(async (transaction) => {
      if (input.is_default) {
        await clearDefaultLlmModels(
          ownerId,
          input.provider,
          undefined,
          transaction
        );
      }

      return insertLlmModel(ownerId, input, transaction);
    });
  } catch (error) {
    translateDatabaseWriteError(error);
  }
}

export async function updateLlmModelService(
  ownerId: string,
  modelId: string,
  input: UpdateLlmModelInput
) {
  try {
    return await db.transaction().execute(async (transaction) => {
      const existingModel = await findLlmModelByIdForUpdate(
        ownerId,
        modelId,
        transaction
      );

      if (!existingModel) {
        throw new LlmModelNotFoundError();
      }

      const normalizedInput: UpdateLlmModelInput = {
        ...input,
      };

      if (input.is_default === true) {
        normalizedInput.enabled = true;

        await clearDefaultLlmModels(
          ownerId,
          existingModel.provider,
          modelId,
          transaction
        );
      }

      if (input.enabled === false) {
        normalizedInput.is_default = false;
      }

      const updatedModel = await updateLlmModel(
        ownerId,
        modelId,
        normalizedInput,
        transaction
      );

      if (!updatedModel) {
        throw new LlmModelNotFoundError();
      }

      return updatedModel;
    });
  } catch (error) {
    if (error instanceof LlmModelNotFoundError) {
      throw error;
    }

    translateDatabaseWriteError(error);
  }
}

export async function deleteLlmModelService(ownerId: string, modelId: string) {
  const deletedModel = await deleteLlmModel(ownerId, modelId);

  if (!deletedModel) {
    throw new LlmModelNotFoundError();
  }

  return deletedModel;
}
