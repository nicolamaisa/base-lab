import { Hono } from "hono";

import { logger } from "@/lib/logger.js";

import { generateRoutes } from "@/modules/generate/generate.route.js";

import { healthRoutes } from "@/routes/health.route.js";
import { modelsRoutes } from "@/modules/models/model.route.js";

export const app = new Hono();

app.route("/health", healthRoutes);
app.route("/v1", generateRoutes);
app.route("/v1", modelsRoutes);

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
  logger.error(
    {
      error: error.message,
    },

    "Unhandled gateway error"
  );

  return context.json(
    {
      error: "internal_error",

      message: "Internal server error",
    },
    500
  );
});
