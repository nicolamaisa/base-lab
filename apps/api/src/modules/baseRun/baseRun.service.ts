import {
  findBaseRunById,
  insertBaseRun,
  listBaseRuns as listBaseRunsQuery,
} from "@/modules/baseRun/baseRun.repository.js";

import {
  InvalidLlmGatewayResponseError,
  LlmGatewayRequestError,
} from "../llmDiscovery/llmDiscovery.client.js";

import {
  DiscoveredProviderNotFoundError,
  getOwnerProviderModels,
} from "../llmDiscovery/llmDiscovery.service.js";

import { ensureBaseRunJob } from "@/queues/base.queue.js";

import type { CreateBaseRunInput } from "@/modules/baseRun/baseRun.schema.js";

export class BaseRunNotFoundError extends Error {
  constructor() {
    super("Base run not found");

    this.name = "BaseRunNotFoundError";
  }
}

export class BaseRunModelSelectionError extends Error {
  constructor(message: string) {
    super(message);

    this.name = "BaseRunModelSelectionError";
  }
}

export class BaseRunProviderDiscoveryError extends Error {
  constructor(options?: ErrorOptions) {
    super("Unable to validate the selected LLM model", options);

    this.name = "BaseRunProviderDiscoveryError";
  }
}

async function ensureSelectableModel(
  ownerId: string,
  input: CreateBaseRunInput
): Promise<void> {
  try {
    const result = await getOwnerProviderModels(ownerId, input.provider);

    if (!result.provider.configured) {
      throw new BaseRunModelSelectionError(
        `Provider "${input.provider}" is not configured`
      );
    }

    const model = result.models.find(
      (candidate) => candidate.model_id === input.model
    );

    if (!model || !model.selectable) {
      throw new BaseRunModelSelectionError(
        `Model "${input.model}" is not selectable for provider "${input.provider}"`
      );
    }
  } catch (error) {
    if (error instanceof BaseRunModelSelectionError) {
      throw error;
    }

    if (error instanceof DiscoveredProviderNotFoundError) {
      throw new BaseRunModelSelectionError(error.message);
    }

    if (
      error instanceof LlmGatewayRequestError ||
      error instanceof InvalidLlmGatewayResponseError
    ) {
      throw new BaseRunProviderDiscoveryError({
        cause: error,
      });
    }

    throw error;
  }
}

export function listBaseRuns(ownerId: string) {
  return listBaseRunsQuery(ownerId);
}

export async function getBaseRun(ownerId: string, runId: string) {
  const run = await findBaseRunById(ownerId, runId);

  if (!run) {
    throw new BaseRunNotFoundError();
  }

  return run;
}

export async function createBaseRun(
  ownerId: string,
  input: CreateBaseRunInput
) {
  await ensureSelectableModel(ownerId, input);

  const run = await insertBaseRun(ownerId, input);

  await ensureBaseRunJob(run.id);

  return run;
}
