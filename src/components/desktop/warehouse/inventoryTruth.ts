// DEPO FOUNDATION — Phase 0: canonical inventory truth layer.
//
// Every number in the Depo & Envanter module must come from this file, which
// reads ONLY real records (public.materials, material_entries, material_exits).
// Nothing here is seeded, sampled or invented. Where evidence is missing the
// helpers return an explicit "insufficient data" state instead of a number.
//
// Phase 0 scope: material master classification + unit integrity + canonical
// on-hand/reserved/available + weighted-average cost + forecast eligibility.
// Warehouses, transfers, assignments and count sessions have no backing tables
// yet, so their collections are intentionally empty (not faked).

import type { Material, MaterialEntry, MaterialExit } from "@/hooks/useMaterials";

/* ────────────────────────────── truthful copy ─────────────────────────────── */

export const TRUTH_COPY = {
  noForecast: "Tahmin için yeterli veri bulunmuyor.",
  noForecastHint:
    "Tüketim geçmişi veya planlanmış ihtiyaç girildiğinde tahmin oluşturulabilir.",
  noCapacity: "Kapasite verisi tanımlanmadı.",
  noPerformance: "Performans verisi bulunmuyor.",
  noMovements: "Henüz malzeme hareketi bulunmuyor.",
  noStock: "Bu depoda henüz stok kaydı bulunmuyor.",
  noTransfers: "Açık transfer bulunmuyor.",
  noAssignments: "Aktif zimmet bulunmuyor.",
  noCounts: "Henüz sayım başlatılmadı.",
  noAnalytics: "Seçili dönem için yeterli hareket verisi bulunmuyor.",
  noPriceHistory: "Fiyat geçmişi bulunmuyor.",
  needsValidation: "Veri doğrulaması gerekli.",
  notImplemented: "Bu işlem için altyapı henüz tamamlanmadı.",
} as const;

/* ─────────────────────── material master: unit integrity ──────────────────── */

/** Canonical base units the system accepts. */
export const BASE_UNITS = ["kg", "ton", "adet", "m", "m2", "m3", "lt", "paket", "torba"] as const;
export type BaseUnit = (typeof BASE_UNITS)[number];

const UNIT_ALIASES: Record<string, BaseUnit> = {
  kg: "kg", kilo: "kg", kilogram: "kg",
  ton: "ton", tn: "ton",
  adet: "adet", ad: "adet", "adet.": "adet", piece: "adet",
  m: "m", metre: "m", mt: "m",
  "m2": "m2", "m²": "m2",
  "m3": "m3", "m³": "m3",
  lt: "lt", litre: "lt", l: "lt",
  paket: "paket", pk: "paket",
  torba: "torba", çuval: "torba", cuval: "torba",
};

export const normalizeUnit = (raw?: string | null): BaseUnit | null => {
  const key = (raw ?? "").trim().toLowerCase();
  return UNIT_ALIASES[key] ?? null;
};

/** Material classes that drive unit validation and stockability. */
export type MaterialClass =
  | "ready_mix_concrete"
  | "reinforcement_steel"
  | "cement_bagged"
  | "pipe"
  | "cable"
  | "board"
  | "paint"
  | "timber"
  | "general";

const CLASS_RULES: { cls: MaterialClass; test: RegExp; units: BaseUnit[] }[] = [
  // Ready-mix concrete: C-grade / "hazır beton" / "transmikser". m3 only, non-stock.
  { cls: "ready_mix_concrete", test: /(hazır\s*beton|hazir\s*beton|transmikser|\bc\s?\d{2}\/?\d{0,2}\b)/i, units: ["m3"] },
  { cls: "cement_bagged", test: /(çimento|cimento)/i, units: ["torba", "kg", "ton", "paket"] },
  { cls: "reinforcement_steel", test: /(nervürlü|nervurlu|demir|hasır çelik|hasir celik|yapı çeliği|yapi celigi|profil)/i, units: ["kg", "ton", "adet", "m"] },
  { cls: "pipe", test: /(boru)/i, units: ["m", "adet"] },
  { cls: "cable", test: /(kablo)/i, units: ["m", "adet"] },
  { cls: "board", test: /(alçıpan|alcipan|osb|xps|eps|levha|membran|yalıtım|yalitim|seramik|fayans)/i, units: ["m2", "adet", "paket"] },
  { cls: "paint", test: /(boya|astar|vernik|silikon|mastik)/i, units: ["lt", "kg", "adet"] },
  { cls: "timber", test: /(kereste|tahta|kalıp|kalip)/i, units: ["m3", "adet", "m"] },
];

