import { env } from "@/config/env.js";
import { Hono } from "hono";

export const healthRoutes = new Hono();

healthRoutes.get("/", (context) => {
  return context.json({
    status: "ok",
    service: `${env.PROJECT_SLUG}-llm-gateway`,
    timestamp: new Date().toISOString(),
  });
});
