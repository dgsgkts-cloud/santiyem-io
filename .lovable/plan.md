# Premium Demo Company — MSY Yapı A.Ş.

## Goal
Add a rich, interconnected demo dataset that showcases every Şantiyem AI feature, loadable and removable with a single click from **Settings → Demo Data**. No existing logic, prompts, permissions, or AI brains change.

## Approach

Two moving parts only:

1. **One new Supabase Edge Function** — `seed-msy-demo` — that generates the entire dataset for the currently authenticated user (owner scope) and can also fully remove it. Every row is tagged so removal is surgical.
2. **One new UI card** inside the existing Settings → Demo Data tab — "MSY Yapı Premium Demo" with **Load** and **Remove** buttons and a live counts summary.

No schema migrations. No changes to Construction Brain, Company Brain, prompts, permissions, or RLS. The seeder writes to existing tables using the same shapes the app already uses, so the AI answers naturally from real demo rows.

## Tagging strategy (how "Remove" stays surgical)

Existing tables already have free-text/JSON fields we can safely mark without a migration:

- `projects.description` — prefix with `[MSY_DEMO]` marker line.
- `personnel.note`, `subcontractors.note`, `materials` (via note-like fields), `tasks.description`, `site_diary_entries.notes`, `meetings.notes`, `company_memories.metadata.is_demo=true`, `communication_messages.metadata.is_demo=true`, `reminders.title` prefix, `project_expenses.note`, `cash_*` tables `note` field, `contracts.description`, `invoices.notes`, `project_notes.content`, `project_files.name` suffix.
- Everything else (hakediş items, deductions, material entries/exits, assignments, attendance, photos) is deleted transitively via the parent `project_id` = the demo project's id, which is the only truly reliable anchor.

The **demo project id** is stored in `company_memories` under a well-known key (`type='other'`, `category='__msy_demo_anchor__'`, `metadata.is_demo=true`) so Remove can find it in one query.

## What gets seeded

**Company profile** (localStorage helper call from UI after seed succeeds): MSY Yapı A.Ş., Hatay, +90… , est. 2013.

**Main project**: MSY Yapı — Ballıca Panorama Villaları, Hatay/Arsuz, 245.000.000 TL, 41% progress, dates 2026-01-12 → 2027-04-30.

**Personnel** (~40 realistic rows): PM, Site Chief, 4 Civil Eng, 2 Architects, Mech Eng, Elec Eng, Survey Eng, HSE, Procurement, Warehouse Mgr, HR, Accountant, 6 Foremen, 20 workers. Each with phone, occupation, title, wage/salary, `note` containing skills+certificates JSON.

**Attendance**: 60 days back, realistic present/absent/leave mix → `attendance_records` + `worker_attendance` for QR-style entries.

**Subcontractors** (18): all trades listed, with contract amount, payments, performance in `note`.

**Suppliers**: modelled through `materials.supplier` field + `material_entries` history (22 distinct supplier names, price history via multiple entries).

**Warehouse** (~250 materials): realistic construction items, each with stock, min_stock, unit, supplier, purchase entries (price history), exits tied to site diary.

**Finance**: `cash_accounts` (2 bank + 1 cash), `cash_collections` (hakediş receipts), `cash_payments` (payroll, subcontractor, supplier, tax, fuel), `subcontractor_payments`, `project_expenses`, `invoices`, `e_invoices`, `project_hakedis` (4 hakediş with items+deductions). Numbers reconcile: sum(payments)+sum(expenses) ≈ 98.700.000 TL current cost.

**Tasks**: 340 completed + 78 active + 16 delayed + 14 high-priority = 448 tasks linked to project/personnel.

**Site diary**: 120 daily entries with weather, worker counts, materials in/out (auto-syncs to stock via existing trigger — no logic change, just data), notes, photos (a few placeholder rows in `site_diary_photos`).

**Meetings**: 48 rows with participants, transcript excerpts, analyses (AI summary), action items.

**Company Memory**: ~40 entries — contracts, technical specs, method statements, quality/safety procedures, supplier agreements, purchase policy, employee handbook, org chart, company profile. All with `metadata.is_demo=true` so Company Brain answers them naturally.

**Communication**: ~30 `communication_messages` (email + WhatsApp) with delivery attempts — payment reminders, delivery notifications, meeting reminders, announcements.

**Reminders**: 12 upcoming reminders (permits, inspections, payments).

**Contracts**: 6 subcontractor contracts + 2 supplier framework contracts with items.

## UI change

Add a new card at the top of `src/components/desktop/DemoDataTab.tsx` (above the existing panels) titled **"MSY Yapı A.Ş. — Premium Demo"** with:

- Short description
- **Yükle** button → invokes `seed-msy-demo` with `{action:'load'}`
- **Kaldır** button (destructive style, confirmation) → `{action:'remove'}`
- Counts summary after load

No other UI touched.

## Technical details

**File plan:**

- `supabase/functions/seed-msy-demo/index.ts` — new. Uses service_role client, resolves user from JWT, runs `load` or `remove`. Splits load into batched inserts (~500 rows per batch) to stay within edge function timeouts. Returns `{ok:true, counts:{…}}`.
- `src/components/desktop/DemoDataTab.tsx` — add the MSY card at the top; keep existing "Göktaş demo" and "Arsuz Villas" panels untouched.

**Removal query set** (executed in FK-safe order):
```
1. delete communication_delivery_attempts where message_id in (demo msgs)
2. delete communication_messages where metadata->>'is_demo'='true' and user_id=uid
3. delete company_memories where metadata->>'is_demo'='true' and user_id=uid
4. read demo project_id from anchor memory (before step 3 if still needed — cache in memory)
5. for demo project_id: delete hakedis_items/deductions → project_hakedis, tasks, site_diary_photos → site_diary_entries, worker_attendance, attendance_records, material_entries/exits (where source=demo project), materials, project_expenses, project_files, project_notes, project_milestones, personnel_project_assignments, contract_items → contracts, invoices, e_invoices, cash_payments/collections/checks/accounts (tagged), subcontractor_payments, meetings + children, reminders (tagged), subcontractors (tagged), personnel (tagged), then project itself.
```

**Reconciliation math** is done in the seeder in JS so totals match the headline numbers exactly.

## Non-goals (explicit)

- No changes to `chat`, `voice-*`, `company-memory`, `communication-hub` functions.
- No changes to any prompt file under `supabase/functions/chat/prompt/*`.
- No RLS/policy/grant changes.
- No new tables, no schema migration.
- No changes to `Construction Brain` or `Company Brain` code paths — they will simply see the demo rows as normal data.

## Deliverable

After the user clicks **Yükle**, they can ask Şantiyem AI any of the 15 example questions (workers today, concrete today, cash flow, overdue invoices, etc.) and get answers derived from the seeded demo data. Clicking **Kaldır** removes every seeded row and leaves production data untouched.
