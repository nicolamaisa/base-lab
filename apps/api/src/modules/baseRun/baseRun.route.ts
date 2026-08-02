import { Hono } from "hono";

import { requireAuth } from "@/middleware/auth.middleware.js";

import {
  createBaseRunController,
  getBaseRunController,
  listBaseRunsController,
} from "@/modules/baseRun/baseRun.controller.js";

import type { AuthVariables } from "@/types/auth.types.js";

export const baseRunRoutes = new Hono<{
  Variables: AuthVariables;
}>();

baseRunRoutes.use("*", requireAuth);

baseRunRoutes.get("/", listBaseRunsController);

baseRunRoutes.post("/", createBaseRunController);

baseRunRoutes.get("/:runId", getBaseRunController);
