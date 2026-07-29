# Communication Architecture Audit (no code changed)

## 1. What already exists

**A Communication Hub already exists.** It is a real, working abstraction — not a stub — covering create → approve → send → retry → log, with a dedicated UI tab.

### Providers
| Channel | Status |
|---|---|
| WhatsApp | Meta Cloud API (Graph v20) with text/template/media support; automatic fallback to `wa.me` deep link when credentials are absent. Inbound + status webhook deployed. |
| Email | Modular driver registry: SMTP (live), Lovable built-in (live), Microsoft Graph / Gmail / SendGrid / SES / Mailgun (explicit "not implemented" stubs). |
| SMS, Push, Teams, Slack | Declared in the channel type, **not registered** — `getProvider()` returns null, send fails with "channel not supported". |

### Abstractions
- `supabase/functions/_shared/communication/types.ts` — `CommunicationProvider` interface (`sendMessage`, `previewMessage`), status machine (draft → pending_approval → scheduled → queued → sending → sent → delivered → read → failed → cancelled), priority, message types.
- `providers.ts` — channel registry.
- `email/index.ts` + `email/types.ts` — second-level `EmailDriver` abstraction with per-account config and `verify()`.
- `src/lib/communicationHub.ts` — single typed client; nothing in the app talks to a provider directly.

### Data model
`communication_messages`, `communication_delivery_attempts` (per-attempt audit), `email_accounts` (multi-account, default flag, signature, status/last_error).

### Event bus
Two informal buses, no unified one:
- `workspaceBus` (typed pub/sub: highlight / filter / navigate / preview) — AI Canvas ↔ ERP surfaces only.
- `window` CustomEvents: `navigate-tab`, `open-project`, `canvas-followup`, `voice-*`, `refresh-profile`.
Neither emits or consumes communication events.

### Notifications
- In-app: `useNotifications` (reminders + milestones, localStorage daily dismiss), `useAutoReminders` (derived check/hakediş/contract alerts), `RemindersPanel`.
- Push: FCM v1 via `send-push-notification` (`send` + daily `scan` mode), `push_subscriptions`, `notification_history`, `notification_preferences`, cron `push-daily-scan` 06:00.

### Email integrations (two separate systems)
1. Lovable Emails infra: `send-transactional-email`, `auth-email-hook`, `process-email-queue`, pgmq queues, suppression + unsubscribe, 8 React Email app templates + 6 auth templates.
2. Communication Hub email (user's own SMTP/accounts, approval-gated, logged in the hub).

### Template system
- Rich for Lovable transactional email (React Email registry).
- WhatsApp: Meta-side template names + variables passed through — no local catalogue or editor.
- Hub: **no** reusable template/snippet table for ad-hoc messages.

### Scheduling
Status `scheduled` + `scheduled_at` + index exist, and the UI has a "Planlı" tab — but there is **no cron job** that dispatches due messages. Only `process-subscriptions-daily` and `push-daily-scan` exist. Scheduled hub messages currently never send by themselves.

### Action Executor
`useActionExecutor` supports `send_whatsapp` and `send_email`, but they open `wa.me` / `mailto:` directly — they **bypass the hub**, so no approval, no logging, no retry. `actionRegistry.ts` has the same shortcut.

### AI integrations
`chat` function has a tool loop with 8 mutation tools (payment, task, hakediş, site diary, material, personnel, contract) plus `resolve_lookups`. Voice (OpenAI Realtime + tool bus), morning briefing, AI Operations Brain. **No AI tool can draft or queue a communication message.**

## 2. What is missing
- Scheduler/dispatcher cron for `status='scheduled'` and automatic retry of `failed` (retryable) messages.
- SMS, Push, Teams, Slack providers (types promise them, registry does not deliver).
- Message template catalogue for the hub (reusable Turkish bodies with variables, per channel).
- Communication event bus: no domain event (hakediş approved, payment overdue, check due) automatically produces a message draft.
- AI tools: `draft_message` / `send_message` in chat and voice tool sets.
- Delivery status ingestion into the hub UI beyond the WhatsApp webhook (no unified read/delivered timeline surface, no email bounce feedback into `communication_messages`).
- Recipient/contact directory — recipients are free-text phone/email, not linked to personnel/subcontractors.
- Quota/rate protection is only counted (`comm_messages_month`), never enforced.

## 3. What should be improved
- **One send path.** Route `useActionExecutor` and `actionRegistry` WhatsApp/email through `communicationHub`, keeping deep-link/mailto only as the provider-level fallback.
- **Two email systems** — document the boundary: system/auth emails → Lovable infra; user-authored/AI-drafted → hub. Optionally register a hub driver that delegates to `send-transactional-email` for branded templates.
- Hub function is a single 290-line switch; split actions into modules as channels grow.
- Retry has no backoff and `max_retries` is not enforced server-side.
- Add project/entity context to every message (`project_id`, `related_action` exist but are rarely populated) so communications show up on project timelines.

## 4. Verdict
A Communication Hub exists and is architecturally sound (provider abstraction, status machine, audit trail, approval gate, UI). It is roughly a solid v1 covering WhatsApp + email. What is missing is the **automation layer**: scheduler, event-driven triggers, AI drafting, templates, and additional channels.

## 5. Recommended roadmap
1. **Dispatcher (highest value, smallest change).** Cron every minute → send due `scheduled` messages and retry retryable `failed` with backoff, enforcing `max_retries`.
2. **Unify send paths.** Action Executor + action registry go through the hub; add an approval sheet for AI-originated messages.
3. **Template catalogue.** `communication_templates` table (channel, name, subject, body, variables) + picker in the Communication Center and in AI drafts.
4. **AI drafting tools.** `draft_message` tool in `chat` and the voice tool bus, always landing in `pending_approval`.
5. **Event-driven triggers.** Map existing derived alerts (`useAutoReminders`, subcontractor check alerts, overdue payments) to rule-based draft creation, with per-user opt-in in notification preferences.
6. **Channel expansion.** SMS provider first (a real gap for site personnel), then Slack/Teams for office workflows; push already has its own path and can register as a hub provider for unified logging.
7. **Contacts + reporting.** Link recipients to personnel/subcontractors, then a communications timeline per project and a delivery-rate report.

*Audit only — no files were modified.*
