import { z } from "zod";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}, z.string().trim().min(1).optional());

const envSchema = z.object({
  PROJECT_NAME: z.string().trim().min(1).default("Base Lab"),
  PROJECT_SLUG: z.string().trim().min(1).default("base-lab"),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().positive().default(3003),

  LOG_LEVEL: z.string().default("info"),

  OLLAMA_BASE_URL: z.string().url().default("http://ollama:11434/v1"),

  OLLAMA_DEFAULT_MODEL: optionalTrimmedString.default("qwen3:1.7b"),

  OPENROUTER_API_KEY: optionalTrimmedString,

  OPENROUTER_BASE_URL: z.url().default("https://openrouter.ai/api/v1"),

  OPENROUTER_APP_URL: z.url().default("http://localhost:8000"),

  OPENROUTER_APP_TITLE: z.string().trim().min(1).default("Base Lab"),

  OPENROUTER_DEFAULT_MODEL: optionalTrimmedString,

  LLM_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(5_000).default(300_000),
});

export const env = envSchema.parse(process.env);
