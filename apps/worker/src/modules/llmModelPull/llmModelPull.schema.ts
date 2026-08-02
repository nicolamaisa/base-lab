import { z } from "zod";

const modelPullEventBaseSchema = z.object({
  request_id: z.uuid(),

  provider: z.string().trim().min(1),

  model: z.string().trim().min(1),

  status: z.string().trim().min(1),
});

const modelPullProgressEventSchema = modelPullEventBaseSchema.extend({
  type: z.literal("progress"),

  digest: z.string().nullable(),

  completed_bytes: z.number().nonnegative().nullable(),

  total_bytes: z.number().nonnegative().nullable(),

  percent: z.number().min(0).max(100).nullable(),
});

const modelPullCompletedEventSchema = modelPullEventBaseSchema.extend({
  type: z.literal("completed"),

  completed_bytes: z.number().nonnegative().nullable(),

  total_bytes: z.number().nonnegative().nullable(),

  percent: z.literal(100),
});

const modelPullFailedEventSchema = modelPullEventBaseSchema.extend({
  type: z.literal("failed"),

  error_code: z.string().trim().min(1),

  message: z.string().trim().min(1),
});

export const llmModelPullEventSchema = z.discriminatedUnion("type", [
  modelPullProgressEventSchema,
  modelPullCompletedEventSchema,
  modelPullFailedEventSchema,
]);

export type LlmModelPullEvent = z.infer<typeof llmModelPullEventSchema>;

export type LlmModelPullProgressEvent = z.infer<
  typeof modelPullProgressEventSchema
>;

export type LlmModelPullCompletedEvent = z.infer<
  typeof modelPullCompletedEventSchema
>;
