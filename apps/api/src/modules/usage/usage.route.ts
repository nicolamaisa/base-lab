import { Hono } from "hono";

import { requireAuth } from "@/middleware/auth.middleware.js";

import {
  getAccountUsageController,
  getProviderModelUsageController,
  getRunUsageController,
} from "@/modules/usage/usage.controller.js";

import type { AuthVariables } from "@/types/auth.types.js";

export const usageRoutes = new Hono<{
  Variables: AuthVariables;
}>();

usageRoutes.use("*", requireAuth);

usageRoutes.get("/summary", getAccountUsageController);

usageRoutes.get("/provider-models", getProviderModelUsageController);

usageRoutes.get("/runs/:runId/summary", getRunUsageController);
