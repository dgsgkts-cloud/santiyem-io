# Sprint 13.2 — Living Workspace

Make the ERP react in real time as the AI speaks. All work is additive UX plumbing on top of Sprint 13.1's `AICanvas`. No touches to Construction Brain, Company Brain, VoiceCopilot reasoning, prompts, AI actions, or `AIResponseRenderer`.

## Core primitive: workspace event bus

A tiny publish/subscribe layer that carries entity references extracted from AI turns to any listening UI surface.

### New: `src/lib/workspaceBus.ts`
```ts
type EntityKind = "project" | "personnel" | "supplier" | "material" | "task" | "payment" | "document";
type EntityRef  = { kind: EntityKind; id: string; label?: string };
type WorkspaceEvent =
  | { type: "highlight"; refs: EntityRef[]; ttlMs?: number }
  | { type: "filter";    kind: EntityKind; predicate: Record<string, unknown> }
  | { type: "navigate";  ref: EntityRef; confidence: "high" | "medium" }
  | { type: "preview";   ref: EntityRef; anchor?: DOMRect };
```
Backed by `EventTarget`; caps highlights at 2 concurrent; auto-expires after `ttlMs` (default 2200 ms).

### New: `src/hooks/useWorkspaceHighlight.ts`
```ts
useWorkspaceHighlight(kind, id) → boolean
```
Row/card components opt in with a single hook + one CSS class.

### New: `src/lib/entityExtractor.ts`
Deterministic post-processor for the assistant message. Reads the raw response text/JSON and pulls entity IDs from three sources it already contains:
1. `ui[*].meta.entities` if the payload includes them.
2. `sources` array (uses `kind` field).
3. Regex scan for `id:xxxxx` markers already emitted by the brains.
Returns `EntityRef[]`. Never modifies the response.

## Canvas integration (extends 13.1)

### Edited: `src/components/canvas/AICanvas.tsx`
- After `pushTurn`, run `entityExtractor` and publish `{ type:"highlight", refs, ttlMs:2200 }`.
- Render up to 2 `<PreviewCard>` chips at the top when refs exist.
- Add a **Pin** button on each `ExpandableVisual` header.
- Progressive reveal: cards mount with staggered `animate-fade-in` delays (60ms each).

### New: `src/components/canvas/PreviewCard.tsx`
Compact context card per entity kind. Fetches summary via existing hooks:
- Project → `useProjects` row lookup
- Personnel → `usePersonnel`
- Supplier → `useSubcontractors`
- Material → `useMaterials`
- Task → `useTasks`
- Payment → `useCashPayments`
- Document → `useDocuments`
Renders label + 2–3 key fields + "Aç" button that emits `navigate`.

### New: `src/components/canvas/PinButton.tsx`
Persists pinned visuals to `localStorage: canvas_pinned_v1` as `{ id, title, ui, createdAt }[]`. Cap 12.

### New: `src/components/canvas/PinnedInsights.tsx`
Reads pinned list and renders via `AIResponseRenderer`. Empty state fallback.

## Dashboard integration

### Edited: `src/components/desktop/DesktopDashboard.tsx`
Add a **"Pinned Insights"** section (top of grid) mounting `<PinnedInsights />`. No dashboard logic changes.

## Highlight surfaces (opt-in, one line each)

Add `useWorkspaceHighlight(kind, id)` + `data-ws-highlight` class to:
- Project cards in `DesktopProjectsPage`
- Personnel rows in `PersonnelList`
- Supplier rows in `useSubcontractors` list component
- Material rows in `MaterialsPage` table
- Task rows in `useTasks` list surface
- Payment rows in `PaymentsKasaPage`

CSS: single utility in `src/index.css`:
```css
.ws-highlight { animation: ws-pulse 1.6s ease-out 1; box-shadow: 0 0 0 2px hsl(var(--primary)/0.35); border-radius: inherit; }
@keyframes ws-pulse { 0%{box-shadow:0 0 0 0 hsl(var(--primary)/0.55)} 100%{box-shadow:0 0 0 12px hsl(var(--primary)/0)} }
```

## Smart navigation

### New: `src/hooks/useSmartNavigation.ts`
Listens for `navigate` events; if `confidence === "high"` and only one ref, calls the existing tab change bus (`navigate-tab` CustomEvent already used across app). Otherwise renders an inline "Aç" button in `PreviewCard`.

Confidence heuristic:
- `high`: response contains exactly one entity ref AND text matches `/açalım|aç|göster|detay/i`.
- Else `medium`.

## Live filters

### New: `src/hooks/useLiveFilter.ts`
List pages subscribe: `const filter = useLiveFilter("project")`. Returns `{ predicate, clear }`. When `filter` event fires for the page's kind, list narrows client-side. A small chip **"AI filtresi · Temizle"** appears above the list (added in each page's existing header slot).

Wired in:
- `DesktopProjectsPage`
- `PersonnelList`
- `PaymentsKasaPage`

Predicate is a shallow subset filter (`row[key] === value` or `Array.includes`); no schema changes.

## Empty state (canvas)

### Edited: `src/components/canvas/CanvasEmptyState.tsx`
Insert a new "Pinlenmiş İçgörüler" section that lists titles of pinned items; click → scrolls to pinned area.

## Conversation memory (lightweight)

`AICanvas` already keeps `turns[]` (Sprint 13.1). Add a helper `getTurnByHint(hintText)` used only when the assistant's speech contains phrases like "önceki cevap" — resolves the last completed turn and mounts a "🕘 Önceki Yanıt" collapsible above the new canvas, reusing the stored `ui` (no rebuild).

## Animation rules
- All new motion ≤ 300 ms.
- Reuse Tailwind `animate-fade-in`, `animate-scale-in`. Add one `ws-pulse` keyframe.
- Number count-up: `src/components/canvas/CountUp.tsx` — 220 ms, `requestAnimationFrame`, integer/float aware. Wraps numeric values inside `AIKpiCards` via a light DOM observer? No — leave existing renderer untouched; expose `CountUp` for future opt-in only. Not injected into `AIKpiCards`.

## Files

**New (10):** `src/lib/workspaceBus.ts`, `src/lib/entityExtractor.ts`, `src/hooks/useWorkspaceHighlight.ts`, `src/hooks/useSmartNavigation.ts`, `src/hooks/useLiveFilter.ts`, `src/components/canvas/PreviewCard.tsx`, `src/components/canvas/PinButton.tsx`, `src/components/canvas/PinnedInsights.tsx`, `src/components/canvas/CountUp.tsx`, one CSS block in `src/index.css`.

**Edited (small, presentation only):** `src/components/canvas/AICanvas.tsx`, `src/components/canvas/ExpandableVisual.tsx`, `src/components/canvas/CanvasEmptyState.tsx`, `src/components/desktop/DesktopDashboard.tsx`, project/personnel/material/payment/task list rows (one hook + className each).

## Non-goals
- No changes to `AIResponseRenderer`, `AIKpiCards`, `AITable`, brain edge functions, prompts, or actions registry.
- No database changes. Pins live in `localStorage`.
- Smart navigation reuses existing `navigate-tab` CustomEvent; no new router work.
- No changes to how AI responses are produced. Extraction is passive.

## Risk
Low. If the bus never publishes, every list, dashboard, and canvas behaves exactly as today.
