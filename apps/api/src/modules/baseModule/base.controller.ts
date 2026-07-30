import type { Context } from "hono";

import type { AuthVariables } from "@/types/auth.types.js";

import { getBaseService } from "./base.service.js";

type BaseContext = Context<{
  Variables: AuthVariables;
}>;

export async function getBaseController(context: BaseContext) {
  const user = context.get("user");

  const baseData = await getBaseService(user?.id ?? "");

  return context.json({
    message: `Hello, ${user?.email}! Welcome to the base route.`,
    data: baseData,
  });
}
