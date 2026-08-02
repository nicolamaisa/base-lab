import type { Context } from "hono";

import type { AuthVariables } from "@/types/auth.types.js";

import {
  createLlmModelSchema,
  listLlmModelsQuerySchema,
  llmModelIdSchema,
  updateLlmModelSchema,
} from "./llmModels.schema.js";

import {
  createLlmModelService,
  deleteLlmModelService,
  getLlmModelService,
  listLlmModelsService,
  LlmModelConflictError,
  LlmModelNotFoundError,
  updateLlmModelService,
  LlmProviderDiscoveryError,
  UnsupportedRemoteLlmProviderError,
} from "./llmModels.service.js";

type LlmModelsContext = Context<{
  Variables: AuthVariables;
}>;

function handleLlmModelError(
  context: LlmModelsContext,
  error: unknown
): Response | null {
  if (error instanceof LlmModelNotFoundError) {
    return context.json(
      {
        error: "llm_model_not_found",

        message: error.message,
      },
      404
    );
  }

  if (error instanceof LlmModelConflictError) {
    return context.json(
      {
        error: "llm_model_conflict",

        message: error.message,
      },
      409
    );
  }

  if (error instanceof UnsupportedRemoteLlmProviderError) {
    return context.json(
      {
        error: "unsupported_remote_llm_provider",

        message: error.message,
      },
      422
    );
  }

  if (error instanceof LlmProviderDiscoveryError) {
    return context.json(
      {
        error: "llm_provider_discovery_failed",

        message: error.message,
      },
      502
    );
  }

  return null;
}

export async function listLlmModelsController(context: LlmModelsContext) {
  const queryResult = listLlmModelsQuerySchema.safeParse(context.req.query());

  if (!queryResult.success) {
    return context.json(
      {
        error: "validation_error",

        message: "Invalid model catalog filters",

        issues: queryResult.error.issues,
      },
      400
    );
  }

  const user = context.get("user");

  const models = await listLlmModelsService(user.id, queryResult.data);

  return context.json({
    models,
  });
}

export async function getLlmModelController(context: LlmModelsContext) {
  const modelIdResult = llmModelIdSchema.safeParse(
    context.req.param("modelId")
  );

  if (!modelIdResult.success) {
    return context.json(
      {
        error: "invalid_model_id",

        message: "Invalid model ID",
      },
      400
    );
  }

  try {
    const user = context.get("user");

    const model = await getLlmModelService(user.id, modelIdResult.data);

    return context.json({
      model,
    });
  } catch (error) {
    const response = handleLlmModelError(context, error);

    if (response) {
      return response;
    }

    throw error;
  }
}

export async function createLlmModelController(context: LlmModelsContext) {
  const body = await context.req.json().catch(() => null);

  const bodyResult = createLlmModelSchema.safeParse(body);

  if (!bodyResult.success) {
    return context.json(
      {
        error: "validation_error",

        message: "Invalid model catalog entry",

        issues: bodyResult.error.issues,
      },
      400
    );
  }

  try {
    const user = context.get("user");

    const model = await createLlmModelService(user.id, bodyResult.data);

    return context.json(
      {
        model,
      },
      201
    );
  } catch (error) {
    const response = handleLlmModelError(context, error);

    if (response) {
      return response;
    }

    throw error;
  }
}

export async function updateLlmModelController(context: LlmModelsContext) {
  const modelIdResult = llmModelIdSchema.safeParse(
    context.req.param("modelId")
  );

  if (!modelIdResult.success) {
    return context.json(
      {
        error: "invalid_model_id",

        message: "Invalid model ID",
      },
      400
    );
  }

  const body = await context.req.json().catch(() => null);

  const bodyResult = updateLlmModelSchema.safeParse(body);

  if (!bodyResult.success) {
    return context.json(
      {
        error: "validation_error",

        message: "Invalid model catalog update",

        issues: bodyResult.error.issues,
      },
      400
    );
  }

  try {
    const user = context.get("user");

    const model = await updateLlmModelService(
      user.id,
      modelIdResult.data,
      bodyResult.data
    );

    return context.json({
      model,
    });
  } catch (error) {
    const response = handleLlmModelError(context, error);

    if (response) {
      return response;
    }

    throw error;
  }
}

export async function deleteLlmModelController(context: LlmModelsContext) {
  const modelIdResult = llmModelIdSchema.safeParse(
    context.req.param("modelId")
  );

  if (!modelIdResult.success) {
    return context.json(
      {
        error: "invalid_model_id",

        message: "Invalid model ID",
      },
      400
    );
  }

  try {
    const user = context.get("user");

    const model = await deleteLlmModelService(user.id, modelIdResult.data);

    return context.json({
      model,
    });
  } catch (error) {
    const response = handleLlmModelError(context, error);

    if (response) {
      return response;
    }

    throw error;
  }
}
