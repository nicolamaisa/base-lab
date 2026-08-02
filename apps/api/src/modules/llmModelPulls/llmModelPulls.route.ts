import { Hono } from "hono";

import { requireAuth } from "@/middleware/auth.middleware.js";

import type { AuthVariables } from "@/types/auth.types.js";

import {
  createLlmModelPullController,
  getLlmModelPullController,
  listLlmModelPullsController,
} from "./llmModelPulls.controller.js";

export const llmModelPullRoutes = new Hono<{
  Variables: AuthVariables;
}>();

llmModelPullRoutes.use("*", requireAuth);

llmModelPullRoutes.get("/", listLlmModelPullsController);

llmModelPullRoutes.post("/", createLlmModelPullController);

llmModelPullRoutes.get("/:pullId", getLlmModelPullController);
