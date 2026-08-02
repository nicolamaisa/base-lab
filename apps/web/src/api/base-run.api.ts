import { apiRequest } from "./api-client";

export type BaseRunInput = {
  prompt: string;
  provider: string;
  model: string;
  temperature?: number;
  max_tokens?: number;
};

export type BaseRun = {
  id: string;
  owner_id: string;
  prompt: string;
  status: "pending" | "running" | "completed" | "failed";
  configuration: Record<string, unknown>;
  response: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  updated_at: string;
  completed_at: string | null;
  raw_response: unknown | null;
};

type BaseRunResponse = {
  base_run: BaseRun;
};

export async function createBaseRun(input: BaseRunInput): Promise<BaseRun> {
  const response = await apiRequest<BaseRunResponse>("/runs", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return response.base_run;
}

export async function listBaseRuns(): Promise<BaseRun[]> {
  const response = await apiRequest<{ base_runs: BaseRun[] }>("/runs");

  return response.base_runs;
}

export async function fetchBaseRunById(runId: string): Promise<BaseRun> {
  const response = await apiRequest<BaseRunResponse>(`/runs/${runId}`);

  return response.base_run;
}
