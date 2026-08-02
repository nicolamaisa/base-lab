import { randomUUID } from "node:crypto";

import { logger } from "@/lib/logger.js";

import {
  ollamaTagsResponseSchema,
  providerModelsResponseSchema,
  providersResponseSchema,
} from "./model.schema.js";

import { listProviderConfigurations } from "@/providers/provider.registry.js";

export class ProviderNotFoundError extends Error {
  constructor(provider: string) {
    super(`Provider "${provider}" was not found`);

    this.name = "ProviderNotFoundError";
  }
}

export class ProviderModelsRequestError extends Error {
  readonly provider: string;
  readonly status: number | null;

  constructor(provider: string, message: string, status: number | null = null) {
    super(message);

    this.name = "ProviderModelsRequestError";
    this.provider = provider;
    this.status = status;
  }
}

export class InvalidProviderModelsResponseError extends Error {
  readonly provider: string;

  constructor(provider: string) {
    super(`Provider "${provider}" returned an invalid models response`);

    this.name = "InvalidProviderModelsResponseError";
    this.provider = provider;
  }
}

function createProviderSummary(
  provider: ReturnType<typeof getModelProviderByName>
) {
  return {
    id: provider.provider,
    label: provider.provider === "ollama" ? "Ollama" : "OpenRouter",
    type: provider.type,
    configured: provider.configured,
    default_model: provider.default_model,
    requires_explicit_model: provider.requires_explicit_model,
  };
}

export function getModelProvider() {
  return providersResponseSchema.parse({
    providers: listProviderConfigurations().map(createProviderSummary),
  });
}

export function getModelProviderByName(providerName: string) {
  const provider = listProviderConfigurations().find(
    (p) => p.provider === providerName
  );

  if (!provider) {
    throw new ProviderNotFoundError(providerName);
  }

  return provider;
}

export async function getListOfModelsForProvider(providerName: string) {
  const requestId = randomUUID();
  const provider = getModelProviderByName(providerName);
  const providerSummary = createProviderSummary(provider);

  if (provider.type === "remote") {
    return providerModelsResponseSchema.parse({
      provider: providerSummary,
      models: [],
    });
  }

  const startedAt = performance.now();
  const baseUrl = provider.metadata.base_url
    .replace(/\/v1\/?$/, "")
    .replace(/\/$/, "");

  logger.info(
    {
      requestId,
      provider: provider.provider,
    },
    "Provider models request started"
  );

  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new ProviderModelsRequestError(
        provider.provider,
        "The provider failed to return its models",
        response.status
      );
    }

    const body = await response.json().catch(() => null);
    const parsed = ollamaTagsResponseSchema.safeParse(body);

    if (!parsed.success) {
      throw new InvalidProviderModelsResponseError(provider.provider);
    }

    const models = parsed.data.models.map((model) => ({
      model_id: model.model,
      display_name: model.name,
      provider: provider.provider,
      provider_type: provider.type,
      source: "discovered" as const,
      selectable: true,
      is_default:
        model.model === provider.default_model ||
        model.name === provider.default_model,
      metadata: {
        modified_at: model.modified_at ?? null,
        size_bytes: model.size ?? null,
        digest: model.digest ?? null,
        format: model.details?.format ?? null,
        family: model.details?.family ?? null,
        parameter_size: model.details?.parameter_size ?? null,
        quantization_level: model.details?.quantization_level ?? null,
      },
    }));

    const durationMs = Math.round(performance.now() - startedAt);

    logger.info(
      {
        requestId,
        provider: provider.provider,
        modelCount: models.length,
        durationMs,
      },
      "Provider models request completed"
    );

    return providerModelsResponseSchema.parse({
      provider: providerSummary,
      models,
    });
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);

    logger.error(
      {
        requestId,
        provider: provider.provider,
        durationMs,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      "Provider models request failed"
    );

    if (
      error instanceof ProviderModelsRequestError ||
      error instanceof InvalidProviderModelsResponseError
    ) {
      throw error;
    }

    throw new ProviderModelsRequestError(
      provider.provider,
      "Unable to retrieve models from the provider"
    );
  }
}
