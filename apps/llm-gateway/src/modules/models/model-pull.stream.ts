import {
  modelPullEventSchema,
  ollamaPullChunkSchema,
  type ModelPullEvent,
  type OllamaPullChunk,
} from "./model.schema.js";

const MAX_BUFFER_LENGTH = 1_000_000;

export class InvalidModelPullStreamError extends Error {
  constructor() {
    super("Ollama returned an invalid model pull stream");

    this.name = "InvalidModelPullStreamError";
  }
}

function parseChunkLine(line: string): OllamaPullChunk {
  let body: unknown;

  try {
    body = JSON.parse(line);
  } catch {
    throw new InvalidModelPullStreamError();
  }

  const parsed = ollamaPullChunkSchema.safeParse(body);

  if (!parsed.success) {
    throw new InvalidModelPullStreamError();
  }

  return parsed.data;
}

export async function* parseOllamaPullStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<OllamaPullChunk> {
  const reader = stream.getReader();

  const decoder = new TextDecoder();

  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, {
        stream: true,
      });

      let newlineIndex = buffer.indexOf("\n");

      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();

        buffer = buffer.slice(newlineIndex + 1);

        if (line) {
          yield parseChunkLine(line);
        }

        newlineIndex = buffer.indexOf("\n");
      }

      if (buffer.length > MAX_BUFFER_LENGTH) {
        throw new InvalidModelPullStreamError();
      }
    }

    buffer += decoder.decode();

    const finalLine = buffer.trim();

    if (finalLine) {
      yield parseChunkLine(finalLine);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);

    throw error;
  } finally {
    reader.releaseLock();
  }
}

type ModelPullStreamContext = {
  requestId: string;
  model: string;
};

function calculatePercent(
  completedBytes: number | undefined,
  totalBytes: number | undefined
): number | null {
  if (
    completedBytes === undefined ||
    totalBytes === undefined ||
    totalBytes <= 0
  ) {
    return null;
  }

  return Math.min(
    100,
    Math.max(0, Math.round((completedBytes / totalBytes) * 100))
  );
}

export async function* normalizeOllamaPullStream(
  stream: ReadableStream<Uint8Array>,
  context: ModelPullStreamContext
): AsyncGenerator<ModelPullEvent> {
  let lastCompletedBytes: number | null = null;

  let lastTotalBytes: number | null = null;

  try {
    for await (const chunk of parseOllamaPullStream(stream)) {
      if (chunk.error) {
        yield modelPullEventSchema.parse({
          type: "failed",
          request_id: context.requestId,
          provider: "ollama",
          model: context.model,
          status: "failed",
          error_code: "provider_pull_failed",
          message: chunk.error,
        });

        return;
      }

      if (chunk.completed !== undefined) {
        lastCompletedBytes = chunk.completed;
      }

      if (chunk.total !== undefined) {
        lastTotalBytes = chunk.total;
      }

      if (chunk.status === "success") {
        yield modelPullEventSchema.parse({
          type: "completed",
          request_id: context.requestId,
          provider: "ollama",
          model: context.model,
          status: "success",
          completed_bytes: lastCompletedBytes,
          total_bytes: lastTotalBytes,
          percent: 100,
        });

        return;
      }

      yield modelPullEventSchema.parse({
        type: "progress",
        request_id: context.requestId,
        provider: "ollama",
        model: context.model,
        status: chunk.status ?? "pulling",
        digest: chunk.digest ?? null,
        completed_bytes: lastCompletedBytes,
        total_bytes: lastTotalBytes,
        percent: calculatePercent(chunk.completed, chunk.total),
      });
    }

    yield modelPullEventSchema.parse({
      type: "failed",
      request_id: context.requestId,
      provider: "ollama",
      model: context.model,
      status: "failed",
      error_code: "provider_pull_incomplete",
      message: "The provider pull stream ended before completion",
    });
  } catch (error) {
    const invalidStream = error instanceof InvalidModelPullStreamError;

    yield modelPullEventSchema.parse({
      type: "failed",
      request_id: context.requestId,
      provider: "ollama",
      model: context.model,
      status: "failed",
      error_code: invalidStream
        ? "invalid_provider_pull_stream"
        : "provider_pull_stream_failed",
      message: invalidStream
        ? error.message
        : "The provider pull stream was interrupted",
    });
  }
}