export const classifyMaterial = (name: string): MaterialClass =>
  CLASS_RULES.find((r) => r.test.test(name))?.cls ?? "general";

export const allowedUnitsFor = (cls: MaterialClass): BaseUnit[] | null =>
  CLASS_RULES.find((r) => r.cls === cls)?.units ?? null;

/**
 * Ready-mix concrete is a direct-delivery / project-consumption material. It is
 * never warehouse inventory: no balance, no reserved stock, no capacity usage,
 * no depletion forecast. It is tracked through the pour schedule, purchase
 * order, dispatch note and accepted m³ on the project cost side.
 */
export const isStockable = (cls: MaterialClass) => cls !== "ready_mix_concrete";

export interface UnitVerdict {
  ok: boolean;
  /** Set only when ok. */
  unit: BaseUnit | null;
  /** Set only when not ok. */
  reason: "unknown_unit" | "incompatible_unit" | null;
  raw: string;
  allowed: BaseUnit[] | null;
}

export const validateUnit = (name: string, rawUnit?: string | null): UnitVerdict => {
  const unit = normalizeUnit(rawUnit);
  const allowed = allowedUnitsFor(classifyMaterial(name));
  const raw = rawUnit ?? "";
  if (!unit) return { ok: false, unit: null, reason: "unknown_unit", raw, allowed };
  if (allowed && !allowed.includes(unit))
    return { ok: false, unit: null, reason: "incompatible_unit", raw, allowed };
  return { ok: true, unit, reason: null, raw, allowed };
};

/* ──────────────────────── canonical inventory calculation ─────────────────── */

export type StockStatus =
  | "healthy"      // Sağlıklı
  | "low"          // Düşük
  | "critical"     // Kritik
  | "out"          // Stok Yok
  | "data_missing" // Veri Eksik
  | "non_stock";   // Kullanım Dışı (stok tutulmaz)

export const STATUS_LABEL: Record<StockStatus, string> = {
  healthy: "Sağlıklı",
  low: "Düşük",
  critical: "Kritik",
  out: "Stok Yok",
  data_missing: "Veri Eksik",
  non_stock: "Stok Tutulmaz",
};

