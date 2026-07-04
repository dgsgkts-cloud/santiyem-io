# Sprint 11.1 — Subscription & Licensing

Turn Şantiyem into a commercial SaaS layer on top of existing `office_teams` / `office_members` / `profiles.plan` / `user_subscriptions`. No changes to Construction Brain, Company Brain, VoiceCopilot, Executive Dashboard or Action Executor.

## Public vs internal plans

UI, pricing page, onboarding, upgrade CTAs use ONLY:
- **Starter**
- **Professional**
- **Enterprise**

Internal identifiers stay untouched. Mapping lives in DB (`plans.internal_key → plans.public_key`) and one helper (`src/lib/plans.ts`):

```text
free       -> starter
pro        -> starter
team       -> professional
enterprise -> enterprise
```

Nothing hard-codes plan names for gating. All checks go through `plan_limits` + `plan_features`.

## Database (migration)

New tables — all with GRANTs + RLS:

- `plans` — canonical catalog. Columns: `internal_key` (PK, matches `profiles.plan`), `public_key` (starter/professional/enterprise), `display_name`, `sort_order`, `is_public`.
- `plan_limits` — `plan_internal_key`, `limit_key`, `limit_value bigint`, `enforcement` (`hard`|`soft`), `grace_pct int default 0`. Keys: `users`, `projects`, `storage_mb`, `kb_storage_mb`, `company_memory_writes_month`, `voice_minutes_month`, `ai_requests_month`, `comm_messages_month`.
- `plan_features` — `plan_internal_key`, `feature_key`, `enabled bool`. Feature keys: `voice_copilot`, `executive_brief`, `company_memory`, `knowledge_base`, `communication_hub`, `email_accounts`, `whatsapp`, `meetings`, `hakedis_ai`, `contracts_ai`, `gayrimenkul360`, `demo_seed`, `advanced_reports`, `api_access`, `sso`.
- `organization_feature_overrides` — `team_id`, `feature_key`, `enabled`, `expires_at`, `reason`, `set_by`, `created_at`. Read wins over `plan_features`; expiry ignored when past.
- `organization_limit_overrides` — same shape for numeric quotas.
- `usage_counters` — `team_id`, `period_start date`, `metric_key`, `value bigint`, unique (`team_id`,`period_start`,`metric_key`). Monthly window = first of month.
- `usage_audit_log` — append-only: `team_id`, `user_id`, `metric_key`, `delta`, `reason`, `created_at`.

`profiles.plan` remains the billing truth (updated by `iyzico-callback`). `organizations` is a thin **view** over `office_teams` joined to owner's `profiles.plan`:

```sql
create view public.organizations as
  select t.id, t.name, t.owner_id, p.plan as internal_plan_key,
         pl.public_key as public_plan, pl.display_name as plan_display
    from office_teams t
    join profiles p  on p.user_id = t.owner_id
    left join plans pl on pl.internal_key = p.plan;
```

Seed rows: 4 plans (free/pro/team/enterprise) mapped to 3 public tiers, with limits/features per the matrix below.

## Limits matrix (seed)

| metric | Starter (free/pro) | Professional (team) | Enterprise |
|---|---|---|---|
| users | 3 / 10 | 25 | 500 |
| projects | 2 / 15 | 75 | unlimited (`-1`) |
| storage_mb | 200 / 5000 | 25000 | unlimited |
| kb_storage_mb | 100 / 2000 | 10000 | unlimited |
| company_memory_writes_month | 50 / 500 | 5000 | unlimited |
| voice_minutes_month | 10 / 300 | 1500 | unlimited |
| ai_requests_month | 100 / 2000 | 15000 | unlimited |
| comm_messages_month | 20 / 500 | 5000 | unlimited |

Enforcement per user's spec:
- **Hard** (`users`, `projects`, `storage_mb`, `kb_storage_mb`)
- **Soft with 10% grace** (`ai_requests_month`, `voice_minutes_month`, `comm_messages_month`, `company_memory_writes_month`)

## Server helpers

`supabase/functions/_shared/licensing.ts`:
- `getOrgContext(supabase, userId)` — returns `{ team_id, internal_plan, public_plan }`.
- `getFeature(team_id, feature_key)` — override → plan_features → false.
- `getLimit(team_id, metric_key)` — override → plan_limits.
- `getUsage(team_id, metric_key, period)` — reads `usage_counters`.
- `assertQuota(team_id, metric_key, delta=1)` — hard: throws 402 if `value+delta > limit`. Soft: allows up to `limit*(1+grace)`, then throws 402. Writes to `usage_audit_log`.
- `incrementUsage(team_id, metric_key, delta)` — upserts counter for current month.

RPCs (SECURITY DEFINER) for client-side reads:
- `get_org_plan_summary()` → plan + limits + current usage.
- `check_feature(_key)` → bool.
- `check_quota(_key)` → `{limit, used, remaining, enforcement, over}`.

## Wiring (surgical — no Brain changes)

Insert quota checks at existing write paths only:

