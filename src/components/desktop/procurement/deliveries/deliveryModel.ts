// Satın Alma → Teslimatlar: operational delivery model.
// Rows are derived from real purchase orders + shipment records.
// No demo records are ever synthesised: an order without a shipment
// produces a truthful "Teslimat planlanmadı" row so it stays actionable.
import type { LicenseRole } from "@/lib/licenseStore";
import {
  daysUntil,
  summarizeOrder,
  type OrderDelivery,
  type OrderReceipt,
  type PurchaseOrder,
} from "../orders/orderModel";

export const DELIVERY_STAGE_STATUSES = [
  "Planlanmadı",
  "Hazırlanıyor",
  "Sevke Hazır",
  "Yolda",
  "Şantiyeye Ulaştı",
  "Mal Kabulü Bekliyor",
  "Kısmi Kabul",
  "Tam Kabul",
  "Hasarlı / Uyuşmazlık",
  "İade Sürecinde",
  "Tamamlandı",
  "İptal",
] as const;
export type DeliveryStageStatus = (typeof DELIVERY_STAGE_STATUSES)[number];

/** Persisted shipment statuses (subset accepted by the database check). */
export type ShipmentStatus = OrderDelivery["status"];

export type DeliveryAction =
  | "detail"
  | "plan"
  | "edit_shipment"
  | "update_eta"
  | "mark_ready"
  | "mark_dispatched"
  | "mark_arrived"
  | "goods_receipt"
  | "track_remaining"
  | "receipt_detail"
  | "stock_entry"
  | "match_invoice"
  | "discrepancy"
  | "return"
  | "open_order";

export const DELIVERY_ACTION_LABELS: Record<DeliveryAction, string> = {
  detail: "Detay",
  plan: "Teslimatı Planla",
  edit_shipment: "Sevkiyat Bilgisi Gir",
  update_eta: "Tarihi Güncelle",
  mark_ready: "Sevke Hazır İşaretle",
  mark_dispatched: "Yola Çıktı Olarak İşaretle",
  mark_arrived: "Şantiyeye Ulaştı",
  goods_receipt: "Mal Kabulü Yap",
  track_remaining: "Kalan Teslimatı Takip Et",
  receipt_detail: "Kabul Detayı",
  stock_entry: "Stok Girişini Gör",
  match_invoice: "Faturayı Eşleştir",
  discrepancy: "Uyuşmazlığı Aç",
  return: "İade Oluştur",
  open_order: "Siparişi Aç",
};

const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : Number(v) || 0);

/* ── Dates: always full, never truncated ───────────────────── */

const TR_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

