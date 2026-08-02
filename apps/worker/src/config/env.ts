import { z } from "zod";

const envSchema = z.object({
  PROJECT_NAME: z.string().trim().min(1).default("Base Lab"),
  PROJECT_SLUG: z.string().trim().min(1).default("base-lab"),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  LOG_LEVEL: z.string().default("info"),

  HEALTH_PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  LLM_GATEWAY_URL: z.url().default("http://llm-gateway:3003"),

  BASE_WORKER_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),

  BASE_WORKER_POLL_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(5000),

  BASE_WORKER_BATCH_SIZE: z.coerce.number().int().positive().max(10).default(1),

  BASE_QUEUE_NAME: z.string().trim().min(1).default("base-tasks"),
  LLM_MODEL_PULL_QUEUE_NAME: z
    .string()
    .trim()
    .min(1)
    .default("llm-model-pulls"),

  LLM_MODEL_PULL_WORKER_CONCURRENCY: z.coerce
    .number()
    .int()
    .positive()
    .max(4)
    .default(1),

  BASE_RUN_WORKER_CONCURRENCY: z.coerce
    .number()
    .int()
    .positive()
    .max(10)
    .default(1),

  BASE_RUNS_RECONCILER_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),

  BASE_RUNS_RECONCILE_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30_000),

  BASE_RUNS_RECONCILE_BATCH_SIZE: z.coerce
    .number()
    .int()
    .positive()
    .default(100),
});

export const env = envSchema.parse(process.env);
