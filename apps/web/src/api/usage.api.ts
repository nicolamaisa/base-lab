import { apiRequest } from "./api-client";

export type UsageSummary = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;

  request_count: number;
  successful_requests: number;
  failed_requests: number;
  unknown_usage_requests: number;

  total_latency_ms: number;
  average_latency_ms: number;
};

type UsageResponse = {
  usage: UsageSummary;
};

export type ProviderModelUsage = UsageSummary & {
  provider: string;
  model_key: string;
};

type ProviderModelUsageResponse = {
  usage: ProviderModelUsage[];
};

export async function getAccountUsage(): Promise<UsageSummary> {
  const response = await apiRequest<UsageResponse>("/usage/summary");

  return response.usage;
}

export async function getRunUsage(runId: string): Promise<UsageSummary> {
  const response = await apiRequest<UsageResponse>(
    `/usage/runs/${encodeURIComponent(runId)}/summary`
  );

  return response.usage;
}

export async function getProviderModelUsage(): Promise<ProviderModelUsage[]> {
  const response = await apiRequest<ProviderModelUsageResponse>(
    "/usage/provider-models"
  );

  return response.usage;
}
