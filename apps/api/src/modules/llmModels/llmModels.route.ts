import { Hono } from "hono";

import { requireAuth } from "@/middleware/auth.middleware.js";

import type { AuthVariables } from "@/types/auth.types.js";

import {
  createLlmModelController,
  deleteLlmModelController,
  getLlmModelController,
  listLlmModelsController,
  updateLlmModelController,
} from "./llmModels.controller.js";

export const llmModelCatalogRoutes = new Hono<{
  Variables: AuthVariables;
}>();

llmModelCatalogRoutes.use("*", requireAuth);

llmModelCatalogRoutes.get("/", listLlmModelsController);

llmModelCatalogRoutes.post("/", createLlmModelController);

llmModelCatalogRoutes.get("/:modelId", getLlmModelController);

llmModelCatalogRoutes.patch("/:modelId", updateLlmModelController);

llmModelCatalogRoutes.delete("/:modelId", deleteLlmModelController);
