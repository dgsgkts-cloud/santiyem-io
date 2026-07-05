// canvasAdapter — pure helpers that shape a Canvas turn from primitives the
// chat/voice pipelines already produce. No brain / prompt / renderer logic.

import type { AIUiPayload } from "@/components/ai/AIResponseRenderer";
import type { CanvasStatus, CanvasTurn } from "@/hooks/useCanvasTurns";

export const STATUS_LABELS: Record<CanvasStatus, string> = {
  idle: "Hazır",
  listening: "Dinliyor",
  understanding: "Anlıyor",
  searching: "Arıyor",
  "reading-memory": "Hafıza okunuyor",
  "reading-knowledge": "Mevzuat okunuyor",
  calculating: "Hesaplıyor",
  preparing: "Görseller hazırlanıyor",
  speaking: "Konuşuyor",
  completed: "Tamamlandı",
  error: "Hata",
};

export const STATUS_TONE: Record<CanvasStatus, string> = {
  idle: "bg-muted text-muted-foreground",
  listening: "bg-sky-500/15 text-sky-500 border border-sky-500/30",
  understanding: "bg-indigo-500/15 text-indigo-500 border border-indigo-500/30",
  searching: "bg-violet-500/15 text-violet-500 border border-violet-500/30",
  "reading-memory": "bg-fuchsia-500/15 text-fuchsia-500 border border-fuchsia-500/30",
  "reading-knowledge": "bg-teal-500/15 text-teal-500 border border-teal-500/30",
  calculating: "bg-amber-500/15 text-amber-500 border border-amber-500/30",
  preparing: "bg-orange-500/15 text-orange-500 border border-orange-500/30",
  speaking: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30",
  completed: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30",
  error: "bg-red-500/15 text-red-500 border border-red-500/30",
};

/** Derives completed-step badges from what the response actually returned. */
export const deriveThinkingSteps = (turn: Pick<CanvasTurn, "ui" | "meta" | "speech">) => {
  const steps: { label: string; done: true }[] = [];
  steps.push({ label: "Soru anlaşıldı", done: true });
  if (turn.meta?.project || turn.meta?.recordsAnalysed) steps.push({ label: "Projeler tarandı", done: true });
  const kinds = new Set(turn.meta?.sources?.map((s) => s.kind || s.label.toLowerCase()) ?? []);
  if (kinds.has("memory") || kinds.has("company_memory")) steps.push({ label: "Şirket hafızası okundu", done: true });
  if (kinds.has("kb") || kinds.has("knowledge") || kinds.has("document")) steps.push({ label: "Mevzuat belgeleri okundu", done: true });
  if (turn.ui.some((u) => ["kpi", "kpi_cards", "metrics", "bar_chart", "line_chart", "pie_chart", "chart", "progress"].includes(String(u.type)))) {
    steps.push({ label: "Hesaplamalar yapıldı", done: true });
    steps.push({ label: "Görseller hazırlandı", done: true });
  } else if (turn.ui.length > 0) {
    steps.push({ label: "Görseller hazırlandı", done: true });
  }
  steps.push({ label: "Yanıt üretildi", done: true });
  return steps;
};

/** Fallback follow-ups when the assistant did not supply any. */
export const DEFAULT_FOLLOWUPS = [
  "Geçen ay ile karşılaştır",
  "Projeye göre dağılım",
  "Bu konuda rapor oluştur",
  "Kim sorumlu?",
];

export const getFollowups = (turn: Pick<CanvasTurn, "meta">) =>
  (turn.meta?.followups && turn.meta.followups.length > 0
    ? turn.meta.followups
    : DEFAULT_FOLLOWUPS
  ).slice(0, 4);

/** Ships a follow-up back into the chat input via a global event. */
export const dispatchFollowup = (text: string) => {
  window.dispatchEvent(new CustomEvent("canvas-followup", { detail: { text } }));
};

/** Detect a "summary-only" turn (no visual payload) so SummaryCard renders. */
export const isSummaryOnly = (ui: AIUiPayload[]) => ui.length === 0;

export const inferTitle = (turn: Pick<CanvasTurn, "meta" | "question">) =>
  turn.meta?.title || turn.question.trim().slice(0, 80) || "AI Yanıtı";
