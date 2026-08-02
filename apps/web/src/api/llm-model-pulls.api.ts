import { apiRequest } from "./api-client";

export type LlmModelPullStatus = "pending" | "running" | "completed" | "failed";

export type LlmModelPull = {
  id: string;

  owner_id: string;

  provider: string;

  model_key: string;

  status: LlmModelPullStatus;

  gateway_request_id: string | null;

  progress_status: string | null;

  layer_digest: string | null;

  layer_completed_bytes: string | number | null;

  layer_total_bytes: string | number | null;

  layer_percent: number | null;

  error_code: string | null;

  error_message: string | null;

  metadata: Record<string, unknown>;

  started_at: string | null;

  completed_at: string | null;

  created_at: string;

  updated_at: string;
};

export type CreateLlmModelPullInput = {
  provider: string;

  model: string;
};

type CreateLlmModelPullResponse = {
  model_pull: LlmModelPull;

  created: boolean;
};

type ListLlmModelPullsResponse = {
  model_pulls: LlmModelPull[];
};

type GetLlmModelPullResponse = {
  model_pull: LlmModelPull;
};

export async function createLlmModelPull(
  input: CreateLlmModelPullInput
): Promise<CreateLlmModelPullResponse> {
  return apiRequest<CreateLlmModelPullResponse>("/llm/model-pulls", {
    method: "POST",

    body: JSON.stringify(input),
  });
}

export async function listLlmModelPulls(
  input: {
    provider?: string;

    model?: string;

    status?: LlmModelPullStatus;

    limit?: number;
  } = {}
): Promise<LlmModelPull[]> {
  const query = new URLSearchParams();

  if (input.provider) {
    query.set("provider", input.provider);
  }

  if (input.model) {
    query.set("model", input.model);
  }

  if (input.status) {
    query.set("status", input.status);
  }

  if (input.limit !== undefined) {
    query.set("limit", String(input.limit));
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";

  const response = await apiRequest<ListLlmModelPullsResponse>(
    `/llm/model-pulls${suffix}`
  );

  return response.model_pulls;
}

export async function getLlmModelPull(pullId: string): Promise<LlmModelPull> {
  const response = await apiRequest<GetLlmModelPullResponse>(
    `/llm/model-pulls/${pullId}`
  );

  return response.model_pull;
}
