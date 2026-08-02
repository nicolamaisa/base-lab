import { randomUUID } from "node:crypto";

import {
  InvalidLlmModelPullStreamError,
  LlmModelPullGatewayError,
  streamLlmModelPull,
} from "@/lib/llm-model-pull-gateway.js";

import { logger } from "@/lib/logger.js";

import {
  claimLlmModelPullById,
  completeLlmModelPull,
  failLlmModelPull,
  setLlmModelPullRequestId,
  updateLlmModelPullProgress,
} from "./llmModelPull.repository.js";

function getFailureDetails(error: unknown): {
  code: string;

  message: string;
} {
  if (error instanceof LlmModelPullGatewayError) {
    return {
      code:
        error.status === null
          ? "llm_gateway_unavailable"
          : "llm_gateway_pull_rejected",

      message: error.message,
    };
  }

  if (error instanceof InvalidLlmModelPullStreamError) {
    return {
      code: "invalid_llm_model_pull_stream",

      message: error.message,
    };
  }

  return {
    code: "llm_model_pull_failed",

    message:
      error instanceof Error ? error.message : "Unknown model pull error",
  };
}

export async function processLlmModelPullById(
  pullId: string
): Promise<boolean> {
  const pull = await claimLlmModelPullById(pullId);

  if (!pull) {
    logger.info(
      {
        pullId,
      },
      "Model pull not found or already terminal"
    );

    return false;
  }

  const requestId = pull.gateway_request_id ?? randomUUID();

  await setLlmModelPullRequestId(pull.id, requestId);

  logger.info(
    {
      pullId: pull.id,

      requestId,

      provider: pull.provider,

      model: pull.model_key,
    },
    "LLM model pull started"
  );

  try {
    for await (const event of streamLlmModelPull(
      pull.provider,
      pull.model_key,
      requestId
    )) {
      if (event.type === "progress") {
        await updateLlmModelPullProgress(pull.id, event);

        continue;
      }

      if (event.type === "completed") {
        await completeLlmModelPull(pull.id, event);

        logger.info(
          {
            pullId: pull.id,

            requestId,

            provider: pull.provider,

            model: pull.model_key,
          },
          "LLM model pull completed"
        );

        return true;
      }

      await failLlmModelPull(pull.id, {
        code: event.error_code,

        message: event.message,
      });

      logger.warn(
        {
          pullId: pull.id,

          requestId,

          errorCode: event.error_code,

          message: event.message,
        },
        "LLM model pull returned a failed event"
      );

      return true;
    }

    throw new InvalidLlmModelPullStreamError(
      "LLM model pull ended unexpectedly"
    );
  } catch (error) {
    const failure = getFailureDetails(error);

    await failLlmModelPull(pull.id, failure);

    logger.error(
      {
        err: error,

        pullId: pull.id,

        requestId,

        errorCode: failure.code,
      },
      "LLM model pull failed"
    );

    return true;
  }
}
