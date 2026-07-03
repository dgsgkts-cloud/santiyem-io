
## Goal

Bring `query_project_data` (voice mode call into the `chat` edge function) from ~4–5s down to a target <2s average, without regressing the web chat experience.

## Where the time goes today

In voice mode the function currently runs, sequentially:

1. **Action Assistant regex check + auth `getClaims`** — even for pure read queries, we always fetch a user token here.
2. **Construction Brain: intent classifier LLM call** — a full `google/gemini-2.5-flash-lite` JSON call just to parse Turkish intent (~800–1500 ms).
3. **DB queries** — several `.select()` calls with `limit=25`, plus supplementary aggregate queries (top_by_recipient, project_expenses totals, material entries join) — mostly fine, but oversized for a voice reply.
4. **Voice LLM call** — `google/gemini-2.5-flash` with the huge `SYSTEM_PROMPT` + RAG + project data context, `max_tokens: 400`, non-streaming (~2–3s).
5. Action Assistant is even entered when the user just asked a read question, because the regex matches words like "ödeme yap".

Steps 2 and 4 dominate; step 1 and 5 add avoidable overhead on the voice path.

## Plan

### 1. Short-circuit the voice path early

At the top of the handler, when `voice_mode === true`:

- Skip the Action Assistant block entirely (voice tool calls from ElevenLabs are always reads).
- Do the auth `getClaims` **once** and reuse the user id for the Brain.
- Skip the RAG/global-docs context assembly for voice (only project data is needed).

### 2. Replace the intent-classifier LLM call with a heuristic first pass

Add a regex/keyword classifier for the 9 intents (`PAYMENT_QUERY`, `HAKEDIS_QUERY`, `PROJECT_QUERY`, `TASK_QUERY`, `SITE_DIARY_QUERY`, `DOCUMENT_QUERY`, `MATERIAL_QUERY`, `CONTRACT_QUERY`, `PERSONNEL_QUERY`). It also extracts:

- date windows for "bu ay / geçen ay / bu hafta / bugün / dün"
- `aggregate` for "toplam / ne kadar / en çok / en son"
- `project_name` when the query includes a known project name (matched against a cached list — see step 4)

Only fall back to the flash-lite LLM classifier when the heuristic is uncertain (unknown intent AND query length > 6 words). Expected: ~90% of voice questions bypass the LLM classifier, saving ~1s.

### 3. Trim DB work for voice mode

When `voice_mode` is true:

- Cap `limit` at 5 (voice summaries never read more than a handful of rows).
- Skip the extra `top_by_recipient` aggregation query, the `project_expenses` sum-loop in `PROJECT_QUERY`, and the material-entries join fan-out.
- Keep grand totals via a single `head: true, count: 'exact'` or a `sum` aggregation when the user asked for a total.
- Select only the fields voice actually reads (drop unused columns like `payment_method`, `bank_name`, `weather_icon`, etc.).

### 4. In-memory caches (per warm isolate)

Add small TTL maps at module scope:

- `projectListCache`: `user_id → { rows, expiresAt }` (60s). Used for name→id resolution and for the heuristic project-name matcher, replacing the current per-request `projects` ilike query.
- `brainCache`: `sha1(user_id + '|' + voice + '|' + normalizedQuery) → { context, expiresAt }` (30s). If the exact same voice question is asked twice quickly (very common when ElevenLabs retries), return the cached context and skip both the classifier and the DB round-trips.

Caches live only in the warm edge isolate; no external cache infra.

### 5. Lean voice LLM call

- Switch the voice generation model to `google/gemini-2.5-flash-lite` (the same tier already used for intent) — it's noticeably faster and adequate for 2–3 sentence spoken replies.
- Send a compact voice-only system prompt (~15 lines: identity + spoken-Turkish rules) instead of the full 200-line `SYSTEM_PROMPT`. Project data context still gets injected.
- Drop `max_tokens` from 400 → 220. Voice replies are short by design.
- Only include the **last 4 messages** of history in `formattedMessages` for voice mode (ElevenLabs already summarizes context server-side).

### 6. Parallelize the two remaining awaits

Where safe, run the project-name resolution and the intent-specific query in parallel using `Promise.all` (only when the query does not need `project_id` to build itself, e.g. `DOCUMENT_QUERY`, `PERSONNEL_QUERY`).

### 7. Observability

Add lightweight timing logs (`console.time`/`timeEnd` around: auth, classifier, db, llm) gated behind `voiceMode` so we can confirm the <2s target from edge logs.

## Non-goals

- No change to the streaming web chat path, action tool-calling, confirmation flow, or system prompt used for the web experience.
- No change to the ElevenLabs client tool schema or the 20s client-side timeout.
- No new tables, migrations, or external caches.

## Technical notes

- All changes are inside `supabase/functions/chat/index.ts`. No new files.
- Heuristic classifier lives in a helper `classifyIntentHeuristic(query, projectNames)` returning `{ intent, filters, confident }`.
- Caches are `Map`s at module scope; entries are size-capped (e.g. 200) with simple LRU-ish eviction on insert.
- Model swap is a one-line change; keep flash-2.5 as fallback if flash-lite returns a 5xx.

## Expected result

- Warm voice call: heuristic classify (~5 ms) + 1 small DB round-trip (~150–300 ms) + flash-lite generation (~800–1200 ms) ≈ **1.0–1.5s**.
- Cold call (first request per isolate): +~200 ms auth/init, still under 2s.
- Cached repeat within 30s: ~700 ms (single LLM call, no DB).
