import type { Context } from "hono";

import {
  getAccountUsage,
  getProviderModelUsage,
  getRunUsage,
} from "@/modules/usage/usage.service.js";

import type { AuthVariables } from "@/types/auth.types.js";

type UsageContext = Context<{
  Variables: AuthVariables;
}>;

export async function getAccountUsageController(context: UsageContext) {
  const user = context.get("user");

  const usage = await getAccountUsage(user.id);

  return context.json({
    usage,
  });
}

export async function getRunUsageController(context: UsageContext) {
  const user = context.get("user");
  const runId = context.req.param("runId");

  if (!runId) {
    return context.json(
      {
        error: "Missing runId parameter",
      },
      400
    );
  }

  const usage = await getRunUsage(user.id, runId);

  return context.json({
    usage,
  });
}

export async function getProviderModelUsageController(context: UsageContext) {
  const user = context.get("user");

  const usage = await getProviderModelUsage(user.id);

  return context.json({
    usage,
  });
}
