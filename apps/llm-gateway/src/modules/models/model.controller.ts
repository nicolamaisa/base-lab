import type { Context } from "hono";
import { stream } from "hono/streaming";

import { providerNameSchema, pullModelRequestSchema } from "./model.schema.js";

import {
  getListOfModelsForProvider,
  getModelProvider,
  InvalidProviderModelsResponseError,
  ProviderModelsRequestError,
  ProviderNotFoundError,
} from "./model.service.js";

import {
  ProviderModelPullNotSupportedError,
  ProviderModelPullRequestError,
  startModelPull,
} from "./model-pull.service.js";

export function getProvidersList(context: Context) {
  return context.json(getModelProvider());
}

export async function getProviderModels(context: Context) {
  const providerNameResult = providerNameSchema.safeParse(
    context.req.param("providerName")
  );

  if (!providerNameResult.success) {
    return context.json(
      {
        error: "validation_error",
        message: "Invalid provider name",
        issues: providerNameResult.error.issues,
      },
      400
    );
  }

  try {
    const providerModels = await getListOfModelsForProvider(
      providerNameResult.data
    );

    return context.json(providerModels);
  } catch (error) {
    if (error instanceof ProviderNotFoundError) {
      return context.json(
        {
          error: "provider_not_found",
          message: error.message,
        },
        404
      );
    }

    if (error instanceof ProviderModelsRequestError) {
      return context.json(
        {
          error: "provider_models_request_failed",
          provider: error.provider,
          message: error.message,
        },
        502
      );
    }

    if (error instanceof InvalidProviderModelsResponseError) {
      return context.json(
        {
          error: "invalid_provider_models_response",
          provider: error.provider,
          message: error.message,
        },
        502
      );
    }

    throw error;
  }
}

export async function pullProviderModel(context: Context) {
  const providerNameResult = providerNameSchema.safeParse(
    context.req.param("providerName")
  );

  if (!providerNameResult.success) {
    return context.json(
      {
        error: "validation_error",
        message: "Invalid provider name",
        issues: providerNameResult.error.issues,
      },
      400
    );
  }

  const body = await context.req.json().catch(() => null);

  const inputResult = pullModelRequestSchema.safeParse(body);

  if (!inputResult.success) {
    return context.json(
      {
        error: "validation_error",
        message: "Invalid model pull request",
        issues: inputResult.error.issues,
      },
      400
    );
  }

  const abortController = new AbortController();

  const handleRequestAbort = () => {
    abortController.abort();
  };

  if (context.req.raw.signal.aborted) {
    abortController.abort();
  } else {
    context.req.raw.signal.addEventListener("abort", handleRequestAbort, {
      once: true,
    });
  }

  try {
    const pull = await startModelPull(
      providerNameResult.data,
      inputResult.data,
      abortController.signal
    );

    context.header("Content-Type", "application/x-ndjson; charset=utf-8");
    context.header("Cache-Control", "no-cache, no-transform");
    context.header("X-Accel-Buffering", "no");
    context.header("X-Request-Id", pull.requestId);

    return stream(context, async (output) => {
      output.onAbort(() => {
        abortController.abort();
      });

      try {
        for await (const event of pull.events) {
          if (output.aborted) {
            break;
          }

          await output.writeln(JSON.stringify(event));
        }
      } finally {
        abortController.abort();

        context.req.raw.signal.removeEventListener("abort", handleRequestAbort);
      }
    });
  } catch (error) {
    context.req.raw.signal.removeEventListener("abort", handleRequestAbort);

    if (error instanceof ProviderNotFoundError) {
      return context.json(
        {
          error: "provider_not_found",
          message: error.message,
        },
        404
      );
    }

    if (error instanceof ProviderModelPullNotSupportedError) {
      return context.json(
        {
          error: "provider_operation_not_supported",
          provider: error.provider,
          message: error.message,
        },
        422
      );
    }

    if (error instanceof ProviderModelPullRequestError) {
      return context.json(
        {
          error: "provider_model_pull_request_failed",
          provider: error.provider,
          message: error.message,
        },
        502
      );
    }

    throw error;
  }
}
