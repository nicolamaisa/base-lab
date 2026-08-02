import { Hono } from "hono";

import { authRoutes } from "@/modules/auth/auth.route.js";
import { healthRoutes } from "@/routes/health.route.js";
import { baseRoutes } from "@/modules/baseModule/base.route.js";
import { baseRunRoutes } from "@/modules/baseRun/baseRun.route.js";
import { usageRoutes } from "./modules/usage/usage.route.js";
import { llmModelCatalogRoutes } from "@/modules/llmModels/llmModels.route.js";
import { llmDiscoveryRoutes } from "@/modules/llmDiscovery/llmDiscovery.route.js";
import { llmModelPullRoutes } from "@/modules/llmModelPulls/llmModelPulls.route.js";

export const app = new Hono();

app.route("/health", healthRoutes);
app.route("/auth", authRoutes);
app.route("/base", baseRoutes);
app.route("/runs", baseRunRoutes);
app.route("/usage", usageRoutes);
app.route("/llm/providers", llmDiscoveryRoutes);
app.route("/llm/model-pulls", llmModelPullRoutes);
app.route("/llm/model-catalog", llmModelCatalogRoutes);

app.notFound((context) => {
  return context.json(
    {
      error: "not_found",
      message: "Route not found",
    },
    404
  );
});

app.onError((error, context) => {
  console.error(error);

  return context.json(
    {
      error: "internal_error",
      message: "Internal server error",
    },
    500
  );
});
