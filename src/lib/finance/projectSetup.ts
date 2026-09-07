// Proje kârlılık kurulumu (onboarding) — veri katmanı.
// Hiçbir finansal hesap burada yapılmaz: girilen tutarlar olduğu gibi
// veritabanı kurulum fonksiyonuna gönderilir, sonuç oradan okunur.

import { supabase } from "@/integrations/supabase/client";

export interface SetupSummary {
  project_id: string;
  project_name: string | null;
  original_revenue: number | null;
  forecast_revenue: number | null;
  contract_amount: number | null;
  total_budget: number;
  actual_cost: number;
  expense_cost: number;
  invoice_cost: number;
  subcontractor_cost: number;
  open_commitments: number;
  budget_item_count: number;
}

export interface SetupItem {
  code?: string;
  name: string;
  amount: number;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  parent_code?: string;
  parent_name?: string;
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const nullableNum = (v: unknown) => (v === null || v === undefined ? null : Number(v));

const toSummary = (raw: Record<string, unknown>): SetupSummary => ({
  project_id: String(raw.project_id ?? ""),
  project_name: (raw.project_name as string) ?? null,
  original_revenue: nullableNum(raw.original_revenue),
  forecast_revenue: nullableNum(raw.forecast_revenue),
  contract_amount: nullableNum(raw.contract_amount),
  total_budget: num(raw.total_budget),
  actual_cost: num(raw.actual_cost),
  expense_cost: num(raw.expense_cost),
  invoice_cost: num(raw.invoice_cost),
  subcontractor_cost: num(raw.subcontractor_cost),
  open_commitments: num(raw.open_commitments),
  budget_item_count: num(raw.budget_item_count),
});

export const fetchSetupSummary = async (projectId: string): Promise<SetupSummary> => {
  const { data, error } = await supabase.rpc("pi_project_setup_summary" as never, {
    _project_id: projectId,
  } as never);
  if (error) throw error;
  return toSummary((data ?? {}) as Record<string, unknown>);
};

export const saveProjectSetup = async (params: {
  projectId: string;
  originalRevenue?: number | null;
  forecastRevenue?: number | null;
  totalBudget?: number | null;
  items?: SetupItem[];
}): Promise<SetupSummary> => {
  const { data, error } = await supabase.rpc("pi_setup_project_budget" as never, {
    _project_id: params.projectId,
    _original_revenue: params.originalRevenue ?? null,
    _forecast_revenue: params.forecastRevenue ?? null,
    _total_budget: params.totalBudget ?? null,
    _items: (params.items ?? []) as never,
  } as never);
  if (error) throw error;
  return toSummary((data ?? {}) as Record<string, unknown>);
};

/* ------------------------------------------------------------------ */
/* Hazır iş kalemi şablonları                                          */
/* ------------------------------------------------------------------ */

export const PROJECT_TYPES = [
  "Konut",
  "Villa",
  "Ticari Yapı",
  "Fabrika / Endüstriyel",
  "Renovasyon",
  "Diğer",
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

/** Ana kategoriler — kullanıcı serbestçe seçer, zorunlu değil. */
export const MAIN_CATEGORIES = [
  "Kaba Yapı",
  "İnce İşler",
  "Mekanik",
  "Elektrik",
  "Cephe",
  "Peyzaj",
  "Diğer",
];

/** Şablonlar yalnızca başlangıç önerisidir; kullanıcı ekler/siler/düzenler. */
export const TEMPLATES: Record<ProjectType, { group: string; items: string[] }[]> = {
  "Konut": [
    { group: "Kaba Yapı", items: ["Beton", "Demir", "Kalıp", "Duvar"] },
    { group: "İnce İşler", items: ["Sıva", "Boya", "Seramik", "Zemin", "Kapı"] },
    { group: "MEP", items: ["Mekanik", "Elektrik"] },
    { group: "Cephe", items: [] },
    { group: "Peyzaj", items: [] },
    { group: "Diğer", items: [] },
  ],
  "Villa": [
    { group: "Kaba Yapı", items: ["Beton", "Demir", "Kalıp", "Duvar"] },
    { group: "İnce İşler", items: ["Sıva", "Boya", "Seramik", "Ahşap İşleri"] },
    { group: "MEP", items: ["Mekanik", "Elektrik", "Havuz"] },
    { group: "Cephe", items: [] },
    { group: "Peyzaj", items: [] },
  ],
  "Ticari Yapı": [
    { group: "Kaba Yapı", items: ["Beton", "Demir", "Çelik Konstrüksiyon"] },
    { group: "İnce İşler", items: ["Alçıpan", "Boya", "Zemin", "Asma Tavan"] },
    { group: "MEP", items: ["Mekanik", "Elektrik", "Yangın"] },
    { group: "Cephe", items: [] },
    { group: "Diğer", items: [] },
  ],
  "Fabrika / Endüstriyel": [
    { group: "Kaba Yapı", items: ["Temel", "Çelik Konstrüksiyon", "Saha Betonu"] },
    { group: "Kaplama", items: ["Çatı", "Cephe Paneli"] },
    { group: "MEP", items: ["Mekanik", "Elektrik", "Basınçlı Hava"] },
    { group: "Altyapı", items: [] },
    { group: "Diğer", items: [] },
  ],
  "Renovasyon": [
    { group: "Yıkım / Söküm", items: [] },
    { group: "İnce İşler", items: ["Sıva", "Boya", "Seramik", "Zemin"] },
    { group: "MEP", items: ["Mekanik", "Elektrik"] },
    { group: "Diğer", items: [] },
  ],
  "Diğer": [
    { group: "Kaba Yapı", items: [] },
    { group: "İnce İşler", items: [] },
    { group: "MEP", items: [] },
    { group: "Diğer", items: [] },
  ],
};

/** Türkçe/Latin karakterlerden güvenli, kısa bir iş kodu üretir. */
export const makeCode = (name: string, index: number): string => {
  const map: Record<string, string> = {
    ç: "c", Ç: "C", ğ: "g", Ğ: "G", ı: "i", İ: "I",
    ö: "o", Ö: "O", ş: "s", Ş: "S", ü: "u", Ü: "U",
  };
  const ascii = name.replace(/[çÇğĞıİöÖşŞüÜ]/g, (c) => map[c] ?? c);
  const base = ascii.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  return base ? `${base}-${index + 1}` : `KALEM-${index + 1}`;
};

/** "1.250.000,50" / "1250000.5" → 1250000.5 (geçersizse 0) */
export const parseAmount = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v === null || v === undefined) return 0;
  const s = String(v).replace(/[^\d,.\-]/g, "").trim();
  if (!s) return 0;
  const normalized =
    s.includes(",") && s.lastIndexOf(",") > s.lastIndexOf(".")
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(/,/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

/* ------------------------------------------------------------------ */
/* Excel okuma + kolon eşleştirme                                      */
/* ------------------------------------------------------------------ */

export type SheetRow = (string | number | null)[];
export type FieldKey = "code" | "name" | "quantity" | "unit" | "unit_price" | "amount";

export const FIELD_LABELS: Record<FieldKey, string> = {
  code: "İş Kodu",
  name: "İş Kalemi",
  quantity: "Miktar",
  unit: "Birim",
  unit_price: "Birim Fiyat",
  amount: "Bütçe Tutarı",
};

const FIELD_PATTERNS: Record<FieldKey, RegExp> = {
  code: /poz|kod|no\b/i,
  name: /kalem|tanım|tanim|açıklama|aciklama|iş adı|is adi|imalat|ad$/i,
  quantity: /miktar|metraj|adet|qty/i,
  unit: /birim$|ölçü|olcu|unit$/i,
  unit_price: /birim fiyat|b\.fiyat|fiyat|unit price/i,
  amount: /tutar|toplam|bedel|amount|total/i,
};

export interface ParsedSheet {
  headers: string[];
  rows: SheetRow[];
  mapping: Partial<Record<FieldKey, number>>;
}

/** Excel/CSV dosyasını okur, başlık satırını bulur ve kolonları önerir. */
export const parseBudgetFile = async (file: File): Promise<ParsedSheet> => {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const all = XLSX.utils.sheet_to_json<SheetRow>(sheet, { header: 1, blankrows: false, raw: true });

  // Başlık satırı: en az iki metin hücresi içeren ilk satır.
  let headerIdx = 0;
  for (let i = 0; i < Math.min(all.length, 15); i++) {
    const textCells = (all[i] ?? []).filter((c) => typeof c === "string" && c.trim().length > 1);
    if (textCells.length >= 2) { headerIdx = i; break; }
  }

  const headers = (all[headerIdx] ?? []).map((c, i) =>
    String(c ?? "").trim() || `Kolon ${i + 1}`,
  );
  const rows = all.slice(headerIdx + 1).filter((r) => (r ?? []).some((c) => String(c ?? "").trim() !== ""));

  const mapping: Partial<Record<FieldKey, number>> = {};
  const used = new Set<number>();
  (Object.keys(FIELD_PATTERNS) as FieldKey[]).forEach((key) => {
    const idx = headers.findIndex((h, i) => !used.has(i) && FIELD_PATTERNS[key].test(h));
    if (idx >= 0) { mapping[key] = idx; used.add(idx); }
  });

  return { headers, rows, mapping };
};

/** Eşleştirmeye göre içe aktarılacak kalemleri üretir (tutar = tutar ya da miktar × birim fiyat). */
export const buildItemsFromSheet = (
  parsed: ParsedSheet,
  mapping: Partial<Record<FieldKey, number>>,
): SetupItem[] => {
  const cell = (row: SheetRow, key: FieldKey) => {
    const i = mapping[key];
    return i === undefined ? undefined : row[i];
  };
  const out: SetupItem[] = [];
  parsed.rows.forEach((row, i) => {
    const name = String(cell(row, "name") ?? "").trim();
    if (!name) return;
    const quantity = parseAmount(cell(row, "quantity"));
    const unitPrice = parseAmount(cell(row, "unit_price"));
    const direct = parseAmount(cell(row, "amount"));
    const amount = direct > 0 ? direct : quantity * unitPrice;
    if (amount <= 0) return;
    const rawCode = String(cell(row, "code") ?? "").trim();
    out.push({
      code: rawCode || makeCode(name, i),
      name,
      amount,
      quantity: quantity || undefined,
      unit: String(cell(row, "unit") ?? "").trim() || undefined,
      unit_price: unitPrice || undefined,
    });
  });
  // Aynı kod birden fazla satırda geçerse tek kaleme toplanır (kopya oluşmaz).
  const merged = new Map<string, SetupItem>();
  out.forEach((it) => {
    const key = (it.code ?? it.name).toLowerCase();
    const prev = merged.get(key);
    if (prev) {
      prev.amount += it.amount;
      prev.quantity = (prev.quantity ?? 0) + (it.quantity ?? 0) || undefined;
    } else merged.set(key, { ...it });
  });
  return [...merged.values()];
};
