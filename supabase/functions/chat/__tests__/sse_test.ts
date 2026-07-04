// ============================================================
// chat/__tests__/sse_test.ts
// Unit tests for the SSE + block-marker parser.
// These lock down the parser itself so parity_test.ts diffs are trustworthy.
// ============================================================

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractBlocks, normalizeVolatile, parseSseBody } from "./sse.ts";

Deno.test("extractBlocks: parses ::summary JSON payload", () => {
  const text = 'Merhaba. ::summary ```json\n{"headline":"ok","projects":3}\n```';
  const { blocks, markers } = extractBlocks(text);
  assert(markers.includes("::summary"));
  assertEquals((blocks["::summary"] as Record<string, unknown>).headline, "ok");
});

Deno.test("extractBlocks: parses multiple markers", () => {
  const text = '::table {"rows":[]}\n::queries {"sql":"select 1"}';
  const { markers } = extractBlocks(text);
  assert(markers.includes("::table"));
  assert(markers.includes("::queries"));
});

Deno.test("extractBlocks: records marker even if payload missing", () => {
  const text = "Selam ::actions ... incomplete";
  const { markers } = extractBlocks(text);
  assert(markers.includes("::actions"));
});

Deno.test("normalizeVolatile: strips timestamps and uuids", () => {
  const input = {
    id: "b1a2c3d4-1111-2222-3333-444455556666",
    created_at: "2026-01-15T10:22:33.000Z",
    label: "call at 2026-01-15T10:22:33Z",
    nested: [{ trace_id: "x", value: 42 }],
  };
  const out = normalizeVolatile(input) as Record<string, unknown>;
  assertEquals(out.id, "<normalized>");
  assertEquals(out.created_at, "<normalized>");
  assertEquals(out.label, "call at <iso-date>");
  assertEquals((out.nested as any[])[0].trace_id, "<normalized>");
  assertEquals((out.nested as any[])[0].value, 42);
});

Deno.test("parseSseBody: assembles OpenAI-style delta stream", () => {
  const body = [
    'data: {"choices":[{"delta":{"content":"Hel"}}]}',
    'data: {"choices":[{"delta":{"content":"lo"}}]}',
    "data: [DONE]",
  ].join("\n\n");
  const parsed = parseSseBody(body);
  assertEquals(parsed.text, "Hello");
  assertEquals(parsed.frames.length, 2);
});