export interface InventoryItem {
  id: string;
  name: string;
  projectId: string;
  cls: MaterialClass;
  stockable: boolean;
  unit: BaseUnit | null;
  rawUnit: string;
  unitVerdict: UnitVerdict;
  /** on-hand = receipts − issues, from posted movements only. */
  onHand: number;
  /** No reservation table exists yet, so reserved is always a known 0. */
  reserved: number;
  /** available = onHand − reserved */
  available: number;
  minStock: number;
  /** Weighted average cost from real entry unit prices; null when never purchased. */
  avgCost: number | null;
  /** avgCost × onHand; null when avgCost is unknown. */
  stockValue: number | null;
  status: StockStatus;
  entryCount: number;
  exitCount: number;
  lastMovementAt: string | null;
  firstMovementAt: string | null;
  suppliers: string[];
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * The single authoritative stock calculation. Genel Bakış, Stoklar, detail,
 * analytics, CEO Mode and Voice AI must all read from this function's output —
 * never recompute their own numbers.
 */
export const buildInventory = (
  materials: Material[],
  entries: MaterialEntry[],
  exits: MaterialExit[],
): InventoryItem[] => {
  const entriesBy = new Map<string, MaterialEntry[]>();
  for (const e of entries) {
    const list = entriesBy.get(e.material_id) ?? [];
    list.push(e);
    entriesBy.set(e.material_id, list);
  }
  const exitsBy = new Map<string, MaterialExit[]>();
  for (const x of exits) {
    const list = exitsBy.get(x.material_id) ?? [];
    list.push(x);
    exitsBy.set(x.material_id, list);
  }

  return materials.map((m) => {
    const cls = classifyMaterial(m.name);
    const stockable = isStockable(cls);
    const unitVerdict = validateUnit(m.name, m.unit);
    const es = entriesBy.get(m.id) ?? [];
    const xs = exitsBy.get(m.id) ?? [];

    const received = es.reduce((s, e) => s + num(e.quantity), 0);
    const issued = xs.reduce((s, x) => s + num(x.quantity), 0);
    const onHand = received - issued;
    const reserved = 0; // no reservation records exist yet — a known zero, not a guess
    const available = onHand - reserved;

    // Weighted average cost: Σ(qty × unit_price) / Σ(qty) over real receipts.
    const costQty = es.reduce((s, e) => (num(e.unit_price) > 0 ? s + num(e.quantity) : s), 0);
    const costSum = es.reduce(
      (s, e) => (num(e.unit_price) > 0 ? s + num(e.quantity) * num(e.unit_price) : s),
      0,
    );
    const avgCost = costQty > 0 ? costSum / costQty : null;

    const dates = [
      ...es.map((e) => e.entry_date),
      ...xs.map((x) => x.exit_date),
    ].filter(Boolean).sort();

    const minStock = num(m.min_stock);
    let status: StockStatus;
    if (!stockable) status = "non_stock";
    else if (!unitVerdict.ok) status = "data_missing";
    else if (onHand <= 0) status = "out";
    else if (minStock > 0 && onHand < minStock * 0.35) status = "critical";
    else if (minStock > 0 && onHand < minStock) status = "low";
    else status = "healthy";

    return {
      id: m.id,
      name: m.name,
      projectId: m.project_id,
      cls,
      stockable,
      unit: unitVerdict.ok ? unitVerdict.unit : null,
      rawUnit: m.unit ?? "",
      unitVerdict,
      onHand: stockable ? onHand : 0,
      reserved,
      available: stockable ? available : 0,
      minStock,
      avgCost,
      stockValue: stockable && avgCost !== null ? avgCost * onHand : null,
      status,
      entryCount: es.length,
      exitCount: xs.length,
      lastMovementAt: dates.length ? dates[dates.length - 1] : null,
      firstMovementAt: dates.length ? dates[0] : null,
      suppliers: Array.from(new Set(es.map((e) => e.supplier).filter(Boolean))),
    };
  });
};

/* ───────────────────────── forecast eligibility & evidence ────────────────── */

export type Confidence = "high" | "medium" | "low" | "insufficient";

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "Yüksek Güven",
  medium: "Orta Güven",
  low: "Düşük Güven",
  insufficient: "Yetersiz Veri",
};

/** Minimum evidence before any depletion statement may be shown. */
export const FORECAST_MIN_HISTORY_DAYS = 14;
export const FORECAST_MIN_ISSUE_MOVEMENTS = 3;

export interface ForecastEvidence {
  label: string;
  value: string;
}

export type Forecast =
  | {
      eligible: false;
      reason:
        | "non_stock"
        | "unit_invalid"
        | "no_consumption_history"
        | "history_too_short"
        | "too_few_movements"
        | "no_consumption_rate"
        | "unverified_consumption_data";
      confidence: "insufficient";
      evidence: ForecastEvidence[];
    }
  | {
      eligible: true;
      /** Days until available stock crosses the minimum level. */
      daysToMinimum: number;
      dailyRate: number;
      windowDays: number;
      confidence: Exclude<Confidence, "insufficient">;
      evidence: ForecastEvidence[];
    };

export const FORECAST_REASON: Record<
  Extract<Forecast, { eligible: false }>["reason"],
  string
> = {
  non_stock: "Bu malzeme depoda stoklanmaz; tüketimi teslimat kayıtlarından izlenir.",
  unit_invalid: "Malzemenin birimi doğrulanmadığı için tahmin hesaplanamıyor.",
  no_consumption_history: "Kayıtlı malzeme tüketimi bulunmuyor.",
  history_too_short: `Anlamlı tahmin için en az ${FORECAST_MIN_HISTORY_DAYS} günlük tüketim geçmişi gerekir.`,
  too_few_movements: `Anlamlı tahmin için en az ${FORECAST_MIN_ISSUE_MOVEMENTS} tüketim hareketi gerekir.`,
  no_consumption_rate: "Kayıtlı tüketimden pozitif bir tüketim hızı hesaplanamadı.",
  unverified_consumption_data: UNVERIFIED_CONSUMPTION_COPY,
};

const dayDiff = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

