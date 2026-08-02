import { Hono } from "hono";

import { generateController } from "@/modules/generate/generate.controller.js";

export const generateRoutes = new Hono();

generateRoutes.post("/generate", generateController);
