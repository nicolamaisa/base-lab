import { env } from "@/config/env.js";

type LlmGatewayOutput =
  | {
      type: "text";
      content: string;
      json: null;
    }
  | {
      type: "json";
      content: string;
      json: unknown;
    };

export type LlmGatewayGenerateResponse = {
  request_id: string;
  task_type: string | null;
  provider: string;
  model: string;
  provider_response_id: string | null;
  output: LlmGatewayOutput;
  usage: {
    input_tokens: number | null;
    output_tokens: number | null;
    total_tokens: number | null;
  };
  finish_reason: string | null;
  latency_ms: number;
};

export type LlmRole = "system" | "user" | "assistant";

export type LlmOutput =
  | {
      type: "text";
      content: string;
      json: null;
    }
  | {
      type: "json";
      content: string;
      json: unknown;
    };

export type LlmGatewayGenerateRequest = {
  provider: string;
  model: string;
  task_type: string;
  messages: Array<{
    role: LlmRole;
    content: string;
  }>;
  temperature: number;
  max_tokens: number;
  output: LlmOutput;
};

export async function generateWithLlmGateway(
  payload: LlmGatewayGenerateRequest
): Promise<LlmGatewayGenerateResponse> {
  const response = await fetch(`${env.LLM_GATEWAY_URL}/v1/generate`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      body || `LLM gateway request failed with status ${response.status}`
    );
  }

  return (await response.json()) as LlmGatewayGenerateResponse;
}
