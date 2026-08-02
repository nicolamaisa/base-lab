import { z } from "zod";

const envSchema = z.object({
  PROJECT_NAME: z.string().trim().min(1).default("Base Lab"),
  PROJECT_SLUG: z.string().trim().min(1).default("base-lab"),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default("info"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  LLM_GATEWAY_URL: z.url().default("http://llm-gateway:3003"),

  GOTRUE_JWKS_URL: z.url().default("http://auth:9999/.well-known/jwks.json"),
  JWT_ISSUER: z.string().trim().min(1).default("api"),
  JWT_AUDIENCE: z.string().trim().min(1).default("authenticated"),

  BASE_QUEUE_NAME: z.string().min(1, "BASE_QUEUE_NAME is required"),
  LLM_MODEL_PULL_QUEUE_NAME: z
    .string()
    .trim()
    .min(1)
    .default("llm-model-pulls"),
});

export const env = envSchema.parse(process.env);