/**
 * Depletion forecast from real historical net consumption only.
 *
 * Refuses to produce a number unless there is a genuine demand signal:
 * ≥14 days of movement history AND ≥3 issue movements with a positive
 * consumption rate. Confirmed inbound orders and planned project demand are
 * not yet available as tables, so confidence is capped at "medium" — a
 * consumption-only forecast never claims high confidence.
 */
export const forecastDepletion = (
  item: InventoryItem,
  exits: MaterialExit[],
  today = new Date(),
): Forecast => {
  const base: ForecastEvidence[] = [];

  if (!item.stockable)
    return {
      eligible: false,
      reason: "non_stock",
      confidence: "insufficient",
      evidence: [
        { label: "Sınıflandırma", value: "Stok tutulmayan malzeme (doğrudan teslim)" },
      ],
    };

  if (!item.unitVerdict.ok)
    return {
      eligible: false,
      reason: "unit_invalid",
      confidence: "insufficient",
      evidence: [{ label: "Birim", value: `${item.rawUnit || "tanımsız"} · ${TRUTH_COPY.needsValidation}` }],
    };

  const issues = exits
    .filter((x) => x.material_id === item.id && num(x.quantity) > 0)
    .sort((a, b) => a.exit_date.localeCompare(b.exit_date));

  if (issues.length === 0)
    return { eligible: false, reason: "no_consumption_history", confidence: "insufficient", evidence: base };

  if (issues.length < FORECAST_MIN_ISSUE_MOVEMENTS)
    return {
      eligible: false,
      reason: "too_few_movements",
      confidence: "insufficient",
      evidence: [{ label: "Çıkış hareketi", value: `${issues.length} kayıt (en az ${FORECAST_MIN_ISSUE_MOVEMENTS} gerekli)` }],
    };

  const first = issues[0].exit_date;
  const last = issues[issues.length - 1].exit_date;
  const historyDays = Math.max(dayDiff(first, last), 0) + 1;

  if (historyDays < FORECAST_MIN_HISTORY_DAYS)
    return {
      eligible: false,
      reason: "history_too_short",
      confidence: "insufficient",
      evidence: [{ label: "Geçmiş", value: `${historyDays} gün (en az ${FORECAST_MIN_HISTORY_DAYS} gün gerekli)` }],
    };

  const consumed = issues.reduce((s, x) => s + num(x.quantity), 0);
  const dailyRate = consumed / historyDays;
  if (dailyRate <= 0)
    return { eligible: false, reason: "no_consumption_rate", confidence: "insufficient", evidence: base };

  const headroom = item.available - item.minStock;
  const daysToMinimum = Math.max(Math.floor(headroom / dailyRate), 0);

  // Volatility: coefficient of variation across per-movement quantities.
  const qtys = issues.map((x) => num(x.quantity));
  const mean = consumed / qtys.length;
  const sd = Math.sqrt(qtys.reduce((s, q) => s + (q - mean) ** 2, 0) / qtys.length);
  const cv = mean > 0 ? sd / mean : 1;

  const staleDays = dayDiff(last, today.toISOString().slice(0, 10));
  // No confirmed-inbound or planned-demand source exists yet, so a
  // consumption-only forecast is capped at medium confidence by design.
  const confidence: Exclude<Confidence, "insufficient"> =
    cv > 0.9 || staleDays > 45 || item.avgCost === null ? "low" : "medium";

  const unit = item.unit ?? "";
  return {
    eligible: true,
    daysToMinimum,
    dailyRate,
    windowDays: historyDays,
    confidence,
    evidence: [
      { label: "Kullanılabilir stok", value: `${fmtQty(item.available)} ${unit}` },
      { label: `Son ${historyDays} gün ortalama tüketim`, value: `${fmtQty(dailyRate)} ${unit}/gün` },
      { label: "Minimum stok seviyesi", value: item.minStock > 0 ? `${fmtQty(item.minStock)} ${unit}` : "tanımlanmadı" },
      { label: "Çıkış hareketi sayısı", value: `${issues.length} kayıt` },
      { label: "Kesinleşmiş giriş kaydı", value: "kayıt bulunmuyor" },
      { label: "Son hareket", value: staleDays <= 0 ? "bugün" : `${staleDays} gün önce` },
    ],
  };
};

/* ──────────────────────────────── formatters ──────────────────────────────── */

