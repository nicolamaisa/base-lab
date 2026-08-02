import { apiRequest } from "./api-client";

export type LlmModelCatalogEntry = {
  id: string;
  owner_id: string;
  provider: string;
  model_key: string;
  display_name: string;
  enabled: boolean;
  is_default: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CreateLlmModelInput = {
  provider: string;
  model_key: string;
  display_name: string;
  enabled?: boolean;
  is_default?: boolean;
  metadata?: Record<string, unknown>;
};

export type UpdateLlmModelInput = {
  display_name?: string;
  enabled?: boolean;
  is_default?: boolean;
  metadata?: Record<string, unknown>;
};

type LlmModelsResponse = {
  models: LlmModelCatalogEntry[];
};

type LlmModelResponse = {
  model: LlmModelCatalogEntry;
};

export async function listRemoteLlmModels(
  provider: string
): Promise<LlmModelCatalogEntry[]> {
  const query = new URLSearchParams({
    provider,
  });

  const response = await apiRequest<LlmModelsResponse>(
    `/llm/model-catalog?${query.toString()}`
  );

  return response.models;
}

export async function createRemoteLlmModel(
  input: CreateLlmModelInput
): Promise<LlmModelCatalogEntry> {
  const response = await apiRequest<LlmModelResponse>("/llm/model-catalog", {
    method: "POST",

    body: JSON.stringify(input),
  });

  return response.model;
}

export async function updateRemoteLlmModel(
  modelId: string,
  input: UpdateLlmModelInput
): Promise<LlmModelCatalogEntry> {
  const response = await apiRequest<LlmModelResponse>(
    `/llm/model-catalog/${modelId}`,
    {
      method: "PATCH",

      body: JSON.stringify(input),
    }
  );

  return response.model;
}

export async function deleteRemoteLlmModel(
  modelId: string
): Promise<LlmModelCatalogEntry> {
  const response = await apiRequest<LlmModelResponse>(
    `/llm/model-catalog/${modelId}`,
    {
      method: "DELETE",
    }
  );

  return response.model;
}
