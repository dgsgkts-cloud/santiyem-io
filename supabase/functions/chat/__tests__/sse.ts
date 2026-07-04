// ============================================================
// chat/__tests__/sse.ts
// Minimal SSE + block-marker parser used by the parity harness.
//
// The Construction Brain streams a series of `data: <chunk>\n\n` frames
// terminated by `data: [DONE]`. Assistant text may include inline block
// markers (::summary, ::table, ::chart, ::kpi, ::queries, ::memories,
// ::documents, ::actions) each followed by a fenced JSON payload.
//
// This module extracts:
//   - `text`   — the raw assembled text stream
//   - `blocks` — a map of markerName -> parsed JSON payload (or raw string
//                when the payload isn't valid JSON)
//   - `frames` — the ordered list of raw SSE data frames (for byte-diff)
//
// Volatile fields (timestamps, UUIDs, generated-at, request_id) are
// normalized so snapshots stay stable across runs.
// ============================================================

export interface ParsedStream {
  text: string;
  frames: string[];
  blocks: Record<string, unknown>;
  markers: string[];
}

const VOLATILE_KEYS = new Set([
  "id",
  "request_id",
  "requestId",
  "generated_at",
  "generatedAt",
  "created_at",
  "createdAt",
  "updated_at",
  "updatedAt",
  "timestamp",
  "ts",
  "trace_id",
  "traceId",
]);

const ISO_DATE_RE = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b/g;
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

export function normalizeVolatile<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((v) => normalizeVolatile(v)) as unknown as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (VOLATILE_KEYS.has(k)) {
        out[k] = "<normalized>";
      } else {
        out[k] = normalizeVolatile(v);
      }
    }
    return out as unknown as T;
  }
  if (typeof value === "string") {
    return value
      .replace(ISO_DATE_RE, "<iso-date>")
      .replace(UUID_RE, "<uuid>") as unknown as T;
  }
  return value;
}

/** Parse the raw SSE body of a /chat response. */
export function parseSseBody(body: string): ParsedStream {
  const frames: string[] = [];
  const parts: string[] = [];

  for (const rawLine of body.split(/\r?\n/)) {
    if (!rawLine.startsWith("data:")) continue;
    const payload = rawLine.slice(5).trim();
    if (payload === "[DONE]" || payload === "") continue;
    frames.push(payload);

    // Frames may be JSON envelopes (OpenAI-style) or plain text deltas.
    try {
      const j = JSON.parse(payload);
      // Common shapes: { choices:[{delta:{content:"..."}}] } or { delta: "..." }
      const delta =
        j?.choices?.[0]?.delta?.content ??
        j?.choices?.[0]?.message?.content ??
        j?.delta ??
        j?.content ??
        null;
      if (typeof delta === "string") parts.push(delta);
      else parts.push(payload);
    } catch {
      parts.push(payload);
    }
  }

  const text = parts.join("");
  return {
    text,
    frames,
    ...extractBlocks(text),
  };
}

/**
 * Scan assembled text for `::marker` fenced JSON blocks. Fence forms accepted:
 *   ::summary\n```json\n{...}\n```
 *   ::summary {...}
 *   ::summary\n{...}\n::endsummary   (legacy)
 */
export function extractBlocks(text: string): { blocks: Record<string, unknown>; markers: string[] } {
  const markers: string[] = [];
  const blocks: Record<string, unknown> = {};

  const re = /::([a-zA-Z_]+)\s*(?:```(?:json)?\s*)?({[\s\S]*?}|\[[\s\S]*?\])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const name = "::" + m[1].toLowerCase();
    markers.push(name);
    try {
      blocks[name] = normalizeVolatile(JSON.parse(m[2]));
    } catch {
      blocks[name] = m[2];
    }
  }

  // Also record markers even if we couldn't parse the payload (defensive:
  // covers streamed / partial-fragment cases where a block starts but its
  // JSON body was chunked across frames).
  const markerOnly = /::(summary|table|chart|kpi|queries|memories|documents|actions)\b/gi;
  while ((m = markerOnly.exec(text)) !== null) {
    const name = "::" + m[1].toLowerCase();
    if (!markers.includes(name)) markers.push(name);
  }

  return { blocks, markers };
}
