import { Hono } from "hono";

import { healthRoutes } from "@/routes/health.route.js";

export const app = new Hono();

app.route("/health", healthRoutes);

app.notFound((context) => {
  return context.json(
    {
      error: "not_found",
      message: "Route not found",
    },
    404
  );
});
