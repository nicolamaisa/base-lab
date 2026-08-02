import { z } from "zod";

const ollamaModelDetailsSchema = z
  .object({
    format: z.string().optional(),

    family: z.string().optional(),

    families: z.array(z.string()).nullable().optional(),

    parameter_size: z.string().optional(),

    quantization_level: z.string().optional(),
  })
  .passthrough();

export const ollamaTagsResponseSchema = z.object({
  models: z.array(
    z
      .object({
        name: z.string().trim().min(1),

        model: z.string().trim().min(1),

        modified_at: z.string().optional(),

        size: z.number().nonnegative().optional(),

        digest: z.string().optional(),

        details: ollamaModelDetailsSchema.optional(),
      })
      .passthrough()
  ),
});

export const pullModelRequestSchema = z.object({
  request_id: z.uuid().optional(),

  model: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/, "Invalid Ollama model name"),
});

export const ollamaPullChunkSchema = z
  .object({
    status: z.string().trim().min(1).optional(),

    error: z.string().trim().min(1).optional(),

    digest: z.string().optional(),

    total: z.number().nonnegative().optional(),

    completed: z.number().nonnegative().optional(),
  })
  .loose()
  .refine((value) => value.status || value.error, {
    message: "Pull chunk must contain status or error",
  });

const modelPullEventBaseSchema = z.object({
  request_id: z.uuid(),

  provider: z.literal("ollama"),

  model: z.string().trim().min(1),

  status: z.string().trim().min(1),
});

export const modelPullProgressEventSchema = modelPullEventBaseSchema.extend({
  type: z.literal("progress"),

  digest: z.string().nullable(),

  completed_bytes: z.number().nonnegative().nullable(),

  total_bytes: z.number().nonnegative().nullable(),

  percent: z.number().min(0).max(100).nullable(),
});

export const modelPullCompletedEventSchema = modelPullEventBaseSchema.extend({
  type: z.literal("completed"),

  completed_bytes: z.number().nonnegative().nullable(),

  total_bytes: z.number().nonnegative().nullable(),

  percent: z.literal(100),
});

export const modelPullFailedEventSchema = modelPullEventBaseSchema.extend({
  type: z.literal("failed"),

  error_code: z.string().trim().min(1),

  message: z.string().trim().min(1),
});

export const modelPullEventSchema = z.discriminatedUnion("type", [
  modelPullProgressEventSchema,
  modelPullCompletedEventSchema,
  modelPullFailedEventSchema,
]);

export const providerNameSchema = z.enum(["ollama", "openrouter"]);

export const providerTypeSchema = z.enum(["local", "remote"]);

export const providerSummarySchema = z.object({
  id: providerNameSchema,

  label: z.string().trim().min(1),

  type: providerTypeSchema,

  configured: z.boolean(),

  default_model: z.string().trim().min(1).nullable(),

  requires_explicit_model: z.boolean(),
});

export const modelSourceSchema = z.enum(["discovered", "curated"]);

export const modelOptionSchema = z.object({
  model_id: z.string().trim().min(1),

  display_name: z.string().trim().min(1),

  provider: providerNameSchema,

  provider_type: providerTypeSchema,

  source: modelSourceSchema,

  selectable: z.boolean(),

  is_default: z.boolean(),

  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const providersResponseSchema = z.object({
  providers: z.array(providerSummarySchema),
});

export const providerModelsResponseSchema = z.object({
  provider: providerSummarySchema,

  models: z.array(modelOptionSchema),
});

export type PullModelRequest = z.infer<typeof pullModelRequestSchema>;

export type OllamaPullChunk = z.infer<typeof ollamaPullChunkSchema>;

export type ModelPullEvent = z.infer<typeof modelPullEventSchema>;

export type ProviderName = z.infer<typeof providerNameSchema>;

export type ProviderType = z.infer<typeof providerTypeSchema>;

export type ProviderSummary = z.infer<typeof providerSummarySchema>;

export type ModelOption = z.infer<typeof modelOptionSchema>;

export type ProvidersResponse = z.infer<typeof providersResponseSchema>;

export type ProviderModelsResponse = z.infer<
  typeof providerModelsResponseSchema
>;
