import { db } from "@/lib/db.js";

import {
  generateWithLlmGateway,
  type LlmGatewayGenerateRequest,
  type LlmGatewayGenerateResponse,
} from "@/lib/llm-gateway.js";

import type { Json } from "@/types/db.types.js";

type LlmInvocationContext = {
  runId: string;
  contextType: string;
  contextId: string;
  metadata?: Json;
  ownerId: string;
};

export type TrackedLlmGatewayGenerateResponse = LlmGatewayGenerateResponse & {
  aiInvocationId: string;
};

function asJsonObject(value: Json | undefined): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export async function generateWithTrackedLlmGateway(
  payload: LlmGatewayGenerateRequest,
  context: LlmInvocationContext
): Promise<TrackedLlmGatewayGenerateResponse> {
  const startedAt = new Date();
  const baseMetadata = asJsonObject(context.metadata);

  const invocation = await db
    .insertInto("ai_invocations")
    .values({
      owner_id: context.ownerId,
      run_id: context.runId,
      task_type: payload.task_type,
      context_type: context.contextType,
      context_id: context.contextId,
      provider: payload.provider,
      model_key: payload.model,
      status: "running",
      request_payload: payload as unknown as Json,
      metadata: baseMetadata as Json,
      started_at: startedAt,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  try {
    const result = await generateWithLlmGateway(payload);

    await db
      .updateTable("ai_invocations")
      .set({
        provider: result.provider,
        model_key: result.model,
        status: "completed",
        response_payload: result as unknown as Json,
        input_tokens: result.usage.input_tokens,
        output_tokens: result.usage.output_tokens,
        total_tokens: result.usage.total_tokens,
        latency_ms: result.latency_ms,
        completed_at: new Date(),
        metadata: {
          ...baseMetadata,
          request_id: result.request_id,
          provider_response_id: result.provider_response_id,
          finish_reason: result.finish_reason,
        } as Json,
      })
      .where("id", "=", invocation.id)
      .execute();

    return {
      ...result,
      aiInvocationId: invocation.id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown LLM gateway error";

    await db
      .updateTable("ai_invocations")
      .set({
        status: "failed",
        error_code: "llm_gateway_failed",
        error_message: message,
        latency_ms: Date.now() - startedAt.getTime(),
        completed_at: new Date(),
      })
      .where("id", "=", invocation.id)
      .execute();

    throw error;
  }
}
