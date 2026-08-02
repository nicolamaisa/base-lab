import OpenAI from "openai";

import { env } from "@/config/env.js";

export type LlmProviderName = "ollama" | "openrouter";

type OllamaProviderRuntime = {
  name: "ollama";
  baseUrl: string;
  defaultModel: string | undefined;
};

type OpenRouterProviderRuntime = {
  name: "openrouter";
  client: OpenAI;
  defaultModel: string | undefined;
};

type ProviderRuntime = OllamaProviderRuntime | OpenRouterProviderRuntime;

export class ProviderNotConfiguredError extends Error {
  constructor(provider: LlmProviderName) {
    super(`Provider "${provider}" is not configured`);

    this.name = "ProviderNotConfiguredError";
  }
}

export class ModelNotConfiguredError extends Error {
  constructor(provider: LlmProviderName) {
    super(
      `No model was supplied and provider "${provider}" has no default model`
    );

    this.name = "ModelNotConfiguredError";
  }
}

const openRouterClient = env.OPENROUTER_API_KEY
  ? new OpenAI({
      baseURL: env.OPENROUTER_BASE_URL,

      apiKey: env.OPENROUTER_API_KEY,

      timeout: env.LLM_REQUEST_TIMEOUT_MS,

      maxRetries: 0,

      defaultHeaders: {
        "HTTP-Referer": env.OPENROUTER_APP_URL,

        "X-Title": env.OPENROUTER_APP_TITLE,
      },
    })
  : null;

export function listProviderConfigurations() {
  return [
    {
      provider: "ollama" as const,

      type: "local" as const,

      configured: true,

      default_model: env.OLLAMA_DEFAULT_MODEL ?? null,

      requires_explicit_model: !env.OLLAMA_DEFAULT_MODEL,

      metadata: {
        base_url: env.OLLAMA_BASE_URL,
      },
    },

    {
      provider: "openrouter" as const,

      type: "remote" as const,

      configured: openRouterClient !== null,

      default_model: env.OPENROUTER_DEFAULT_MODEL ?? null,

      requires_explicit_model: !env.OPENROUTER_DEFAULT_MODEL,
      metadata: {
        base_url: env.OPENROUTER_BASE_URL,

        app_url: env.OPENROUTER_APP_URL,

        app_title: env.OPENROUTER_APP_TITLE,
      },
    },
  ];
}

export function resolveProvider(
  providerName: LlmProviderName,
  requestedModel?: string
): ProviderRuntime & {
  model: string;
} {
  let provider: ProviderRuntime;

  if (providerName === "ollama") {
    provider = {
      name: "ollama",

      baseUrl: env.OLLAMA_BASE_URL.replace(/\/v1\/?$/, ""),

      defaultModel: env.OLLAMA_DEFAULT_MODEL,
    };
  } else {
    if (!openRouterClient) {
      throw new ProviderNotConfiguredError("openrouter");
    }

    provider = {
      name: "openrouter",

      client: openRouterClient,

      defaultModel: env.OPENROUTER_DEFAULT_MODEL,
    };
  }

  const model = requestedModel?.trim() || provider.defaultModel;

  if (!model) {
    throw new ModelNotConfiguredError(providerName);
  }

  return {
    ...provider,
    model,
  };
}
