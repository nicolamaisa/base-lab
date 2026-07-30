import { Hono } from "hono";

import { requireAuth } from "@/middleware/auth.middleware.js";
import type { AuthVariables } from "@/types/auth.types.js";

export const authRoutes = new Hono<{
  Variables: AuthVariables;
}>();

authRoutes.use("*", requireAuth);

authRoutes.get("/me", (context) => {
  const user = context.get("user");

  return context.json({
    user,
  });
});
