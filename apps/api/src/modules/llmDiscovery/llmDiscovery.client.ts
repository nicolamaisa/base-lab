import type { ZodType } from "zod";

import { env } from "@/config/env.js";

import { logger } from "@/lib/logger.js";

import {
  discoveredProviderModelsResponseSchema,
  discoveredProvidersResponseSchema,
  type DiscoveredProviderModelsResponse,
  type DiscoveredProvidersResponse,
} from "./llmDiscovery.schema.js";

const gatewayBaseUrl = env.LLM_GATEWAY_URL.replace(/\/+$/, "");

const discoveryTimeoutMs = 10_000;

export class LlmGatewayRequestError extends Error {
  readonly upstreamStatus: number | null;

  constructor(
    message: string,
    upstreamStatus: number | null = null,
    options?: ErrorOptions
  ) {
    super(message, options);

    this.name = "LlmGatewayRequestError";

    this.upstreamStatus = upstreamStatus;
  }
}

export class InvalidLlmGatewayResponseError extends Error {
  readonly resource: string;

  constructor(resource: string) {
    super(`LLM gateway returned an invalid ${resource} response`);

    this.name = "InvalidLlmGatewayResponseError";

    this.resource = resource;
  }
}

async function fetchGatewayJson<T>(
  url: string,
  schema: ZodType<T>,
  resource: string
): Promise<T> {
  const startedAt = Date.now();

  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",

      headers: {
        Accept: "application/json",
      },

      signal: AbortSignal.timeout(discoveryTimeoutMs),
    });
  } catch (error) {
    logger.warn(
      {
        err: error,

        resource,

        upstream_url: url,

        duration_ms: Date.now() - startedAt,
      },
      "Unable to reach LLM gateway"
    );

    throw new LlmGatewayRequestError("LLM gateway is unavailable", null, {
      cause: error,
    });
  }

  if (!response.ok) {
    logger.warn(
      {
        resource,

        upstream_url: url,

        upstream_status: response.status,

        duration_ms: Date.now() - startedAt,
      },
      "LLM gateway request failed"
    );

    throw new LlmGatewayRequestError(
      `LLM gateway rejected the ${resource} request`,
      response.status
    );
  }

  let body: unknown;

  try {
    body = await response.json();
  } catch (error) {
    logger.warn(
      {
        err: error,

        resource,

        upstream_url: url,

        duration_ms: Date.now() - startedAt,
      },
      "LLM gateway returned invalid JSON"
    );

    throw new InvalidLlmGatewayResponseError(resource);
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    logger.warn(
      {
        resource,

        upstream_url: url,

        validation_issues: result.error.issues,

        duration_ms: Date.now() - startedAt,
      },
      "LLM gateway returned an invalid response"
    );

    throw new InvalidLlmGatewayResponseError(resource);
  }

  logger.debug(
    {
      resource,

      upstream_url: url,

      duration_ms: Date.now() - startedAt,
    },
    "LLM gateway request completed"
  );

  return result.data;
}

export function fetchDiscoveredProviders(): Promise<DiscoveredProvidersResponse> {
  return fetchGatewayJson(
    `${gatewayBaseUrl}/v1/providers`,
    discoveredProvidersResponseSchema,
    "providers"
  );
}

export async function fetchDiscoveredProviderModels(
  providerId: string
): Promise<DiscoveredProviderModelsResponse> {
  const result = await fetchGatewayJson(
    `${gatewayBaseUrl}/v1/${encodeURIComponent(providerId)}/models`,
    discoveredProviderModelsResponseSchema,
    "provider models"
  );

  if (result.provider.id !== providerId) {
    logger.warn(
      {
        requested_provider: providerId,

        returned_provider: result.provider.id,
      },
      "LLM gateway returned models for a different provider"
    );

    throw new InvalidLlmGatewayResponseError("provider models");
  }

  return result;
}
