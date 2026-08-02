import { Hono } from "hono";

import {
  getProviderModels,
  getProvidersList,
  pullProviderModel,
} from "./model.controller.js";

export const modelsRoutes = new Hono();

modelsRoutes.get("/providers", getProvidersList);

modelsRoutes.get("/:providerName/models", getProviderModels);

modelsRoutes.post("/:providerName/models/pull", pullProviderModel);
