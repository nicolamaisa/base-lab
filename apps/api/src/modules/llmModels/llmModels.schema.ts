import { z } from "zod";

import { discoveredProviderIdSchema } from "../llmDiscovery/llmDiscovery.schema.js";

export const llmModelIdSchema = z.uuid();

export const remoteLlmProviderSchema = discoveredProviderIdSchema;

const modelKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/, "Invalid remote model key");

const displayNameSchema = z.string().trim().min(1).max(200);

const metadataSchema = z.record(z.string(), z.json()).default({});

const queryBooleanSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

export const listLlmModelsQuerySchema = z.object({
  provider: remoteLlmProviderSchema.optional(),

  enabled: queryBooleanSchema.optional(),
});

export const createLlmModelSchema = z
  .object({
    provider: remoteLlmProviderSchema,

    model_key: modelKeySchema,

    display_name: displayNameSchema,

    enabled: z.boolean().default(true),

    is_default: z.boolean().default(false),

    metadata: metadataSchema,
  })
  .refine((value) => !value.is_default || value.enabled, {
    message: "A default model must be enabled",

    path: ["is_default"],
  });

export const updateLlmModelSchema = z
  .object({
    display_name: displayNameSchema.optional(),

    enabled: z.boolean().optional(),

    is_default: z.boolean().optional(),

    metadata: z.record(z.string(), z.json()).optional(),
  })
  .refine(
    (value) =>
      Object.values(value).some((fieldValue) => fieldValue !== undefined),
    {
      message: "At least one field must be supplied",
    }
  )
  .refine((value) => !(value.is_default === true && value.enabled === false), {
    message: "A default model must be enabled",

    path: ["is_default"],
  });

export type ListLlmModelsQuery = z.infer<typeof listLlmModelsQuerySchema>;

export type CreateLlmModelInput = z.infer<typeof createLlmModelSchema>;

export type UpdateLlmModelInput = z.infer<typeof updateLlmModelSchema>;
