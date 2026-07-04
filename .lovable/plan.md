## Scope

Only the Executive Dashboard (`src/components/desktop/DesktopDashboard.tsx` and new files under `src/components/dashboard/executive/`). No changes to:
- `src/components/voice/VoiceCopilot.tsx`
- `src/components/voice/VoiceBrain.tsx` / renderer (`src/components/ai/*`)
- Construction Brain (`supabase/functions/chat/index.ts`) reasoning or prompt

## New files

1. `src/hooks/useExecutiveBrief.ts`
   - Pure client-side aggregator. Reuses already-fetched data from existing hooks: `useProjects`, `useContracts`, `useReminders`, `useCashAccounts`, `useCashChecks`, plus targeted Supabase reads for `subcontractor_payments`, `project_expenses`, `materials` + `material_entries`/`_exits`, `tasks`, `worker_attendance`, `project_hakedis`.
   - Returns `{ score, kpis, insights[], findings[], loading, refresh }`.
   - `findings` are typed `{ id, severity: 'critical'|'important'|'info', title, detail, action?: { tab, projectId? } }`.
   - Deterministic rules (no LLM call) so no extra AI cost:
     - Critical supplier payments due today / overdue checks
     - Overdue invoices / hakediş awaiting approval > N days
     - Materials below `min_stock` or projected runout (recent exit rate)
     - Labour cost month-over-month delta (via `compute_project_labor_cost` per active project, cached)
     - Cash flow warning if accounts sum < next-7-day payables
     - Tasks due today / overdue
     - Weather + safety hooks left as pluggable, hidden when no data

2. `src/components/dashboard/executive/ExecutiveBrief.tsx`
   - Expandable card at the very top of `DesktopDashboard`.
   - Collapsed: greeting + counts per severity + top 3 bullets + "Detayları Gör".
   - Expanded: full grouped list (🔴🟠🟢) with per-item action buttons routed via existing `onTabChange` / `onProjectSelect`.

3. `src/components/dashboard/executive/HealthScoreCard.tsx`
   - 0–100 ring, derived from findings weights (critical -15, important -5, info 0, floor 0).

4. `src/components/dashboard/executive/InsightList.tsx`
   - Renders `insights[]` (short natural-language strings produced by the hook, e.g. "İşçilik gideri geçen aya göre %12 arttı").

5. `src/components/dashboard/executive/KpiTile.tsx`
   - Small reusable tile: icon, label, value, delta, severity accent. Used for Cash, Revenue, Expenses, Active Workers, Active Projects, Critical Risks, Critical Stock, Pending Payments, Tasks Due Today.

## Edits

- `src/components/desktop/DesktopDashboard.tsx`
  - Insert `<ExecutiveBrief />` above the existing `MorningBriefingCard` block.
  - Add a new KPI row using `KpiTile` fed by `useExecutiveBrief` (Health Score, Critical Risks, Pending Payments, Tasks Due Today, Critical Stock). Existing widgets stay.
  - Wire `refresh()` to: initial mount, tab focus (`visibilitychange`), and a custom `window` event `executive-brief-refresh`.
- Dispatch `executive-brief-refresh` from two existing spots (no logic changes there):
  - After a chat send completes (`src/pages/Index.tsx`, existing chat submit handler).
  - After voice session ends (`VoiceCopilot` already fires `voice-session-ended` — subscribe to it instead of editing VoiceCopilot).

## Priority & severity rules

- 🔴 Critical: overdue payment, cash < next-7-day payables, stock at 0 with active project needing it, hakediş rejected.
- 🟠 Important: due today/tomorrow, labour cost delta > +10%, project schedule slip > 10%, hakediş pending > 7 days.
- 🟢 Info: neutral trends, positive deltas, upcoming milestones.

## Performance

- All Supabase reads batched in one `Promise.all` inside the hook, cached in state; auto-refetch only on the events above (no polling).
- Memoized selectors; no new realtime subscriptions.

## Design

- Matches existing dark theme tokens (`#0F1419`, `#1E2732`, primary `#FF6B2B`).
- Severity colors reuse existing `--destructive`, `--warning`, `--success` tokens; no hardcoded hex outside brand.
- Fully responsive: KPI tiles use `grid-cols-2 md:grid-cols-3 xl:grid-cols-5`.
- Executive Brief collapses to a single row on mobile.

## Out of scope

- No new edge function.
- No changes to voice pipeline, renderer, Construction Brain, ElevenLabs.
- No new tables or migrations.
