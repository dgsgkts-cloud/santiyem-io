
## 1. Current scroll architecture map

Desktop shell (`src/pages/Index.tsx`, line 529–609):

```text
<div class="flex h-screen">                        ← app viewport lock
  <DesktopSidebar />                                ← own scroll (nav has overflow-y:auto)
  <div class="flex-1 flex flex-col overflow-hidden">← disables body-level scroll
    <DesktopTopBar />
    <div ref=scrollRef                              ← THE canonical scroll container
         class="flex-1 min-h-0 overflow-y-auto">
      <div class="flex min-h-full flex-col">
        <div class="flex-1 pb-12">
          <ActiveModulePage />                      ← must NOT re-declare height/scroll
        </div>
      </div>
      <Footer minimal />
    </div>
  </div>
</div>
```

There is already exactly one intended vertical scroll container per pane: sidebar `<nav>` and `scrollRef` div. All module pages must render as passive content inside `scrollRef`.

## 2. Modules that violate the contract

Grouped by the actual root wrapper each module emits:

**A. Passive wrapper — works correctly (control group)**
- `EInvoicesPage` — `<div class="p-4 lg:p-6 space-y-4">`
- `MaterialsPage` — `<div class="p-4 lg:p-6 ... max-w-7xl mx-auto">`
- `SiteDiaryPage` — `<div class="max-w-6xl mx-auto p-4 lg:p-6">`
- `DesktopHakedisPage` — `<div class="p-3 sm:p-4 md:p-6 max-w-[1200px] mx-auto">`
- `PersonnelPage` — `<div class="p-4 md:p-6 max-w-7xl mx-auto">`
- `ReportsPage` — `<div class="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">`
- `DesktopSettingsPage` — `<div class="p-3 sm:p-4 lg:p-6 max-w-[1200px] mx-auto">`

**B. PageShell wrapper — broken (adds `min-h-full smooth-scroll`)**
- `DesktopDashboard` — `<PageShell maxWidth={1120}>`
- `PaymentsKasaPage` — `<PageShell maxWidth={1400}>`
- `ProcurementPage` — `<PageShell ...>`
- `ProjectDetailPage` — `<PageShell maxWidth={1200}>`

**C. Extra height-claiming wrapper on top of PageShell / body**
- `WarehousePage` — `<div class="min-h-screen bg-background"><PageShell>…</PageShell></div>`
- `FleetPage` — `<div class="min-h-screen bg-[#0B0F14]">` (also has inner `overflow-y-auto` panels with `max-h-[420px]` / `max-h-[600px]` that create nested vertical scroll)

## 3. Root cause

Two structural problems, not a browser/event bug:

1. **`PageShell` claims height and scroll semantics** it doesn't own.
   `src/components/ui/responsive/PageShell.tsx` line 34:
   `"w-full min-h-full smooth-scroll no-overflow-x"`.
   `.smooth-scroll` (src/index.css:509) sets `scroll-behavior: smooth`, `-webkit-overflow-scrolling: touch`, `overscroll-behavior: contain`. Those properties belong on the actual scroll container (`scrollRef` in Index.tsx), not on a passive content wrapper. `min-h-full` combined with the flex column parent forces the page body to exactly fill the viewport, and the smooth-scroll/overscroll rules on that same node interfere with wheel delta propagation to the real scroll container above it. Every PageShell-using module (Dashboard, Payments, Procurement, ProjectDetail) inherits the same defect — this matches the reported "Dashboard + some migrated modules" symptom exactly.

2. **`min-h-screen` on module roots** (Warehouse, Fleet) creates a 100vh box inside a scroll container that is itself smaller than 100vh (viewport minus TopBar). This pushes content off the parent's scroll range and, together with the nested `max-h-[420/600px] overflow-y-auto` panels in `FleetPage`, creates two vertical scroll layers over the same region — the wheel is captured by whichever child is under the cursor.

