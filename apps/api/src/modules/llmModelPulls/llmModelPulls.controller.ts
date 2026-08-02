import type { Context } from "hono";

import type { AuthVariables } from "@/types/auth.types.js";

import {
  createLlmModelPullSchema,
  listLlmModelPullsQuerySchema,
  llmModelPullIdSchema,
} from "./llmModelPulls.schema.js";

import {
  createOwnerLlmModelPull,
  getOwnerLlmModelPull,
  listOwnerLlmModelPulls,
  LlmModelPullNotFoundError,
  LlmModelPullProviderDiscoveryError,
  LlmModelPullQueueError,
  LocalLlmProviderNotConfiguredError,
  UnsupportedLocalLlmProviderError,
} from "./llmModelPulls.service.js";

type LlmModelPullContext = Context<{
  Variables: AuthVariables;
}>;

function handleLlmModelPullError(
  context: LlmModelPullContext,
  error: unknown
): Response | null {
  if (error instanceof LlmModelPullNotFoundError) {
    return context.json(
      {
        error: "llm_model_pull_not_found",

        message: error.message,
      },
      404
    );
  }

  if (
    error instanceof UnsupportedLocalLlmProviderError ||
    error instanceof LocalLlmProviderNotConfiguredError
  ) {
    return context.json(
      {
        error: "unsupported_local_llm_provider",

        message: error.message,
      },
      422
    );
  }

  if (error instanceof LlmModelPullProviderDiscoveryError) {
    return context.json(
      {
        error: "llm_provider_discovery_failed",

        message: error.message,
      },
      502
    );
  }

  if (error instanceof LlmModelPullQueueError) {
    return context.json(
      {
        error: "llm_model_pull_queue_unavailable",

        message: error.message,
      },
      503
    );
  }

  return null;
}

export async function listLlmModelPullsController(
  context: LlmModelPullContext
) {
  const queryResult = listLlmModelPullsQuerySchema.safeParse(
    context.req.query()
  );

  if (!queryResult.success) {
    return context.json(
      {
        error: "validation_error",

        message: "Invalid model pull filters",

        issues: queryResult.error.issues,
      },
      400
    );
  }

  const user = context.get("user");

  const pulls = await listOwnerLlmModelPulls(user.id, queryResult.data);

  return context.json({
    model_pulls: pulls,
  });
}

export async function getLlmModelPullController(context: LlmModelPullContext) {
  const pullIdResult = llmModelPullIdSchema.safeParse(
    context.req.param("pullId")
  );

  if (!pullIdResult.success) {
    return context.json(
      {
        error: "invalid_llm_model_pull_id",

        message: "Invalid LLM model pull ID",
      },
      400
    );
  }

  try {
    const user = context.get("user");

    const pull = await getOwnerLlmModelPull(user.id, pullIdResult.data);

    return context.json({
      model_pull: pull,
    });
  } catch (error) {
    const response = handleLlmModelPullError(context, error);

    if (response) {
      return response;
    }

    throw error;
  }
}

export async function createLlmModelPullController(
  context: LlmModelPullContext
) {
  const body = await context.req.json().catch(() => null);

  const bodyResult = createLlmModelPullSchema.safeParse(body);

  if (!bodyResult.success) {
    return context.json(
      {
        error: "validation_error",

        message: "Invalid model pull request",

        issues: bodyResult.error.issues,
      },
      400
    );
  }

  try {
    const user = context.get("user");

    const result = await createOwnerLlmModelPull(user.id, bodyResult.data);

    const body = {
      model_pull: result.pull,

      created: result.created,
    };

    return result.created ? context.json(body, 201) : context.json(body, 200);
  } catch (error) {
    const response = handleLlmModelPullError(context, error);

    if (response) {
      return response;
    }

    throw error;
  }
}
