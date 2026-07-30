import { Hono } from "hono";

export const healthRoutes = new Hono();

healthRoutes.get("/", (context) => {
  return context.json({
    status: "ok",
    service: "decision-lab-api",
    timestamp: new Date().toISOString(),
  });
});
