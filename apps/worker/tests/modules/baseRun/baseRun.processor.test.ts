import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Sostituiamo le dipendenze esterne del processor:
 *
 * - niente vero gateway LLM;
 * - niente vero database;
 * - niente output del logger.
 */

vi.mock("@/lib/tracked-llm-gateway.js", () => ({
  generateWithTrackedLlmGateway: vi.fn(),
}));

vi.mock("@/modules/baseRun/baseRun.repository.js", () => ({
  claimRunById: vi.fn(),
  claimNextRun: vi.fn(),
  completeRunById: vi.fn(),
  failRunById: vi.fn(),
}));

vi.mock("@/lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}));

import { generateWithTrackedLlmGateway } from "@/lib/tracked-llm-gateway.js";

import {
  claimRunById,
  completeRunById,
  failRunById,
} from "@/modules/baseRun/baseRun.repository.js";

import { processBaseRunById } from "@/modules/baseRun/baseRun.processor.js";

const claimRunByIdMock = vi.mocked(claimRunById);
const completeRunByIdMock = vi.mocked(completeRunById);
const failRunByIdMock = vi.mocked(failRunById);

const generateWithTrackedLlmGatewayMock = vi.mocked(
  generateWithTrackedLlmGateway
);

type ClaimedRun = NonNullable<Awaited<ReturnType<typeof claimRunById>>>;

function createClaimedRun(): ClaimedRun {
  const now = new Date("2026-01-01T12:00:00.000Z");

  return {
    id: "run-1",
    owner_id: "user-1",

    prompt: "Say hello",

    configuration: {
      provider: "ollama",
      model: "llama3.2:3b",
      temperature: 0.2,
      max_tokens: 128,
    },

    status: "running",

    response: null,
    raw_response: null,

    error_code: null,
    error_message: null,

    created_at: now,
    updated_at: now,
    started_at: now,
    completed_at: null,
  } satisfies ClaimedRun;
}

describe("processBaseRunById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes a run when the LLM gateway succeeds", async () => {
    const claimedRun = createClaimedRun();

    const gatewayResult = {
      request_id: "request-1",
      task_type: "base_response",
      provider: "ollama",
      model: "llama3.2:3b",
      provider_response_id: null,

      output: {
        type: "text" as const,
        content: "Hello Nicola",
        json: null,
      },

      usage: {
        input_tokens: 3,
        output_tokens: 2,
        total_tokens: 5,
      },

      finish_reason: "stop",
      latency_ms: 25,
      aiInvocationId: "invocation-1",
    };

    claimRunByIdMock.mockResolvedValueOnce(claimedRun);

    generateWithTrackedLlmGatewayMock.mockResolvedValueOnce(gatewayResult);

    const processed = await processBaseRunById("run-1");

    expect(processed).toBe(true);

    expect(claimRunByIdMock).toHaveBeenCalledWith("run-1");

    expect(generateWithTrackedLlmGatewayMock).toHaveBeenCalledWith(
      {
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
        },
      },
      {
        runId: "run-1",
        contextType: "base_run",
        contextId: "run-1",
        ownerId: "user-1",

        metadata: {
          base_run_id: "run-1",
        },
      }
    );

    expect(completeRunByIdMock).toHaveBeenCalledWith(
      "run-1",
      "Hello Nicola",
      gatewayResult
    );

    expect(failRunByIdMock).not.toHaveBeenCalled();
  });

  it("marks the run as failed when the LLM gateway throws", async () => {
    claimRunByIdMock.mockResolvedValueOnce(createClaimedRun());

    generateWithTrackedLlmGatewayMock.mockRejectedValueOnce(
      new Error("Provider offline")
    );

    const processed = await processBaseRunById("run-1");

    expect(processed).toBe(true);

    expect(failRunByIdMock).toHaveBeenCalledWith("run-1", {
      code: "llm_failed",
      message: "Provider offline",
    });

    expect(completeRunByIdMock).not.toHaveBeenCalled();
  });

  it("does nothing when the run was already claimed", async () => {
    claimRunByIdMock.mockResolvedValueOnce(undefined);

    const processed = await processBaseRunById("run-1");

    expect(processed).toBe(false);

    expect(generateWithTrackedLlmGatewayMock).not.toHaveBeenCalled();
    expect(completeRunByIdMock).not.toHaveBeenCalled();
    expect(failRunByIdMock).not.toHaveBeenCalled();
  });
});
