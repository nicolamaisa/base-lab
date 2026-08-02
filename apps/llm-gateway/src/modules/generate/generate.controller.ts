import type { Context } from "hono";

import { generateRequestSchema } from "@/modules/generate/generate.schema.js";

import {
  EmptyModelResponseError,
  generateCompletion,
  InvalidStructuredOutputError,
  ProviderRequestError,
} from "@/modules/generate/generate.service.js";

import {
  ModelNotConfiguredError,
  ProviderNotConfiguredError,
} from "@/providers/provider.registry.js";

export async function generateController(context: Context) {
  const body = await context.req.json().catch(() => null);

  const result = generateRequestSchema.safeParse(body);

  if (!result.success) {
    return context.json(
      {
        error: "validation_error",

        message: "Invalid LLM request",

        issues: result.error.issues,
      },
      400
    );
  }

  try {
    const response = await generateCompletion(result.data);

    return context.json(response);
  } catch (error) {
    if (error instanceof ProviderNotConfiguredError) {
      return context.json(
        {
          error: "provider_not_configured",

          message: error.message,
        },
        503
      );
    }

    if (error instanceof ModelNotConfiguredError) {
      return context.json(
        {
          error: "model_not_configured",

          message: error.message,
        },
        400
      );
    }

    if (error instanceof EmptyModelResponseError) {
      return context.json(
        {
          error: "empty_model_response",

          message: error.message,
        },
        502
      );
    }

    if (error instanceof InvalidStructuredOutputError) {
      return context.json(
        {
          error: "invalid_structured_output",

          message: error.message,
        },
        502
      );
    }

    if (error instanceof ProviderRequestError) {
      return context.json(
        {
          error: "provider_request_failed",

          provider: error.provider,

          message: error.message,
        },
        502
      );
    }

    throw error;
  }
}
