import {
  findAccountUsage,
  findProviderModelUsage,
  findRunUsage,
  type RawTokenUsageSummary,
} from "@/modules/usage/usage.repository.js";

export type TokenUsageSummary = {
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

export type ProviderModelUsageSummary = TokenUsageSummary & {
  provider: string;
  model_key: string;
};

function normalizeUsageSummary(row: RawTokenUsageSummary): TokenUsageSummary {
  return {
    input_tokens: Number(row.input_tokens),
    output_tokens: Number(row.output_tokens),
    total_tokens: Number(row.total_tokens),

    request_count: Number(row.request_count),
    successful_requests: Number(row.successful_requests),
    failed_requests: Number(row.failed_requests),
    unknown_usage_requests: Number(row.unknown_usage_requests),

    total_latency_ms: Number(row.total_latency_ms),
    average_latency_ms: Number(row.average_latency_ms),
  };
}

export async function getAccountUsage(ownerId: string) {
  const row = await findAccountUsage(ownerId);

  return normalizeUsageSummary(row);
}

export async function getRunUsage(ownerId: string, runId: string) {
  const row = await findRunUsage(ownerId, runId);

  return normalizeUsageSummary(row);
}

export async function getProviderModelUsage(
  ownerId: string
): Promise<ProviderModelUsageSummary[]> {
  const rows = await findProviderModelUsage(ownerId);

  return rows
    .map((row) => ({
      provider: row.provider,
      model_key: row.model_key,
      ...normalizeUsageSummary(row),
    }))
    .sort((first, second) => second.total_tokens - first.total_tokens);
}
