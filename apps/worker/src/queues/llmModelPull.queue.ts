import { z } from "zod";

export const PROCESS_LLM_MODEL_PULL_JOB = "process-llm-model-pull" as const;

export type ProcessLlmModelPullJobName = typeof PROCESS_LLM_MODEL_PULL_JOB;

export const processLlmModelPullJobDataSchema = z.object({
  pullId: z.uuid(),
});

export type ProcessLlmModelPullJobData = z.infer<
  typeof processLlmModelPullJobDataSchema
>;
