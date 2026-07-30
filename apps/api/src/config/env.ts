import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3000),

  LOG_LEVEL: z.string().default("info"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),

  BASE_QUEUE_NAME: z.string().min(1, "BASE_QUEUE_NAME is required"),
});

export const env = envSchema.parse(process.env);
