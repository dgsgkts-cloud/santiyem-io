// Satın Alma → Siparişler: connected order model.
// Single source of truth for status domains, derived financials,
// role permissions and the status-based action matrix.
import type { LicenseRole } from "@/lib/licenseStore";

export const ORDER_STATUSES = [
  "Taslak",
  "Onay Bekliyor",
  "Onaylandı",
  "Tedarikçiye Gönderildi",
  "Hazırlanıyor",
  "Kısmi Teslimat",
  "Tamamlandı",
  "İptal",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "Planlanmadı",
  "Ödeme Planlandı",
  "Kısmen Ödendi",
  "Ödendi",
  "Gecikmiş",
  "İptal",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const DELIVERY_STATUSES = [
  "Planlanmadı",
  "Hazırlanıyor",
  "Yolda",
  "Kısmi Teslim",
  "Şantiyede",
  "Teslim Edildi",
  "İade",
  "İptal",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const INVOICE_STATUSES = [
  "Fatura Bekleniyor",
  "Fatura Geldi",
  "Kontrol Ediliyor",
  "Eşleştirildi",
  "İtirazlı",
  "Ödendi",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_METHODS = [
  "Banka Havalesi",
  "EFT",
  "Nakit",
  "Kredi Kartı",
  "Çek",
  "Senet",
  "Mahsup",
  "Diğer",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const INSTALLMENT_TYPES = [
  "Avans",
  "Peşin",
  "Teslimatta",
  "Mal Kabulünde",
  "Vadeli",
  "Kesin Hesap",
] as const;

/* ── Row types (mirror the backend tables) ─────────────────── */

export interface OrderItem {
  id: string;
  order_id: string;
  name: string;
  description: string | null;
  item_type: "malzeme" | "hizmet" | "kiralama" | "diger";
  material_id: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  line_total: number;
  delivered_quantity: number;
  accepted_quantity: number;
  rejected_quantity: number;
  warehouse_name: string | null;
  cost_code: string | null;
  sort_order: number;
}

export interface OrderInstallment {
  id: string;
  order_id: string;
  installment_no: number;
  payment_type: string;
  due_date: string;
  amount: number;
  currency: string;
  percentage: number | null;
  condition_note: string | null;
  status: "Planlandı" | "Bekliyor" | "Kısmen Ödendi" | "Ödendi" | "Gecikmiş" | "İptal";
  planned_account_id: string | null;
  paid_amount: number;
}

export interface OrderPayment {
  id: string;
  order_id: string;
  installment_id: string | null;
  cash_payment_id: string | null;
  account_id: string | null;
  amount: number;
  currency: string;
  payment_date: string;
  method: PaymentMethod;
  reference_no: string | null;
  description: string | null;
  reversed_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface OrderDeliveryItem {
  id: string;
  delivery_id: string;
  order_item_id: string;
  delivered_quantity: number;
  accepted_quantity: number;
  rejected_quantity: number;
  damaged_quantity: number;
  note: string | null;
}

export interface OrderDelivery {
  id: string;
  order_id: string;
  delivery_no: string;
  carrier: string | null;
  vehicle_plate: string | null;
  driver_name: string | null;
  waybill_no: string | null;
  dispatch_date: string | null;
  expected_arrival: string | null;
  actual_arrival: string | null;
  project_id: string | null;
  warehouse_name: string | null;
  status: "Hazırlanıyor" | "Yolda" | "Şantiyede" | "Kısmi Teslim" | "Teslim Edildi" | "İade" | "İptal";
  notes: string | null;
  items: OrderDeliveryItem[];
  created_at: string;
}

export interface OrderReceipt {
  id: string;
  order_id: string;
  delivery_id: string;
  receipt_no: string;
  received_by: string | null;
  warehouse_name: string | null;
  discrepancy_note: string | null;
  stock_posted: boolean;
  stock_posted_at: string | null;
  accepted_at: string;
}

export interface OrderInvoice {
  id: string;
  order_id: string;
  delivery_id: string | null;
  invoice_no: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  vat_amount: number;
  withholding: number;
  total: number;
  currency: string;
  status: "Fatura Geldi" | "Kontrol Ediliyor" | "Eşleştirildi" | "İtirazlı" | "Ödendi";
  file_url: string | null;
  file_name: string | null;
  match_result: MatchLine[];
  notes: string | null;
  created_at: string;
}

export interface MatchLine {
  label: string;
  ok: boolean;
  detail: string;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  actor: string;
  event: string;
  from_value: string | null;
  to_value: string | null;
  detail: string | null;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  user_id: string;
  order_no: string;
  purchase_request_id: string | null;
  purchase_request_no: string | null;
  rfq_no: string | null;
  quotation_ref: string | null;
  quotation_total: number | null;
  supplier_id: string | null;
  supplier_name: string;
  project_id: string | null;
  project_name: string | null;
  category: string | null;
  owner_name: string | null;
  order_date: string;
  expected_delivery_date: string | null;
  payment_terms: string | null;
  delivery_address: string | null;
  delivery_contact: string | null;
  currency: string;
  subtotal: number;
  discount: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  delivery_status: DeliveryStatus;
  invoice_status: InvoiceStatus;
  notes: string | null;
  approver_name: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  sent_to_supplier_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  version: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  installments: OrderInstallment[];
  payments: OrderPayment[];
  deliveries: OrderDelivery[];
  receipts: OrderReceipt[];
  invoices: OrderInvoice[];
  events: OrderEvent[];
}

/* ── Derived financials & progress ─────────────────────────── */

export interface OrderSummary {
  total: number;
  planned: number;
  paid: number;
  remaining: number;
  paidPct: number;
  invoiced: number;
  overdueInstallments: OrderInstallment[];
  nextInstallment: OrderInstallment | null;
  deliveredPct: number;
  acceptedPct: number;
  etaDays: number | null;
  isLate: boolean;
}

const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);

export const daysUntil = (iso?: string | null): number | null => {
  if (!iso) return null;
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

export const summarizeOrder = (order: PurchaseOrder): OrderSummary => {
  const total = num(order.total);
  const planned = order.installments
    .filter((i) => i.status !== "İptal")
    .reduce((s, i) => s + num(i.amount), 0);
  const paid = order.payments
    .filter((p) => !p.reversed_at)
    .reduce((s, p) => s + num(p.amount), 0);
  const invoiced = order.invoices.reduce((s, i) => s + num(i.total), 0);
  const remaining = Math.max(total - paid, 0);
  const overdueInstallments = order.installments.filter(
    (i) =>
      i.status !== "Ödendi" &&
      i.status !== "İptal" &&
      num(i.paid_amount) < num(i.amount) &&
      (daysUntil(i.due_date) ?? 1) < 0
  );
  const open = order.installments
    .filter((i) => i.status !== "Ödendi" && i.status !== "İptal")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const qty = order.items.reduce((s, i) => s + num(i.quantity), 0);
  const delivered = order.items.reduce((s, i) => s + num(i.delivered_quantity), 0);
  const accepted = order.items.reduce((s, i) => s + num(i.accepted_quantity), 0);
  const etaDays = daysUntil(order.expected_delivery_date);

  return {
    total,
    planned,
    paid,
    remaining,
    paidPct: total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0,
    invoiced,
    overdueInstallments,
    nextInstallment: open[0] ?? null,
    deliveredPct: qty > 0 ? Math.round((delivered / qty) * 100) : 0,
    acceptedPct: qty > 0 ? Math.round((accepted / qty) * 100) : 0,
    etaDays,
    isLate:
      etaDays !== null &&
      etaDays < 0 &&
      !["Teslim Edildi", "İptal"].includes(order.delivery_status),
  };
};

/** Payment status derived from the plan + recorded payments. */
export const derivePaymentStatus = (
  total: number,
  installments: OrderInstallment[],
  paid: number
): PaymentStatus => {
  if (paid >= total - 0.5 && total > 0) return "Ödendi";
  const overdue = installments.some(
    (i) =>
      i.status !== "Ödendi" &&
      i.status !== "İptal" &&
      num(i.paid_amount) < num(i.amount) &&
      (daysUntil(i.due_date) ?? 1) < 0
  );
  if (overdue) return "Gecikmiş";
  if (paid > 0) return "Kısmen Ödendi";
  if (installments.length > 0) return "Ödeme Planlandı";
  return "Planlanmadı";
};

/** Delivery status derived from accepted / delivered quantities. */
export const deriveDeliveryStatus = (
  items: Pick<OrderItem, "quantity" | "delivered_quantity" | "accepted_quantity">[],
  deliveries: Pick<OrderDelivery, "status">[]
): DeliveryStatus => {
  const qty = items.reduce((s, i) => s + num(i.quantity), 0);
  const accepted = items.reduce((s, i) => s + num(i.accepted_quantity), 0);
  const delivered = items.reduce((s, i) => s + num(i.delivered_quantity), 0);
  if (qty > 0 && accepted >= qty - 0.001) return "Teslim Edildi";
  if (accepted > 0 || (delivered > 0 && delivered < qty)) return "Kısmi Teslim";
  if (deliveries.some((d) => d.status === "Şantiyede")) return "Şantiyede";
  if (deliveries.some((d) => d.status === "Yolda")) return "Yolda";
  if (deliveries.length > 0) return "Hazırlanıyor";
  return "Planlanmadı";
};

export const deriveOrderStatus = (
  current: OrderStatus,
  delivery: DeliveryStatus,
  payment: PaymentStatus
): OrderStatus => {
  if (current === "İptal" || current === "Taslak" || current === "Onay Bekliyor")
    return current;
  if (delivery === "Teslim Edildi" && (payment === "Ödendi" || payment === "İptal"))
    return "Tamamlandı";
  if (delivery === "Kısmi Teslim") return "Kısmi Teslimat";
  if (delivery === "Yolda" || delivery === "Hazırlanıyor" || delivery === "Şantiyede")
    return "Hazırlanıyor";
  return current;
};

/* ── Permissions ───────────────────────────────────────────── */

export type OrderCapability =
  | "procurement" // create / edit / send / cancel orders
  | "finance" // payment plan, payments, invoices
  | "site" // deliveries, goods receipt
  | "approve";

const CAPABILITY_ROLES: Record<OrderCapability, LicenseRole[]> = {
  procurement: ["super_admin", "company_admin", "procurement", "project_manager"],
  finance: ["super_admin", "company_admin", "accounting"],
  site: [
    "super_admin",
    "company_admin",
    "project_manager",
    "site_chief",
    "warehouse_manager",
    "engineer",
  ],
  approve: ["super_admin", "company_admin", "project_manager", "accounting"],
};

export const can = (role: LicenseRole, capability: OrderCapability) =>
  CAPABILITY_ROLES[capability].includes(role);

export const PERMISSION_MESSAGE =
  "Bu işlem için yetkiniz yok. Yetkili kullanıcı ile devam edin.";

/* ── Status-based action matrix ─────────────────────────────── */

export type OrderAction =
  | "detail"
  | "edit"
  | "submit_approval"
  | "approve"
  | "reject"
  | "send_supplier"
  | "plan_payment"
  | "record_payment"
  | "add_delivery"
  | "goods_receipt"
  | "add_invoice"
  | "pdf"
  | "duplicate"
  | "cancel"
  | "delete";

export const ACTION_LABELS: Record<OrderAction, string> = {
  detail: "Detay",
  edit: "Siparişi Düzenle",
  submit_approval: "Onaya Gönder",
  approve: "Onayla",
  reject: "Reddet",
  send_supplier: "Tedarikçiye Gönder",
  plan_payment: "Ödeme Planı Oluştur",
  record_payment: "Ödeme Kaydet",
  add_delivery: "Sevkiyat Ekle",
  goods_receipt: "Mal Kabulü Yap",
  add_invoice: "Fatura Ekle",
  pdf: "PDF İndir",
  duplicate: "Kopyala",
  cancel: "Siparişi İptal Et",
  delete: "Siparişi Sil",
};

export const ACTION_CAPABILITY: Record<OrderAction, OrderCapability | null> = {
  detail: null,
  pdf: null,
  duplicate: "procurement",
  edit: "procurement",
  submit_approval: "procurement",
  approve: "approve",
  reject: "approve",
  send_supplier: "procurement",
  plan_payment: "finance",
  record_payment: "finance",
  add_delivery: "site",
  goods_receipt: "site",
  add_invoice: "finance",
  cancel: "procurement",
  delete: "procurement",
};

export interface ActionSet {
  primary: OrderAction | null;
  secondary: OrderAction | null;
  overflow: OrderAction[];
}

/** One primary, one secondary, "Detay" link, rest in overflow. */
export const actionsForOrder = (order: PurchaseOrder): ActionSet => {
  const s = summarizeOrder(order);
  const hasPlan = order.installments.length > 0;
  const openDelivery = order.deliveries.find(
    (d) => !order.receipts.some((r) => r.delivery_id === d.id) && d.status !== "İptal"
  );

  switch (order.order_status) {
    case "Taslak":
      return {
        primary: "edit",
        secondary: "submit_approval",
        overflow: ["pdf", "duplicate", "delete"],
      };
    case "Onay Bekliyor":
      return { primary: "approve", secondary: "reject", overflow: ["edit", "pdf"] };
    case "Onaylandı":
      return {
        primary: "send_supplier",
        secondary: hasPlan ? "record_payment" : "plan_payment",
        overflow: ["pdf", hasPlan ? "plan_payment" : "record_payment", "cancel"],
      };
    case "Tedarikçiye Gönderildi":
      return {
        primary: "add_delivery",
        secondary: hasPlan ? "record_payment" : "plan_payment",
        overflow: ["pdf", "add_invoice", "cancel"],
      };
    case "Hazırlanıyor":
    case "Kısmi Teslimat":
      return {
        primary: openDelivery ? "goods_receipt" : "add_delivery",
        secondary: s.remaining > 0 ? "record_payment" : "add_invoice",
        overflow: ["add_delivery", "add_invoice", "pdf", "cancel"],
      };
    case "Tamamlandı":
      return {
        primary: "add_invoice",
        secondary: "pdf",
        overflow: ["duplicate"],
      };
    case "İptal":
      return { primary: "duplicate", secondary: "pdf", overflow: [] };
    default:
      return { primary: null, secondary: null, overflow: ["pdf"] };
  }
};

/** Guard for actions that would be invalid in the current state. */
export const actionBlockedReason = (
  order: PurchaseOrder,
  action: OrderAction
): string | null => {
  const s = summarizeOrder(order);
  switch (action) {
    case "edit":
      return ["Taslak", "Onay Bekliyor"].includes(order.order_status)
        ? null
        : "Sadece taslak ve onay bekleyen siparişler düzenlenebilir.";
    case "delete":
      return order.order_status === "Taslak"
        ? null
        : "Sadece taslak siparişler silinebilir.";
    case "submit_approval":
      if (order.order_status !== "Taslak")
        return "Sipariş zaten onay sürecine girmiş.";
      return order.items.length === 0 ? "Onaya göndermek için kalem ekleyin." : null;
    case "record_payment":
      if (order.order_status === "Taslak")
        return "Ödeme kaydı için sipariş onaylanmalı.";
      return s.remaining <= 0 ? "Sipariş tamamen ödenmiş." : null;
    case "goods_receipt":
      return order.deliveries.some(
        (d) => !order.receipts.some((r) => r.delivery_id === d.id)
      )
        ? null
        : "Mal kabulü için önce sevkiyat kaydı oluşturun.";
    case "add_delivery":
      return ["Taslak", "Onay Bekliyor", "İptal"].includes(order.order_status)
        ? "Sevkiyat için sipariş onaylanmış olmalı."
        : null;
    case "cancel":
      return ["Tamamlandı", "İptal"].includes(order.order_status)
        ? "Bu sipariş iptal edilemez."
        : null;
    default:
      return null;
  }
};

/* ── Formatting & numbering ────────────────────────────────── */

export const fmtMoney = (n: number, currency = "TRY") => {
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₺";
  return `${symbol}${Math.round(n).toLocaleString("tr-TR")}`;
};

export const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const nextOrderNo = (existing: string[]): string => {
  const now = new Date();
  const prefix = `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const seq =
    existing
      .filter((n) => n.startsWith(prefix))
      .map((n) => parseInt(n.split("-")[2] ?? "0", 10) || 0)
      .reduce((a, b) => Math.max(a, b), 0) + 1;
  return `${prefix}-${String(seq).padStart(3, "0")}`;
};

export const computeTotals = (
  items: Pick<OrderItem, "quantity" | "unit_price" | "vat_rate">[],
  discount = 0
) => {
  const subtotal = items.reduce((s, i) => s + num(i.quantity) * num(i.unit_price), 0);
  const base = Math.max(subtotal - num(discount), 0);
  const vat = items.reduce((s, i) => {
    const line = num(i.quantity) * num(i.unit_price);
    const share = subtotal > 0 ? line / subtotal : 0;
    return s + (base * share * num(i.vat_rate)) / 100;
  }, 0);
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vat_amount: Math.round(vat * 100) / 100,
    total: Math.round((base + vat) * 100) / 100,
  };
};

/** Three-way match: PO ↔ goods receipt ↔ supplier invoice. */
export const threeWayMatch = (
  order: PurchaseOrder,
  invoice: { subtotal: number; vat_amount: number; total: number }
): MatchLine[] => {
  const s = summarizeOrder(order);
  const acceptedValue = order.items.reduce(
    (sum, i) => sum + num(i.accepted_quantity) * num(i.unit_price),
    0
  );
  const tolerance = Math.max(order.total * 0.01, 1);
  const invoicedBefore = order.invoices.reduce((sum, i) => sum + num(i.total), 0);
  return [
    {
      label: "Sipariş tutarı ↔ fatura tutarı",
      ok: Math.abs(invoice.total - order.total) <= tolerance,
      detail: `${fmtMoney(order.total, order.currency)} / ${fmtMoney(invoice.total, order.currency)}`,
    },
    {
      label: "Mal kabulü ↔ fatura",
      ok: invoice.subtotal <= acceptedValue + tolerance,
      detail: `Kabul edilen: ${fmtMoney(acceptedValue, order.currency)}`,
    },
    {
      label: "Mükerrer fatura kontrolü",
      ok: invoicedBefore + invoice.total <= order.total + tolerance,
      detail: `Önceki faturalar: ${fmtMoney(invoicedBefore, order.currency)}`,
    },
    {
      label: "Ödeme durumu",
      ok: s.paid <= invoice.total + invoicedBefore + tolerance,
      detail: `Ödenen: ${fmtMoney(s.paid, order.currency)}`,
    },
  ];
};
