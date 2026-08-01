// RFQ (Teklif Toplama) domain model.
// NOTE: the backend has no procurement tables yet, so the mutation layer
// (useRfqWorkflow) persists records locally. Every guard here mirrors what a
// server mutation must enforce: status transitions, permissions, duplicate and
// quotation validity checks.
import type { LicenseRole } from "@/lib/licenseStore";
import type { Order, Request, Supplier } from "../procurementConstants";

export const RFQ_STATUSES = [
  "Taslak",
  "Tedarikçilere Gönderildi",
  "Teklifler Bekleniyor",
  "Karşılaştırma Aşamasında",
  "Tedarikçi Seçildi",
  "Siparişe Dönüştürüldü",
  "İptal",
] as const;
export type RfqStatus = (typeof RFQ_STATUSES)[number];

export const QUOTATION_STATUSES = [
  "Davet Edildi",
  "Görüntülendi",
  "Teklif Bekleniyor",
  "Teklif Geldi",
  "Revizyon İstendi",
  "Revize Teklif Geldi",
  "Süresi Geçti",
  "Reddedildi",
  "Seçildi",
] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const TECHNICAL_LEVELS = ["Tam Uygun", "Kısmi Uygun", "Uygun Değil"] as const;
export type TechnicalLevel = (typeof TECHNICAL_LEVELS)[number];

export const PAYMENT_TERMS = ["Peşin", "15 gün", "30 gün", "45 gün", "60 gün", "90 gün"] as const;
export type PaymentTerm = (typeof PAYMENT_TERMS)[number];

export type RfqCurrency = "TRY" | "USD" | "EUR";

export interface QuotationLine {
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
}

export interface QuotationAttachment {
  name: string;
  size: number;
}

export interface Quotation {
  version: number;
  lines: QuotationLine[];
  subtotal: number;
  discount: number;
  vatRate: number;
  vat: number;
  total: number;
  currency: RfqCurrency;
  deliveryDays: number;
  deliveryDate?: string;
  paymentTerm: string;
  warranty: string;
  technical: TechnicalLevel;
  exclusions?: string;
  notes?: string;
  validUntil?: string;
  submittedAt: string;
  recordedBy: string;
  attachments?: QuotationAttachment[];
}

export interface RfqMessage {
  at: string;
  actor: string;
  text: string;
}

export interface RfqSupplierEntry {
  supplierId: string;
  supplierName: string;
  category: string;
  performance: number;
  contact?: string;
  phone?: string;
  email?: string;
  active: boolean;
  status: QuotationStatus;
  invitedAt: string;
  sentAt?: string;
  quotation?: Quotation;
  revisions: Quotation[];
  revisionRequestedAt?: string;
  revisionNote?: string;
  messages: RfqMessage[];
}

export interface RfqAuditEntry {
  at: string;
  actor: string;
  event: string;
  from?: string;
  to?: string;
  detail?: string;
  ref?: string;
}

export interface RfqSelection {
  supplierId: string;
  supplierName: string;
  quotationVersion: number;
  reason: string;
  note?: string;
  by: string;
  at: string;
  total: number;
  currency: RfqCurrency;
}

export interface RfqRecord {
  /** the purchase request this RFQ belongs to (also the record key) */
  requestId: string;
  no: string;
  requestNo: string;
  title: string;
  project: string;
  status: RfqStatus;
  deadline: string;
  requiredBy?: string;
  budget: number;
  currency: RfqCurrency;
  requester: string;
  owner: string;
  notes?: string;
  suppliers: RfqSupplierEntry[];
  /** temporary (unconfirmed) supplier candidate — never a final selection */
  candidateSupplierId?: string | null;
  selection?: RfqSelection;
  orderNo?: string;
  createdAt: string;
  sentAt?: string;
  cancelledAt?: string;
  audit: RfqAuditEntry[];
  version: number;
}

// ── Status machine ─────────────────────────────────────────────────────────
const TRANSITIONS: Record<RfqStatus, RfqStatus[]> = {
  Taslak: ["Tedarikçilere Gönderildi", "İptal"],
  "Tedarikçilere Gönderildi": ["Teklifler Bekleniyor", "İptal"],
  "Teklifler Bekleniyor": ["Karşılaştırma Aşamasında", "İptal"],
  "Karşılaştırma Aşamasında": ["Tedarikçi Seçildi", "İptal"],
  "Tedarikçi Seçildi": ["Siparişe Dönüştürüldü", "Karşılaştırma Aşamasında", "İptal"],
  "Siparişe Dönüştürüldü": [],
  İptal: [],
};

