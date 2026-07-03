# Toplantı Merkezi (Meeting Center)

AI-powered meeting assistant that turns construction meetings into structured project data: transcript → summary → decisions → tasks → notifications → PDF report. Integrates with Voice Copilot, Communication Center (in progress), Tasks, Site Diary and Project Notes.

## Scope (Phase 1 — shippable)

Included:
- New Office Dashboard module route `#tab=toplanti-merkezi`
- Start / pause / resume / finish live meeting with mic capture
- Live streaming transcription (Turkish + auto) via existing STT
- AI post-meeting analysis: summary, decisions, risks, action items, deadlines, responsibles, numbers, questions, next-meeting suggestion
- Auto task extraction with approval modal before insert into `tasks`
- Meeting history, filters (project, date, participant, tag, status), full-text search across transcripts
- "Ask AI about this meeting" chat (RAG over the meeting's own transcript + summary)
- Premium PDF report (logo, participants, summary, decisions, action items, signature area)
- Project / office / department linking
- Participants list with attendance + speaking time (best-effort from diarization; falls back to manual)
- Voice Copilot client tool `start_meeting` / `stop_meeting` so "Toplantıyı başlat" enters Meeting Mode
- Communication Center hook: after action items approved, offer to dispatch WhatsApp / Push / Email via the dispatch function
- Meeting dashboard cards: today's meetings, pending action items, open decisions, delayed follow-ups, completion rate

Explicitly out of scope for Phase 1 (architecture-ready, not implemented):
- Video meetings, Zoom / Teams / Meet ingestion
- Google / Outlook calendar sync
- Screen recording
- Multi-language simultaneous translation (Phase 1 = TR + EN auto-detect only)
- Real-time speaker identification by voiceprint (Phase 1 = manual speaker labels + segment timing)

## Data model

Five new tables in `public`, all with `user_id` + `team_id` scoping, RLS via existing `can_access_team_resource`, and required GRANTs.

- `meetings` — id, user_id, team_id, project_id (nullable), title, meeting_type (`project|office|department`), status (`scheduled|live|processing|completed|failed`), started_at, ended_at, duration_seconds, audio_path (storage), language, tags[], location, created_by
- `meeting_participants` — id, meeting_id, contact_id (nullable, links to Communication Center `contacts`), display_name, company, role, attended, joined_at, left_at, speaking_seconds
- `meeting_transcripts` — id, meeting_id, seq, speaker_label, text, started_at_ms, ended_at_ms, is_final. Full-text GIN index on `text` (Turkish config)
- `meeting_analyses` — id, meeting_id, summary, decisions jsonb, risks jsonb, action_items jsonb, questions jsonb, numbers jsonb, next_meeting jsonb, model, prompt_version, generated_at
- `meeting_action_items` — id, meeting_id, title, description, assignee_contact_id, assignee_name, due_date, priority, status (`pending|approved|rejected|converted`), created_task_id (fk to `tasks`), notified_at, notified_channels[]

Storage: new private bucket `meeting-audio` (path `<team_id>/<meeting_id>/<segment>.webm`). RLS on `storage.objects` restricts to team members.

## Edge functions

- `meeting-transcribe-chunk` — accepts a self-contained WAV/webm blob, forwards to `openai/gpt-4o-mini-transcribe` (streaming SSE), returns transcript deltas. Frontend streams every ~5s window. Writes finalized segments into `meeting_transcripts`.
- `meeting-analyze` — called on Finish. Loads all transcript rows, runs Gemini 3 Flash with a strict JSON schema (summary + decisions + risks + action_items[{title, assignee, due, priority}] + questions + numbers + next_meeting). Persists to `meeting_analyses` and staged rows in `meeting_action_items` (status=`pending`).
- `meeting-search` — server-side full-text + optional semantic re-rank across transcripts a user can access.
- `meeting-ask` — RAG chat: pulls transcript chunks + analysis for one meeting (or a project's meetings) and answers via Gemini with `[timestamp]` citations.
- `meeting-pdf` — renders premium PDF via jsPDF in the browser (no function needed) OR a Deno function for signed download. Phase 1 = client jsPDF, matching existing report style.

Voice Copilot: extend the existing `construction-brain` tool set and ElevenLabs client tools with `start_meeting({project_id?, title?})`, `stop_meeting()`, `add_meeting_note(text)`.

## Frontend

New module under Office Management, route `#tab=toplanti-merkezi`, lazy-loaded. Structure:

```text
src/components/meetings/
  MeetingCenterPage.tsx          // tabs: Dashboard | Yeni | Geçmiş | Aksiyonlar | Kararlar
  MeetingDashboard.tsx           // cards + upcoming follow-ups
  LiveMeetingPanel.tsx           // timer, waveform, live transcript, pause/resume/finish
  MeetingHistoryList.tsx         // filters + search
  MeetingDetailDrawer.tsx        // transcript timeline + AI chat + analysis tabs
  ActionItemsApproval.tsx        // approve → creates tasks + optional notifications
  MeetingPdfExport.tsx           // jsPDF renderer
  hooks/useMeetingRecorder.ts    // Web Audio → WAV windows → transcribe-chunk
  hooks/useLiveTranscript.ts     // SSE consumer
```

Design language: same dark surface, glass cards, orange accent, Space Grotesk headings, Linear-style timeline for transcript, Notion-style side drawer for detail. Reuses existing `Card`, `Sheet`, `Tabs`, `EmptyState`, `Skeleton`, `Toast`.

## Integrations

- Tasks: approved action items call existing `tasks` insert (respects project + assignee, sets `source='meeting'`, back-links `meeting_id` in `metadata`).
- Communication Center: after task creation, calls the dispatch endpoint from that module with template `meeting_action_assigned` (falls back to a local WhatsApp `wa.me` link if that module's dispatch isn't live yet).
- Site Diary: optional "Add summary to today's site diary" button on completed meeting.
- Project Notes: optional "Save decisions as project notes" button.
- Voice Copilot: `MorningBriefing` already reads today's data — extend to surface "3 açık toplantı aksiyonu" card.

## Premium gating (existing tiers)

- Free: manual notes only, 1 meeting/month, no AI analysis
- Professional: unlimited meetings, AI summary + action items, PDF export
- Business: AI chat over transcripts, cross-meeting search, auto-dispatch via Communication Center
- Enterprise: (future) video ingestion, calendar sync

## Verification

After build:
1. Typecheck passes.
2. Start a meeting, speak 20s, finish → transcript rows exist, `meeting_analyses` row created, at least one `meeting_action_items` staged.
3. Approve one action item → matching row in `tasks` with `metadata.meeting_id`.
4. Voice Copilot "Toplantıyı başlat" opens Live Meeting panel.
5. PDF export renders with logo + participants + action items.

## Rough size

~5 new edge functions (1 already covered by existing STT proxy), 5 tables + 1 bucket + RLS, ~10 new React files, additions to Voice Copilot tool registry and Office Dashboard nav. Estimated 2 build passes (schema + backend, then UI + integrations).
