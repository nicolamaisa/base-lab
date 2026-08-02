import { z } from "zod";

import { discoveredProviderIdSchema } from "../llmDiscovery/llmDiscovery.schema.js";

export const llmModelPullIdSchema = z.uuid();

export const llmModelPullStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
]);

export const llmModelPullModelSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/, "Invalid local model name");

export const createLlmModelPullSchema = z.object({
  provider: discoveredProviderIdSchema,

  model: llmModelPullModelSchema,
});

const queryLimitSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(100));

export const listLlmModelPullsQuerySchema = z.object({
  provider: discoveredProviderIdSchema.optional(),

  model: llmModelPullModelSchema.optional(),

  status: llmModelPullStatusSchema.optional(),

  limit: queryLimitSchema.default(20),
});

export type CreateLlmModelPullInput = z.infer<typeof createLlmModelPullSchema>;

export type ListLlmModelPullsQuery = z.infer<
  typeof listLlmModelPullsQuerySchema
>;
