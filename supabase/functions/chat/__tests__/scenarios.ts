// ============================================================
// chat/__tests__/scenarios.ts
// Canonical regression fixtures for Construction Brain.
//
// One entry per scenario listed in Sprint 8.2. Each fixture declares:
//   - id             — snapshot filename slug
//   - description    — human-readable purpose
//   - prompt         — the user turn to send to /chat
//   - history        — optional prior conversation turns
//   - voice          — mark as voice-mode request
//   - projectNames   — canonical project list used by the pure classifier
//                      (must stay stable across snapshots — do NOT tie to live DB)
//   - expectIntent   — heuristic intent name we assert on
//   - expectBlocks   — SSE block markers that MUST appear in the streamed
//                      response (::summary / ::table / ::chart / ::kpi /
//                      ::queries / ::memories / ::documents / ::actions).
//                      Only listed markers are asserted; extras are allowed.
//   - expectFilters  — optional subset of `filters` produced by the classifier.
//
// These fixtures are the contract. Adding a scenario is fine; changing an
// existing `expectIntent` / `expectBlocks` means you are changing behaviour
// and the refactor guard has fired — stop and reconcile.
// ============================================================

export type BlockMarker =
  | "::summary"
  | "::table"
  | "::chart"
  | "::kpi"
  | "::queries"
  | "::memories"
  | "::documents"
  | "::actions";

export interface Turn {
  role: "user" | "assistant";
  content: string;
}

export interface Scenario {
  id: string;
  description: string;
  prompt: string;
  history?: Turn[];
  voice?: boolean;
  projectNames: Array<{ id: string; name: string }>;
  expectIntent: string;
  expectBlocks?: BlockMarker[];
  expectFilters?: Record<string, unknown>;
}

// Stable synthetic project list. Never derive from live DB — the whole point
// of the harness is that the fixture is the invariant.
const PROJECTS: Array<{ id: string; name: string }> = [
  { id: "p-arsuz", name: "Arsuz Modern Villa" },
  { id: "p-mersin", name: "Mersin Residence" },
  { id: "p-antalya", name: "Antalya Otel Projesi" },
];

export const SCENARIOS: Scenario[] = [
  {
    id: "01-general-qa",
    description: "General conversational question with no project context.",
    prompt: "Merhaba, bugün nasıl yardımcı olabilirsin?",
    projectNames: PROJECTS,
    expectIntent: "GENERAL_CHAT",
  },
  {
    id: "02-project-status",
    description: "Named project — general overview. NOTE: entity resolver "
      + "does not confidently match this phrasing today (project_name stays "
      + "empty); pinned as baseline.",
    prompt: "Arsuz Modern Villa projesinde genel durum nedir?",
    projectNames: PROJECTS,
    expectIntent: "PROJECT_OVERVIEW",
    expectBlocks: ["::summary"],
  },
  {
    id: "03-executive-brief",
    description: "Executive morning briefing intent.",
    prompt: "Günaydın özet ver bana",
    projectNames: PROJECTS,
    expectIntent: "EXECUTIVE_BRIEFING",
    expectBlocks: ["::summary", "::kpi"],
  },
  {
    id: "04-finance-summary",
    description: "Financial summary across projects.",
    prompt: "Bu ay nakit akış durumu nasıl?",
    projectNames: PROJECTS,
    expectIntent: "FINANCIAL_SUMMARY",
    expectBlocks: ["::summary"],
  },
  {
    id: "05-finance-overdue",
    description: "Overdue payment filter.",
    prompt: "Vadesi geçen ödemeler var mı?",
    projectNames: PROJECTS,
    expectIntent: "OVERDUE_PAYMENTS",
    expectBlocks: ["::table"],
  },
  {
    id: "06-personnel-live",
    description: "Live personnel head-count on site.",
    prompt: "Şu an sahada kaç kişi var?",
    projectNames: PROJECTS,
    expectIntent: "LIVE_PERSONNEL",
    expectBlocks: ["::summary"],
  },
  {
    id: "07-attendance",
    description: "Attendance-adjacent question. NOTE: 'geç kalan' (participle) "
      + "does not match the ATTENDANCE regex which expects 'geç kaldı'; "
      + "'işçi' wins → PERSONNEL_QUERY. Pinned as baseline.",
    prompt: "Bugün geç kalan işçi var mı?",
    projectNames: PROJECTS,
    expectIntent: "PERSONNEL_QUERY",
    expectBlocks: ["::table"],
  },
  {
    id: "08-company-memory",
    description: "Supplier-recall question. NOTE: 'demir' triggers "
      + "MATERIAL_QUERY before any memory-specific matcher. Company Memory "
      + "retrieval still runs alongside the intent; pinned as baseline.",
    prompt: "Tercih ettiğimiz demir tedarikçisi kimdi?",
    projectNames: PROJECTS,
    expectIntent: "MATERIAL_QUERY",
    expectBlocks: ["::memories"],
  },
  {
    id: "09-knowledge-base",
    description: "RAG / document lookup. NOTE: 'beton döküm' hits SITE_DIARY "
      + "regex before DOCUMENT_QUERY. Pinned as baseline; RAG search still "
      + "runs and should emit ::documents.",
    prompt: "Beton döküm prosedürü belgesinde ne yazıyor?",
    projectNames: PROJECTS,
    expectIntent: "SITE_DIARY_QUERY",
    expectBlocks: ["::documents"],
  },
  {
    id: "10-voice-mode",
    description: "Voice-mode lean prompt path.",
    prompt: "Bugünkü işler ne durumda?",
    voice: true,
    projectNames: PROJECTS,
    expectIntent: "TODAYS_TASKS",
  },
  {
    id: "11-action-generation",
    description: "Action-mode: user asks brain to create a hakediş. "
      + "Entity resolver does not match on this phrasing; pinned as baseline.",
    prompt: "Arsuz Modern Villa için Ekim ayı hakedişi oluştur",
    projectNames: PROJECTS,
    expectIntent: "HAKEDIS_QUERY",
    expectBlocks: ["::actions"],
  },
  {
    id: "12-explainability",
    description: "Any data-backed answer must ship ::queries explainability.",
    prompt: "Mersin Residence hakedişlerini göster",
    projectNames: PROJECTS,
    expectIntent: "HAKEDIS_QUERY",
    expectBlocks: ["::table", "::queries"],
    expectFilters: { project_name: "Mersin Residence" },
  },
  {
    id: "13-ui-payload-chart",
    description: "Progress question — expected to render as chart UI block.",
    prompt: "Antalya Otel Projesi ilerleme durumu",
    projectNames: PROJECTS,
    expectIntent: "PROJECT_PROGRESS",
    expectBlocks: ["::chart"],
    expectFilters: { project_name: "Antalya Otel Projesi" },
  },
  {
    id: "14-sticky-project",
    description: "Follow-up turn inherits project from prior assistant reply.",
    prompt: "Peki ödemeler ne durumda?",
    history: [
      { role: "user", content: "Arsuz Modern Villa projesinde durum ne?" },
      { role: "assistant", content: "Arsuz Modern Villa'da işler yolunda." },
      { role: "user", content: "Peki ödemeler ne durumda?" },
    ],
    projectNames: PROJECTS,
    expectIntent: "PAYMENT_QUERY",
  },
];
