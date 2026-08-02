import type { Json } from "@/types/db.types.js";

import { listLlmModels } from "../llmModels/llmModels.repository.js";
import {
  fetchDiscoveredProviderModels,
  fetchDiscoveredProviders,
} from "./llmDiscovery.client.js";
import {
  discoveredProviderModelsResponseSchema,
  type DiscoveredProviderModelsResponse,
} from "./llmDiscovery.schema.js";

export class DiscoveredProviderNotFoundError extends Error {
  constructor(providerId: string) {
    super(`Provider "${providerId}" was not found`);

    this.name = "DiscoveredProviderNotFoundError";
  }
}

function normalizeMetadata(value: Json): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export async function getOwnerProviderModels(
  ownerId: string,
  providerId: string
): Promise<DiscoveredProviderModelsResponse> {
  const { providers } = await fetchDiscoveredProviders();

  const provider = providers.find((item) => item.id === providerId);

  if (!provider) {
    throw new DiscoveredProviderNotFoundError(providerId);
  }

  if (provider.type === "local") {
    return fetchDiscoveredProviderModels(providerId);
  }

  const catalogModels = await listLlmModels(ownerId, {
    provider: providerId,
    enabled: true,
  });

  const defaultModel = catalogModels.find((model) => model.is_default);

  return discoveredProviderModelsResponseSchema.parse({
    provider: {
      ...provider,
      default_model: defaultModel?.model_key ?? null,
    },

    models: catalogModels.map((model) => ({
      model_id: model.model_key,
      display_name: model.display_name,
      provider: model.provider,
      provider_type: "remote" as const,
      source: "curated" as const,

      selectable: provider.configured,

      is_default: model.is_default,

      metadata: {
        ...normalizeMetadata(model.metadata),
        catalog_entry_id: model.id,
      },
    })),
  });
}
