// ============================================================
// chat/__tests__/intent_snapshot_test.ts
// Offline Construction Brain parity baseline.
//
// Runs `classifyIntentHeuristic` against every scenario in scenarios.ts and
// diffs the FULL {intent, filters} output against a committed snapshot per
// scenario. Any drift — intent name, added/removed filter, date-window
// change, project-name resolution, aggregate detection — fails CI.
//
// Modes:
//   PARITY_MODE=capture  → (re-)write snapshots (only when Brain behaviour
//                          intentionally changes; commit the diff for review).
//   default              → verify (fail on drift).
//
// Runs offline — no network, no auth, safe on every commit.
// ============================================================
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classifyIntentHeuristic } from "../intents/classifyIntent.ts";
import { SCENARIOS } from "./scenarios.ts";

const MODE = (Deno.env.get("PARITY_MODE") ?? "verify") as "capture" | "verify";
const SNAP_DIR = new URL("./snapshots/intent/", import.meta.url);

// Normalize date filters — extractDateWindow uses the current date, so
// pinning raw values would flap daily. We snapshot the *shape* instead
// (whether the classifier decided to emit a window and whether it was
// a single-day window).
function normalizeFilters(f: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...f };
  if (out.date_from || out.date_to) {
    out.date_from = out.date_from ? "<date>" : null;
    out.date_to = out.date_to ? "<date>" : null;
    out.date_window_single_day =
      typeof f.date_from === "string" && f.date_from === f.date_to;
  }
  return out;
}

async function readSnapshot(id: string): Promise<unknown | null> {
  try {
    const raw = await Deno.readTextFile(new URL(`${id}.json`, SNAP_DIR));
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
async function writeSnapshot(id: string, payload: unknown) {
  try { await Deno.mkdir(SNAP_DIR, { recursive: true }); } catch { /* exists */ }
  await Deno.writeTextFile(
    new URL(`${id}.json`, SNAP_DIR),
    JSON.stringify(payload, null, 2) + "\n",
  );
}

for (const s of SCENARIOS) {
  Deno.test(`intent snapshot: ${s.id}`, async () => {
    const { intent, filters, confident } =
      classifyIntentHeuristic(s.prompt, s.projectNames);
    const snapshot = {
      id: s.id,
      prompt: s.prompt,
      intent,
      confident,
      filters: normalizeFilters(filters ?? {}),
    };

    if (MODE === "capture") {
      await writeSnapshot(s.id, snapshot);
      return;
    }

    const baseline = await readSnapshot(s.id);
    if (!baseline) {
      throw new Error(
        `no baseline for ${s.id}. Run PARITY_MODE=capture once and commit ` +
        `supabase/functions/chat/__tests__/snapshots/intent/${s.id}.json`,
      );
    }
    assertEquals(snapshot, baseline, `Construction Brain behaviour drift on ${s.id}`);
  });
}