export function canRfqTransition(from: RfqStatus, to: RfqStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

// ── Actions & permissions ──────────────────────────────────────────────────
export type RfqAction =
  | "add_supplier"
  | "remove_supplier"
  | "edit_rfq"
  | "send"
  | "remind"
  | "update_deadline"
  | "record_quotation"
  | "request_revision"
  | "select_candidate"
  | "confirm_selection"
  | "change_selection"
  | "export_comparison"
  | "create_order"
  | "open_order"
  | "track_delivery"
  | "cancel";

export const RFQ_ACTION_LABELS: Record<RfqAction, string> = {
  add_supplier: "Tedarikçi Ekle",
  remove_supplier: "Tedarikçiyi Çıkar",
  edit_rfq: "RFQ'yu Düzenle",
  send: "Tedarikçilere Gönder",
  remind: "Hatırlatma Gönder",
  update_deadline: "Son Tarihi Güncelle",
  record_quotation: "Teklif Gir",
  request_revision: "Revizyon İste",
  select_candidate: "Seç",
  confirm_selection: "Seçimi Onayla",
  change_selection: "Seçimi Değiştir",
  export_comparison: "Teklif Karşılaştırmasını Dışa Aktar",
  create_order: "Siparişe Dönüştür",
  open_order: "Siparişi Aç",
  track_delivery: "Teslimatı Takip Et",
  cancel: "RFQ'yu Kapat",
};

const PROCUREMENT_ROLES: LicenseRole[] = [
  "super_admin",
  "company_admin",
  "project_manager",
  "procurement",
];
const MANAGER_ROLES: LicenseRole[] = [
  "super_admin",
  "company_admin",
  "project_manager",
  "procurement",
];

const ACTION_ROLES: Record<RfqAction, LicenseRole[] | "all"> = {
  add_supplier: PROCUREMENT_ROLES,
  remove_supplier: PROCUREMENT_ROLES,
  edit_rfq: PROCUREMENT_ROLES,
  send: MANAGER_ROLES,
  remind: PROCUREMENT_ROLES,
  update_deadline: PROCUREMENT_ROLES,
  record_quotation: PROCUREMENT_ROLES,
  request_revision: PROCUREMENT_ROLES,
  select_candidate: PROCUREMENT_ROLES,
  confirm_selection: MANAGER_ROLES,
  change_selection: MANAGER_ROLES,
  export_comparison: "all",
  create_order: MANAGER_ROLES,
  open_order: "all",
  track_delivery: "all",
  cancel: MANAGER_ROLES,
};

export function canRunRfqAction(role: LicenseRole, action: RfqAction): boolean {
  const allowed = ACTION_ROLES[action];
  return allowed === "all" ? true : allowed.includes(role);
}

export interface RfqActionPlan {
  primary?: RfqAction;
  secondary?: RfqAction;
  tertiary?: RfqAction;
  overflow: RfqAction[];
}

/** Status-aware action bar model. Only valid actions are ever rendered. */
export function actionsForRfq(rfq: RfqRecord): RfqActionPlan {
  switch (rfq.status) {
    case "Taslak":
      return {
        primary: "send",
        secondary: "add_supplier",
        tertiary: "update_deadline",
        overflow: ["cancel"],
      };
    case "Tedarikçilere Gönderildi":
    case "Teklifler Bekleniyor":
      return {
        primary: "add_supplier",
        secondary: "remind",
        tertiary: "update_deadline",
        overflow: ["export_comparison", "cancel"],
      };
    case "Karşılaştırma Aşamasında":
      return {
        primary: rfq.candidateSupplierId ? "confirm_selection" : "add_supplier",
        secondary: "export_comparison",
        tertiary: "update_deadline",
        overflow: ["remind", "cancel"],
      };
    case "Tedarikçi Seçildi":
      return {
        primary: "create_order",
        secondary: "change_selection",
        tertiary: "export_comparison",
        overflow: ["cancel"],
      };
    case "Siparişe Dönüştürüldü":
      return {
        primary: "open_order",
        secondary: "track_delivery",
        tertiary: "export_comparison",
        overflow: [],
      };
    case "İptal":
      return { primary: "export_comparison", overflow: [] };
    default:
      return { overflow: [] };
  }
}

// ── Score model ────────────────────────────────────────────────────────────
/** Weights are defined in the frontend scoring model below — there is no
 *  backend scoring service yet, so this file is the single source of truth. */
export const SCORE_WEIGHTS = [
  { key: "price", label: "Fiyat", weight: 40 },
  { key: "delivery", label: "Teslim süresi", weight: 20 },
  { key: "payment", label: "Ödeme koşulu", weight: 15 },
  { key: "technical", label: "Teknik uygunluk", weight: 15 },
  { key: "performance", label: "Geçmiş performans", weight: 10 },
] as const;

export type ScoreKey = (typeof SCORE_WEIGHTS)[number]["key"];

export interface ScoreBreakdownItem {
  key: ScoreKey;
  label: string;
  weight: number;
  earned: number;
  note: string;
}

export interface ScoreResult {
  total: number;
  items: ScoreBreakdownItem[];
}

const PAYMENT_RATIO: Record<string, number> = {
  Peşin: 0.5,
  "15 gün": 0.7,
  "30 gün": 0.85,
  "45 gün": 0.92,
  "60 gün": 1,
  "90 gün": 1,
};

const TECHNICAL_RATIO: Record<TechnicalLevel, number> = {
  "Tam Uygun": 1,
  "Kısmi Uygun": 0.6,
  "Uygun Değil": 0.2,
};

export function scoreQuotation(
  entry: RfqSupplierEntry,
  ctx: { bestTotal: number; bestDelivery: number }
): ScoreResult | null {
  const q = entry.quotation;
  if (!q) return null;
  const priceRatio = q.total > 0 ? Math.min(1, ctx.bestTotal / q.total) : 0;
  const deliveryRatio =
    q.deliveryDays > 0 ? Math.min(1, ctx.bestDelivery / q.deliveryDays) : 0;
  const paymentRatio = PAYMENT_RATIO[q.paymentTerm] ?? 0.7;
  const technicalRatio = TECHNICAL_RATIO[q.technical] ?? 0.5;
  const performanceRatio = Math.max(0, Math.min(1, entry.performance / 100));

  const ratios: Record<ScoreKey, { r: number; note: string }> = {
    price: {
      r: priceRatio,
      note:
        q.total <= ctx.bestTotal
          ? "En düşük toplam teklif"
          : `En düşük teklife göre %${Math.round((q.total / ctx.bestTotal - 1) * 100)} daha yüksek`,
    },
    delivery: {
      r: deliveryRatio,
      note:
        q.deliveryDays <= ctx.bestDelivery
          ? "En kısa teslim süresi"
          : `En hızlı teklife göre ${q.deliveryDays - ctx.bestDelivery} gün daha uzun`,
    },
    payment: { r: paymentRatio, note: q.paymentTerm },
    technical: { r: technicalRatio, note: q.technical },
    performance: {
      r: performanceRatio,
      note: `Tedarikçi performansı ${entry.performance}/100`,
    },
  };

  const items: ScoreBreakdownItem[] = SCORE_WEIGHTS.map((w) => ({
    key: w.key,
    label: w.label,
    weight: w.weight,
    earned: Math.round(ratios[w.key].r * w.weight),
    note: ratios[w.key].note,
  }));

  return {
    total: items.reduce((s, i) => s + i.earned, 0),
    items,
  };
}

export interface ScoredEntry {
  entry: RfqSupplierEntry;
  score: ScoreResult | null;
  badges: string[];
}

/** Derived comparison view: scores + restrained "best of" badges. */
export function buildComparison(rfq: RfqRecord): ScoredEntry[] {
  const withQuote = rfq.suppliers.filter(
    (s) => !!s.quotation && s.status !== "Reddedildi"
  );
  const bestTotal = withQuote.length
    ? Math.min(...withQuote.map((s) => s.quotation!.total))
    : 0;
  const bestDelivery = withQuote.length
    ? Math.min(...withQuote.map((s) => s.quotation!.deliveryDays))
    : 0;

  const scored: ScoredEntry[] = rfq.suppliers.map((entry) => ({
    entry,
    score: scoreQuotation(entry, { bestTotal, bestDelivery }),
    badges: [],
  }));

  if (withQuote.length > 1) {
    const quoted = scored.filter((s) => !!s.entry.quotation);
    const cheapest = quoted.reduce((a, b) =>
      b.entry.quotation!.total < a.entry.quotation!.total ? b : a
    );
    cheapest.badges.push("En Düşük Fiyat");
    const fastest = quoted.reduce((a, b) =>
      b.entry.quotation!.deliveryDays < a.entry.quotation!.deliveryDays ? b : a
    );
    if (!fastest.badges.includes("En Hızlı Teslim")) fastest.badges.push("En Hızlı Teslim");
    const topScore = quoted.reduce((a, b) =>
      (b.score?.total ?? 0) > (a.score?.total ?? 0) ? b : a
    );
    topScore.badges.push("En Yüksek Puan");
    const bestPayment = quoted.reduce((a, b) =>
      (PAYMENT_RATIO[b.entry.quotation!.paymentTerm] ?? 0) >
      (PAYMENT_RATIO[a.entry.quotation!.paymentTerm] ?? 0)
        ? b
        : a
    );
    bestPayment.badges.push("En İyi Ödeme Koşulu");
  }

  return scored;
}

// ── Helpers ────────────────────────────────────────────────────────────────
export const CURRENCY_SYMBOL: Record<RfqCurrency, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
};

