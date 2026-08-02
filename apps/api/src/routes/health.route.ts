import { Hono } from "hono";

export const healthRoutes = new Hono();

healthRoutes.get("/", (context) => {
  return context.json({
    status: "ok",
    service: `${process.env.PROJECT_SLUG}-api`,
    timestamp: new Date().toISOString(),
  });
});
