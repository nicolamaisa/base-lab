import { randomUUID } from "node:crypto";

import { logger } from "@/lib/logger.js";

import { normalizeOllamaPullStream } from "./model-pull.stream.js";

import { getModelProviderByName } from "./model.service.js";

import type {
  ModelPullEvent,
  ProviderName,
  PullModelRequest,
} from "./model.schema.js";

export class ProviderModelPullNotSupportedError extends Error {
  readonly provider: string;
  constructor(provider: string) {
    super(`Provider "${provider}" does not support model pull`);
    this.name = "ProviderModelPullNotSupportedError";
    this.provider = provider;
  }
}

export class ProviderModelPullRequestError extends Error {
  readonly provider: string;
  readonly status: number | null;
  constructor(provider: string, message: string, status: number | null = null) {
    super(message);
    this.name = "ProviderModelPullRequestError";
    this.provider = provider;
    this.status = status;
  }
}

type StartedModelPull = {
  requestId: string;
  provider: "ollama";
  model: string;
  events: AsyncGenerator<ModelPullEvent>;
};

type ModelPullLogContext = {
  requestId: string;
  provider: "ollama";
  model: string;
  startedAt: number;
};

async function* observeModelPullEvents(
  events: AsyncGenerator<ModelPullEvent>,
  context: ModelPullLogContext
): AsyncGenerator<ModelPullEvent> {
  let terminalEventReceived = false;

  try {
    for await (const event of events) {
      if (event.type === "completed") {
        terminalEventReceived = true;

        logger.info(
          {
            requestId: context.requestId,
            provider: context.provider,
            model: context.model,
            durationMs: Math.round(performance.now() - context.startedAt),
            completedBytes: event.completed_bytes,
            totalBytes: event.total_bytes,
          },
          "Provider model pull completed"
        );
      }

      if (event.type === "failed") {
        terminalEventReceived = true;

        logger.error(
          {
            requestId: context.requestId,
            provider: context.provider,
            model: context.model,
            durationMs: Math.round(performance.now() - context.startedAt),
            errorCode: event.error_code,
            error: event.message,
          },
          "Provider model pull failed"
        );
      }

      yield event;
    }
  } finally {
    if (!terminalEventReceived) {
      logger.warn(
        {
          requestId: context.requestId,
          provider: context.provider,
          model: context.model,
          durationMs: Math.round(performance.now() - context.startedAt),
        },
        "Provider model pull consumer disconnected"
      );
    }
  }
}

export async function startModelPull(
  providerName: ProviderName,
  input: PullModelRequest,
  signal?: AbortSignal
): Promise<StartedModelPull> {
  const requestId = input.request_id ?? randomUUID();

  const provider = getModelProviderByName(providerName);

  if (provider.provider !== "ollama") {
    throw new ProviderModelPullNotSupportedError(provider.provider);
  }

  const startedAt = performance.now();

  const baseUrl = provider.metadata.base_url
    .replace(/\/v1\/?$/, "")
    .replace(/\/$/, "");

  logger.info(
    {
      requestId,
      provider: provider.provider,
      model: input.model,
    },
    "Provider model pull started"
  );

  let response: Response;

  try {
    response = await fetch(`${baseUrl}/api/pull`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        stream: true,
      }),
      signal,
    });
  } catch (error) {
    logger.error(
      {
        requestId,
        provider: provider.provider,
        model: input.model,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      "Unable to start provider model pull"
    );

    throw new ProviderModelPullRequestError(
      provider.provider,
      "Unable to start the provider model pull"
    );
  }

  if (!response.ok) {
    logger.error(
      {
        requestId,
        provider: provider.provider,
        model: input.model,
        upstreamStatus: response.status,
      },
      "Provider rejected model pull"
    );

    throw new ProviderModelPullRequestError(
      provider.provider,
      "The provider rejected the model pull request",
      response.status
    );
  }

  if (!response.body) {
    logger.error(
      {
        requestId,
        provider: provider.provider,
        model: input.model,
      },
      "Provider returned an empty model pull stream"
    );

    throw new ProviderModelPullRequestError(
      provider.provider,
      "The provider returned an empty model pull stream",
      response.status
    );
  }

  const events = normalizeOllamaPullStream(response.body, {
    requestId,
    model: input.model,
  });

  return {
    requestId,
    provider: "ollama",
    model: input.model,
    events: observeModelPullEvents(events, {
      requestId,
      provider: "ollama",
      model: input.model,
      startedAt,
    }),
  };
}
