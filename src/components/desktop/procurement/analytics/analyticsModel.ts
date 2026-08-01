// Satın Alma → Analitik: connected procurement analytics engine.
// Pure functions only. Every number is derived from real persisted records
// (purchase_orders + nested items/installments/payments/deliveries/receipts/
// invoices/events), purchase requests, RFQ records and project budgets.
// No synthetic values, no demo fallbacks.
import type {
  OrderInstallment,
  OrderInvoice,
  PurchaseOrder,
} from "../orders/orderModel";
import type { RfqRecord } from "../rfq/rfqModel";
import type { Request } from "../procurementConstants";

/* ── Formatting ────────────────────────────────────────────── */

export const CURRENCY_SYMBOL: Record<string, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
};

export const fmtMoney = (n: number, currency = "TRY") =>
  `${CURRENCY_SYMBOL[currency] ?? "₺"}${Math.round(n).toLocaleString("tr-TR")}`;

export const fmtPct = (n: number, digits = 0) =>
  `%${n.toLocaleString("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;

export const fmtDay = (iso?: string | null) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export const fmtStamp = (d: Date) =>
  `${d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })} · ${d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;

const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const dayStart = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00`);
const daysBetween = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / 86400000);

/* ── Date range ────────────────────────────────────────────── */

export const DATE_PRESETS = [
  { key: "month", label: "Bu Ay" },
  { key: "last30", label: "Son 30 Gün" },
  { key: "quarter", label: "Bu Çeyrek" },
  { key: "year", label: "Bu Yıl" },
  { key: "custom", label: "Özel Tarih" },
] as const;
export type DatePreset = (typeof DATE_PRESETS)[number]["key"];

export interface DateRange {
  from: string;
  to: string;
}

export const rangeForPreset = (preset: DatePreset, now = new Date()): DateRange => {
  const to = iso(now);
  switch (preset) {
    case "last30": {
      const f = new Date(now);
      f.setDate(f.getDate() - 29);
      return { from: iso(f), to };
    }
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3) * 3;
      return { from: iso(new Date(now.getFullYear(), q, 1)), to };
    }
    case "year":
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to };
    case "month":
    default:
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to };
  }
};

/** Previous period of the exact same length, ending the day before `from`. */
export const previousRange = (range: DateRange): DateRange => {
  const from = dayStart(range.from);
  const to = dayStart(range.to);
  const len = Math.max(daysBetween(from, to), 0);
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - len);
  return { from: iso(prevFrom), to: iso(prevTo) };
};

export const rangeLabel = (r: DateRange) => `${fmtDay(r.from)} – ${fmtDay(r.to)}`;

const inRange = (value: string | null | undefined, r: DateRange) => {
  if (!value) return false;
  const d = value.slice(0, 10);
  return d >= r.from && d <= r.to;
};

/* ── Filters ───────────────────────────────────────────────── */

export interface AnalyticsFilters {
  preset: DatePreset;
  from: string;
  to: string;
  project: string;
  supplier: string;
  category: string;
  orderStatus: string;
  paymentStatus: string;
  deliveryStatus: string;
  invoiceStatus: string;
}

export const ALL = "all";

export const defaultFilters = (now = new Date()): AnalyticsFilters => {
  const r = rangeForPreset("month", now);
  return {
    preset: "month",
    from: r.from,
    to: r.to,
    project: ALL,
    supplier: ALL,
    category: ALL,
    orderStatus: ALL,
    paymentStatus: ALL,
    deliveryStatus: ALL,
    invoiceStatus: ALL,
  };
};

export const activeFilterCount = (f: AnalyticsFilters) =>
  [
    f.project,
    f.supplier,
    f.category,
    f.orderStatus,
    f.paymentStatus,
    f.deliveryStatus,
    f.invoiceStatus,
  ].filter((v) => v !== ALL).length;

export const filtersToParams = (f: AnalyticsFilters): Record<string, string> => {
  const out: Record<string, string> = { d: f.preset };
  if (f.preset === "custom") {
    out.df = f.from;
    out.dt = f.to;
  }
  const map: Array<[string, string]> = [
    ["pr", f.project],
    ["sp", f.supplier],
    ["ct", f.category],
    ["os", f.orderStatus],
    ["ps", f.paymentStatus],
    ["ds", f.deliveryStatus],
    ["is", f.invoiceStatus],
  ];
  map.forEach(([k, v]) => {
    if (v !== ALL) out[k] = v;
  });
  return out;
};

export const filtersFromParams = (
  get: (k: string) => string | null,
  now = new Date()
): AnalyticsFilters => {
  const base = defaultFilters(now);
  const preset = (get("d") as DatePreset) || base.preset;
  const known = DATE_PRESETS.some((p) => p.key === preset);
  const usedPreset: DatePreset = known ? preset : base.preset;
  const range =
    usedPreset === "custom"
      ? { from: get("df") || base.from, to: get("dt") || base.to }
      : rangeForPreset(usedPreset, now);
  return {
    ...base,
    preset: usedPreset,
    from: range.from,
    to: range.to,
    project: get("pr") || ALL,
    supplier: get("sp") || ALL,
    category: get("ct") || ALL,
    orderStatus: get("os") || ALL,
    paymentStatus: get("ps") || ALL,
    deliveryStatus: get("ds") || ALL,
    invoiceStatus: get("is") || ALL,
  };
};

const matchesDimensions = (o: PurchaseOrder, f: AnalyticsFilters) =>
  (f.project === ALL || (o.project_name ?? "—") === f.project) &&
  (f.supplier === ALL || o.supplier_name === f.supplier) &&
  (f.category === ALL || (o.category ?? "—") === f.category) &&
  (f.orderStatus === ALL || o.order_status === f.orderStatus) &&
  (f.paymentStatus === ALL || o.payment_status === f.paymentStatus) &&
  (f.deliveryStatus === ALL || o.delivery_status === f.deliveryStatus) &&
  (f.invoiceStatus === ALL || o.invoice_status === f.invoiceStatus);

/* ── Status domains that count as a financial commitment ───── */

export const COMMITTED_STATUSES = [
  "Onaylandı",
  "Tedarikçiye Gönderildi",
  "Hazırlanıyor",
  "Kısmi Teslimat",
  "Tamamlandı",
];

export const isCommitted = (o: PurchaseOrder) =>
  COMMITTED_STATUSES.includes(o.order_status);

const validInvoices = (o: PurchaseOrder): OrderInvoice[] =>
  o.invoices.filter((i) => i.status !== "İtirazlı");

const paidOf = (o: PurchaseOrder, range?: DateRange) =>
  o.payments
    .filter((p) => !p.reversed_at && (!range || inRange(p.payment_date, range)))
    .reduce((s, p) => s + num(p.amount), 0);

const invoicedOf = (o: PurchaseOrder, range?: DateRange) =>
  validInvoices(o)
    .filter((i) => !range || inRange(i.invoice_date, range))
    .reduce((s, i) => s + num(i.total), 0);

/** Liability recognised for an order: invoiced amount when invoices exist,
 *  otherwise the committed order total. */
export const liabilityOf = (o: PurchaseOrder) => {
  const invoiced = invoicedOf(o);
  return invoiced > 0 ? invoiced : isCommitted(o) ? num(o.total) : 0;
};

export const openDebtOf = (o: PurchaseOrder) =>
  Math.max(liabilityOf(o) - paidOf(o), 0);

/* ── Open installment ledger (single source for aging) ─────── */

export interface OpenLiabilityRow {
  key: string;
  order: PurchaseOrder;
  installment: OrderInstallment | null;
  invoice: OrderInvoice | null;
  supplier: string;
  project: string;
  orderNo: string;
  invoiceNo: string | null;
  installmentLabel: string;
  dueDate: string | null;
  daysOverdue: number | null;
  amount: number;
  paid: number;
  remaining: number;
  plannedAccountId: string | null;
  currency: string;
}

/**
 * Open supplier liabilities. Installments are the primary source (they carry
 * the due date). Orders without a payment plan fall back to the invoice due
 * date, and finally to an undated open balance so nothing is lost or doubled.
 */
export const buildOpenLiabilities = (
  orders: PurchaseOrder[],
  now = new Date()
): OpenLiabilityRow[] => {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const rows: OpenLiabilityRow[] = [];

  orders.forEach((o) => {
    const base = {
      order: o,
      supplier: o.supplier_name,
      project: o.project_name ?? "—",
      orderNo: o.order_no,
      currency: o.currency,
    };
    const openInstallments = o.installments.filter(
      (i) => i.status !== "İptal" && num(i.paid_amount) < num(i.amount)
    );
    if (openInstallments.length > 0) {
      openInstallments.forEach((i) => {
        const due = i.due_date ? dayStart(i.due_date) : null;
        rows.push({
          ...base,
          key: `inst-${i.id}`,
          installment: i,
          invoice: null,
          invoiceNo: null,
          installmentLabel: `${i.installment_no}. taksit · ${i.payment_type}`,
          dueDate: i.due_date ?? null,
          daysOverdue: due ? Math.max(daysBetween(due, today), 0) : null,
          amount: num(i.amount),
          paid: num(i.paid_amount),
          remaining: Math.max(num(i.amount) - num(i.paid_amount), 0),
          plannedAccountId: i.planned_account_id,
        });
      });
      return;
    }

    const open = openDebtOf(o);
    if (open <= 0.5) return;
    const invoice =
      validInvoices(o)
        .slice()
        .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))[0] ?? null;
    const dueDate = invoice?.due_date ?? null;
    const due = dueDate ? dayStart(dueDate) : null;
    rows.push({
      ...base,
      key: `order-${o.id}`,
      installment: null,
      invoice,
      invoiceNo: invoice?.invoice_no ?? null,
      installmentLabel: invoice ? "Fatura bakiyesi" : "Ödeme planı yok",
      dueDate,
      daysOverdue: due ? Math.max(daysBetween(due, today), 0) : null,
      amount: liabilityOf(o),
      paid: paidOf(o),
      remaining: open,
      plannedAccountId: null,
    });
  });

  return rows;
};

/* ── Aging buckets ─────────────────────────────────────────── */

export type AgingKey = "not_due" | "d0_30" | "d31_60" | "d61_90" | "d90_plus" | "undated";

export const AGING_LABEL: Record<AgingKey, string> = {
  not_due: "Vadesi Gelmemiş",
  d0_30: "0–30 Gün Gecikmiş",
  d31_60: "31–60 Gün Gecikmiş",
  d61_90: "61–90 Gün Gecikmiş",
  d90_plus: "90+ Gün Gecikmiş",
  undated: "Vadesi Belirsiz",
};

export const AGING_TONE: Record<AgingKey, "ok" | "warn" | "high" | "critical" | "muted"> = {
  not_due: "ok",
  d0_30: "warn",
  d31_60: "high",
  d61_90: "high",
  d90_plus: "critical",
  undated: "muted",
};

export const agingKeyOf = (row: OpenLiabilityRow): AgingKey => {
  if (row.daysOverdue === null) return "undated";
  if (row.daysOverdue <= 0) return "not_due";
  if (row.daysOverdue <= 30) return "d0_30";
  if (row.daysOverdue <= 60) return "d31_60";
  if (row.daysOverdue <= 90) return "d61_90";
  return "d90_plus";
};

export interface AgingBucket {
  key: AgingKey;
  label: string;
  amount: number;
  pct: number;
  records: number;
  suppliers: number;
  rows: OpenLiabilityRow[];
}

export const buildAging = (rows: OpenLiabilityRow[]): AgingBucket[] => {
  const total = rows.reduce((s, r) => s + r.remaining, 0);
  const keys: AgingKey[] = ["not_due", "d0_30", "d31_60", "d61_90", "d90_plus", "undated"];
  return keys
    .map((key) => {
      const inBucket = rows.filter((r) => agingKeyOf(r) === key);
      const amount = inBucket.reduce((s, r) => s + r.remaining, 0);
      return {
        key,
        label: AGING_LABEL[key],
        amount,
        pct: total > 0 ? (amount / total) * 100 : 0,
        records: inBucket.length,
        suppliers: new Set(inBucket.map((r) => r.supplier)).size,
        rows: inBucket,
      };
    })
    .filter((b) => b.key !== "undated" || b.records > 0);
};

/* ── KPIs ──────────────────────────────────────────────────── */

export type KpiKey =
  | "purchase"
  | "commitment"
  | "invoiced"
  | "paid"
  | "open"
  | "overdue";

export interface KpiValue {
  key: KpiKey;
  label: string;
  value: number;
  previous: number | null;
  changePct: number | null;
  comparable: boolean;
  method: string;
  scope: string;
  sensitive: boolean;
}

const changeOf = (value: number, previous: number | null) => {
  if (previous === null) return null;
  if (previous === 0) return null;
  return ((value - previous) / Math.abs(previous)) * 100;
};

/* ── Suppliers ─────────────────────────────────────────────── */

export interface SupplierSpend {
  name: string;
  supplierId: string | null;
  volume: number;
  pct: number;
  orders: number;
  outstanding: number;
  overdue: number;
  categories: string[];
}

export interface Concentration {
  top1: number;
  top3: number;
  top5: number;
  level: "low" | "medium" | "high";
  levelLabel: string;
  topNames: string[];
  supplierCount: number;
}

const concentrationLevel = (top3: number): Concentration["level"] =>
  top3 >= 60 ? "high" : top3 >= 40 ? "medium" : "low";

const CONCENTRATION_LABEL: Record<Concentration["level"], string> = {
  low: "Düşük risk",
  medium: "Orta risk",
  high: "Yüksek risk",
};

/* ── Trend ─────────────────────────────────────────────────── */

export type TrendGrain = "day" | "week" | "month";

export interface TrendPoint {
  key: string;
  label: string;
  from: string;
  to: string;
  ordered: number;
  invoiced: number;
  paid: number;
}

export const grainFor = (range: DateRange): TrendGrain => {
  const len = daysBetween(dayStart(range.from), dayStart(range.to));
  if (len <= 31) return "day";
  if (len <= 120) return "week";
  return "month";
};

const bucketKey = (dateStr: string, grain: TrendGrain) => {
  const d = dayStart(dateStr);
  if (grain === "day") return iso(d);
  if (grain === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const monday = new Date(d);
  const dow = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - dow);
  return iso(monday);
};

const bucketLabel = (key: string, grain: TrendGrain) => {
  if (grain === "month") {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("tr-TR", {
      month: "short",
      year: "2-digit",
    });
  }
  const d = dayStart(key);
  const label = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
  return grain === "week" ? `${label} haftası` : label;
};

const buildTrend = (
  orders: PurchaseOrder[],
  range: DateRange,
  grain: TrendGrain
): TrendPoint[] => {
  const map = new Map<string, TrendPoint>();
  const touch = (dateStr: string) => {
    const key = bucketKey(dateStr, grain);
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: bucketLabel(key, grain),
        from: key.length === 7 ? `${key}-01` : key,
        to: key.length === 7 ? `${key}-31` : key,
        ordered: 0,
        invoiced: 0,
        paid: 0,
      });
    }
    return map.get(key)!;
  };

  orders.forEach((o) => {
    if (isCommitted(o) && inRange(o.order_date, range)) {
      touch(o.order_date).ordered += num(o.total);
    }
    validInvoices(o).forEach((i) => {
      if (inRange(i.invoice_date, range)) touch(i.invoice_date).invoiced += num(i.total);
    });
    o.payments.forEach((p) => {
      if (!p.reversed_at && inRange(p.payment_date, range))
        touch(p.payment_date).paid += num(p.amount);
    });
  });

  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
};

/* ── Projects & budgets ────────────────────────────────────── */

export interface ProjectBudgetRow {
  id: string | null;
  name: string;
  commitment: number;
  invoiced: number;
  paid: number;
  outstanding: number;
  budget: number | null;
  remaining: number | null;
  usagePct: number | null;
  risk: "none" | "watch" | "over";
}

export const parseBudget = (raw?: string | number | null): number | null => {
  if (typeof raw === "number") return isFinite(raw) && raw > 0 ? raw : null;
  if (!raw) return null;
  const cleaned = String(raw)
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return isFinite(n) && n > 0 ? n : null;
};

export interface ProjectBudgetInput {
  id: string;
  name: string;
  budget?: string | null;
  contract_amount?: number | null;
}

/* ── Categories ────────────────────────────────────────────── */

export interface CategoryUnitPrice {
  unit: string;
  avgPrice: number;
  quantity: number;
  lines: number;
}

export interface CategoryRow {
  name: string;
  total: number;
  orders: number;
  previous: number;
  changePct: number | null;
  topSupplier: string | null;
  unitPrices: CategoryUnitPrice[];
}

/* ── RFQ savings ───────────────────────────────────────────── */

export const SAVINGS_METHOD =
  "Tasarruf = En yüksek geçerli teklif − seçilen teklif (aynı RFQ içindeki geçerli teklifler karşılaştırılır).";

export interface RfqAnalytics {
  count: number;
  avgSuppliers: number | null;
  responseRate: number | null;
  invited: number;
  responded: number;
  selectedTotal: number;
  highestTotal: number;
  lowestTotal: number;
  savings: number;
  savingsPct: number | null;
  comparableRfqs: number;
  conversionRate: number | null;
  converted: number;
  hasData: boolean;
}

/* ── Cycle time ────────────────────────────────────────────── */

export interface CycleStage {
  key: string;
  label: string;
  samples: number;
  avgDays: number | null;
  medianDays: number | null;
}

const stats = (values: number[]) => {
  if (values.length === 0) return { avg: null, median: null };
  const sorted = [...values].sort((a, b) => a - b);
  const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return { avg: Math.round(avg * 10) / 10, median: Math.round(median * 10) / 10 };
};

const diffDays = (a?: string | null, b?: string | null): number | null => {
  if (!a || !b) return null;
  const start = new Date(a).getTime();
  const end = new Date(b).getTime();
  if (!isFinite(start) || !isFinite(end) || end < start) return null;
  return Math.round(((end - start) / 86400000) * 10) / 10;
};

/* ── Delivery performance ──────────────────────────────────── */

export interface SupplierDelivery {
  supplier: string;
  total: number;
  onTime: number;
  late: number;
  avgDelay: number | null;
}

export interface DeliveryAnalytics {
  measured: number;
  onTime: number;
  late: number;
  onTimeRate: number | null;
  avgDelayDays: number | null;
  partial: number;
  rejectedQty: number;
  damagedQty: number;
  awaitingReceipt: number;
  bySupplier: SupplierDelivery[];
  hasData: boolean;
}

/* ── Invoice / matching risks ──────────────────────────────── */

export type InvoiceRiskKey =
  | "awaiting_invoice"
  | "price_mismatch"
  | "quantity_mismatch"
  | "vat_mismatch"
  | "missing_receipt"
  | "duplicate_risk"
  | "overdue_unmatched";

export const INVOICE_RISK_LABEL: Record<InvoiceRiskKey, string> = {
  awaiting_invoice: "Teslim alındı, fatura bekleniyor",
  price_mismatch: "Fiyat / tutar farkı",
  quantity_mismatch: "Miktar farkı (mal kabulü < fatura)",
  vat_mismatch: "KDV farkı",
  missing_receipt: "Mal kabulü olmayan fatura",
  duplicate_risk: "Mükerrer fatura riski",
  overdue_unmatched: "Vadesi geçmiş, eşleştirilmemiş fatura",
};

export interface InvoiceRiskRow {
  key: InvoiceRiskKey;
  label: string;
  count: number;
  amount: number;
  orders: PurchaseOrder[];
}

/* ── Critical actions ──────────────────────────────────────── */

export interface CriticalAction {
  id: string;
  title: string;
  reason: string;
  impact: string;
  actionLabel: string;
  target:
    | { kind: "aging"; bucket: AgingKey }
    | { kind: "supplier"; name: string }
    | { kind: "project"; name: string }
    | { kind: "invoice"; risk: InvoiceRiskKey }
    | { kind: "delivery"; supplier: string };
  severity: "critical" | "high" | "medium";
  weight: number;
}

/* ── Result ────────────────────────────────────────────────── */

export interface AnalyticsResult {
  range: DateRange;
  prevRange: DateRange;
  generatedAt: Date;
  orders: PurchaseOrder[];
  hasOrders: boolean;
  kpis: KpiValue[];
  kpiBy: Record<KpiKey, KpiValue>;
  trend: TrendPoint[];
  grain: TrendGrain;
  suppliers: SupplierSpend[];
  concentration: Concentration | null;
  openLiabilities: OpenLiabilityRow[];
  aging: AgingBucket[];
  openTotal: number;
  overdueTotal: number;
  projects: ProjectBudgetRow[];
  categories: CategoryRow[];
  rfq: RfqAnalytics;
  cycle: CycleStage[];
  cycleBottleneck: CycleStage | null;
  delivery: DeliveryAnalytics;
  invoiceRisks: InvoiceRiskRow[];
  criticalActions: CriticalAction[];
  currencies: { currency: string; total: number }[];
  mixedCurrency: boolean;
  options: {
    projects: string[];
    suppliers: string[];
    categories: string[];
  };
}

export interface AnalyticsInput {
  orders: PurchaseOrder[];
  requests: Request[];
  rfqs: RfqRecord[];
  projects: ProjectBudgetInput[];
  filters: AnalyticsFilters;
  now?: Date;
}

export const buildAnalytics = ({
  orders: allOrders,
  requests,
  rfqs,
  projects,
  filters,
  now = new Date(),
}: AnalyticsInput): AnalyticsResult => {
  const range: DateRange = { from: filters.from, to: filters.to };
  const prevRange = previousRange(range);

  const dimensionOrders = allOrders.filter((o) => matchesDimensions(o, filters));
  const orders = dimensionOrders.filter((o) => inRange(o.order_date, range));
  const prevOrders = dimensionOrders.filter((o) => inRange(o.order_date, prevRange));
  const committed = orders.filter(isCommitted);
  const prevCommitted = prevOrders.filter(isCommitted);

  /* KPIs — each with an explicit definition. */
  const purchase = committed.reduce((s, o) => s + num(o.total), 0);
  const prevPurchase = prevCommitted.reduce((s, o) => s + num(o.total), 0);

  const openCommitmentStatuses = committed.filter(
    (o) => o.order_status !== "Tamamlandı"
  );
  const commitment = openCommitmentStatuses.reduce((s, o) => s + num(o.total), 0);
  const prevCommitment = prevCommitted
    .filter((o) => o.order_status !== "Tamamlandı")
    .reduce((s, o) => s + num(o.total), 0);

  const invoiced = dimensionOrders.reduce((s, o) => s + invoicedOf(o, range), 0);
  const prevInvoiced = dimensionOrders.reduce((s, o) => s + invoicedOf(o, prevRange), 0);

  const paid = dimensionOrders.reduce((s, o) => s + paidOf(o, range), 0);
  const prevPaid = dimensionOrders.reduce((s, o) => s + paidOf(o, prevRange), 0);

  // Open + overdue are balances, not period flows: they cover every filtered
  // order regardless of order date, and are labelled as such in the UI.
  const openLiabilities = buildOpenLiabilities(dimensionOrders.filter(isCommitted), now);
  const openTotal = openLiabilities.reduce((s, r) => s + r.remaining, 0);
  const overdueRows = openLiabilities.filter(
    (r) => r.daysOverdue !== null && r.daysOverdue > 0
  );
  const overdueTotal = overdueRows.reduce((s, r) => s + r.remaining, 0);
  const aging = buildAging(openLiabilities);

  const mk = (
    key: KpiKey,
    label: string,
    value: number,
    previous: number | null,
    method: string,
    scope: string,
    sensitive = false
  ): KpiValue => ({
    key,
    label,
    value,
    previous,
    changePct: changeOf(value, previous),
    comparable: previous !== null && previous > 0,
    method,
    scope,
    sensitive,
  });

  const periodScope = `Seçili dönem: ${rangeLabel(range)}`;
  const balanceScope = "Bakiye — seçili filtrelerdeki tüm siparişler (dönemden bağımsız)";

  const kpis: KpiValue[] = [
    mk(
      "purchase",
      "Toplam Satın Alma",
      purchase,
      prevPurchase,
      "Sipariş tarihi seçili dönemde olan, onaylanmış/gönderilmiş siparişlerin toplam tutarı (KDV dahil).",
      periodScope
    ),
    mk(
      "commitment",
      "Sipariş Taahhüdü",
      commitment,
      prevCommitment,
      "Onaylanmış veya tedarikçiye gönderilmiş, henüz tamamlanmamış siparişlerin toplamı — şirketi finansal olarak bağlayan tutar.",
      periodScope
    ),
    mk(
      "invoiced",
      "Faturalanan",
      invoiced,
      prevInvoiced,
      "Siparişe bağlı, itirazlı olmayan tedarikçi faturalarının toplamı (fatura tarihine göre).",
      periodScope
    ),
    mk(
      "paid",
      "Ödenen",
      paid,
      prevPaid,
      "Ters kaydı olmayan gerçek ödeme işlemlerinin toplamı (ödeme tarihine göre). Kart durum etiketleri kullanılmaz.",
      periodScope,
      true
    ),
    mk(
      "open",
      "Açık Borç",
      openTotal,
      null,
      "Açık taksit bakiyeleri; ödeme planı olmayan siparişlerde fatura/sipariş yükümlülüğünden ödenen tutar düşülerek hesaplanır.",
      balanceScope,
      true
    ),
    mk(
      "overdue",
      "Gecikmiş Borç",
      overdueTotal,
      null,
      "Vadesi bugünden önce dolmuş açık taksit/fatura bakiyelerinin toplamı.",
      balanceScope,
      true
    ),
  ];

  const kpiBy = Object.fromEntries(kpis.map((k) => [k.key, k])) as Record<
    KpiKey,
    KpiValue
  >;

  /* Trend */
  const grain = grainFor(range);
  const trend = buildTrend(dimensionOrders, range, grain);

  /* Supplier spend */
  const supplierMap = new Map<string, SupplierSpend>();
  committed.forEach((o) => {
    const key = o.supplier_name;
    const row =
      supplierMap.get(key) ??
      ({
        name: key,
        supplierId: o.supplier_id,
        volume: 0,
        pct: 0,
        orders: 0,
        outstanding: 0,
        overdue: 0,
        categories: [],
      } as SupplierSpend);
    row.volume += num(o.total);
    row.orders += 1;
    if (o.category && !row.categories.includes(o.category)) row.categories.push(o.category);
    supplierMap.set(key, row);
  });
  openLiabilities.forEach((r) => {
    const row = supplierMap.get(r.supplier);
    if (!row) return;
    row.outstanding += r.remaining;
    if ((r.daysOverdue ?? 0) > 0) row.overdue += r.remaining;
  });
  const suppliers = [...supplierMap.values()]
    .map((s) => ({ ...s, pct: purchase > 0 ? (s.volume / purchase) * 100 : 0 }))
    .sort((a, b) => b.volume - a.volume);

  const shareOf = (n: number) =>
    purchase > 0
      ? (suppliers.slice(0, n).reduce((s, x) => s + x.volume, 0) / purchase) * 100
      : 0;
  const concentration: Concentration | null =
    suppliers.length > 0
      ? {
          top1: shareOf(1),
          top3: shareOf(3),
          top5: shareOf(5),
          level: concentrationLevel(shareOf(3)),
          levelLabel: CONCENTRATION_LABEL[concentrationLevel(shareOf(3))],
          topNames: suppliers.slice(0, 3).map((s) => s.name),
          supplierCount: suppliers.length,
        }
      : null;

  /* Projects & budgets */
  const projectNames = new Set<string>();
  dimensionOrders.forEach((o) => projectNames.add(o.project_name ?? "—"));
  const projectRows: ProjectBudgetRow[] = [...projectNames]
    .map((name) => {
      const rows = committed.filter((o) => (o.project_name ?? "—") === name);
      const balanceRows = dimensionOrders.filter(
        (o) => (o.project_name ?? "—") === name && isCommitted(o)
      );
      const commit = rows.reduce((s, o) => s + num(o.total), 0);
      const inv = rows.reduce((s, o) => s + invoicedOf(o), 0);
      const pay = rows.reduce((s, o) => s + paidOf(o), 0);
      const outstanding = balanceRows.reduce((s, o) => s + openDebtOf(o), 0);
      const project = projects.find((p) => p.name === name);
      const budget =
        parseBudget(project?.budget) ?? parseBudget(project?.contract_amount ?? null);
      const remaining = budget !== null ? budget - commit : null;
      const usagePct = budget !== null && budget > 0 ? (commit / budget) * 100 : null;
      return {
        id: project?.id ?? null,
        name,
        commitment: commit,
        invoiced: inv,
        paid: pay,
        outstanding,
        budget,
        remaining,
        usagePct,
        risk:
          usagePct === null ? "none" : usagePct >= 100 ? "over" : usagePct >= 85 ? "watch" : "none",
      } as ProjectBudgetRow;
    })
    .filter((p) => p.commitment > 0 || p.outstanding > 0)
    .sort((a, b) => b.commitment - a.commitment);

  /* Categories */
  const categoryNames = new Set<string>();
  committed.forEach((o) => categoryNames.add(o.category ?? "Tanımsız"));
  const categories: CategoryRow[] = [...categoryNames]
    .map((name) => {
      const rows = committed.filter((o) => (o.category ?? "Tanımsız") === name);
      const prevRows = prevCommitted.filter((o) => (o.category ?? "Tanımsız") === name);
      const total = rows.reduce((s, o) => s + num(o.total), 0);
      const previous = prevRows.reduce((s, o) => s + num(o.total), 0);
      const bySupplier = new Map<string, number>();
      rows.forEach((o) =>
        bySupplier.set(o.supplier_name, (bySupplier.get(o.supplier_name) ?? 0) + num(o.total))
      );
      const topSupplier =
        [...bySupplier.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      // Unit prices are grouped per unit — never averaged across units.
      const unitMap = new Map<string, { value: number; qty: number; lines: number }>();
      rows.forEach((o) =>
        o.items.forEach((i) => {
          const unit = (i.unit || "birim").toLowerCase();
          const cur = unitMap.get(unit) ?? { value: 0, qty: 0, lines: 0 };
          cur.value += num(i.quantity) * num(i.unit_price);
          cur.qty += num(i.quantity);
          cur.lines += 1;
          unitMap.set(unit, cur);
        })
      );
      const unitPrices: CategoryUnitPrice[] = [...unitMap.entries()]
        .filter(([, v]) => v.qty > 0)
        .map(([unit, v]) => ({
          unit,
          avgPrice: v.value / v.qty,
          quantity: v.qty,
          lines: v.lines,
        }))
        .sort((a, b) => b.quantity - a.quantity);
      return {
        name,
        total,
        orders: rows.length,
        previous,
        changePct: changeOf(total, previous),
        topSupplier,
        unitPrices,
      };
    })
    .sort((a, b) => b.total - a.total);

  /* RFQ savings */
  const scopedRfqs = rfqs.filter((r) => {
    if (!inRange(r.createdAt?.slice(0, 10), range)) return false;
    if (filters.project !== ALL && r.project !== filters.project) return false;
    return true;
  });
  let invitedCount = 0;
  let respondedCount = 0;
  let selectedTotal = 0;
  let highestTotal = 0;
  let lowestTotal = 0;
  let comparableRfqs = 0;
  scopedRfqs.forEach((r) => {
    const entries = r.suppliers ?? [];
    invitedCount += entries.length;
    const quotes = entries
      .map((e) => e.quotation)
      .filter((q): q is NonNullable<typeof q> => !!q);
    respondedCount += quotes.length;
    if (quotes.length === 0) return;
    const totals = quotes.map((q) => num(q.total)).filter((t) => t > 0);
    if (totals.length === 0) return;
    const selectedId = r.selection?.supplierId;
    const selectedQuote = selectedId
      ? entries.find((e) => e.supplierId === selectedId)?.quotation
      : undefined;
    const selected = num(selectedQuote?.total) || Math.min(...totals);
    selectedTotal += selected;
    highestTotal += Math.max(...totals);
    lowestTotal += Math.min(...totals);
    if (totals.length > 1) comparableRfqs += 1;
  });
  const converted = scopedRfqs.filter((r) => r.status === "Siparişe Dönüştürüldü").length;
  const rfq: RfqAnalytics = {
    count: scopedRfqs.length,
    avgSuppliers:
      scopedRfqs.length > 0
        ? Math.round((invitedCount / scopedRfqs.length) * 10) / 10
        : null,
    responseRate: invitedCount > 0 ? (respondedCount / invitedCount) * 100 : null,
    invited: invitedCount,
    responded: respondedCount,
    selectedTotal,
    highestTotal,
    lowestTotal,
    savings: Math.max(highestTotal - selectedTotal, 0),
    savingsPct:
      highestTotal > 0 ? ((highestTotal - selectedTotal) / highestTotal) * 100 : null,
    comparableRfqs,
    conversionRate:
      scopedRfqs.length > 0 ? (converted / scopedRfqs.length) * 100 : null,
    converted,
    hasData: scopedRfqs.length > 0,
  };

  /* Cycle time — real timestamps only */
  const scopedRequests = requests.filter((r) => {
    if (filters.project !== ALL && r.project !== filters.project) return false;
    if (filters.category !== ALL && r.category !== filters.category) return false;
    const created = r.createdAt ?? r.submittedForApprovalAt ?? null;
    return created ? inRange(created.slice(0, 10), range) : false;
  });
  const rfqByRequest = new Map(rfqs.map((r) => [r.requestId, r]));
  const stageSamples: Record<string, number[]> = {
    approval: [],
    rfq: [],
    selection: [],
    order: [],
    delivery: [],
  };
  scopedRequests.forEach((r) => {
    const rec = rfqByRequest.get(r.id);
    const a = diffDays(r.submittedForApprovalAt, r.approvedAt);
    if (a !== null) stageSamples.approval.push(a);
    const b = diffDays(r.approvedAt, rec?.sentAt);
    if (b !== null) stageSamples.rfq.push(b);
    const c = diffDays(rec?.sentAt, rec?.selection?.at);
    if (c !== null) stageSamples.selection.push(c);
    const order = allOrders.find(
      (o) => o.purchase_request_id === r.id || o.purchase_request_no === r.no
    );
    const d = diffDays(rec?.selection?.at ?? r.approvedAt, order?.created_at);
    if (d !== null) stageSamples.order.push(d);
    const arrival = order?.deliveries
      ?.map((x) => x.actual_arrival ?? x.arrived_at)
      .filter(Boolean)
      .sort()
      .pop();
    const e = diffDays(order?.created_at, arrival ?? undefined);
    if (e !== null) stageSamples.delivery.push(e);
  });
  const CYCLE_LABELS: Array<[string, string]> = [
    ["approval", "Talep → Onay"],
    ["rfq", "Onay → RFQ"],
    ["selection", "RFQ → Tedarikçi Seçimi"],
    ["order", "Seçim → Sipariş"],
    ["delivery", "Sipariş → Teslimat"],
  ];
  const cycle: CycleStage[] = CYCLE_LABELS.map(([key, label]) => {
    const s = stats(stageSamples[key]);
    return {
      key,
      label,
      samples: stageSamples[key].length,
      avgDays: s.avg,
      medianDays: s.median,
    };
  });
  const cycleBottleneck =
    cycle
      .filter((c) => c.samples > 0 && c.avgDays !== null)
      .sort((a, b) => (b.avgDays ?? 0) - (a.avgDays ?? 0))[0] ?? null;

  /* Delivery performance — expected vs actual arrival dates */
  const deliveries = dimensionOrders.flatMap((o) =>
    o.deliveries.map((d) => ({ order: o, delivery: d }))
  );
  let measured = 0;
  let onTime = 0;
  const delays: number[] = [];
  let partial = 0;
  let rejectedQty = 0;
  let damagedQty = 0;
  let awaitingReceipt = 0;
  const supplierPerf = new Map<string, { total: number; onTime: number; delays: number[] }>();
  deliveries.forEach(({ order, delivery }) => {
    const actual = delivery.actual_arrival ?? delivery.arrived_at;
    if (delivery.status === "Kısmi Kabul" || delivery.status === "Kısmi Teslim") partial += 1;
    delivery.items?.forEach((i) => {
      rejectedQty += num(i.rejected_quantity);
      damagedQty += num(i.damaged_quantity);
    });
    const hasReceipt = order.receipts.some((r) => r.delivery_id === delivery.id);
    if (actual && !hasReceipt) awaitingReceipt += 1;
    if (!delivery.expected_arrival || !actual) return;
    if (!inRange(actual.slice(0, 10), range)) return;
    measured += 1;
    const delay = daysBetween(dayStart(delivery.expected_arrival), dayStart(actual));
    const perf =
      supplierPerf.get(order.supplier_name) ?? { total: 0, onTime: 0, delays: [] };
    perf.total += 1;
    if (delay <= 0) {
      onTime += 1;
      perf.onTime += 1;
    } else {
      delays.push(delay);
      perf.delays.push(delay);
    }
    supplierPerf.set(order.supplier_name, perf);
  });
  const delayStats = stats(delays);
  const delivery: DeliveryAnalytics = {
    measured,
    onTime,
    late: measured - onTime,
    onTimeRate: measured > 0 ? (onTime / measured) * 100 : null,
    avgDelayDays: delayStats.avg,
    partial,
    rejectedQty,
    damagedQty,
    awaitingReceipt,
    bySupplier: [...supplierPerf.entries()]
      .map(([supplier, v]) => ({
        supplier,
        total: v.total,
        onTime: v.onTime,
        late: v.total - v.onTime,
        avgDelay: stats(v.delays).avg,
      }))
      .sort((a, b) => b.late - a.late),
    hasData: measured > 0 || deliveries.length > 0,
  };

  /* Invoice & three-way-match risks */
  const riskAcc = new Map<InvoiceRiskKey, { count: number; amount: number; orders: PurchaseOrder[] }>();
  const addRisk = (key: InvoiceRiskKey, amount: number, order: PurchaseOrder) => {
    const cur = riskAcc.get(key) ?? { count: 0, amount: 0, orders: [] };
    cur.count += 1;
    cur.amount += amount;
    if (!cur.orders.includes(order)) cur.orders.push(order);
    riskAcc.set(key, cur);
  };
  const today = iso(now);
  dimensionOrders.forEach((o) => {
    const tolerance = Math.max(num(o.total) * 0.01, 1);
    const acceptedValue = o.items.reduce(
      (s, i) => s + num(i.accepted_quantity) * num(i.unit_price),
      0
    );
    const invoices = o.invoices;
    const delivered =
      o.delivery_status === "Teslim Edildi" || o.delivery_status === "Kısmi Teslim";
    if (delivered && invoices.length === 0) addRisk("awaiting_invoice", num(o.total), o);
    const seen = new Set<string>();
    invoices.forEach((inv) => {
      const total = num(inv.total);
      if (total > num(o.total) + tolerance)
        addRisk("price_mismatch", total - num(o.total), o);
      if (acceptedValue > 0 && num(inv.subtotal) > acceptedValue + tolerance)
        addRisk("quantity_mismatch", num(inv.subtotal) - acceptedValue, o);
      const expectedVat = (num(inv.subtotal) * num(o.vat_rate)) / 100;
      if (Math.abs(expectedVat - num(inv.vat_amount)) > Math.max(expectedVat * 0.02, 1))
        addRisk("vat_mismatch", Math.abs(expectedVat - num(inv.vat_amount)), o);
      const hasReceipt = inv.delivery_id
        ? o.receipts.some((r) => r.delivery_id === inv.delivery_id)
        : o.receipts.length > 0;
      if (!hasReceipt) addRisk("missing_receipt", total, o);
      const dupKey = `${inv.invoice_no}|${total.toFixed(2)}`;
      if (seen.has(dupKey)) addRisk("duplicate_risk", total, o);
      seen.add(dupKey);
      if (
        inv.due_date &&
        inv.due_date < today &&
        inv.status !== "Eşleştirildi" &&
        inv.status !== "Ödendi"
      )
        addRisk("overdue_unmatched", total, o);
    });
  });
  const invoiceRisks: InvoiceRiskRow[] = (
    Object.keys(INVOICE_RISK_LABEL) as InvoiceRiskKey[]
  )
    .map((key) => ({
      key,
      label: INVOICE_RISK_LABEL[key],
      count: riskAcc.get(key)?.count ?? 0,
      amount: riskAcc.get(key)?.amount ?? 0,
      orders: riskAcc.get(key)?.orders ?? [],
    }))
    .filter((r) => r.count > 0);

  /* Critical actions — max 5, ranked by financial/operational impact */
  const actions: CriticalAction[] = [];
  const worstAging = [...aging]
    .filter((b) => b.key !== "not_due" && b.key !== "undated" && b.amount > 0)
    .sort((a, b) => b.amount - a.amount)[0];
  if (worstAging)
    actions.push({
      id: `aging-${worstAging.key}`,
      title: `${fmtMoney(worstAging.amount)} gecikmiş tedarikçi ödemesi`,
      reason: `${worstAging.label} kovasında ${worstAging.records} kayıt, ${worstAging.suppliers} tedarikçi.`,
      impact: `Açık borcun ${fmtPct(worstAging.pct)}'i`,
      actionLabel: "Gecikmiş Ödemeleri Aç",
      target: { kind: "aging", bucket: worstAging.key },
      severity: worstAging.key === "d90_plus" ? "critical" : "high",
      weight: worstAging.amount * (worstAging.key === "d90_plus" ? 1.5 : 1),
    });
  const overBudget = projectRows.filter((p) => p.risk !== "none")[0];
  if (overBudget && overBudget.usagePct !== null)
    actions.push({
      id: `budget-${overBudget.name}`,
      title: `${overBudget.name} bütçesinin ${fmtPct(overBudget.usagePct)}'i kullanıldı`,
      reason: `Sipariş taahhüdü ${fmtMoney(overBudget.commitment)} / bütçe ${fmtMoney(
        overBudget.budget ?? 0
      )}.`,
      impact:
        overBudget.remaining !== null && overBudget.remaining < 0
          ? `${fmtMoney(Math.abs(overBudget.remaining))} bütçe aşımı`
          : `Kalan bütçe ${fmtMoney(overBudget.remaining ?? 0)}`,
      actionLabel: "Projeyi İncele",
      target: { kind: "project", name: overBudget.name },
      severity: overBudget.risk === "over" ? "critical" : "high",
      weight: Math.abs(overBudget.commitment) * 0.8,
    });
  const lateSupplier = delivery.bySupplier.filter((s) => s.late > 0)[0];
  if (lateSupplier)
    actions.push({
      id: `delivery-${lateSupplier.supplier}`,
      title: `${lateSupplier.supplier} ${lateSupplier.late} teslimatta gecikti`,
      reason: `Ölçülen ${lateSupplier.total} teslimatın ${lateSupplier.late} tanesi planlanan tarihten sonra ulaştı.`,
      impact: `Ortalama ${lateSupplier.avgDelay ?? 0} gün gecikme`,
      actionLabel: "Teslimatları Aç",
      target: { kind: "delivery", supplier: lateSupplier.supplier },
      severity: "medium",
      weight: lateSupplier.late * 50000,
    });
  const topRisk = [...invoiceRisks].sort((a, b) => b.amount - a.amount)[0];
  if (topRisk)
    actions.push({
      id: `invoice-${topRisk.key}`,
      title: `${topRisk.label}: ${topRisk.count} kayıt`,
      reason: "Sipariş ↔ mal kabulü ↔ fatura üçlü eşleştirmesi tutmuyor.",
      impact: `${fmtMoney(topRisk.amount)} tutarında fark`,
      actionLabel: "Kayıtları Aç",
      target: { kind: "invoice", risk: topRisk.key },
      severity: "high",
      weight: topRisk.amount * 0.9,
    });
  if (concentration && concentration.level !== "low")
    actions.push({
      id: "concentration",
      title: `Top 3 tedarikçi satın almanın ${fmtPct(concentration.top3)}'ini oluşturuyor`,
      reason: concentration.topNames.join(", "),
      impact: `${concentration.levelLabel} — tedarikçi bağımlılığı`,
      actionLabel: "Tedarikçileri İncele",
      target: { kind: "supplier", name: concentration.topNames[0] },
      severity: concentration.level === "high" ? "high" : "medium",
      weight: purchase * (concentration.top3 / 100) * 0.3,
    });
  const criticalActions = actions.sort((a, b) => b.weight - a.weight).slice(0, 5);

  /* Currencies */
  const currencyMap = new Map<string, number>();
  committed.forEach((o) =>
    currencyMap.set(o.currency, (currencyMap.get(o.currency) ?? 0) + num(o.total))
  );
  const currencies = [...currencyMap.entries()]
    .map(([currency, total]) => ({ currency, total }))
    .sort((a, b) => b.total - a.total);

  return {
    range,
    prevRange,
    generatedAt: now,
    orders,
    hasOrders: orders.length > 0 || openLiabilities.length > 0,
    kpis,
    kpiBy,
    trend,
    grain,
    suppliers,
    concentration,
    openLiabilities,
    aging,
    openTotal,
    overdueTotal,
    projects: projectRows,
    categories,
    rfq,
    cycle,
    cycleBottleneck,
    delivery,
    invoiceRisks,
    criticalActions,
    currencies,
    mixedCurrency: currencies.length > 1,
    options: {
      projects: [...new Set(allOrders.map((o) => o.project_name ?? "—"))].sort(),
      suppliers: [...new Set(allOrders.map((o) => o.supplier_name))].sort(),
      categories: [...new Set(allOrders.map((o) => o.category ?? "Tanımsız"))].sort(),
    },
  };
};

