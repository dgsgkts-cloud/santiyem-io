# Construction Brain — Verification Harness (Sprint 8.2)

Automated parity tests that MUST pass before any further extraction of
`supabase/functions/chat/index.ts`. Written before the refactor so the
current behaviour is the baseline.

## Layout

```
__tests__/
  scenarios.ts             # 14 canonical fixtures (contract — do not weaken)
  sse.ts                   # SSE + ::block marker parser
  sse_test.ts              # locks the parser itself
  classifyIntent_test.ts   # pure-function intent parity (runs offline)
  parity_test.ts           # end-to-end SSE snapshot diff (opt-in)
  snapshots/               # per-scenario baseline (created on first capture)
```

## What each layer proves

| Layer                     | Signal it guards                                          | Runs by default |
|---------------------------|-----------------------------------------------------------|-----------------|
| `classifyIntent_test.ts`  | Intent name + sticky project + date-window filters        | Yes             |
| `sse_test.ts`             | Snapshot parser itself (marker extraction, normalization) | Yes             |
| `parity_test.ts`          | Full streamed response: markers, block payloads (JSON)    | Opt-in via env  |

## Scenarios covered

`01-general-qa`, `02-project-status`, `03-executive-brief`, `04-finance-summary`,
`05-finance-overdue`, `06-personnel-live`, `07-attendance`, `08-company-memory`,
`09-knowledge-base`, `10-voice-mode`, `11-action-generation`, `12-explainability`,
`13-ui-payload-chart`, `14-sticky-project`.

For each scenario the harness verifies:

- **Intent classification** — `classifyIntentHeuristic` result.
- **SQL / retrieved rows** — surfaced via the `::queries` block payload.
- **Retrieved memories** — `::memories` block payload.
- **Retrieved documents** — `::documents` block payload.
- **UI payload** — `::summary` / `::table` / `::chart` / `::kpi` block payloads.
- **Actions payload** — `::actions` block payload.
- **Explainability payload** — `::queries` / `::memories` / `::documents`.
- **Streaming format** — raw SSE frame shape (data + `[DONE]`).

Volatile fields (ids, timestamps, uuids) are normalized in `sse.ts` so
snapshots stay stable across runs; anything that differs is a real drift.

## Running

Offline (safe on every commit):

```bash
deno test supabase/functions/chat/__tests__/classifyIntent_test.ts \
          supabase/functions/chat/__tests__/sse_test.ts
```

End-to-end parity (once, to establish a baseline before refactoring):

```bash
PARITY_CHAT_URL="https://<project>.functions.supabase.co/chat" \
PARITY_CHAT_TOKEN="<user-jwt>" \
PARITY_MODE=capture \
deno test --allow-net --allow-env --allow-read --allow-write \
  supabase/functions/chat/__tests__/parity_test.ts
```

After that, verify (default):

```bash
PARITY_CHAT_URL=... PARITY_CHAT_TOKEN=... \
deno test --allow-net --allow-env --allow-read \
  supabase/functions/chat/__tests__/parity_test.ts
```

Without the env vars the parity suite emits a `SKIPPED` result so CI never
false-fails.

## Rules

- **Never edit `expectIntent` / `expectBlocks` to make a failing test pass.**
  A failure means the refactor changed behaviour — stop, diff, decide.
- **Never delete a scenario.** Only add.
- **Never point `PROJECTS` at the live DB.** The fixture must be stable
  across time and environments.
- The harness is read-only: `parity_test.ts` sends `dry_run: true` so
  no data is mutated.

## Extending

To add a scenario, append to `SCENARIOS` in `scenarios.ts` and re-run
`PARITY_MODE=capture` once.