export const fmtQty = (n: number) =>
  n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });

export const fmtMoney = (n: number | null) =>
  n === null ? "—" : `₺${Math.round(n).toLocaleString("tr-TR")}`;

export const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

export const fmtDateTime = (d: Date) =>
  `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })} · ${d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;

/* ──────────────────────── data-quality / migration report ─────────────────── */

export interface DataQualityIssue {
  materialId: string;
  materialName: string;
  kind:
    | "invalid_unit"
    | "unknown_unit"
    | "non_stock_with_balance"
    | "negative_available"
    | "no_min_stock"
    | "no_cost_basis";
  detail: string;
  severity: "high" | "medium" | "low";
}

const ISSUE_LABEL: Record<DataQualityIssue["kind"], string> = {
  invalid_unit: "Uyumsuz birim",
  unknown_unit: "Tanımsız birim",
  non_stock_with_balance: "Stok tutulmaz malzemede depo bakiyesi",
  negative_available: "Negatif kullanılabilir stok",
  no_min_stock: "Minimum stok tanımlı değil",
  no_cost_basis: "Maliyet esası bulunmuyor",
};

export const issueLabel = (k: DataQualityIssue["kind"]) => ISSUE_LABEL[k];

/**
 * Read-only audit. Never converts or rewrites a value: uncertain records are
 * flagged for admin review ("Veri doğrulaması gerekli") instead.
 */
export const auditInventory = (
  items: InventoryItem[],
  materials: Material[],
  entries: MaterialEntry[],
  exits: MaterialExit[],
): DataQualityIssue[] => {
  const issues: DataQualityIssue[] = [];
  const received = new Map<string, number>();
  for (const e of entries) received.set(e.material_id, (received.get(e.material_id) ?? 0) + num(e.quantity));
  const issued = new Map<string, number>();
  for (const x of exits) issued.set(x.material_id, (issued.get(x.material_id) ?? 0) + num(x.quantity));

  for (const it of items) {
    const push = (kind: DataQualityIssue["kind"], detail: string, severity: DataQualityIssue["severity"]) =>
      issues.push({ materialId: it.id, materialName: it.name, kind, detail, severity });

    const verdict = it.unitVerdict;
    if (!verdict.ok) {
      const allowed = verdict.allowed?.join(", ") ?? "—";
      if (verdict.reason === "unknown_unit")
        push("unknown_unit", `"${it.rawUnit || "boş"}" tanınmıyor · geçerli: ${allowed}`, "high");
      else
        push("invalid_unit", `"${it.rawUnit}" bu malzeme için geçersiz · geçerli: ${allowed}`, "high");
    }

    if (!it.stockable) {
      const net = (received.get(it.id) ?? 0) - (issued.get(it.id) ?? 0);
      if (Math.abs(net) > 0.001)
        push(
          "non_stock_with_balance",
          `Doğrudan teslim malzemesi ancak ${fmtQty(net)} ${it.rawUnit} depo bakiyesi var · sevk irsaliyesi ve döküm programına taşınmalı`,
          "high",
        );
      continue;
    }

    if (it.available < 0)
      push("negative_available", `${fmtQty(it.available)} ${it.rawUnit} · çıkış kayıtları girişleri aşıyor`, "high");
    if (it.minStock <= 0) push("no_min_stock", "Kritik/düşük stok uyarısı üretilemez", "medium");
    if (it.avgCost === null && it.onHand > 0)
      push("no_cost_basis", "Birim fiyatlı giriş kaydı yok · stok değeri hesaplanamıyor", "medium");
  }

  // Duplicate material master names within the same project.
  const byKey = new Map<string, string[]>();
  for (const m of materials) {
    const k = `${m.project_id}::${m.name.trim().toLowerCase()}`;
    byKey.set(k, [...(byKey.get(k) ?? []), m.id]);
  }
  for (const [, ids] of byKey) {
    if (ids.length > 1) {
      const m = materials.find((x) => x.id === ids[0])!;
      issues.push({
        materialId: m.id,
        materialName: m.name,
        kind: "invalid_unit",
        detail: `Aynı projede ${ids.length} mükerrer malzeme kaydı · ${TRUTH_COPY.needsValidation}`,
        severity: "medium",
      });
    }
  }

  return issues;
};
