import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }

    return value;
  },

  z.string().trim().min(1).max(300).optional()
);

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),

  content: z.string().min(1).max(200_000),
});

const textOutputSchema = z.object({
  type: z.literal("text"),
});

const jsonOutputSchema = z.object({
  type: z.literal("json"),

  schema_name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/),

  schema: z
    .record(z.string(), z.unknown())
    .refine((value) => Object.keys(value).length > 0, {
      message: "JSON schema cannot be empty",
    }),
});

export const generateRequestSchema = z.object({
  request_id: z.string().uuid().optional(),

  task_type: optionalTrimmedString,

  provider: z.enum(["ollama", "openrouter"]),

  model: optionalTrimmedString,

  messages: z.array(messageSchema).min(1).max(100),

  temperature: z.number().min(0).max(2).optional(),

  top_p: z.number().min(0).max(1).optional(),

  max_tokens: z.number().int().positive().max(100_000).optional(),

  seed: z.number().int().optional(),

  output: z
    .discriminatedUnion("type", [textOutputSchema, jsonOutputSchema])
    .default({
      type: "text",
    }),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
