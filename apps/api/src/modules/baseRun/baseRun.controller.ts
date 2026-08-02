import type { Context } from "hono";

import {
  BaseRunModelSelectionError,
  BaseRunNotFoundError,
  BaseRunProviderDiscoveryError,
  createBaseRun,
  getBaseRun,
  listBaseRuns,
} from "@/modules/baseRun/baseRun.service.js";

import {
  baseRunIdSchema,
  createBaseRunSchema,
} from "@/modules/baseRun/baseRun.schema.js";

import type { AuthVariables } from "@/types/auth.types.js";

type BaseRunContext = Context<{
  Variables: AuthVariables;
}>;

export async function listBaseRunsController(context: BaseRunContext) {
  const user = context.get("user");

  const runs = await listBaseRuns(user.id);

  return context.json({
    base_runs: runs,
  });
}

export async function getBaseRunController(context: BaseRunContext) {
  const runId = baseRunIdSchema.safeParse(context.req.param("runId"));

  if (!runId.success) {
    return context.json(
      {
        error: "invalid_run_id",

        message: "Invalid run ID",
      },
      400
    );
  }

  try {
    const user = context.get("user");

    const run = await getBaseRun(user.id, runId.data);

    return context.json({
      base_run: run,
    });
  } catch (error) {
    if (error instanceof BaseRunNotFoundError) {
      return context.json(
        {
          error: "base_run_not_found",

          message: error.message,
        },
        404
      );
    }

    throw error;
  }
}

export async function createBaseRunController(context: BaseRunContext) {
  const body = await context.req.json().catch(() => null);

  const bodyResult = createBaseRunSchema.safeParse(body);

  if (!bodyResult.success) {
    return context.json(
      {
        error: "validation_error",

        message: "Invalid run data",

        issues: bodyResult.error.issues,
      },
      400
    );
  }

  const user = context.get("user");

  try {
    const run = await createBaseRun(user.id, bodyResult.data);

    return context.json(
      {
        base_run: run,
      },
      201
    );
  } catch (error) {
    if (error instanceof BaseRunModelSelectionError) {
      return context.json(
        {
          error: "invalid_model_selection",
          message: error.message,
        },
        422
      );
    }

    if (error instanceof BaseRunProviderDiscoveryError) {
      return context.json(
        {
          error: "provider_discovery_unavailable",
          message: error.message,
        },
        502
      );
    }

    throw error;
  }
}
