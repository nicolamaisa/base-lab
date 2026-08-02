import { apiRequest } from "./api-client";

export type LlmProviderType = "local" | "remote";

export type LlmProvider = {
  id: string;

  label: string;

  type: LlmProviderType;

  configured: boolean;

  default_model: string | null;

  requires_explicit_model: boolean;
};

type LlmProvidersResponse = {
  providers: LlmProvider[];
};

export type LlmModelSource = "discovered" | "curated";

export type LlmModelOption = {
  model_id: string;

  display_name: string;

  provider: string;

  provider_type: LlmProviderType;

  source: LlmModelSource;

  selectable: boolean;

  is_default: boolean;

  metadata: Record<string, unknown>;
};

export type LlmProviderModelsResponse = {
  provider: LlmProvider;

  models: LlmModelOption[];
};

export async function listLlmProviders(): Promise<LlmProvider[]> {
  const response = await apiRequest<LlmProvidersResponse>("/llm/providers");

  return response.providers;
}

export async function listLlmProviderModels(
  providerId: string
): Promise<LlmProviderModelsResponse> {
  return apiRequest<LlmProviderModelsResponse>(
    `/llm/providers/${encodeURIComponent(providerId)}/models`
  );
}
