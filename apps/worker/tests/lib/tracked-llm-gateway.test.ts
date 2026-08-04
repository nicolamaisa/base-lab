import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  LlmGatewayGenerateRequest,
  LlmGatewayGenerateResponse,
} from "@/lib/llm-gateway.js";

/*
 * Creiamo un database finto che riproduce soltanto le catene Kysely
 * utilizzate da generateWithTrackedLlmGateway:
 *
 * db.insertInto().values().returning().executeTakeFirstOrThrow()
 * db.updateTable().set().where().execute()
 */
const mocks = vi.hoisted(() => {
  const insertExecuteTakeFirstOrThrow = vi.fn().mockResolvedValue({
    id: "invocation-1",
  });

  const insertReturning = vi.fn(() => ({
    executeTakeFirstOrThrow: insertExecuteTakeFirstOrThrow,
  }));

  const insertValues = vi.fn(() => ({
    returning: insertReturning,
  }));

  const insertInto = vi.fn(() => ({
    values: insertValues,
  }));

  const updateExecute = vi.fn().mockResolvedValue([]);

  const updateWhere = vi.fn(() => ({
    execute: updateExecute,
  }));

  const updateSet = vi.fn(() => ({
    where: updateWhere,
  }));

  const updateTable = vi.fn(() => ({
    set: updateSet,
  }));

  const generateWithLlmGateway = vi.fn();

  return {
    insertExecuteTakeFirstOrThrow,
    insertReturning,
    insertValues,
    insertInto,

    updateExecute,
    updateWhere,
    updateSet,
    updateTable,

    generateWithLlmGateway,
  };
});

vi.mock("@/lib/db.js", () => ({
  db: {
    insertInto: mocks.insertInto,
    updateTable: mocks.updateTable,
  },
}));

vi.mock("@/lib/llm-gateway.js", () => ({
  generateWithLlmGateway: mocks.generateWithLlmGateway,
}));

import { generateWithTrackedLlmGateway } from "@/lib/tracked-llm-gateway.js";

const payload = {
  provider: "ollama",
  model: "llama3.2:3b",
  task_type: "base_response",

  messages: [
    {
      role: "user",
      content: "Say hello",
    },
  ],

  temperature: 0.2,
  max_tokens: 128,

  output: {
    type: "text",
    content: "",
    json: null,
  },
} satisfies LlmGatewayGenerateRequest;

const context = {
  runId: "run-1",
  contextType: "base_run",
  contextId: "run-1",
  ownerId: "user-1",

  metadata: {
    base_run_id: "run-1",
    source: "test",
  },
};

const gatewayResult = {
  request_id: "request-1",
  task_type: "base_response",

  provider: "ollama",
  model: "llama3.2:3b",

  provider_response_id: "provider-response-1",

  output: {
    type: "text",
    content: "Hello Nicola",
    json: null,
  },

  usage: {
    input_tokens: 3,
    output_tokens: 2,
    total_tokens: 5,
  },

  finish_reason: "stop",
  latency_ms: 125,
} satisfies LlmGatewayGenerateResponse;

describe("generateWithTrackedLlmGateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks and completes a successful LLM invocation", async () => {
    mocks.generateWithLlmGateway.mockResolvedValueOnce(gatewayResult);

    const result = await generateWithTrackedLlmGateway(payload, context);

    expect(mocks.insertInto).toHaveBeenCalledWith("ai_invocations");

    expect(mocks.insertValues).toHaveBeenCalledWith({
      owner_id: "user-1",
      run_id: "run-1",

      task_type: "base_response",
      context_type: "base_run",
      context_id: "run-1",

      provider: "ollama",
      model_key: "llama3.2:3b",

      status: "running",

      request_payload: payload,

      metadata: {
        base_run_id: "run-1",
        source: "test",
      },

      started_at: expect.any(Date),
    });

    expect(mocks.generateWithLlmGateway).toHaveBeenCalledWith(payload);

    expect(mocks.updateTable).toHaveBeenCalledWith("ai_invocations");

    expect(mocks.updateSet).toHaveBeenCalledWith({
      provider: "ollama",
      model_key: "llama3.2:3b",

      status: "completed",

      response_payload: gatewayResult,

      input_tokens: 3,
      output_tokens: 2,
      total_tokens: 5,

      latency_ms: 125,

      completed_at: expect.any(Date),

      metadata: {
        base_run_id: "run-1",
        source: "test",

        request_id: "request-1",
        provider_response_id: "provider-response-1",
        finish_reason: "stop",
      },
    });

    expect(mocks.updateWhere).toHaveBeenCalledWith("id", "=", "invocation-1");

    expect(mocks.updateExecute).toHaveBeenCalled();

    expect(result).toEqual({
      ...gatewayResult,
      aiInvocationId: "invocation-1",
    });
  });

  it("marks the invocation as failed and rethrows the gateway error", async () => {
    const gatewayError = new Error("LLM provider unavailable");

    mocks.generateWithLlmGateway.mockRejectedValueOnce(gatewayError);

    await expect(generateWithTrackedLlmGateway(payload, context)).rejects.toBe(
      gatewayError
    );

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: "user-1",
        run_id: "run-1",
        status: "running",
      })
    );

    expect(mocks.updateSet).toHaveBeenCalledWith({
      status: "failed",

      error_code: "llm_gateway_failed",
      error_message: "LLM provider unavailable",

      latency_ms: expect.any(Number),
      completed_at: expect.any(Date),
    });

    expect(mocks.updateWhere).toHaveBeenCalledWith("id", "=", "invocation-1");

    expect(mocks.updateExecute).toHaveBeenCalled();
  });
});