export const fmtMoney = (n: number, currency: RfqCurrency = "TRY") =>
  `${CURRENCY_SYMBOL[currency]}${Math.round(n).toLocaleString("tr-TR")}`;

export const fmtDateTime = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export const isDeadlinePassed = (rfq: RfqRecord) => {
  const d = new Date(rfq.deadline);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
};

export const isQuotationExpired = (q?: Quotation) => {
  if (!q?.validUntil) return false;
  const d = new Date(q.validUntil);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
};

export const quotationTotals = (
  lines: QuotationLine[],
  discount: number,
  vatRate: number
) => {
  const subtotal = lines.reduce((s, l) => s + (l.qty || 0) * (l.unitPrice || 0), 0);
  const net = Math.max(0, subtotal - (discount || 0));
  const vat = (net * (vatRate || 0)) / 100;
  return { subtotal, vat, total: net + vat };
};

const isoAtEndOfDay = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
};

/** Builds the initial RFQ record from an approved purchase request. */
export function seedRfqFromRequest(
  request: Request,
  catalog: Supplier[],
  owner: string
): RfqRecord {
  const rfq = request.rfq;
  const now = new Date().toISOString();
  const entries: RfqSupplierEntry[] = (rfq?.suppliers ?? []).map((name, i) => {
    const match = catalog.find((s) => s.name === name);
    return {
      supplierId: match?.id ?? `sup-ext-${i}`,
      supplierName: name,
      category: match?.category ?? request.category,
      performance: match?.score ?? 70,
      active: true,
      status: rfq?.sentAt ? "Teklif Bekleniyor" : "Davet Edildi",
      invitedAt: rfq?.createdAt ?? now,
      sentAt: rfq?.sentAt,
      revisions: [],
      messages: [],
    };
  });

  const status: RfqStatus = rfq?.sentAt
    ? "Teklifler Bekleniyor"
    : "Taslak";

  return {
    requestId: request.id,
    no: rfq?.no ?? `RFQ-${request.no.replace("PR-", "")}`,
    requestNo: request.no,
    title: request.category,
    project: request.project,
    status,
    deadline: rfq?.deadline || isoAtEndOfDay(7),
    requiredBy: undefined,
    budget: request.budget,
    currency: (request.currency as RfqCurrency) ?? "TRY",
    requester: request.requester,
    owner,
    notes: rfq?.notes,
    suppliers: entries,
    candidateSupplierId: null,
    createdAt: rfq?.createdAt ?? now,
    sentAt: rfq?.sentAt,
    audit: [
      {
        at: rfq?.createdAt ?? now,
        actor: request.requester,
        event: `Teklif talebi oluşturuldu (${rfq?.no ?? "RFQ"})`,
        to: status,
      },
    ],
    version: 0,
  };
}

/** Creates a purchase order shape compatible with the existing orders list. */
export function orderFromSelection(
  rfq: RfqRecord,
  selection: RfqSelection,
  etaDays: number
): Order {
  return {
    id: `po-rfq-${rfq.requestId}`,
    no: rfq.orderNo ?? `PO-${rfq.requestNo.replace("PR-", "")}`,
    supplier: selection.supplierName,
    project: rfq.project,
    amount: selection.total,
    eta: etaDays,
    paid: false,
    delivery: "Sipariş",
    category: rfq.title,
  };
}

export const RFQ_PERMISSION_MESSAGE = "Bu işlem için yetkiniz bulunmuyor.";
export const RFQ_GENERIC_ERROR = "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
export const RFQ_LOAD_ERROR = "RFQ bilgileri yüklenemedi.";
