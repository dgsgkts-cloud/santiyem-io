
# Sprint 8.1 — Construction Brain Modularization

Pure refactor of `supabase/functions/chat/index.ts` (2,485 lines) into the target module layout. **Zero behavior change**: same prompts (byte-for-byte), same intent flow, same DB queries, same streamed output, same action schemas, same error paths.

## Guardrails

- No prompt edits — the `SYSTEM_PROMPT` (lines 167–685), voice prompt (~2279), action prompt (~2175), and every embedded fragment are moved verbatim.
- No new dependencies, no runtime shape changes to the request/response contract.
- No touching VoiceCopilot, Executive Dashboard, Company Memory (features), Knowledge Base features — only the chat function internals.
- Public HTTP contract (`Deno.serve` handler in `index.ts`, SSE stream format, headers) stays identical.

## Target layout

```text
supabase/functions/chat/
  index.ts                       # thin entry: CORS, auth, request parse, orchestration
  prompt/
    systemPrompt.ts              # SYSTEM_PROMPT verbatim
    voicePrompt.ts               # voice-mode lean prompt verbatim
    explainabilityPrompt.ts      # explainability instructions extracted from SYSTEM_PROMPT tail
    fragments.ts                 # shared reusable snippets referenced by the above
  intents/
    classifyIntent.ts            # classifyIntentHeuristic + extractPriorProject
    types.ts                     # IntentName, IntentContext, IntentResult
    registry.ts                  # name -> handler map (single source of truth)
    handlers/
      projectStatus.ts
      financeQuery.ts
      hakedisQuery.ts
      subcontractorQuery.ts
      siteDiaryQuery.ts
      knowledgeQuery.ts
      generalChat.ts             # fallback
      # ...one file per intent already present in current if/else
  retrieval/
    companyMemory.ts             # memory fetch + memoryContext string builder
    knowledgeBase.ts             # RAG search + ragContext builder
    projectData.ts               # DB pulls for project/finance/hakedis/etc.
    executiveContext.ts          # dashboard/exec brief context (read-only)
  actions/
    buildActions.ts              # ACTION_SYSTEM builder + tool-loop wiring
    actionSchemas.ts             # JSON schemas for exposed tools
  ui/
    buildUiPayload.ts            # ::summary/::table/::chart block assembly helpers
  explainability/
    buildExplainability.ts       # ::queries/::memories/::documents block assembly
  streaming/
    streamResponse.ts            # SSE writer, delta chunking, [DONE], abort handling
  tools/
    queryProjectData.ts          # supabase-side tool implementations invoked by the model
  utils/
    parsing.ts                   # normalizeQuery, extractDateWindow, cacheGet/cacheSet, JSON parsers
    formatting.ts                # currency/date/number formatters used inside prompts & payloads
    validation.ts                # zod schemas for incoming request body + tool args
```

## Phased execution

Each phase is a self-contained edit set that leaves the function green. I stop between phases only if signals fail.

1. **Scaffold + utils extraction (safe)**
   - Create `utils/parsing.ts`, `utils/formatting.ts`, `utils/validation.ts`.
   - Move `cacheGet/cacheSet`, `normalizeQuery`, `extractDateWindow`, small helpers.
   - `index.ts` imports them; no logic changes.

2. **Prompt extraction**
   - Move `SYSTEM_PROMPT` (167–685) into `prompt/systemPrompt.ts` as `export const SYSTEM_PROMPT`.
   - Move voice-mode prompt (~2279) to `prompt/voicePrompt.ts`.
   - Move explainability tail instructions to `prompt/explainabilityPrompt.ts`; re-compose the exact same string in `systemPrompt.ts` so the concatenated prompt is byte-identical.
   - Diff check: run a script that reconstructs the pre-refactor string and asserts equality.

3. **Retrieval modules**
   - Move memory fetch + `memoryContext` builder → `retrieval/companyMemory.ts`.
   - Move RAG search + `ragContext` builder → `retrieval/knowledgeBase.ts`.
   - Move project/finance/hakedis DB reads + `projectDataContext` builder → `retrieval/projectData.ts`.
   - Executive/dashboard context → `retrieval/executiveContext.ts`.

4. **Intent registry**
   - Move `classifyIntentHeuristic` + `extractPriorProject` → `intents/classifyIntent.ts`.
   - Extract each branch of the current handling block into `intents/handlers/<name>.ts` implementing a shared `IntentHandler` signature: `(ctx: IntentContext) => Promise<IntentResult>`.
   - `intents/registry.ts` maps intent name → handler; `index.ts` looks up + invokes.

5. **Actions module**
   - Move `ACTION_SYSTEM` + tool-loop into `actions/buildActions.ts`, schemas into `actions/actionSchemas.ts`.

6. **UI + explainability builders**
   - Extract the `::summary` / `::table` / `::chart` / `::kpi` block builders into `ui/buildUiPayload.ts`.
   - Extract `::queries` / `::memories` / `::documents` builders into `explainability/buildExplainability.ts`.

7. **Streaming**
   - Move SSE writer, chunk framing, `[DONE]`, abort handling → `streaming/streamResponse.ts`.

8. **Thin `index.ts`**
   - Final `index.ts`: CORS preflight, JWT check, body parse (via `utils/validation.ts`), classify → registry lookup → handler → stream. Target < 200 lines.

## Verification (must pass before ship)

- **Prompt equality**: a Deno test asserts `assembledSystemPrompt === legacySystemPrompt` (snapshot of pre-refactor string).
- **Type check**: `tsgo` clean over `supabase/functions/chat/**`.
- **Edge function smoke tests** via `supabase--test_edge_functions` for chat: intent classification, RAG path, memory path, action path, voice path — asserting the same block markers appear in the response.
- **Live smoke** in the preview: one project-status question, one finance question, one action-mode ("hakediş oluştur"), one voice request — compare streamed output shape to a pre-refactor capture.

## Notes / trade-offs

- Total edit volume is large but mechanical. I will do it in the phases above rather than a single mega-edit so any regression is bisectable to one phase.
- The `intents/handlers/` file list will match whatever branches actually exist in the current control flow — I finalize that list during Phase 4 after mapping every branch; the plan does not invent intents.
- No changes to `supabase/config.toml`, no new secrets, no DB migrations.

## Out of scope (explicit)

- Any prompt wording change, even whitespace normalization.
- Any change to Voice, Executive Dashboard, Company Memory UI, Knowledge Base UI, Communication Hub, or WhatsApp provider.
- Performance tuning, caching strategy changes, model swaps.
