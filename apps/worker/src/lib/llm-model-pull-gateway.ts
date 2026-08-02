import { env } from "@/config/env.js";

import {
  llmModelPullEventSchema,
  type LlmModelPullEvent,
} from "@/modules/llmModelPull/llmModelPull.schema.js";

const gatewayBaseUrl = env.LLM_GATEWAY_URL.replace(/\/+$/, "");

const maxBufferLength = 1024 * 1024;

export class LlmModelPullGatewayError extends Error {
  readonly status: number | null;

  constructor(
    message: string,
    status: number | null = null,
    options?: ErrorOptions
  ) {
    super(message, options);

    this.name = "LlmModelPullGatewayError";

    this.status = status;
  }
}

export class InvalidLlmModelPullStreamError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = "InvalidLlmModelPullStreamError";
  }
}

function parseEventLine(line: string): LlmModelPullEvent {
  let body: unknown;

  try {
    body = JSON.parse(line);
  } catch (error) {
    throw new InvalidLlmModelPullStreamError(
      "LLM gateway returned invalid NDJSON",
      {
        cause: error,
      }
    );
  }

  const result = llmModelPullEventSchema.safeParse(body);

  if (!result.success) {
    throw new InvalidLlmModelPullStreamError(
      "LLM gateway returned an invalid pull event",
      {
        cause: result.error,
      }
    );
  }

  return result.data;
}

export async function* streamLlmModelPull(
  provider: string,
  model: string,
  requestId: string
): AsyncGenerator<LlmModelPullEvent> {
  const url =
    `${gatewayBaseUrl}/v1/` + `${encodeURIComponent(provider)}/models/pull`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",

      headers: {
        Accept: "application/x-ndjson",

        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        request_id: requestId,

        model,
      }),
    });
  } catch (error) {
    throw new LlmModelPullGatewayError(
      "Unable to reach the LLM gateway",
      null,
      {
        cause: error,
      }
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");

    throw new LlmModelPullGatewayError(
      body.slice(0, 1_000) ||
        `LLM gateway rejected the pull with status ${response.status}`,
      response.status
    );
  }

  if (!response.body) {
    throw new InvalidLlmModelPullStreamError(
      "LLM gateway returned an empty pull stream"
    );
  }

  const reader = response.body.getReader();

  const decoder = new TextDecoder();

  let buffer = "";

  let terminalEventReceived = false;

  try {
    while (true) {
      const chunk = await reader.read();

      if (chunk.value) {
        buffer += decoder.decode(chunk.value, {
          stream: true,
        });
      }

      if (chunk.done) {
        buffer += decoder.decode();
      }

      if (buffer.length > maxBufferLength) {
        throw new InvalidLlmModelPullStreamError(
          "LLM gateway pull stream buffer exceeded its limit"
        );
      }

      let newlineIndex = buffer.indexOf("\n");

      while (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();

        buffer = buffer.slice(newlineIndex + 1);

        if (line) {
          const event = parseEventLine(line);

          if (
            event.request_id !== requestId ||
            event.provider !== provider ||
            event.model !== model
          ) {
            throw new InvalidLlmModelPullStreamError(
              "LLM gateway pull event does not match the request"
            );
          }

          if (event.type === "completed" || event.type === "failed") {
            terminalEventReceived = true;
          }

          yield event;

          if (terminalEventReceived) {
            return;
          }
        }

        newlineIndex = buffer.indexOf("\n");
      }

      if (chunk.done) {
        break;
      }
    }

    const finalLine = buffer.trim();

    if (finalLine) {
      const event = parseEventLine(finalLine);

      if (
        event.request_id !== requestId ||
        event.provider !== provider ||
        event.model !== model
      ) {
        throw new InvalidLlmModelPullStreamError(
          "LLM gateway pull event does not match the request"
        );
      }

      terminalEventReceived =
        event.type === "completed" || event.type === "failed";

      yield event;
    }

    if (!terminalEventReceived) {
      throw new InvalidLlmModelPullStreamError(
        "LLM gateway pull stream ended without a terminal event"
      );
    }
  } finally {
    await reader.cancel().catch(() => undefined);

    reader.releaseLock();
  }
}
