import { Hono } from "hono";

import { requireAuth } from "@/middleware/auth.middleware.js";

import type { AuthVariables } from "@/types/auth.types.js";

import {
  listDiscoveredProvidersController,
  listDiscoveredProviderModelsController,
} from "./llmDiscovery.controller.js";

export const llmDiscoveryRoutes = new Hono<{
  Variables: AuthVariables;
}>();

llmDiscoveryRoutes.use("*", requireAuth);

llmDiscoveryRoutes.get("/", listDiscoveredProvidersController);

llmDiscoveryRoutes.get(
  "/:providerId/models",
  listDiscoveredProviderModelsController
);
