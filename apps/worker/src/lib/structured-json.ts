export class StructuredJsonParseError extends Error {
  readonly rawContent: string;

  constructor(rawContent: string) {
    super("The model returned malformed JSON");

    this.name = "StructuredJsonParseError";

    this.rawContent = rawContent;
  }
}

export function parseStructuredJson(content: string): unknown {
  const trimmed = content.trim();

  const withoutCodeFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const objectStart = withoutCodeFence.indexOf("{");

  const objectEnd = withoutCodeFence.lastIndexOf("}");

  const extractedObject =
    objectStart >= 0 && objectEnd > objectStart
      ? withoutCodeFence.slice(objectStart, objectEnd + 1)
      : withoutCodeFence;

  const candidates = new Set([trimmed, withoutCodeFence, extractedObject]);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Prova il candidato successivo.
    }
  }

  throw new StructuredJsonParseError(content);
}
