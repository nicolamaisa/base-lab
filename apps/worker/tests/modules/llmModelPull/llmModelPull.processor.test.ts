import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LlmModelPullEvent } from "@/modules/llmModelPull/llmModelPull.schema.js";

/*
 * Simuliamo il gateway senza importare la configurazione reale
 * dell'applicazione.
 *
 * Manteniamo anche le due classi di errore usate dal processor
 * per distinguere i diversi fallimenti.
 */
vi.mock("@/lib/llm-model-pull-gateway.js", () => {
  class LlmModelPullGatewayError extends Error {
    readonly status: number | null;

    constructor(message: string, status: number | null = null) {
      super(message);

      this.name = "LlmModelPullGatewayError";
      this.status = status;
    }
  }

  class InvalidLlmModelPullStreamError extends Error {
    constructor(message: string) {
      super(message);

      this.name = "InvalidLlmModelPullStreamError";
    }
  }

  return {
    streamLlmModelPull: vi.fn(),
    LlmModelPullGatewayError,
    InvalidLlmModelPullStreamError,
  };
});

vi.mock("@/modules/llmModelPull/llmModelPull.repository.js", () => ({
  claimLlmModelPullById: vi.fn(),
  setLlmModelPullRequestId: vi.fn(),
  updateLlmModelPullProgress: vi.fn(),
  completeLlmModelPull: vi.fn(),
  failLlmModelPull: vi.fn(),
}));

vi.mock("@/lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}));

import { streamLlmModelPull } from "@/lib/llm-model-pull-gateway.js";

import {
  claimLlmModelPullById,
  completeLlmModelPull,
  failLlmModelPull,
  setLlmModelPullRequestId,
  updateLlmModelPullProgress,
} from "@/modules/llmModelPull/llmModelPull.repository.js";

import { processLlmModelPullById } from "@/modules/llmModelPull/llmModelPull.processor.js";

const requestId = "11111111-1111-4111-8111-111111111111";

const streamLlmModelPullMock = vi.mocked(streamLlmModelPull);

const claimLlmModelPullByIdMock = vi.mocked(claimLlmModelPullById);

const setLlmModelPullRequestIdMock = vi.mocked(setLlmModelPullRequestId);

const updateLlmModelPullProgressMock = vi.mocked(updateLlmModelPullProgress);

const completeLlmModelPullMock = vi.mocked(completeLlmModelPull);

const failLlmModelPullMock = vi.mocked(failLlmModelPull);

type ClaimedPull = NonNullable<
  Awaited<ReturnType<typeof claimLlmModelPullById>>
>;

function createClaimedPull(overrides: Partial<ClaimedPull> = {}): ClaimedPull {
  const now = new Date("2026-01-01T12:00:00.000Z");

  return {
    completed_at: null,
    created_at: now,

    error_code: null,
    error_message: null,

    gateway_request_id: requestId,

    id: "pull-1",

    layer_completed_bytes: null,
    layer_digest: null,
    layer_percent: null,
    layer_total_bytes: null,

    metadata: {},

    model_key: "llama3.2:3b",
    owner_id: "user-1",

    progress_status: null,
    provider: "ollama",

    started_at: now,
    status: "running",
    updated_at: now,

    ...overrides,
  } satisfies ClaimedPull;
}

async function* createEventStream(
  events: LlmModelPullEvent[]
): AsyncGenerator<LlmModelPullEvent> {
  for (const event of events) {
    yield event;
  }
}

describe("processLlmModelPullById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tracks progress and completes the model pull", async () => {
    const progressEvent = {
      type: "progress",

      request_id: requestId,
      provider: "ollama",
      model: "llama3.2:3b",

      status: "downloading",

      digest: "sha256:abc123",
      completed_bytes: 50,
      total_bytes: 100,
      percent: 50,
    } satisfies LlmModelPullEvent;

    const completedEvent = {
      type: "completed",

      request_id: requestId,
      provider: "ollama",
      model: "llama3.2:3b",

      status: "success",

      completed_bytes: 100,
      total_bytes: 100,
      percent: 100,
    } satisfies LlmModelPullEvent;

    claimLlmModelPullByIdMock.mockResolvedValueOnce(createClaimedPull());

    streamLlmModelPullMock.mockReturnValueOnce(
      createEventStream([progressEvent, completedEvent])
    );

    const processed = await processLlmModelPullById("pull-1");

    expect(processed).toBe(true);

    expect(setLlmModelPullRequestIdMock).toHaveBeenCalledWith(
      "pull-1",
      requestId
    );

    expect(streamLlmModelPullMock).toHaveBeenCalledWith(
      "ollama",
      "llama3.2:3b",
      requestId
    );

    expect(updateLlmModelPullProgressMock).toHaveBeenCalledWith(
      "pull-1",
      progressEvent
    );

    expect(completeLlmModelPullMock).toHaveBeenCalledWith(
      "pull-1",
      completedEvent
    );

    expect(failLlmModelPullMock).not.toHaveBeenCalled();
  });

  it("records a failed event returned by the gateway", async () => {
    const failedEvent = {
      type: "failed",

      request_id: requestId,
      provider: "ollama",
      model: "llama3.2:3b",

      status: "failed",

      error_code: "model_not_found",
      message: "The requested model does not exist",
    } satisfies LlmModelPullEvent;

    claimLlmModelPullByIdMock.mockResolvedValueOnce(createClaimedPull());

    streamLlmModelPullMock.mockReturnValueOnce(
      createEventStream([failedEvent])
    );

    const processed = await processLlmModelPullById("pull-1");

    expect(processed).toBe(true);

    expect(failLlmModelPullMock).toHaveBeenCalledWith("pull-1", {
      code: "model_not_found",
      message: "The requested model does not exist",
    });

    expect(completeLlmModelPullMock).not.toHaveBeenCalled();
  });

  it("fails when the stream ends without a terminal event", async () => {
    const progressEvent = {
      type: "progress",

      request_id: requestId,
      provider: "ollama",
      model: "llama3.2:3b",

      status: "downloading",

      digest: "sha256:abc123",
      completed_bytes: 25,
      total_bytes: 100,
      percent: 25,
    } satisfies LlmModelPullEvent;

    claimLlmModelPullByIdMock.mockResolvedValueOnce(createClaimedPull());

    streamLlmModelPullMock.mockReturnValueOnce(
      createEventStream([progressEvent])
    );

    const processed = await processLlmModelPullById("pull-1");

    expect(processed).toBe(true);

    expect(updateLlmModelPullProgressMock).toHaveBeenCalledWith(
      "pull-1",
      progressEvent
    );

    expect(failLlmModelPullMock).toHaveBeenCalledWith("pull-1", {
      code: "invalid_llm_model_pull_stream",
      message: "LLM model pull ended unexpectedly",
    });

    expect(completeLlmModelPullMock).not.toHaveBeenCalled();
  });
});
