## Sprint M1.4 — Procurement Responsive Migration

Migrate `src/components/desktop/ProcurementPage.tsx` (780 lines, single monolith) onto the frozen Responsive Design System. Frontend only. Zero backend/schema/business-logic changes. All existing features preserved.

### Current state (audit)

- **One file, 780 lines** with 7 sub-views + CEO view + FAB defined inline.
- **Custom shell** wraps whole page (`min-h-screen bg-[#0F1419] p-6 lg:p-8`) instead of `PageShell`.
- **Custom cards everywhere** (`rounded-2xl border border-white/10 bg-white/[0.02] p-5`) instead of `SectionCard`.
- **Custom KPI tile** (`KPI` local component) instead of `KpiCard`.
- **Custom grids** (`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7`) instead of `ResponsiveGrid`.
- **Raw HTML table** in `RFQView` — desktop-only, no card fallback for <768px.
- **No drawers** currently, but RFQ + FAB Quick Create actions and order/request "Görüntüle" need `ResponsiveSheet` detail panels to reach full parity across breakpoints.
- **Fixed font sizes** everywhere: `text-[10px]`, `text-[11px]`, `text-[9px]`, `text-2xl`, `text-3xl` → must move to `text-fs-*` tokens.
- **Hardcoded neutrals**: `bg-white/[0.02]`, `border-white/10`, `text-white/40`, `bg-[#0F1419]`, `bg-[#151A21]` → semantic tokens (`bg-card`, `border-border`, `text-muted-foreground`, `bg-background`).
- **Brand ember `#FF6B2B` and status colors** (emerald/amber/red/blue/cyan) may remain per rules.

### Migration structure

Decompose the monolith into a `procurement/` feature folder. Parent shell becomes composition, each view ≤250 lines, no component >300.

```text
src/components/desktop/procurement/
├── ProcurementHeader.tsx          — title, CEO toggle, command palette button
├── ProcurementTabs.tsx            — sub-tab bar (horizontal scroll on mobile intact)
├── ProcurementKpiRibbon.tsx       — 7 KpiCards in ResponsiveGrid
├── AIInsightsCard.tsx             — SectionCard variant (ember accent)
├── ProcurementDashboardView.tsx   — KPI + AI + trend chart + category split
├── ProcurementRequestsView.tsx    — filters + ResponsiveGrid of request cards
├── ProcurementRFQView.tsx         — offer table → ResponsiveTable
├── ProcurementOrdersView.tsx      — ResponsiveGrid of order cards
├── ProcurementDeliveriesView.tsx  — SectionCard list w/ stage tracker
├── ProcurementSuppliersView.tsx   — ResponsiveGrid of supplier score cards
├── ProcurementAnalyticsView.tsx   — 2× SectionCard (spend / aging)
├── ProcurementCEOView.tsx         — CEO summary layout
├── ProcurementQuickCreateFAB.tsx  — FAB unchanged
├── ProcurementDetailSheet.tsx     — ResponsiveSheet host for request/order/supplier detail
├── useProcurementDemoData.ts      — extracted hook (existing `useDemoData`)
└── procurementConstants.ts        — CATS/PRIORITIES/STATUSES/DELIV_STAGES + helpers
```

`ProcurementPage.tsx` becomes a <150-line composition shell using `PageShell`, holding tab/CEO/detail state.

### Concrete rewrites

1. **Page shell** — replace `<div className="min-h-screen bg-[#0F1419] p-6 lg:p-8">` with `<PageShell title="Satın Alma Merkezi" eyebrow="SATIN ALMA & TEDARİK ZİNCİRİ" actions={<ProcurementHeaderActions/>}>`. Removes hardcoded bg/padding.
2. **KPI ribbon** — 7 tiles → `ResponsiveGrid` (auto-collapses 2/4/7 cols) + `KpiCard` per metric. Delta/tone map preserved.
3. **Section cards** — every `rounded-2xl border border-white/10 bg-white/[0.02] p-5` block wrapped in `<SectionCard title=…>`; header removed from body.
4. **Request grid** — inline card list wrapped in `ResponsiveGrid` (columns: 1/2/3 across sm/md/xl). Hover-only action bar kept but padding tokens replace `px-2 py-1.5 text-[11px]`.
5. **RFQ table** — raw `<table>` swapped for `ResponsiveTable<Offer>` with columns Tedarikçi / Fiyat (right) / Teslim / Ödeme / Garanti / Puan / Eylem. `primary: true` on Tedarikçi for mobile card mode. "Best offer" row keeps emerald tinting via `rowClassName`.
6. **Orders grid** → `ResponsiveGrid` + `SectionCard` per order (or keep custom card but tokenize).
7. **Deliveries list** → stack of `SectionCard`s, stage tracker unchanged.
8. **Suppliers grid** → `ResponsiveGrid` + supplier card (tokenized).
9. **Analytics** → two `SectionCard`s inside `ResponsiveGrid` (1/2 cols).
10. **CEO view** → 3× `KpiCard` ribbon + `AIInsightsCard` + `SectionCard` for upcoming deliveries.
11. **Detail sheets** — introduce `ProcurementDetailSheet` powered by `ResponsiveSheet`; wire "Görüntüle" (order), request tile click, and supplier tile click into it so mobile users get the same detail affordance as desktop. RFQ "Sipariş Ver" opens a confirmation `ResponsiveSheet` (size `sm`).
12. **Quick Create FAB** — actions stay; each action opens a `ResponsiveSheet` (right drawer / bottom sheet) with a placeholder form (matches existing "no business logic change" — it currently does nothing but render buttons; we preserve the current no-op behavior, only replacing the popover with `ResponsiveSheet` when clicked, or leave as-is if simpler). Decision: keep current popover behavior; do NOT introduce new logic. Only tokenize colors.

