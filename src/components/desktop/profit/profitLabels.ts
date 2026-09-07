/**
 * Proje Kârlılığı — kullanıcıya gösterilen sade Türkçe etiketler.
 * Presentation only: hiçbir finansal hesap burada yapılmaz, sadece
 * teknik project-controls terimleri günlük dile çevrilir.
 */

export const PROFIT_LABELS = {
  forecastProfit: "Tahmini Final Kâr",
  originalProfit: "Başlangıçta Beklenen Kâr",
  erosion: "Başlangıca Göre",
  revenue: "Sözleşme / Tahmini Gelir",
  budget: "Başlangıç Bütçesi",
  spent: "Bugüne Kadar Harcanan",
  eac: "Tahmini Final Maliyet",
  committed: "Sipariş Verilmiş / Bağlanmış",
  etc: "Kalan İş İçin Tahmin",
  variance: "Bütçeye Göre",
  progress: "İlerleme",
} as const;

export const PROFIT_TOOLTIPS: Record<string, string> = {
  forecastProfit:
    "Projenin bugünkü gidişatı devam ederse iş bittiğinde elinizde kalması beklenen kâr.",
  originalProfit:
    "Projeye başlarken planladığınız gelir ve bütçeye göre beklenen kâr.",
  revenue:
    "İşverenden bu proje karşılığında almayı beklediğiniz toplam tutar.",
  budget: "Projeye başlarken planladığınız toplam maliyet.",
  spent: "Bugüne kadar fiilen gerçekleşmiş (harcanmış) maliyet.",
  eac:
    "Bugüne kadar gerçekleşen maliyetler ile kalan işleri tamamlamak için beklenen maliyetin toplamıdır.",
  committed:
    "Sipariş veya sözleşme ile bağlanmış, henüz faturası gelmemiş maliyet.",
  etc: "Kalan işleri tamamlamak için beklenen maliyet.",
  variance:
    "Bu kalemin tahmini toplam maliyetinin başlangıç bütçesinden ne kadar sapmış olduğu.",
};

/** Backend risk_type değerleri kullanıcıya asla ham gösterilmez. */
const RISK_TYPE_TITLES: Record<string, string> = {
  unit_price_variance: "Alış fiyatı bütçenin üzerinde",
  eac_budget_overrun: "Tahmini maliyet bütçeyi aşıyor",
  commitment_over_budget: "Verilen siparişler bütçeyi aşıyor",
  cost_progress_mismatch: "Maliyet, ilerlemenin önünde gidiyor",
  profit_erosion: "Tahmini proje kârı düşüyor",
  margin_below_threshold: "Kâr oranı hedefin altına indi",
  profit_concentration: "Kâr kaybı tek bir kalemde yoğunlaşıyor",
  uncoded_cost: "Kategorisi belirlenmemiş maliyetler artıyor",
};

export const riskTitle = (risk: {
  title?: string | null;
  risk_type?: string | null;
  cost_code_name?: string | null;
}): string => {
  if (risk.title && risk.title.trim()) return risk.title.trim();
  const base = RISK_TYPE_TITLES[risk.risk_type ?? ""] ?? "Dikkat gerektiren durum";
  return risk.cost_code_name ? `${risk.cost_code_name}: ${base}` : base;
};

export type Severity = "critical" | "high" | "medium" | "low";

export const SEVERITY_META: Record<Severity, { label: string; color: string; bg: string }> = {
  critical: { label: "KRİTİK", color: "#EF4444", bg: "rgba(239,68,68,0.10)" },
  high: { label: "YÜKSEK", color: "#F59E0B", bg: "rgba(245,158,11,0.10)" },
  medium: { label: "ORTA", color: "#3B82F6", bg: "rgba(59,130,246,0.10)" },
  low: { label: "BİLGİ", color: "#64748B", bg: "rgba(100,116,139,0.10)" },
};

export const severityOf = (s?: string | null): Severity =>
  s === "critical" || s === "high" || s === "medium" || s === "low" ? s : "low";

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export const sortRisks = <T extends { severity?: string | null; financial_impact?: number | null }>(
  rows: T[],
): T[] =>
  [...rows].sort((a, b) => {
    const r = SEVERITY_RANK[severityOf(a.severity)] - SEVERITY_RANK[severityOf(b.severity)];
    if (r !== 0) return r;
    return Number(b.financial_impact ?? 0) - Number(a.financial_impact ?? 0);
  });

/** Ana rakamın altındaki deterministik durum cümlesi (LLM yok). */
export const profitStatusSentence = (erosion: number, formatted: string): string => {
  if (erosion > 0)
    return `Projenin mevcut gidişatına göre final kârınız başlangıç tahmininin ${formatted} altında.`;
  if (erosion < 0)
    return `Projenin tahmini final kârı başlangıç beklentisinin ${formatted} üzerinde.`;
  return "Proje şu anda başlangıç kâr hedefiyle uyumlu ilerliyor.";
};
