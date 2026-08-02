import { randomUUID } from "node:crypto";

import { logger } from "@/lib/logger.js";

import { resolveProvider } from "@/providers/provider.registry.js";

import type { GenerateRequest } from "@/modules/generate/generate.schema.js";

type OllamaChatResponse = {
  model: string;
  created_at: string;

  message?: {
    role?: string;
    content?: string;
    thinking?: string;
  };

  done: boolean;
  done_reason?: string;

  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
};

export class EmptyModelResponseError extends Error {
  constructor() {
    super("The model returned an empty response");

    this.name = "EmptyModelResponseError";
  }
}

export class InvalidStructuredOutputError extends Error {
  constructor() {
    super("The model returned invalid JSON");

    this.name = "InvalidStructuredOutputError";
  }
}

export class ProviderRequestError extends Error {
  provider: string;

  constructor(provider: string, message: string) {
    super(message);

    this.name = "ProviderRequestError";

    this.provider = provider;
  }
}

function parseStructuredOutput(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    throw new InvalidStructuredOutputError();
  }
}

async function generateWithOllama(
  input: GenerateRequest,
  provider: ReturnType<typeof resolveProvider>,
  requestId: string,
  startedAt: number
) {
  if (provider.name !== "ollama") {
    throw new ProviderRequestError(provider.name, "Invalid provider runtime");
  }

  const response = await fetch(`${provider.baseUrl}/api/chat`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      model: provider.model,

      messages: input.messages.map((message) => ({
        role: message.role,

        content: message.content,
      })),

      stream: false,

      think: false,

      keep_alive: "10m",

      format: input.output.type === "json" ? input.output.schema : undefined,

      options: {
        temperature: input.temperature ?? 0,

        top_p: input.top_p,

        num_predict: input.max_tokens ?? 512,

        seed: input.seed,

        num_ctx: 4096,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new ProviderRequestError(
      provider.name,
      errorBody || `Ollama request failed with status ${response.status}`
    );
  }

  const body = (await response.json()) as OllamaChatResponse;

  const latencyMs = Math.round(performance.now() - startedAt);

  const content = body.message?.content?.trim();

  if (!content) {
    throw new EmptyModelResponseError();
  }

  const structuredOutput =
    input.output.type === "json" ? parseStructuredOutput(content) : null;

  logger.info(
    {
      requestId,

      taskType: input.task_type ?? null,

      provider: provider.name,

      model: provider.model,

      latencyMs,

      inputTokens: body.prompt_eval_count ?? null,

      outputTokens: body.eval_count ?? null,
    },

    "LLM request completed"
  );

  return {
    request_id: requestId,

    task_type: input.task_type ?? null,

    provider: provider.name,

    model: provider.model,

    provider_response_id: null,

    output: {
      type: input.output.type,

      content,

      json: structuredOutput,
    },

    usage: {
      input_tokens: body.prompt_eval_count ?? null,

      output_tokens: body.eval_count ?? null,

      total_tokens:
        body.prompt_eval_count && body.eval_count
          ? body.prompt_eval_count + body.eval_count
          : null,
    },

    finish_reason: body.done_reason ?? null,

    latency_ms: latencyMs,
  };
}

async function generateWithOpenRouter(
  input: GenerateRequest,
  provider: ReturnType<typeof resolveProvider>,
  requestId: string,
  startedAt: number
) {
  if (provider.name !== "openrouter") {
    throw new ProviderRequestError(provider.name, "Invalid provider runtime");
  }

  const response = await provider.client.chat.completions.create({
    model: provider.model,

    messages: input.messages.map((message) => ({
      role: message.role,

      content: message.content,
    })),

    temperature: input.temperature,

    top_p: input.top_p,

    max_tokens: input.max_tokens ?? 512,

    seed: input.seed,

    stream: false,

    ...(input.output.type === "json"
      ? {
          response_format: {
            type: "json_schema" as const,

            json_schema: {
              name: input.output.schema_name,

              strict: true,

              schema: input.output.schema,
            },
          },
        }
      : {}),
  });

  const latencyMs = Math.round(performance.now() - startedAt);

  const choice = response.choices[0];

  const content = choice?.message.content?.trim();

  if (!content) {
    throw new EmptyModelResponseError();
  }

  const structuredOutput =
    input.output.type === "json" ? parseStructuredOutput(content) : null;

  logger.info(
    {
      requestId,

      taskType: input.task_type ?? null,

      provider: provider.name,

      model: provider.model,

      latencyMs,

      inputTokens: response.usage?.prompt_tokens ?? null,

      outputTokens: response.usage?.completion_tokens ?? null,
    },

    "LLM request completed"
  );

  return {
    request_id: requestId,

    task_type: input.task_type ?? null,

    provider: provider.name,

    model: provider.model,

    provider_response_id: response.id,

    output: {
      type: input.output.type,

      content,

      json: structuredOutput,
    },

    usage: {
      input_tokens: response.usage?.prompt_tokens ?? null,

      output_tokens: response.usage?.completion_tokens ?? null,

      total_tokens: response.usage?.total_tokens ?? null,
    },

    finish_reason: choice.finish_reason ?? null,

    latency_ms: latencyMs,
  };
}

function getProviderErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const candidate = error as {
      message?: string;
      status?: number;
      error?: unknown;
      response?: unknown;
    };

    return JSON.stringify({
      status: candidate.status ?? null,
      message: candidate.message ?? "Unknown provider error",
      error: candidate.error ?? null,
      response: candidate.response ?? null,
    });
  }

  return error instanceof Error ? error.message : "Unknown provider error";
}

export async function generateCompletion(input: GenerateRequest) {
  const requestId = input.request_id ?? randomUUID();

  const provider = resolveProvider(input.provider, input.model);

  const startedAt = performance.now();

  logger.info(
    {
      requestId,

      taskType: input.task_type ?? null,

      provider: provider.name,

      model: provider.model,

      outputType: input.output.type,
    },

    "LLM request started"
  );

  try {
    if (provider.name === "ollama") {
      return await generateWithOllama(input, provider, requestId, startedAt);
    }

    return await generateWithOpenRouter(input, provider, requestId, startedAt);
  } catch (error) {
    if (
      error instanceof EmptyModelResponseError ||
      error instanceof InvalidStructuredOutputError
    ) {
      throw error;
    }

    const message = getProviderErrorMessage(error);

    logger.error(
      {
        requestId,

        provider: provider.name,

        model: provider.model,

        error: message,
      },

      "LLM request failed"
    );

    throw new ProviderRequestError(provider.name, message);
  }
}
