import type { Context } from "hono";

import type { AuthVariables } from "@/types/auth.types.js";

import {
  fetchDiscoveredProviders,
  InvalidLlmGatewayResponseError,
  LlmGatewayRequestError,
} from "./llmDiscovery.client.js";
import {
  DiscoveredProviderNotFoundError,
  getOwnerProviderModels,
} from "./llmDiscovery.service.js";
import { discoveredProviderIdSchema } from "./llmDiscovery.schema.js";

type LlmDiscoveryContext = Context<{
  Variables: AuthVariables;
}>;

export async function listDiscoveredProvidersController(
  context: LlmDiscoveryContext
) {
  try {
    const providers = await fetchDiscoveredProviders();

    context.header("Cache-Control", "no-store");

    return context.json(providers);
  } catch (error) {
    if (error instanceof LlmGatewayRequestError) {
      return context.json(
        {
          error: "llm_gateway_unavailable",

          message: "Unable to retrieve LLM providers",
        },
        502
      );
    }

    if (error instanceof InvalidLlmGatewayResponseError) {
      return context.json(
        {
          error: "invalid_llm_gateway_response",

          message: "LLM gateway returned an invalid providers response",
        },
        502
      );
    }

    throw error;
  }
}

export async function listDiscoveredProviderModelsController(
  context: LlmDiscoveryContext
) {
  const providerIdResult = discoveredProviderIdSchema.safeParse(
    context.req.param("providerId")
  );

  if (!providerIdResult.success) {
    return context.json(
      {
        error: "validation_error",

        message: "Invalid provider identifier",

        issues: providerIdResult.error.issues,
      },
      400
    );
  }

  try {
    const user = context.get("user");

    const providerModels = await getOwnerProviderModels(
      user.id,
      providerIdResult.data
    );

    context.header("Cache-Control", "no-store");

    return context.json(providerModels);
  } catch (error) {
    if (error instanceof DiscoveredProviderNotFoundError) {
      return context.json(
        {
          error: "provider_not_found",
          message: "The requested provider was not found",
        },
        404
      );
    }
    if (error instanceof LlmGatewayRequestError) {
      if (error.upstreamStatus === 400) {
        return context.json(
          {
            error: "invalid_provider",

            message: "The requested provider is invalid",
          },
          400
        );
      }

      if (error.upstreamStatus === 404) {
        return context.json(
          {
            error: "provider_not_found",

            message: "The requested provider was not found",
          },
          404
        );
      }

      return context.json(
        {
          error: "provider_models_unavailable",

          message: "Unable to retrieve provider models",
        },
        502
      );
    }

    if (error instanceof InvalidLlmGatewayResponseError) {
      return context.json(
        {
          error: "invalid_llm_gateway_response",

          message: "LLM gateway returned an invalid provider models response",
        },
        502
      );
    }

    throw error;
  }
}