The reason Sidebar / E-Fatura / Hakediş / Şantiye Günlüğü / Malzeme / Personel work: their roots are pure padded `<div>`s with no height or scroll declarations, so `scrollRef` is the only scroller in the chain.

## 4. Unified architecture (single strategy)

Contract for every module page:

- Root element is a plain `<div>` with padding + `max-w-*` only.
- Never use: `h-screen`, `min-h-screen`, `100vh`, `100dvh`, `min-h-full`, `overflow-y-auto`, `overflow-scroll`, `overscroll-*`, `-webkit-overflow-scrolling`, `scroll-behavior` on the page root.
- Nested vertical scroll (`max-h-[…] overflow-y-auto`) is only allowed inside modal/sheet/dialog surfaces, never in the main content flow.
- `PageShell` becomes a pure layout primitive: max-width, header, padding, safe-area. No height, no scroll semantics.
- The only vertical scroll containers in the app remain:
  - `DesktopSidebar` `<nav>` (independent sidebar scroll)
  - `Index.tsx` `scrollRef` div (single content scroll on desktop)
  - `Index.tsx` mobile `scrollRef` div (single content scroll on mobile)
  - Modal/sheet bodies

## 5. Files to change (frontend only)

1. `src/components/ui/responsive/PageShell.tsx`
   - Replace root className `"w-full min-h-full smooth-scroll no-overflow-x"` with `"w-full no-overflow-x"`. Remove `min-h-full` and `smooth-scroll`. Keep padding / safe-area / max-width behavior identical.

2. `src/components/desktop/WarehousePage.tsx`
   - Remove the outer `<div className="min-h-screen bg-background">` wrapper. Render `<PageShell>` (and sibling `StockSheet` / `QuickActionFAB`) as a fragment. Background is already provided by `scrollRef`'s `bg-background`.

3. `src/components/desktop/FleetPage.tsx`
   - Remove the `min-h-screen` on the page root (line 281). Convert page root to a padded passive wrapper (`p-4 lg:p-6 space-y-4 max-w-7xl mx-auto`) matching working modules; keep the dark palette via existing tokens.
   - Convert the two nested vertical scrollers (`max-h-[420px] overflow-y-auto` at line 717, `max-h-[600px] overflow-y-auto` at line 760) to natural flow (drop `max-h-*` and `overflow-y-auto`), so the outer `scrollRef` handles all wheel scrolling. The right-side detail panel (`overflow-y-auto` inside its own fixed sheet at line 949) stays — it is a sheet surface, allowed by the contract.

4. `src/pages/Index.tsx` — no structural change required. Optionally move `.smooth-scroll` class onto the desktop `scrollRef` div (line 554) and mobile `scrollRef` div (line 857) so smooth wheel behavior is applied on the actual scroller. This is a small, safe additive edit.

No changes to: `EInvoicesPage`, `MaterialsPage`, `SiteDiaryPage`, `DesktopHakedisPage`, `PersonnelPage`, `ReportsPage`, `DesktopSettingsPage`, `DesktopDashboard`, `PaymentsKasaPage`, `ProcurementPage`, `ProjectDetailPage` — after PageShell is fixed they inherit correct behavior automatically.

No backend, schema, hook, business logic, licensing, or permission changes.

## Verification plan

After the edits, drive Playwright over `/dashboard`, `/odemeler-kasa`, `/satin-alma`, `/depo`, `/makine-ekipman`, `/raporlar`, `/settings` at 1280×1800 and:

- Assert exactly one element in the main pane has `scrollHeight > clientHeight` and `overflow-y` in (`auto`, `scroll`) — should be the `scrollRef` div.
- Dispatch `wheel` events over the content area and assert `scrollRef.scrollTop` increases.
- Confirm sidebar `<nav>` still scrolls independently.
- Re-check working modules (E-Fatura, Hakediş, Malzeme, Personel, Şantiye Günlüğü) show no regression.