### Design token sweep

- `text-[9px]` → `text-fs-2xs` (fallback `text-fs-xs`)
- `text-[10px]` / `text-[11px]` → `text-fs-xs`
- `text-2xl` / `text-3xl` (KPI values) → provided by `KpiCard` typography
- `bg-white/[0.02]` → `bg-card` / `bg-muted/40`
- `border-white/10` → `border-border`
- `text-white`, `text-white/70`, `text-white/50`, `text-white/40` → `text-foreground`, `text-muted-foreground`
- `bg-[#0F1419]` / `bg-[#151A21]` → `bg-background` / `bg-card`
- Preserve brand `#FF6B2B` (ember) and status colors (emerald/amber/red/blue/cyan).

### Feature parity checklist (no regressions)

- 7 sub-tabs + CEO toggle
- 7 dashboard KPIs w/ delta arrows
- AI Insights card (4 items + "Detaylı özet" → `canvas-followup` event)
- Requests: search, status filter chips, approval timeline, Onayla/Reddet/RFQ actions
- RFQ: best-offer highlight, Sipariş Ver / Seç, Tedarikçi Ekle
- Orders: paid badge, ETA, Görüntüle/PDF/Teslim actions
- Deliveries: 5-stage tracker, delayed state
- Suppliers: score ring, 5 sub-metrics, total spend
- Analytics: revenue share + aging buckets
- CEO view: total spend, top supplier, budget risk, upcoming deliveries
- Quick Create FAB: 3 actions
- Command palette (`⌘K`) button intact
- `canvas-followup` event intact
- `useProjects` / `useSubcontractors` hook usage intact — no behavior change

### Responsive QA matrix

Verify at 390 / 430 / 768 / 1024 / 1440 / 1920:
- No horizontal overflow, no clipped actions, no double scroll.
- KPI ribbon: 2 cols mobile → 4 tablet → 7 desktop.
- RFQ table collapses to cards <768px via `ResponsiveTable`.
- Sub-tab bar scrolls horizontally on mobile.
- FAB stays inside safe area.
- Ember + status colors identical on all breakpoints.

### Component health budget

```text
ProcurementPage.tsx                  <150
procurement/*View.tsx                each <250
procurement/AIInsightsCard.tsx       <80
procurement/ProcurementKpiRibbon.tsx <60
procurement/ProcurementTabs.tsx      <60
procurement/ProcurementHeader.tsx    <80
procurement/QuickCreateFAB.tsx       <70
procurement/DetailSheet.tsx          <150
useProcurementDemoData.ts            <120
```

No component >500; target none >300.

### Guardrails

- No changes to `useProjects`, `useSubcontractors` hooks or their data shapes.
- No SQL, no edge functions, no RLS, no schema.
- No new business logic — approve/reject/order buttons keep whatever no-op behavior they have today (the current file has none wired up).
- Design System Freeze respected — zero edits to `PageShell`, `SectionCard`, `ResponsiveGrid`, `ResponsiveTable`, `ResponsiveSheet`, `KpiCard`, tokens.
- Licensing / FeatureGate / LimitGuard / AccessGuard usage unchanged (none present in current file — nothing to break).
- Noir + Ember palette preserved; only layout adapts across breakpoints.

### Final report (returned after implementation)

```text
Procurement Completion %:      100
Responsive Components Used:    PageShell, SectionCard, ResponsiveGrid,
                               ResponsiveTable, ResponsiveSheet, KpiCard
Remaining Legacy Components:   0
Remaining Legacy Drawers:      0
Remaining Non-responsive Tbl:  0
Largest Component:             <line count of biggest post-split file>
Components >300 lines:         <list or none>
Components >500 lines:         0
Design Debt:                   none (brand + status colors preserved)
Architecture Health %:         100
TypeScript:                    clean
Build:                         pass
QA:                            pass at 390/430/768/1024/1440/1920
```
