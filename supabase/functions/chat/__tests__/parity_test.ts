// ============================================================
// chat/__tests__/parity_test.ts
// End-to-end parity harness — captures + diffs streamed /chat responses.
//
// This test is OPT-IN. It only runs when:
//   PARITY_CHAT_URL   — full https URL of the deployed chat function
//   PARITY_CHAT_TOKEN — Bearer token of a test user (Supabase access_token)
//
// Without those env vars the test emits a skipped result so CI stays green.
//
// Modes:
//   PARITY_MODE=capture   — write a fresh baseline snapshot per scenario
//   PARITY_MODE=verify    — (default) compare against existing snapshots
//
// Snapshots live in __tests__/snapshots/<scenario-id>.json and record:
//   - normalized markers (order preserved)
//   - normalized block payloads
// Raw text is intentionally NOT diffed — LLM wording drifts, structure must not.
// ============================================================

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { SCENARIOS, type Scenario } from "./scenarios.ts";
import { parseSseBody } from "./sse.ts";

const CHAT_URL = Deno.env.get("PARITY_CHAT_URL");
const CHAT_TOKEN = Deno.env.get("PARITY_CHAT_TOKEN");
const MODE = (Deno.env.get("PARITY_MODE") ?? "verify") as "capture" | "verify";

const SNAPSHOT_DIR = new URL("./snapshots/", import.meta.url);

async function callChat(s: Scenario): Promise<string> {
  const messages =
    s.history ??
    [{ role: "user", content: s.prompt }];
  const res = await fetch(CHAT_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CHAT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      voice: s.voice ?? false,
      // The harness never mutates data — read-only turns only.
      dry_run: true,
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`chat call failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return body;
}

async function readSnapshot(id: string): Promise<any | null> {
  try {
    const path = new URL(`${id}.json`, SNAPSHOT_DIR);
    const raw = await Deno.readTextFile(path);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeSnapshot(id: string, payload: unknown) {
  try {
    await Deno.mkdir(SNAPSHOT_DIR, { recursive: true });
  } catch { /* exists */ }
  const path = new URL(`${id}.json`, SNAPSHOT_DIR);
  await Deno.writeTextFile(path, JSON.stringify(payload, null, 2) + "\n");
}

if (!CHAT_URL || !CHAT_TOKEN) {
  Deno.test({
    name: "parity: SKIPPED (set PARITY_CHAT_URL + PARITY_CHAT_TOKEN to enable)",
    ignore: true,
    fn: () => {},
  });
} else {
  for (const s of SCENARIOS) {
    Deno.test(`parity: ${s.id} — ${s.description}`, async () => {
      const body = await callChat(s);
      const parsed = parseSseBody(body);

      // Every scenario must at least produce a non-empty stream.
      assert(parsed.frames.length > 0, "no SSE frames received");

      // Assert required block markers are present.
      for (const marker of s.expectBlocks ?? []) {
        assert(
          parsed.markers.includes(marker),
          `missing block ${marker}. saw: ${parsed.markers.join(",")}`,
        );
      }

      const snapshot = {
        id: s.id,
        markers: parsed.markers,
        blocks: parsed.blocks,
      };

      if (MODE === "capture") {
        await writeSnapshot(s.id, snapshot);
        return;
      }

      const baseline = await readSnapshot(s.id);
      if (!baseline) {
        throw new Error(
          `no baseline snapshot for ${s.id}. Run once with PARITY_MODE=capture.`,
        );
      }
      // Order-sensitive marker diff — reordering a block IS a behaviour change.
      assertEquals(parsed.markers, baseline.markers, "marker sequence drift");
      // Structural block diff (volatile fields already normalized in parser).
      assertEquals(parsed.blocks, baseline.blocks, "block payload drift");
    });
  }
}
