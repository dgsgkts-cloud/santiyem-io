/**
 * Toplantı Merkezi — AI aksiyon motoru modeli.
 *
 * Boru hattı: Ses → Yazıya çevirme → Konuşmacı ayrımı → AI analizi → Görev.
 * Her aşamanın kullanıcıya gösterilecek kendi durumu vardır; AI çıktısı
 * "öneri" olarak kalır, göreve dönüşmesi kullanıcı onayına bağlıdır.
 */

export type PipelineStage =
  | "idle"
  | "recording"
  | "transcribing"
  | "diarizing"
  | "analyzing"
  | "ready"
  | "transcript_missing"
  | "failed";

export const STAGE_ORDER: PipelineStage[] = ["recording", "transcribing", "diarizing", "analyzing", "ready"];

export const STAGE_META: Record<PipelineStage, { label: string; hint: string; busy: boolean }> = {
  idle: { label: "Hazır", hint: "Toplantı henüz işlenmedi.", busy: false },
  recording: { label: "Kayıt alınıyor", hint: "Konuşma kaydediliyor.", busy: true },
  transcribing: { label: "Yazıya dönüştürülüyor", hint: "Kayıt metne çevriliyor.", busy: true },
  diarizing: { label: "Konuşmacılar ayrılıyor", hint: "Kim ne söyledi belirleniyor.", busy: true },
  analyzing: { label: "Analiz hazırlanıyor", hint: "Özet, kararlar ve aksiyonlar çıkarılıyor.", busy: true },
  ready: { label: "Analiz hazır", hint: "Özet, kararlar ve aksiyonlar hazır.", busy: false },
  transcript_missing: {
    label: "Konuşma metni yok",
    hint: "Kayıttan metin çıkarılamadı. Mikrofon sessiz kalmış olabilir.",
    busy: false,
  },
  failed: { label: "İşlem başarısız", hint: "Analiz tamamlanamadı. Yeniden deneyebilirsiniz.", busy: false },
};

export const stageMeta = (stage?: string | null) =>
  STAGE_META[(stage || "idle") as PipelineStage] ?? STAGE_META.idle;

export const ACTION_STATUS_LABEL: Record<string, string> = {
  pending: "Onay bekliyor",
  approved: "Onaylandı",
  converted: "Göreve dönüştü",
  rejected: "Reddedildi",
  done: "Tamamlandı",
};

export const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Acil",
  high: "Yüksek",
  medium: "Normal",
  low: "Düşük",
};

/** `meeting_action_items.priority` → `tasks.priority` (görev tablosu 'normal' kullanır). */
export const toTaskPriority = (p?: string | null) =>
  p === "medium" || !p ? "normal" : ["low", "high", "urgent"].includes(p) ? p : "normal";

export type SpeakerMap = Record<string, string>;

/** "Konuşmacı A" → eşleştirilmiş gerçek isim (eşleşme yoksa etiketin kendisi). */
export const speakerName = (label: string | null | undefined, map: SpeakerMap) => {
  if (!label) return null;
  return map[label]?.trim() || label;
};

/** Metin içindeki konuşmacı etiketlerini eşleştirilmiş isimlerle değiştirir. */
export const applySpeakerMap = (text: string | null | undefined, map: SpeakerMap) => {
  if (!text) return text || "";
  let out = text;
  for (const [label, name] of Object.entries(map)) {
    if (!name?.trim()) continue;
    out = out.split(label).join(name.trim());
  }
  return out;
};

export const confidenceTone = (c?: number | null) => {
  if (c == null) return { label: "Güven belirtilmedi", tone: "neutral" as const };
  if (c >= 0.75) return { label: `Yüksek güven · %${Math.round(c * 100)}`, tone: "positive" as const };
  if (c >= 0.5) return { label: `Orta güven · %${Math.round(c * 100)}`, tone: "attention" as const };
  return { label: `Düşük güven · %${Math.round(c * 100)}`, tone: "overdue" as const };
};

export type MeetingActionItem = {
  id: string;
  meeting_id: string;
  title: string;
  description: string | null;
  assignee_name: string | null;
  assignee_user_id: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  created_task_id: string | null;
  source_quote: string | null;
  speaker_label: string | null;
  confidence: number | null;
};

export type MeetingAnalysis = {
  summary: string | null;
  decisions: Array<{ title?: string; detail?: string; speaker?: string | null; source_quote?: string; confidence?: number }>;
  risks: Array<{ title?: string; impact?: string }>;
  action_items: any[];
  questions: string[];
  open_questions: Array<{ question?: string; context?: string; owner?: string | null }>;
  speakers: string[];
  numbers: Array<{ label?: string; value?: string }>;
  next_meeting: { suggested_date?: string | null; topics?: string[] } | null;
  generated_at?: string | null;
};

export type TranscriptSegment = {
  id: string;
  seq: number;
  text: string;
  started_at_ms: number;
  speaker_label: string | null;
  speaker_confidence: number | null;
};
