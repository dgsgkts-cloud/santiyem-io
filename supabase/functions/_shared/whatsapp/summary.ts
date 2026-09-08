// ============================================================
// WhatsApp Yönetici Özeti — deterministik payload + mesaj metni.
//
// KESİN KURAL: bu dosya hiçbir finansal hesap YAPMAZ.
// Tüm rakamlar `whatsapp_summary_snapshot` (mevcut project_financials /
// risk motoru) ve Profit/Risk Agent'ın kayıtlı içgörülerinden gelir.
// Saf TypeScript — Deno/Node bağımlılığı yoktur, birim testlerde doğrudan
// import edilebilir.
// ============================================================

export type SummaryKind = "daily_summary" | "weekly_summary" | "test_summary";

/** Mesajda gösterilecek en fazla konu sayısı (madde 9). */
export const MAX_TOPICS = 3;

export interface SnapshotProject {
  id: string;
  name: string;
  status?: string | null;
  forecast_final_profit?: number | null;
  profit_erosion?: number | null;
  is_ready?: boolean | null;
}

export interface SnapshotRisk {
  id: string;
  project_id: string;
  project_name?: string | null;
  severity?: string | null;
  title?: string | null;
  financial_impact?: number | null;
}

export interface SummarySnapshot {
  active_project_count: number;
  ready_count: number;
  portfolio_forecast_profit: number;
  portfolio_expected_profit: number;
  portfolio_profit_erosion: number;
  projects: SnapshotProject[];
  top_risks: SnapshotRisk[];
}

export interface AgentInsight {
  project_id?: string | null;
  title: string;
  summary?: string | null;
  financial_impact?: number | null;
  priority?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface SummaryTopic {
  severity: "critical" | "attention";
  project_name: string | null;
  headline: string;
  impact: number | null;
  source: "agent_insight" | "risk_engine";
}

export interface SummaryPayload {
  kind: SummaryKind;
  active_project_count: number;
  ready_count: number;
  portfolio_forecast_profit: number;
  portfolio_profit_erosion: number;
  /** En fazla MAX_TOPICS konu. */
  top_topics: SummaryTopic[];
  /** Analiz için hiç hazır proje yoksa mesaj bunu söyler. */
  data_ready: boolean;
  link: string;
  generated_at: string;
}

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v) || 0);

const nameOf = (projects: SnapshotProject[], id?: string | null) =>
  projects.find((p) => String(p.id) === String(id ?? ""))?.name ?? null;

const sevOf = (s?: string | null): "critical" | "attention" =>
  s === "critical" || s === "high" ? "critical" : "attention";

/**
 * Konu seçimi deterministiktir: önce Profit/Risk Agent'ın kayıtlı içgörüleri
 * (priority sırasıyla), yeterli değilse risk motorunun en önemli kayıtları.
 * Aynı proje + aynı başlık iki kez girmez.
 */
export function buildSummaryPayload(
  snapshot: SummarySnapshot,
  insights: AgentInsight[],
  opts: { kind: SummaryKind; link: string; now?: Date },
): SummaryPayload {
  const projects = snapshot.projects ?? [];
  const topics: SummaryTopic[] = [];
  const seen = new Set<string>();

  const add = (t: SummaryTopic) => {
    const key = `${t.project_name ?? "-"}|${t.headline.toLowerCase()}`;
    if (seen.has(key) || topics.length >= MAX_TOPICS) return;
    seen.add(key);
    topics.push(t);
  };

  [...(insights ?? [])]
    .sort((a, b) => num(a.priority ?? 99) - num(b.priority ?? 99))
    .forEach((i) => {
      if (!i?.title) return;
      add({
        severity: sevOf((i.metadata?.severity as string | undefined) ?? null),
        project_name: nameOf(projects, i.project_id),
        headline: i.title,
        impact: i.financial_impact === null || i.financial_impact === undefined ? null : num(i.financial_impact),
        source: "agent_insight",
      });
    });

  (snapshot.top_risks ?? []).forEach((r) => {
    if (!r?.title) return;
    add({
      severity: sevOf(r.severity),
      project_name: r.project_name ?? nameOf(projects, r.project_id),
      headline: r.title,
      impact: r.financial_impact === null || r.financial_impact === undefined ? null : num(r.financial_impact),
      source: "risk_engine",
    });
  });

  return {
    kind: opts.kind,
    active_project_count: num(snapshot.active_project_count),
    ready_count: num(snapshot.ready_count),
    portfolio_forecast_profit: num(snapshot.portfolio_forecast_profit),
    portfolio_profit_erosion: num(snapshot.portfolio_profit_erosion),
    top_topics: topics.slice(0, MAX_TOPICS),
    data_ready: num(snapshot.ready_count) > 0,
    link: opts.link,
    generated_at: (opts.now ?? new Date()).toISOString(),
  };
}

/* ------------------------------------------------------------- biçimlendirme */

