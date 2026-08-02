import { logger } from "@/lib/logger.js";

import {
  fetchDiscoveredProviders,
  InvalidLlmGatewayResponseError,
  LlmGatewayRequestError,
} from "../llmDiscovery/llmDiscovery.client.js";

import { ensureLlmModelPullJob } from "@/queues/llmModelPull.queue.js";

import {
  findActiveLlmModelPull,
  findLlmModelPullById,
  insertLlmModelPull,
  listLlmModelPulls,
  markPendingLlmModelPullQueueFailed,
} from "./llmModelPulls.repository.js";

import type {
  CreateLlmModelPullInput,
  ListLlmModelPullsQuery,
} from "./llmModelPulls.schema.js";

export class LlmModelPullNotFoundError extends Error {
  constructor() {
    super("LLM model pull was not found");

    this.name = "LlmModelPullNotFoundError";
  }
}

export class UnsupportedLocalLlmProviderError extends Error {
  constructor(provider: string) {
    super(`Provider "${provider}" is not an available local provider`);

    this.name = "UnsupportedLocalLlmProviderError";
  }
}

export class LocalLlmProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`Local provider "${provider}" is not configured`);

    this.name = "LocalLlmProviderNotConfiguredError";
  }
}

export class LlmModelPullProviderDiscoveryError extends Error {
  constructor(options?: ErrorOptions) {
    super("Unable to validate the local LLM provider", options);

    this.name = "LlmModelPullProviderDiscoveryError";
  }
}

export class LlmModelPullQueueError extends Error {
  constructor(options?: ErrorOptions) {
    super("Unable to queue the LLM model pull", options);

    this.name = "LlmModelPullQueueError";
  }
}

async function ensureLocalProvider(providerId: string): Promise<void> {
  try {
    const discovery = await fetchDiscoveredProviders();

    const provider = discovery.providers.find(
      (candidate) => candidate.id === providerId
    );

    if (!provider || provider.type !== "local") {
      throw new UnsupportedLocalLlmProviderError(providerId);
    }

    if (!provider.configured) {
      throw new LocalLlmProviderNotConfiguredError(providerId);
    }
  } catch (error) {
    if (
      error instanceof UnsupportedLocalLlmProviderError ||
      error instanceof LocalLlmProviderNotConfiguredError
    ) {
      throw error;
    }

    if (
      error instanceof LlmGatewayRequestError ||
      error instanceof InvalidLlmGatewayResponseError
    ) {
      throw new LlmModelPullProviderDiscoveryError({
        cause: error,
      });
    }

    throw error;
  }
}

function isActivePullConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const databaseError = error as {
    code?: string;
    constraint?: string;
  };

  return (
    databaseError.code === "23505" &&
    databaseError.constraint === "llm_model_pulls_one_active_model_idx"
  );
}

export function listOwnerLlmModelPulls(
  ownerId: string,
  filters: ListLlmModelPullsQuery
) {
  return listLlmModelPulls(ownerId, filters);
}

export async function getOwnerLlmModelPull(ownerId: string, pullId: string) {
  const pull = await findLlmModelPullById(ownerId, pullId);

  if (!pull) {
    throw new LlmModelPullNotFoundError();
  }

  return pull;
}

export async function createOwnerLlmModelPull(
  ownerId: string,
  input: CreateLlmModelPullInput
) {
  await ensureLocalProvider(input.provider);

  let pull;

  let created = true;

  try {
    pull = await insertLlmModelPull(ownerId, input);
  } catch (error) {
    if (!isActivePullConflict(error)) {
      throw error;
    }

    pull = await findActiveLlmModelPull(ownerId, input.provider, input.model);

    if (!pull) {
      throw error;
    }

    created = false;
  }

  try {
    await ensureLlmModelPullJob(pull.id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown queue error";

    await markPendingLlmModelPullQueueFailed(pull.id, message);

    logger.error(
      {
        err: error,

        pull_id: pull.id,

        provider: pull.provider,

        model: pull.model_key,
      },
      "Unable to queue LLM model pull"
    );

    throw new LlmModelPullQueueError({
      cause: error,
    });
  }

  return {
    pull,

    created,
  };
}
