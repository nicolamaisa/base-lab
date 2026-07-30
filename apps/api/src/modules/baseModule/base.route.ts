import { Hono } from "hono";

import { requireAuth } from "@/middleware/auth.middleware.js";

import type { AuthVariables } from "@/types/auth.types.js";

import { getBaseController } from "./base.controller.js";

export const baseRoutes = new Hono<{
  Variables: AuthVariables;
}>();

baseRoutes.use("*", requireAuth);

baseRoutes.get("/", getBaseController);
