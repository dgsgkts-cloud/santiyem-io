## Sprint M1.3C — Projects Module Finalization

Final responsive migration pass for the Projects module. Frontend only. No backend, schema, or business logic changes.

### Scope

Six legacy components remain outside the frozen Responsive Design System (`PageShell`, `SectionCard`, `ResponsiveGrid`, `ResponsiveTable`, `ResponsiveSheet`, `KpiCard`). This sprint migrates them, replaces custom modals/drawers with `ResponsiveSheet`, converts remaining tables to `ResponsiveTable`, purges hardcoded spacing/font values, and enforces the ≤300 (≤500 hard) line budget.

### Migration Targets

1. **TaskBoard** (`src/components/desktop/TaskBoard.tsx`, 565 lines)
   - Split by responsibility into `task-board/` subfolder:
     - `TaskBoardHeader.tsx` — title, view switcher, search, AI summary
     - `TaskBoardFilters.tsx` — status/priority/assignee/mine/today/overdue chips
     - `TaskKanbanView.tsx` — 3 columns, DnD, sticky headers, pagination
     - `TaskListView.tsx` — uses `ResponsiveTable` (rows → cards on mobile)
     - `TaskCalendarView.tsx`, `TaskTimelineView.tsx` — thin wrappers
     - `TaskDrawer.tsx` — detail sheet, migrated from raw `Sheet` → `ResponsiveSheet`
     - `TaskAddForm.tsx` — quick-add row
     - `useTaskBoardState.ts` — filter/query/pagination/DnD state hook
   - Parent `TaskBoard.tsx` becomes composition shell (<200 lines).
   - Preserve DnD, sticky headers, internal scroll, filters, search, AI summary, pagination, view switcher, drawer — zero behavior change.

2. **AttendancePanel** (340 lines)
   - Wrap in `SectionCard`; KPI row → `ResponsiveGrid` + `KpiCard` (On-site, Total entries, Exited, Teams).
   - Attendance list → `ResponsiveTable` (worker, occupation, check-in, check-out, duration).
   - PDF-range dialog → `ResponsiveSheet`.
   - Extract `AttendanceExportSheet.tsx` if parent exceeds 300 lines.

3. **ProjectMembersManagement** (378 lines)
   - Wrap in `SectionCard`; members list → `ResponsiveTable` (name, role, joined, actions).
   - Invitations list → second `ResponsiveTable`.
   - Invite form → `ResponsiveSheet` (replaces inline expand block).
   - Fine-tune permissions panel extracted to `MemberPermissionsSheet.tsx` (also `ResponsiveSheet`).

4. **EditProjectModal** & **AddProjectModal**
   - Replace custom fixed-inset modal with `ResponsiveSheet` (right drawer / bottom sheet).
   - Drop hardcoded `text-[16px]/[13px]/[11px]` in favor of `text-fs-*` tokens; drop inline `#FF6B2B` in favor of `bg-primary`.

5. **QrCodeModal**
   - Replace custom modal shell with `ResponsiveSheet`.
   - Keep QR canvas, PNG/poster download, regenerate button unchanged.

6. **DeleteConfirmModal**
   - Replace custom fixed-inset modal with `ResponsiveSheet` (size `sm`).
   - Preserve 2s loading animation, red confirm button, item-name warning per project memory.

### Table Migration Sweep

Confirm the following surfaces already use `ResponsiveTable`; migrate any that don't:
- Milestones, Project Files, Notes, Recent Activity (from `project-detail/*` sections)
- Attendance, Members (above)

### Design Debt Purge

Sweep migrated files for:
- Hardcoded `px`/`rem` spacing → Tailwind spacing scale (`p-4`, `gap-3`)
- Fixed `text-[NNpx]` → `text-fs-xs/sm/base/lg/xl` tokens
- Inline `style={{ backgroundColor / color / border }}` for non-brand values → semantic tokens (`bg-card`, `text-muted-foreground`, `border-border`)
- Brand ember `#FF6B2B` / status colors may remain (per rules).

### Component Health Budget

Post-migration line counts (targets):

```text
TaskBoard.tsx                 ~180
task-board/*.tsx              each <250
AttendancePanel.tsx           <300
ProjectMembersManagement.tsx  <300
EditProjectModal.tsx          <180
AddProjectModal.tsx           <180
QrCodeModal.tsx               <180
DeleteConfirmModal.tsx        <120
```

No component >500. Target: none >300 except where a single cohesive view demands it (justify in report).

### QA Matrix

Verify at 390 / 430 / 768 / 1024 / 1440 / 1920:
- No horizontal overflow, no clipped actions, no double scroll.
- Tables collapse to cards <768px.
- Sheets: right drawer ≥768px, bottom sheet <768px.
- DnD works on desktop; touch DnD unchanged on mobile.
- All modals dismiss via backdrop, X, and Escape.

### Final Report (returned after implementation)

```text
Projects Completion %:        100
Responsive Components Used:   PageShell, SectionCard, ResponsiveGrid,
                              ResponsiveTable, ResponsiveSheet, KpiCard
Remaining Legacy Components:  0
Remaining Legacy Drawers:     0
Remaining Non-responsive Tbl: 0
Largest Component:            <line count of biggest post-split file>
Components >300 lines:        <list or none>
Components >500 lines:        0
Design Debt:                  none (brand colors preserved)
Architecture Health %:        100
TypeScript:                   clean
Build:                        pass
QA:                           pass at 390/430/768/1024/1440/1920
```

### Guardrails

- No changes to hooks (`useTasks`, `useTeam`, `useWorkerAttendance`, `useProjectRole`, `useProjectNotes`, etc.).
- No SQL, no edge functions, no RLS.
- Design System Freeze respected — no edits to `PageShell`, `SectionCard`, `ResponsiveGrid`, `ResponsiveTable`, `ResponsiveSheet`, `KpiCard`, tokens.
- Noir + Ember palette preserved; only layout adapts across breakpoints.
