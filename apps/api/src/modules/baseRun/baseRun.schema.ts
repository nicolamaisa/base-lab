import { z } from "zod";
import { discoveredProviderIdSchema } from "../llmDiscovery/llmDiscovery.schema.js";

export const baseRunIdSchema = z.uuid();

export const createBaseRunSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),

  provider: discoveredProviderIdSchema,

  model: z.string().trim().min(1).max(300),

  temperature: z.number().min(0).max(2).default(0.7),

  max_tokens: z.number().int().positive().max(10_000).default(800),
});

export type CreateBaseRunInput = z.infer<typeof createBaseRunSchema>;