const tr = (v: number, digits = 0) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** ₺42,8M / ₺735.000 — WhatsApp'ta kısa okunur biçim. */
export function money(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}₺${tr(abs / 1_000_000, 1)}M`;
  return `${sign}₺${tr(abs)}`;
}

const GREETING: Record<SummaryKind, string> = {
  daily_summary: "Şantiyem AI | Günaydın",
  weekly_summary: "Şantiyem AI | Haftalık Özet",
  test_summary: "Şantiyem AI — Deneme Özeti",
};

/** WhatsApp mesaj metni — 15–20 saniyede okunacak kadar kısa. */
export function renderSummaryMessage(p: SummaryPayload): string {
  const lines: string[] = [GREETING[p.kind], ""];

  if (!p.data_ready) {
    lines.push(
      p.active_project_count > 0
        ? `${p.active_project_count} aktif projeniz var, kârlılık analizi için başlangıç bütçesi bekleniyor.`
        : "Henüz kârlılık analizi yapılabilecek aktif proje bulunmuyor.",
      "",
      "Şantiyem'de Hazırla",
      p.link,
    );
    return lines.join("\n");
  }

  const n = p.top_topics.length;
  lines.push(
    n > 0
      ? `${p.active_project_count} aktif projenizde ${p.kind === "weekly_summary" ? "bu hafta" : "bugün"} ${n} konu dikkatinizi gerektiriyor.`
      : `${p.active_project_count} aktif projenizde kritik yeni bir değişiklik görünmüyor.`,
  );

  p.top_topics.forEach((t) => {
    lines.push("");
    lines.push(`${t.severity === "critical" ? "🔴" : "🟠"} ${t.project_name ?? "Portföy"}`);
    lines.push(t.headline);
    if (t.impact !== null && t.impact !== 0) lines.push(`Tahmini etki: ${money(Math.abs(t.impact))}`);
  });

  lines.push("", "Toplam tahmini final kâr:", money(p.portfolio_forecast_profit));
  if (p.portfolio_profit_erosion > 0) {
    lines.push("", "Başlangıca göre kâr kaybı:", money(p.portfolio_profit_erosion));
  }
  lines.push("", "Detayları Şantiyem'de Gör", p.link);

  return lines.join("\n");
}

/* ------------------------------------------------------- zamanlama / dönem */

export interface RecipientSchedule {
  summary_frequency: "daily" | "weekly" | "off";
  preferred_time: string; // "08:00" | "08:00:00"
  timezone: string;
  weekday: number; // 0=Pazar
  is_active: boolean;
  opt_in: boolean;
}

export interface ZonedNow {
  date: string; // YYYY-MM-DD (yerel)
  minutes: number; // gün içindeki dakika (yerel)
  weekday: number; // 0=Pazar
  isoWeek: string; // YYYY-Www benzeri dönem anahtarı
}

/** Sunucu saat dilimine güvenmeden alıcının yerel zamanını çözer. */
export function zonedNow(now: Date, timeZone: string): ZonedNow {
  let parts: Record<string, string> = {};
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    });
    fmt.formatToParts(now).forEach((p) => { parts[p.type] = p.value; });
  } catch {
    return zonedNow(now, "UTC");
  }
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const minutes = Number(parts.hour === "24" ? 0 : parts.hour) * 60 + Number(parts.minute);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday ?? "Mon");
  // Yıl + haftanın kaçıncı günü üzerinden basit hafta anahtarı
  const d = new Date(`${date}T00:00:00Z`);
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.floor((d.getTime() - jan1.getTime()) / (7 * 86_400_000)) + 1;
  return { date, minutes, weekday: weekday < 0 ? 1 : weekday, isoWeek: `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}` };
}

const toMinutes = (time: string) => {
  const [h, m] = String(time || "08:00").split(":");
  return Number(h) * 60 + Number(m || 0);
};

/** Aynı alıcı + aynı dönem için sabit anahtar (duplicate koruması). */
export function periodKey(kind: SummaryKind, z: ZonedNow, now = new Date()): string {
  if (kind === "weekly_summary") return z.isoWeek;
  if (kind === "test_summary") return `test-${now.toISOString()}`;
  return z.date;
}

/**
 * Alıcı şu an gönderime uygun mu? Tercih edilen saatten sonra ve aynı gün
 * içinde `windowMinutes` genişliğinde bir pencerede true döner; duplicate
 * koruması ayrıca veritabanı tekillik kuralıyla sağlanır.
 */
export function isDue(
  r: RecipientSchedule,
  now: Date,
  windowMinutes = 180,
): { due: boolean; kind: SummaryKind; zoned: ZonedNow } {
  const zoned = zonedNow(now, r.timezone || "Europe/Istanbul");
  const kind: SummaryKind = r.summary_frequency === "weekly" ? "weekly_summary" : "daily_summary";
  if (!r.is_active || !r.opt_in || r.summary_frequency === "off") return { due: false, kind, zoned };
  if (r.summary_frequency === "weekly" && zoned.weekday !== r.weekday) return { due: false, kind, zoned };
  const target = toMinutes(r.preferred_time);
  const delta = zoned.minutes - target;
  return { due: delta >= 0 && delta <= windowMinutes, kind, zoned };
}
