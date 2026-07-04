# Sprint 13.1 — AI Canvas

Add a permanent **AI Canvas** surface that becomes the primary visual output for every AI turn (chat + voice). Reuse the existing `AIResponseRenderer`, `useAIResponse`, and `ActionExecutor`. No changes to Construction Brain, Company Brain, Executive Dashboard logic, VoiceCopilot conversation logic, prompts, or the renderer internals.

## Scope

Presentation-only. All new code lives in a new `src/components/canvas/` folder plus small wiring edits to the chat + voice UIs.

## Deliverables

### New: `src/components/canvas/`
- `AICanvas.tsx` — container that renders one canvas per turn (header, status, timeline, visuals, summary card, actions, sources, follow-ups).
- `CanvasHeader.tsx` — title, date range, project, records analysed, generated time. Never shows anonymous data (falls back to "Genel" only if all fields absent).
- `AIStatusBadge.tsx` — animated live status pill (Listening / Understanding / Searching / Reading Memory / Calculating / Preparing Charts / Speaking / Completed).
- `AIThinkingTimeline.tsx` — checkmark list of completed system operations (not chain-of-thought). Steps derived from response metadata + fallback heuristic on `ui` payload.
- `SummaryCard.tsx` — fallback card when no `ui` payload: Summary / Key Findings / Suggested Next Step / Related Modules.
- `SourcePanel.tsx` — evidence chips built from the existing explainability payload (`sources`, `evidence`, `records`). Read-only, no reasoning exposed.
- `SuggestedFollowups.tsx` — clickable follow-up chips; on click, dispatches `canvas-followup` CustomEvent picked up by chat input / voice.
- `ExpandableVisual.tsx` — wraps a visual in a card with expand/collapse/fullscreen (Radix Dialog) buttons; wraps children only, does not re-render.
- `CanvasHistory.tsx` — desktop-only scrollable stack of past turns' canvases.
- `CanvasEmptyState.tsx` — pre-first-question view: suggested questions, recent, Executive Brief shortcut, voice + demo examples.

### New helpers
- `src/lib/canvasAdapter.ts` — pure function `toCanvasTurn(assistantMessage)` that:
  - Runs `parseAIResponse` (existing).
  - Extracts header context from message metadata (project, date range, record count, timestamp — all already present on chat messages).
  - Extracts sources from `explainability` / `sources` fields when present.
  - Derives thinking steps from which subsystems fired (voice=true, ui payload present, sources present, etc.).
  - Derives follow-ups from an optional `followups` field or a small heuristic seeded from `exampleQuestions.ts`.
- `src/hooks/useCanvasTurns.ts` — subscribes to chat/voice streams and yields `CanvasTurn[]`.

### Wiring (minimal, no logic changes)
- `src/pages/Index.tsx` (AI Assistant tab) — split layout on desktop: left = existing transcript + composer, right = `<AICanvas />` bound to latest turn with `<CanvasHistory />`. Mobile: stack Orb → Canvas → Transcript → Actions.
- `src/components/voice/VoiceModeUI.tsx` — mount `<AICanvas />` alongside the orb; auto-opens on speech start (existing status signal), progressively reveals visuals as `assistantMessage.ui` populates.
- `src/components/ChatMessage.tsx` — when a message is the latest assistant turn AND canvas is visible, hide inline `AIResponseRenderer` output (canvas owns it). Older messages keep inline rendering for scroll-back parity.

### Behaviour rules
- Voice and Chat both feed the same `AICanvas` — one shared component.
- Canvas is the primary output; transcript is secondary.
- When no `ui` payload: `SummaryCard` renders.
- Follow-up click → fills chat input + submits (or triggers voice question).
- Fullscreen uses existing Radix `Dialog`.
- Animations: reuse Tailwind `animate-fade-in`, `animate-scale-in`, `animate-slide-in-right`. No new keyframes.

## Technical notes

```text
Index.tsx  (ai-asistan tab)
├── left column  (existing)
│   ├── Transcript (ChatMessage list)
│   └── ChatInput
└── right column  (NEW)
    └── AICanvas
        ├── CanvasHeader
        ├── AIStatusBadge
        ├── AIThinkingTimeline
        ├── ExpandableVisual × N   ← wraps AIResponseRenderer
        │   └── (or) SummaryCard   ← when ui payload empty
        ├── Action row             ← existing ActionExecutor
        ├── SourcePanel
        └── SuggestedFollowups

CanvasHistory (below current, collapsed by default)
```

Status signal source:
- Chat: existing streaming state in `useChat`/`streamChat`.
- Voice: existing `VoiceBrain` phase (`listening`, `thinking`, `speaking`).
- Mapped in `canvasAdapter.ts` to the badge labels.

Follow-up transport:
```ts
window.dispatchEvent(new CustomEvent("canvas-followup", { detail: { text } }));
```
`ChatInput` and `VoiceCopilot` add a passive listener — no logic change.

## Non-goals
- No prompt changes.
- No changes to `AIResponseRenderer`, `AITable`, `AICharts`, `AIKpiCards`, `AITimeline`, `AIProgress`.
- No new backend routes.
- No changes to how sources are computed — canvas only *displays* what the assistant already returns.

## Files touched
**New (11):** `src/components/canvas/{AICanvas,CanvasHeader,AIStatusBadge,AIThinkingTimeline,SummaryCard,SourcePanel,SuggestedFollowups,ExpandableVisual,CanvasHistory,CanvasEmptyState}.tsx`, `src/lib/canvasAdapter.ts`, `src/hooks/useCanvasTurns.ts`.

**Edited (3, wiring only):** `src/pages/Index.tsx` (AI Assistant tab layout), `src/components/voice/VoiceModeUI.tsx` (mount canvas), `src/components/ChatMessage.tsx` (suppress inline visuals for latest turn when canvas active).

## Risk
Low. Renderer, hooks, brains, prompts, and executive logic remain untouched. Canvas is additive; if it fails to render, existing inline visuals still work (kept behind a `canvasActive` flag).