export const fmtFullDate = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const fmtFullDateTime = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()} · ${d
    .getHours()
    .toString()
    .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

/** Human ETA label. Never invents a date. */
export const etaLabel = (
  eta: string | null,
  etaTime: string | null,
  delayDays: number,
  settled: boolean
): string => {
  if (!eta) return settled ? "—" : "Teslimat planlanmadı";
  if (settled) return fmtFullDate(eta);
  if (delayDays > 0) return `${delayDays} gün gecikti`;
  if (delayDays === 0) return etaTime ? `Bugün · ${etaTime}` : "Bugün bekleniyor";
  return fmtFullDate(eta);
};

/* ── Row model ─────────────────────────────────────────────── */

export interface DeliveryRow {
  key: string;
  deliveryId: string | null;
  delivery: OrderDelivery | null;
  receipt: OrderReceipt | null;
  order: PurchaseOrder;
  orderNo: string;
  deliveryNo: string | null;
  supplier: string;
  project: string | null;
  category: string | null;
  materials: string[];
  unit: string;
  status: DeliveryStageStatus;
  shipmentStatus: ShipmentStatus | null;
  eta: string | null;
  etaTime: string | null;
  dispatchDate: string | null;
  actualArrival: string | null;
  delayDays: number;
  isLate: boolean;
  isToday: boolean;
  settled: boolean;
  orderedQty: number;
  deliveredQty: number;
  acceptedQty: number;
  rejectedQty: number;
  damagedQty: number;
  remainingQty: number;
  warehouse: string | null;
  vehiclePlate: string | null;
  waybillNo: string | null;
  awaitingReceipt: boolean;
  hasDiscrepancy: boolean;
  stockPosted: boolean;
  isServiceOnly: boolean;
  orderTotal: number;
  paid: number;
  remainingDebt: number;
  paymentNote: string;
  invoiceNote: string;
  primaryAction: DeliveryAction | null;
  secondaryAction: DeliveryAction | null;
  overflowActions: DeliveryAction[];
}

const SETTLED: DeliveryStageStatus[] = ["Tamamlandı", "Tam Kabul", "İptal"];

const deriveStatus = (
  order: PurchaseOrder,
  delivery: OrderDelivery,
  receipt: OrderReceipt | null,
  qty: { delivered: number; accepted: number; rejected: number; damaged: number }
): DeliveryStageStatus => {
  const s = delivery.status;
  if (s === "İptal") return "İptal";
  if (s === "İade" || s === "İade Sürecinde") return "İade Sürecinde";
  if (s === "Hasarlı / Uyuşmazlık") return "Hasarlı / Uyuşmazlık";

  if (receipt) {
    if (qty.rejected > 0 || qty.damaged > 0) return "Hasarlı / Uyuşmazlık";
    const orderQty = order.items.reduce((t, i) => t + num(i.quantity), 0);
    const orderAccepted = order.items.reduce((t, i) => t + num(i.accepted_quantity), 0);
    if (orderQty > 0 && orderAccepted >= orderQty - 0.001) return "Tamamlandı";
    if (qty.accepted >= qty.delivered - 0.001 && qty.delivered > 0) return "Tam Kabul";
    return "Kısmi Kabul";
  }

  if (
    s === "Şantiyede" ||
    s === "Şantiyeye Ulaştı" ||
    s === "Mal Kabulü Bekliyor" ||
    delivery.actual_arrival
  )
    return "Mal Kabulü Bekliyor";
  if (s === "Yolda") return "Yolda";
  if (s === "Sevke Hazır") return "Sevke Hazır";
  if (s === "Kısmi Teslim" || s === "Kısmi Kabul") return "Kısmi Kabul";
  if (s === "Teslim Edildi" || s === "Tam Kabul") return "Tam Kabul";
  if (s === "Tamamlandı") return "Tamamlandı";
  return "Hazırlanıyor";
};

const actionsFor = (
  status: DeliveryStageStatus,
  row: { stockPosted: boolean; remainingQty: number; hasInvoice: boolean }
): Pick<DeliveryRow, "primaryAction" | "secondaryAction" | "overflowActions"> => {
  switch (status) {
    case "Planlanmadı":
      return {
        primaryAction: "plan",
        secondaryAction: "open_order",
        overflowActions: [],
      };
    case "Hazırlanıyor":
      return {
        primaryAction: "edit_shipment",
        secondaryAction: "update_eta",
        overflowActions: ["mark_ready", "open_order"],
      };
    case "Sevke Hazır":
      return {
        primaryAction: "mark_dispatched",
        secondaryAction: "update_eta",
        overflowActions: ["edit_shipment", "open_order"],
      };
    case "Yolda":
      return {
        primaryAction: "mark_arrived",
        secondaryAction: "update_eta",
        overflowActions: ["edit_shipment", "open_order"],
      };
    case "Şantiyeye Ulaştı":
    case "Mal Kabulü Bekliyor":
      return {
        primaryAction: "goods_receipt",
        secondaryAction: "edit_shipment",
        overflowActions: ["discrepancy", "open_order"],
      };
    case "Kısmi Kabul":
      return {
        primaryAction: row.remainingQty > 0 ? "track_remaining" : "receipt_detail",
        secondaryAction: "receipt_detail",
        overflowActions: ["stock_entry", "match_invoice", "open_order"],
      };
    case "Tam Kabul":
    case "Tamamlandı":
      return {
        primaryAction: row.stockPosted ? "stock_entry" : "receipt_detail",
        secondaryAction: "match_invoice",
        overflowActions: ["open_order"],
      };
    case "Hasarlı / Uyuşmazlık":
      return {
        primaryAction: "discrepancy",
        secondaryAction: "return",
        overflowActions: ["receipt_detail", "open_order"],
      };
    case "İade Sürecinde":
      return {
        primaryAction: "detail",
        secondaryAction: "open_order",
        overflowActions: [],
      };
    default:
      return { primaryAction: "detail", secondaryAction: null, overflowActions: [] };
  }
};

const paymentNoteFor = (order: PurchaseOrder, status: DeliveryStageStatus): string => {
  const s = summarizeOrder(order);
  if (s.overdueInstallments.length > 0) return "Ödeme gecikmiş";
  const conditional = order.installments.find(
    (i) =>
      i.status !== "Ödendi" &&
      i.status !== "İptal" &&
      (i.payment_type === "Teslimatta" || i.payment_type === "Mal Kabulünde")
  );
  if (conditional) {
    const open = num(conditional.amount) - num(conditional.paid_amount);
    const accepted = ["Tam Kabul", "Kısmi Kabul", "Tamamlandı"].includes(status);
    return accepted
      ? `Teslimatta ${Math.round(open).toLocaleString("tr-TR")} ₺ ödeme bekliyor`
      : "Ödeme için mal kabulü bekleniyor";
  }
  if (s.paid > 0 && s.remaining > 0) return "Peşinat ödendi";
  if (s.remaining <= 0 && s.total > 0) return "Ödeme tamamlandı";
  if (order.payment_terms) return order.payment_terms;
  return "Ödeme planı oluşturulmadı";
};

const invoiceNoteFor = (order: PurchaseOrder): string => {
  if (order.invoices.length === 0) return "Fatura bekleniyor";
  const mismatched = order.invoices.find((i) => i.status === "İtirazlı");
  if (mismatched) return `${mismatched.invoice_no} · fatura uyuşmazlığı`;
  const last = order.invoices[order.invoices.length - 1];
  return `${last.invoice_no} · ${last.status}`;
};

/** Flattens orders into delivery rows. One row per shipment, plus a
 *  truthful "Planlanmadı" row for approved orders with no shipment yet. */
export const buildDeliveryRows = (orders: PurchaseOrder[]): DeliveryRow[] => {
  const rows: DeliveryRow[] = [];

  for (const order of orders) {
    if (order.order_status === "İptal") continue;
    const s = summarizeOrder(order);
    const orderedQty = order.items.reduce((t, i) => t + num(i.quantity), 0);
    const materials = order.items.map((i) => i.name);
    const unit = order.items[0]?.unit ?? "adet";
    const isServiceOnly =
      order.items.length > 0 && order.items.every((i) => i.item_type !== "malzeme");
    const hasInvoice = order.invoices.length > 0;

    const base = {
      order,
      orderNo: order.order_no,
      supplier: order.supplier_name,
      project: order.project_name,
      category: order.category,
      materials,
      unit,
      orderedQty,
      isServiceOnly,
      orderTotal: s.total,
      paid: s.paid,
      remainingDebt: s.remaining,
      invoiceNote: invoiceNoteFor(order),
    };

    if (order.deliveries.length === 0) {
      if (["Taslak", "Onay Bekliyor"].includes(order.order_status)) continue;
      const eta = order.expected_delivery_date;
      const until = daysUntil(eta);
      const delayDays = until !== null && until < 0 ? Math.abs(until) : 0;
      rows.push({
        ...base,
        key: `unplanned:${order.id}`,
        deliveryId: null,
        delivery: null,
        receipt: null,
        deliveryNo: null,
        status: "Planlanmadı",
        shipmentStatus: null,
        eta: eta ?? null,
        etaTime: null,
        dispatchDate: null,
        actualArrival: null,
        delayDays,
        isLate: delayDays > 0,
        isToday: until === 0,
        settled: false,
        deliveredQty: 0,
        acceptedQty: 0,
        rejectedQty: 0,
        damagedQty: 0,
        remainingQty: orderedQty,
        warehouse: order.items.find((i) => i.warehouse_name)?.warehouse_name ?? null,
        vehiclePlate: null,
        waybillNo: null,
        awaitingReceipt: false,
        hasDiscrepancy: false,
        stockPosted: false,
        paymentNote: paymentNoteFor(order, "Planlanmadı"),
        ...actionsFor("Planlanmadı", {
          stockPosted: false,
          remainingQty: orderedQty,
          hasInvoice,
        }),
      });
      continue;
    }

    for (const delivery of order.deliveries) {
      const receipt = order.receipts.find((r) => r.delivery_id === delivery.id) ?? null;
      const lines = delivery.items || [];
      const qty = {
        delivered: lines.reduce((t, l) => t + num(l.delivered_quantity), 0),
        accepted: lines.reduce((t, l) => t + num(l.accepted_quantity), 0),
        rejected: lines.reduce((t, l) => t + num(l.rejected_quantity), 0),
        damaged: lines.reduce((t, l) => t + num(l.damaged_quantity), 0),
      };
      const status = deriveStatus(order, delivery, receipt, qty);
      const settled = SETTLED.includes(status);
      const eta = delivery.expected_arrival ?? order.expected_delivery_date ?? null;
      const until = daysUntil(eta);
      const delayDays = !settled && until !== null && until < 0 ? Math.abs(until) : 0;
      const orderAccepted = order.items.reduce(
        (t, i) => t + num(i.accepted_quantity),
        0
      );
      const remainingQty = Math.max(orderedQty - orderAccepted, 0);
      const awaitingReceipt = status === "Mal Kabulü Bekliyor";

      rows.push({
        ...base,
        key: delivery.id,
        deliveryId: delivery.id,
        delivery,
        receipt,
        deliveryNo: delivery.delivery_no,
        status,
        shipmentStatus: delivery.status,
        eta,
        etaTime: delivery.expected_arrival_time ?? null,
        dispatchDate: delivery.dispatch_date ?? null,
        actualArrival: delivery.actual_arrival ?? null,
        delayDays,
        isLate: delayDays > 0,
        isToday: !settled && until === 0,
        settled,
        deliveredQty: qty.delivered,
        acceptedQty: qty.accepted,
        rejectedQty: qty.rejected,
        damagedQty: qty.damaged,
        remainingQty,
        warehouse: delivery.warehouse_name ?? receipt?.warehouse_name ?? null,
        vehiclePlate: delivery.vehicle_plate ?? null,
        waybillNo: delivery.waybill_no ?? null,
        awaitingReceipt,
        hasDiscrepancy: qty.rejected > 0 || qty.damaged > 0,
        stockPosted: !!receipt?.stock_posted,
        paymentNote: paymentNoteFor(order, status),
        ...actionsFor(status, {
          stockPosted: !!receipt?.stock_posted,
          remainingQty,
          hasInvoice,
        }),
      });
    }
  }

  return rows;
};

/* ── KPIs ──────────────────────────────────────────────────── */

export type DeliveryKpiKey =
  | "in_transit"
  | "today"
  | "late"
  | "awaiting_receipt"
  | "partial"
  | "completed";

export const DELIVERY_KPIS: { key: DeliveryKpiKey; label: string }[] = [
  { key: "in_transit", label: "Yolda" },
  { key: "today", label: "Bugün Beklenen" },
  { key: "late", label: "Geciken" },
  { key: "awaiting_receipt", label: "Mal Kabulü Bekleyen" },
  { key: "partial", label: "Kısmi Teslimat" },
  { key: "completed", label: "Tamamlanan" },
];

export const matchesKpi = (row: DeliveryRow, key: DeliveryKpiKey): boolean => {
  switch (key) {
    case "in_transit":
      return row.status === "Yolda" || row.status === "Sevke Hazır";
    case "today":
      return row.isToday;
    case "late":
      return row.isLate;
    case "awaiting_receipt":
      return row.status === "Mal Kabulü Bekliyor" || row.status === "Şantiyeye Ulaştı";
    case "partial":
      return row.status === "Kısmi Kabul";
    case "completed":
      return row.status === "Tamamlandı" || row.status === "Tam Kabul";
    default:
      return true;
  }
};

export const deliveryKpiCounts = (rows: DeliveryRow[]) =>
  DELIVERY_KPIS.reduce(
    (acc, k) => ({ ...acc, [k.key]: rows.filter((r) => matchesKpi(r, k.key)).length }),
    {} as Record<DeliveryKpiKey, number>
  );

/* ── Filters & sorting ─────────────────────────────────────── */

export interface DeliveryFilterState {
  query: string;
  status: string;
  project: string;
  supplier: string;
  warehouse: string;
  etaDate: string;
  kpi: DeliveryKpiKey | null;
  sort: DeliverySort;
}

export type DeliverySort = "eta" | "delay" | "value" | "newest";

export const DELIVERY_SORTS: { key: DeliverySort; label: string }[] = [
  { key: "eta", label: "En yakın teslim tarihi" },
  { key: "delay", label: "En çok geciken" },
  { key: "value", label: "En yüksek sipariş tutarı" },
  { key: "newest", label: "En yeni sevkiyat" },
];

export const emptyDeliveryFilters: DeliveryFilterState = {
  query: "",
  status: "all",
  project: "all",
  supplier: "all",
  warehouse: "all",
  etaDate: "",
  kpi: null,
  sort: "eta",
};

const lower = (v: unknown) => String(v ?? "").toLocaleLowerCase("tr");

export const filterDeliveryRows = (
  rows: DeliveryRow[],
  f: DeliveryFilterState
): DeliveryRow[] => {
  const q = f.query.trim().toLocaleLowerCase("tr");
  const out = rows.filter((r) => {
    if (f.status !== "all" && r.status !== f.status) return false;
    if (f.project !== "all" && (r.project ?? "") !== f.project) return false;
    if (f.supplier !== "all" && r.supplier !== f.supplier) return false;
    if (f.warehouse !== "all" && (r.warehouse ?? "") !== f.warehouse) return false;
    if (f.etaDate && (r.eta ?? "").slice(0, 10) !== f.etaDate) return false;
    if (f.kpi && !matchesKpi(r, f.kpi)) return false;
    if (!q) return true;
    return [
      r.orderNo,
      r.deliveryNo,
      r.supplier,
      r.project,
      r.vehiclePlate,
      r.waybillNo,
      r.category,
      ...r.materials,
    ].some((v) => lower(v).includes(q));
  });

  const rank = (r: DeliveryRow) => (r.eta ? new Date(r.eta).getTime() : 8.64e15);
  return out.sort((a, b) => {
    switch (f.sort) {
      case "delay":
        return b.delayDays - a.delayDays || rank(a) - rank(b);
      case "value":
        return b.orderTotal - a.orderTotal;
      case "newest":
        return (b.delivery?.created_at ?? "").localeCompare(
          a.delivery?.created_at ?? ""
        );
      default:
        return rank(a) - rank(b);
    }
  });
};

/* ── Quantity guards ───────────────────────────────────────── */

export const remainingForItem = (
  order: PurchaseOrder,
  itemId: string,
  excludeDeliveryId?: string | null
): number => {
  const item = order.items.find((i) => i.id === itemId);
  if (!item) return 0;
  const otherDelivered = order.deliveries
    .filter((d) => d.id !== excludeDeliveryId && d.status !== "İptal")
    .flatMap((d) => d.items || [])
    .filter((l) => l.order_item_id === itemId)
    .reduce((t, l) => t + num(l.delivered_quantity), 0);
  return Math.max(num(item.quantity) - otherDelivered, 0);
};

export const validateReceiptLine = (
  delivered: number,
  accepted: number,
  rejected: number,
  damaged: number
): string | null => {
  if (accepted < 0 || rejected < 0 || damaged < 0)
    return "Miktarlar negatif olamaz.";
  if (accepted + rejected + damaged > delivered + 0.001)
    return "Kabul, red ve hasarlı toplamı teslim edilen miktarı aşamaz.";
  return null;
};

/* ── Permissions ───────────────────────────────────────────── */

const DELIVERY_MANAGE_ROLES: LicenseRole[] = [
  "super_admin",
  "company_admin",
  "project_manager",
  "site_chief",
  "warehouse_manager",
  "engineer",
  "procurement",
];

export const canManageDeliveries = (role: LicenseRole) =>
  DELIVERY_MANAGE_ROLES.includes(role);

export const DELIVERY_PERMISSION_MESSAGE =
  "Teslimat işlemleri için yetkiniz bulunmuyor.";

/** Sensitive driver contact data is only exposed to managing roles. */
export const canSeeDriverContact = (role: LicenseRole) => canManageDeliveries(role);