/* ── Permissions ───────────────────────────────────────────── */

import type { LicenseRole } from "@/lib/licenseStore";

const ANALYTICS_ROLES: LicenseRole[] = [
  "super_admin",
  "company_admin",
  "procurement",
  "project_manager",
  "accounting",
  "engineer",
  "site_chief",
];

const FINANCIAL_ROLES: LicenseRole[] = [
  "super_admin",
  "company_admin",
  "accounting",
  "procurement",
  "project_manager",
];

const CASH_SOURCE_ROLES: LicenseRole[] = ["super_admin", "company_admin", "accounting"];

export const canViewAnalytics = (role: LicenseRole) => ANALYTICS_ROLES.includes(role);
export const canViewFinancials = (role: LicenseRole) => FINANCIAL_ROLES.includes(role);
export const canViewCashSources = (role: LicenseRole) => CASH_SOURCE_ROLES.includes(role);

export const ANALYTICS_PERMISSION_MESSAGE =
  "Satın alma analitiğini görüntüleme yetkiniz bulunmuyor.";
export const FINANCIAL_MASK = "Yetki gerekli";

/* ── Voice context ─────────────────────────────────────────── */

export const buildVoiceContext = (
  r: AnalyticsResult,
  f: AnalyticsFilters,
  view?: { tab?: string; masked?: boolean },
): string => {
  const filterBits = [
    `tarih ${rangeLabel(r.range)}`,
    f.project !== ALL ? `proje ${f.project}` : null,
    f.supplier !== ALL ? `tedarikçi ${f.supplier}` : null,
    f.category !== ALL ? `kategori ${f.category}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const top = r.suppliers
    .slice(0, 3)
    .map((s) => `${s.name} ${fmtMoney(s.volume)}`)
    .join("; ");
  return [
    `SATIN ALMA ANALİTİĞİ (aktif filtreler: ${filterBits}).`,
    `Toplam satın alma ${fmtMoney(r.kpiBy.purchase.value)}, sipariş taahhüdü ${fmtMoney(
      r.kpiBy.commitment.value
    )}, faturalanan ${fmtMoney(r.kpiBy.invoiced.value)}, ödenen ${fmtMoney(
      r.kpiBy.paid.value
    )}, açık borç ${fmtMoney(r.openTotal)}, gecikmiş borç ${fmtMoney(r.overdueTotal)}.`,
    top ? `En yüksek harcama yapılan tedarikçiler: ${top}.` : "Dönemde tedarikçi harcaması yok.",
    r.cycleBottleneck
      ? `En uzun satın alma aşaması: ${r.cycleBottleneck.label}, ortalama ${r.cycleBottleneck.avgDays} gün.`
      : "Süreç süresi için yeterli zaman verisi yok.",
    r.delivery.onTimeRate !== null
      ? `Zamanında teslimat oranı ${fmtPct(r.delivery.onTimeRate)}.`
      : "Teslimat performansı için yeterli veri yok.",
    view?.tab ? `Kullanıcı şu an "${view.tab}" ekranında.` : null,
    view?.masked ? "Kullanıcının finansal tutarları görme yetkisi yok; tutar paylaşma." : null,
    "Bu veriler yalnızca kullanıcının yetkili olduğu kayıtlardan gelir; rakamları uydurma.",
  ]
    .filter(Boolean)
    .join(" ");
};
