# Sprint M1 — Responsive Design System Unification

This is a very large architecture effort. Attempting it in a single pass would risk regressions in every module (Dashboard, Projects, Finance, Purchasing, Warehouse, Fleet, Reports, Personnel, Diary, Meetings, Notifications, Settings, Subscription, AI, Command Palette, Onboarding, CEO Mode). I recommend a phased approach and want your sign-off before starting.

## Phase 0 — Audit (read-only, no code changes)
Produce a divergence map:
- Which modules currently render different components on mobile vs desktop (e.g. `DesktopDashboard` vs mobile chat-first `Index.tsx` branches, `DesktopHakedisPage` vs mobile flows, `PersonnelPage` vs `AttendancePanel`, etc.).
- Which routes exist only on desktop (Fleet, Reports, Procurement, Warehouse, E-Invoices, Meetings, Communication, ProfitabilityCashFlow) and have no mobile entry point.
- Duplicated logic hotspots (topbar, sidebar, tables, cards, filters, dialogs).
Deliverable: `.lovable/responsive-audit.md`.

## Phase 1 — Design system foundation (safe, global)
Frontend-only tokens + primitives, no behavior changes:
- Extend `src/index.css` with a single responsive scale:
  - Spacing tokens: `--space-1..--space-12` (4/8/12/16/24/32/48).
  - Typography scale with `clamp()` for fluid desktop→mobile.
  - Motion tokens already exist (`--motion-*`, `--ease-*`) — standardize to 200–250ms ease-out.
  - Touch target minimum 44px utility.
- New shared primitives under `src/components/ui/responsive/`:
  - `<ResponsiveGrid>` (4/2/1 KPI grid).
  - `<ResponsiveTable>` (desktop table → mobile card list, expandable rows).
  - `<ResponsiveSheet>` (side drawer on desktop, bottom sheet on mobile — wraps existing Radix Dialog/Sheet).
  - `<PageShell>` (unified topbar + sidebar/drawer + content region).
  - `<KpiCard>`, `<SectionCard>`, `<FilterBar>` — single components used everywhere.
- Unify Sidebar: single `<AppSidebar>` that renders fixed (desktop) / collapsible (tablet) / drawer (mobile) from one source of truth (icons, order, badges, access guard).
- Unify TopBar: single `<AppTopBar>` — full on desktop, compact on mobile, always includes Notifications, Workspace, AI, Profile, PlanBadge, Search.

## Phase 2 — Route parity
Make every desktop-only module reachable on mobile via the same routes and drawer entries:
- Fleet, Reports, Procurement, Warehouse, E-Invoices, Meetings, Communication, Profitability, Subscription Center, CEO Mode.
- Extend `getMobileTabsForRole` + drawer allow-list; add these to the mobile hamburger drawer.
- Ensure `LockedPage` renders identically on both.

## Phase 3 — Module migration (one module per pass)
Migrate each module to the shared primitives, in this order (highest reuse first):
1. Dashboard — replace desktop-only KPI grid with `<ResponsiveGrid>`; stack widgets vertically on mobile without removing any.
2. Projects, Personnel, Site Diary — table → `<ResponsiveTable>`.
3. Finance (Payments&Kasa, Profitability, E-Invoices) — same.
4. Purchasing, Warehouse, Fleet, Reports — same.
5. Settings + Subscription Center — same responsive shell.
6. AI (Chat, Command Palette, CEO Mode, FAB) — identical cards/suggestions; only position differs.
7. Onboarding + FirstRunWizard + Notifications — bottom sheet on mobile, side drawer on desktop.

Each module PR keeps existing business logic, hooks, and data flow untouched. Only presentation is swapped.

## Phase 4 — Responsive QA
Playwright script driving `/` and every route at 390 / 430 / 768 / 1024 / 1440 / 1920. Screenshots + assertions:
- no horizontal overflow, no double scrollbars, no clipped buttons, FAB never overlaps bottom nav / safe areas / keyboard.

## Guardrails
- Frontend only. No backend, schema, or business-logic changes.
- Reuse existing hooks (`useProjects`, `useLicense`, `useAccessGuard`, etc.) verbatim.
- TypeScript clean compile required after every phase.
- No visual regressions on desktop — the unified primitives must render pixel-close to the current desktop look.

## What I need from you
This scope is 30–50+ files touched across many sessions. Please confirm:
1. Green-light the phased approach (Phase 0 → 4), or ask me to compress.
2. Preferred starting point:
   - **A. Full phased rollout** — I begin with Phase 0 audit this turn, Phase 1 next.
   - **B. Foundation only now** — Phase 1 tokens + shared primitives + unified Sidebar/TopBar, then stop for review before touching modules.
   - **C. One pilot module** — pick Dashboard as the reference migration end-to-end, then replicate.

Recommend **B** first, then **C** on Dashboard, then roll out module-by-module — safest for a production ERP.
