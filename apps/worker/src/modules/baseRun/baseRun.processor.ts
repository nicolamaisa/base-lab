import { generateWithTrackedLlmGateway } from "@/lib/tracked-llm-gateway.js";
import { logger } from "@/lib/logger.js";

import {
  claimRunById,
  claimNextRun,
  completeRunById,
  failRunById,
} from "@/modules/baseRun/baseRun.repository.js";

import type { Json } from "@/types/db.types.js";
import { LlmOutput, LlmRole } from "@/lib/llm-gateway.js";
import { z } from "zod";

const runParametersSchema = z.object({
  provider: z.string().trim().min(1).max(64),
  model: z.string().trim().min(1).max(300),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().max(10_000).optional(),
});

type RunParameters = z.infer<typeof runParametersSchema>;

function parseTaskParameters(parameters: Json): RunParameters {
  return runParametersSchema.parse(parameters);
}

type ClaimedBaseRun = NonNullable<Awaited<ReturnType<typeof claimRunById>>>;

function buildRequestPayload(run: ClaimedBaseRun) {
  const parameters = parseTaskParameters(run.configuration);

  const provider = parameters.provider;
  const model = parameters.model;

  return {
    provider,
    model,
    task_type: "base_response",
    messages: [{ role: "user" as LlmRole, content: run.prompt }],
    temperature: parameters.temperature ?? 0.7,
    max_tokens: parameters.max_tokens ?? 800,
    output: { type: "text" } as LlmOutput,
  };
}

export async function processClaimedBaseRun(run: ClaimedBaseRun) {
  logger.info(
    {
      runId: run.id,
    },
    "Claimed run task"
  );

  try {
    const requestPayload = buildRequestPayload(run);

    const result = await generateWithTrackedLlmGateway(requestPayload, {
      runId: run.id,
      contextType: "base_run",
      contextId: run.id,
      ownerId: run.owner_id,
      metadata: { base_run_id: run.id },
    });

    const outputContent =
      result.output.type === "text"
        ? result.output.content
        : JSON.stringify(result.output.json);

    await completeRunById(run.id, outputContent, result as Json);

    logger.info(
      {
        runId: run.id,
      },
      "Run task completed"
    );

    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown generation task error";

    logger.error(
      {
        runId: run.id,
        error: message,
      },
      "Run task failed"
    );

    await failRunById(run.id, {
      code: "llm_failed",
      message,
    });

    return true;
  }
}
export async function processBaseRunById(runId: string) {
  const run = await claimRunById(runId);

  if (!run) {
    logger.info(
      {
        runId,
      },
      "Run task not found or already processed"
    );
    return false;
  }

  return processClaimedBaseRun(run);
}

export async function processNextBaseRun() {
  const run = await claimNextRun();

  if (!run) {
    return false;
  }

  return processClaimedBaseRun(run);
}