- `useProjects.createProject` → `check_quota('projects')` before insert (hard).
- `useTeam.invite` → `check_quota('users')` (hard).
- Storage upload helpers (`useDocuments`, `useProjectFiles`) → sum current storage vs `storage_mb` / `kb_storage_mb` (hard).
- `chat/index.ts`: after successful response, call `incrementUsage('ai_requests_month')`. Pre-flight `assertQuota` at very top — this is the only chat/index.ts touch, does NOT alter prompts, intents, retrieval, payload, or streaming format.
- `voice-usage-track` edge function → also increments `voice_minutes_month`.
- `communication-hub` `create` action → `assertQuota('comm_messages_month')` + increment.
- `company-memory` writes → `assertQuota('company_memory_writes_month')` + increment.

VoiceCopilot behaviour unchanged — the existing `useVoiceAccess` daily cap stays; monthly org quota is additive and enforced at the same edge that already tracks seconds.

## Frontend

- `src/lib/plans.ts` — `PUBLIC_PLAN_LABELS`, `toPublicPlan(internal)`.
- `src/hooks/useOrgPlan.ts` — loads `get_org_plan_summary` RPC; exposes plan, limits, usage, refresh.
- `src/hooks/useFeature.ts` — `useFeature('voice_copilot') → boolean`.
- `src/hooks/useQuota.ts` — `useQuota('projects')`.
- `src/components/billing/PlanBadge.tsx`, `UsageBar.tsx`, `QuotaWarningBanner.tsx` (80/95/100% states with Upgrade CTA; native app hides CTA per `isNativeApp`).
- `src/components/billing/PlanLimitsPanel.tsx` — visible in Settings → Plans; renders every metric with progress bar and hard/soft badge.
- `src/components/billing/FeatureGate.tsx` — wraps disabled features with upgrade prompt.
- Update `PricingPanel` + `PricingSection` (landing) to use `PUBLIC_PLAN_LABELS` only. Internal keys still sent to `create-iyzico-payment` unchanged.
- Warning banner mounts once in `Index.tsx` header, driven by `useOrgPlan` — appears at 80% / 95% / blocked.

## Admin

- `src/components/billing/OrgAdminPanel.tsx` (Settings → Kuruluş):
  - list `office_members` with roles (owner/admin/member — reuse existing `office_members.role`).
  - toggle role admin ↔ member (owner only).
  - view + set `organization_feature_overrides` and `organization_limit_overrides` (owner only, with expiry + reason).
- No cross-tenant admin; superadmin remains the existing `profiles.role='admin'` short-circuit.

## Billing (unchanged surface)

`iyzico-callback` continues to write `profiles.plan`. Adds one line: on successful upgrade, insert a `usage_audit_log` row `{metric:'plan_change', reason:'iyzico:'||plan_name}`. Trial / renewal / cancellation flows untouched.

## Files

New:
- `supabase/migrations/<ts>_sprint_11_1_licensing.sql`
- `supabase/functions/_shared/licensing.ts`
- `src/lib/plans.ts`
- `src/hooks/useOrgPlan.ts`, `useFeature.ts`, `useQuota.ts`
- `src/components/billing/{PlanBadge,UsageBar,QuotaWarningBanner,PlanLimitsPanel,FeatureGate,OrgAdminPanel}.tsx`

Edited (thin, mechanical):
- `src/hooks/useProjects.ts`, `useTeam.ts`, `useDocuments.ts`, `useProjectFiles.ts`
- `supabase/functions/chat/index.ts` (top-of-handler quota only)
- `supabase/functions/voice-usage-track/index.ts`
- `supabase/functions/communication-hub/index.ts`
- `supabase/functions/company-memory/index.ts`
- `supabase/functions/iyzico-callback/index.ts`
- `src/components/PricingPanel.tsx`, `src/components/landing/PricingSection.tsx`
- `src/pages/Index.tsx` (mount `QuotaWarningBanner`)

## Explicitly untouched

- `supabase/functions/chat/prompt/*`, `intents/*`, `utils/*` — no prompt/intent/retrieval/payload/streaming diff.
- `supabase/functions/company-memory` retrieval path (read-only paths).
- `VoiceCopilot`, `VoiceBrain`, `voice-stt`, `voice-tts` — behaviour identical; only usage counter added at existing tracker.
- Executive Dashboard, Action Executor, Company Brain widgets.

## Parity checks

After each migration + wiring commit:
1. Chat parity test still passes (intent/SQL/memory/KB/UI/actions/explainability/streaming byte-identical for non-quota'd users).
2. Voice: existing free-tier daily cap behaviour unchanged for users within org quota.
3. Iyzico success flow still flips `profiles.plan` and preserves trial dates.

Stop and report diff if anything drifts.

## Out of scope (future sprints)

- Per-user seat billing.
- Metered add-on packs (extra voice minutes, AI credits).
- Superadmin tenant console.
- Migration of `office_teams` → dedicated `organizations` table (view is enough now).
