// DEPO — TRANSFER MODELİ (saf mantık, sunucu kurallarının aynası).
//
// Buradaki hiçbir fonksiyon veri uydurmaz: yalnızca sunucudan gelen transfer
// satırını okuyup hangi işlemin yapılabileceğini ve akışın hangi aşamada
// olduğunu türetir. Yetki kuralları `depot_permission()` ile birebir aynıdır;
// buton gizlemek güvenlik değildir, son söz her zaman sunucudadır.

export type TransferStatus =
  | "requested"
  | "pending_approval"
  | "approved"
  | "ready_to_dispatch"
  | "partially_dispatched"
  | "in_transit"
  | "partially_received"
  | "received"
  | "discrepancy"
  | "rejected"
  | "cancelled";

export const TRANSFER_STATUS_LABEL: Record<TransferStatus, string> = {
  requested: "Talep Edildi",
  pending_approval: "Onay Bekliyor",
  approved: "Onaylandı",
  ready_to_dispatch: "Sevke Hazır",
  partially_dispatched: "Kısmi Sevk",
  in_transit: "Yolda",
  partially_received: "Kısmi Teslim",
  received: "Teslim Alındı",
  discrepancy: "Uyuşmazlık",
  rejected: "Reddedildi",
  cancelled: "İptal Edildi",
};

export const TRANSFER_STATUS_TONE: Record<TransferStatus, string> = {
  requested: "bg-muted/60 text-muted-foreground border-border/70",
  pending_approval: "bg-amber-500/[0.08] text-amber-300/90 border-amber-500/20",
  approved: "bg-sky-500/[0.08] text-sky-300/90 border-sky-500/25",
  ready_to_dispatch: "bg-sky-500/[0.08] text-sky-300/90 border-sky-500/25",
  partially_dispatched: "bg-indigo-500/[0.08] text-indigo-300/90 border-indigo-500/25",
  in_transit: "bg-indigo-500/[0.08] text-indigo-300/90 border-indigo-500/25",
  partially_received: "bg-teal-500/[0.08] text-teal-300/90 border-teal-500/25",
  received: "bg-emerald-500/[0.08] text-emerald-300/90 border-emerald-500/20",
  discrepancy: "bg-rose-500/[0.08] text-rose-300/90 border-rose-500/20",
  rejected: "bg-rose-500/[0.08] text-rose-300/90 border-rose-500/20",
  cancelled: "bg-muted/60 text-muted-foreground border-border/70",
};

/** Akış çizgisinde gösterilen dört ana aşama. */
export const TRANSFER_STAGES = ["Talep", "Onay", "Sevk", "Teslim"] as const;

export const TERMINAL_STATUSES: TransferStatus[] = ["received", "rejected", "cancelled"];
const PENDING: TransferStatus[] = ["requested", "pending_approval"];
const DISPATCHABLE: TransferStatus[] = ["approved", "ready_to_dispatch", "partially_dispatched"];
const RECEIVABLE: TransferStatus[] = ["partially_dispatched", "in_transit", "partially_received"];

export type TransferAction =
  | "approve"
  | "reject"
  | "revise"
  | "dispatch"
  | "receive"
  | "cancel"
  | "return";

export const TRANSFER_ACTION_LABEL: Record<TransferAction, string> = {
  approve: "Onayla",
  reject: "Reddet",
  revise: "Revizyon İste",
  dispatch: "Sevk Et",
  receive: "Teslim Al",
  cancel: "Sevk Öncesi İptal",
  // return_stock_transfer yalnızca YOLDA olan miktarı kaynak depoya geri yazar.
  // Hedef depoya kabul edilmiş stok bu işlemle geri alınamaz.
  return: "Transit Sevkiyatı Kaynağa Geri Al",
};

/** Kullanıcıya gösterilen açıklamalar — RPC'nin gerçek davranışını anlatır. */
export const TRANSFER_ACTION_EXPLANATION: Record<TransferAction, string> = {
  approve: "Onaydan sonra miktar kaynak depoda rezerve edilir; fiziksel stok sevkte düşer.",
  reject: "Red sebebi talep sahibine bildirim olarak iletilir.",
  revise: "Talep, düzeltilmek üzere talep sahibine geri döner (durum yeniden 'Talep Edildi' olur).",
  dispatch: "Sevk edilen miktar kaynak depodan düşer ve yolda (transit) stoğa geçer.",
  receive: "Yalnızca kabul edilen miktar hedef depoya girer. Hasarlı, eksik ve reddedilen miktarlar uyuşmazlık olarak kaydedilir.",
  cancel: "Sevk başlamadan önce iptal edilebilir. Stok hareketi oluşmaz.",
  return: "Yalnızca yolda (transit) olan miktar kaynak depoya geri yazılır. Hedef depoya kabul edilmiş stok bu işlemle geri alınamaz.",
};

/**
 * Sunucu `approve_stock_transfer` yalnızca bu karar adlarını kabul eder.
 * UI aksiyon adı ile sunucu karar adı birebir aynı değildir.
 */
export const SERVER_DECISION: Record<"approve" | "reject" | "revise", "approve" | "reject" | "request_revision"> = {
  approve: "approve",
  reject: "reject",
  revise: "request_revision",
};


/** Bir transferin işlem kararları için gereken asgari alanlar. */
export interface TransferDecisionRow {
  status: TransferStatus;
  requester_id: string | null;
  requested_quantity: number;
  dispatched_quantity: number;
  in_transit_quantity: number;
  received_quantity: number;
}

export interface DepotPermissions {
  create_transfer: boolean;
  approve_transfer: boolean;
  dispatch_transfer: boolean;
  receive_transfer: boolean;
  override_safety_stock: boolean;
}

export const NO_PERMISSIONS: DepotPermissions = {
  create_transfer: false,
  approve_transfer: false,
  dispatch_transfer: false,
  receive_transfer: false,
  override_safety_stock: false,
};

export interface TransferActor {
  userId: string | null;
  /** Firma sahibi/yöneticisi kendi talebini onaylayabilir. */
  isOwner: boolean;
  permissions: DepotPermissions;
}

export const remainingToDispatch = (t: TransferDecisionRow) =>
  Math.max(t.requested_quantity - t.dispatched_quantity, 0);

export const transitQuantity = (t: TransferDecisionRow) => Math.max(t.in_transit_quantity, 0);

/**
 * Sunucu kurallarının aynası. Sıra, kart üzerinde gösterim sırasıdır.
 */
export const availableTransferActions = (
  t: TransferDecisionRow,
  actor: TransferActor,
): TransferAction[] => {
  const p = actor.permissions;
  const out: TransferAction[] = [];
  const isRequester = !!actor.userId && t.requester_id === actor.userId;
  const selfBlocked = isRequester && !actor.isOwner;

  if (PENDING.includes(t.status) && p.approve_transfer && !selfBlocked) {
    out.push("approve", "reject", "revise");
  }
  if (DISPATCHABLE.includes(t.status) && p.dispatch_transfer && remainingToDispatch(t) > 0) {
    out.push("dispatch");
  }
  if (RECEIVABLE.includes(t.status) && p.receive_transfer && transitQuantity(t) > 0) {
    out.push("receive");
  }
  if (
    !TERMINAL_STATUSES.includes(t.status) &&
    t.status !== "discrepancy" &&
    t.dispatched_quantity === 0 &&
    (p.approve_transfer || (p.create_transfer && isRequester))
  ) {
    out.push("cancel");
  }
  if (transitQuantity(t) > 0 && p.approve_transfer) {
    out.push("return");
  }
  return out;
};

/** Sebep zorunlu olan işlemler — sunucu da bunları zorunlu tutar. */
export const REASON_REQUIRED: TransferAction[] = ["reject", "revise", "cancel", "return"];

export interface TransferProgress {
  /** 0-4 arası tamamlanan aşama sayısı. */
  completed: number;
  total: number;
  ratio: number;
  label: string;
  failed: boolean;
}

export const transferProgress = (t: TransferDecisionRow): TransferProgress => {
  const total = TRANSFER_STAGES.length;
  let completed = 1; // talep her zaman oluşmuş
  if (
    ["approved", "ready_to_dispatch", "partially_dispatched", "in_transit",
      "partially_received", "received", "discrepancy"].includes(t.status)
  ) completed = 2;
  if (t.dispatched_quantity > 0) completed = 3;
  if (t.status === "received" || t.status === "discrepancy") completed = 4;
  const failed = t.status === "rejected" || t.status === "cancelled";
  return {
    completed,
    total,
    ratio: failed ? 1 : completed / total,
    label: `${completed} / ${total} tamamlandı`,
    failed,
  };
};

/** Teslimde tespit edilen uyuşmazlık toplamı (hasar + eksik + red). */
export const discrepancyTotal = (t: {
  damaged_quantity?: number | null;
  missing_quantity?: number | null;
  rejected_quantity?: number | null;
}) =>
  (Number(t.damaged_quantity) || 0) +
  (Number(t.missing_quantity) || 0) +
  (Number(t.rejected_quantity) || 0);

/** Sunucu hata kodlarının okunabilir Türkçe karşılıkları. */
export const TRANSFER_ERROR_TR: Record<string, string> = {
  not_authenticated: "Oturum bulunamadı.",
  permission_denied: "Bu işlem için yetkiniz yok.",
  cross_company_access: "Bu kayıt firmanıza ait değil.",
  same_warehouse: "Kaynak ve hedef depo aynı olamaz.",
  invalid_warehouse: "Geçersiz depo seçimi.",
  warehouse_inactive: "Seçilen depo pasif durumda.",
  material_not_found: "Malzeme bulunamadı.",
  material_inactive: "Malzeme pasif durumda.",
  material_not_stockable: "Bu malzeme stoklanabilir değil, transfer edilemez.",
  invalid_quantity: "Miktar sıfırdan büyük olmalı.",
  invalid_unit: "Birim malzeme birimiyle uyumlu değil.",
  insufficient_available_stock: "Kullanılabilir stok yetersiz.",
  safety_stock_violation: "İşlem güvenlik stoğunun altına düşürüyor.",
  invalid_transfer_status: "Transferin mevcut durumu bu işleme izin vermiyor.",
  invalid_decision: "Geçersiz onay kararı.",
  self_approval_not_allowed: "Kendi talebinizi onaylayamazsınız.",
  reason_required: "Sebep girilmesi zorunlu.",
  quantity_exceeds_remaining: "Miktar sevk edilmemiş kalan miktarı aşıyor.",
  quantity_exceeds_transit: "Miktar yolda olan miktarı aşıyor.",
  transfer_already_dispatched: "Bu sevk belgesi zaten işlenmiş.",
  receipt_already_processed: "Bu teslim belgesi zaten işlenmiş.",
  transfer_not_found: "Transfer kaydı bulunamadı.",
};

export const transferErrorText = (e: unknown): string => {
  const raw = (e as any)?.message ? String((e as any).message) : "";
  const code = Object.keys(TRANSFER_ERROR_TR).find((k) => raw.includes(k));
  if (code) return TRANSFER_ERROR_TR[code];
  return raw.replace(/^.*?:\s?/, "") || "İşlem tamamlanamadı.";
};

/* ───────────────────────────── miktar zinciri ───────────────────────────── */

export interface QuantityChainRow {
  key: string;
  label: string;
  value: number;
  /** Uyuşmazlık kalemleri kırmızı gösterilir. */
  tone?: "default" | "danger" | "transit" | "success";
}

export interface QuantityChainSource {
  status: TransferStatus;
  requested_quantity: number;
  dispatched_quantity: number;
  in_transit_quantity: number;
  received_quantity: number;
  damaged_quantity: number;
  missing_quantity: number;
  rejected_quantity: number;
  approved_at: string | null;
}

/** Onaylanan miktar sunucuda ayrı tutulmaz: onay talep edilen miktarın tamamınadır. */
export const approvedQuantity = (t: QuantityChainSource) =>
  t.approved_at && t.status !== "rejected" ? t.requested_quantity : 0;

/** Henüz sevk edilmemiş miktar. */
export const remainingQuantity = (t: QuantityChainSource) =>
  Math.max(t.requested_quantity - t.dispatched_quantity, 0);

/** Detay ekranında açıkça listelenen miktar zinciri (tooltip içinde saklanmaz). */
export const quantityChain = (t: QuantityChainSource): QuantityChainRow[] => [
  { key: "requested", label: "Talep Edilen", value: t.requested_quantity },
  { key: "approved", label: "Onaylanan", value: approvedQuantity(t) },
  { key: "dispatched", label: "Sevk Edilen", value: t.dispatched_quantity },
  { key: "transit", label: "Transit", value: t.in_transit_quantity, tone: "transit" },
  { key: "received", label: "Kabul Edilen", value: t.received_quantity, tone: "success" },
  { key: "damaged", label: "Hasarlı", value: t.damaged_quantity, tone: "danger" },
  { key: "missing", label: "Eksik", value: t.missing_quantity, tone: "danger" },
  { key: "rejected", label: "Reddedilen", value: t.rejected_quantity, tone: "danger" },
  { key: "remaining", label: "Kalan", value: remainingQuantity(t) },
];

/* ─────────────────────────────── gecikme ────────────────────────────────── */

export interface OverdueSource {
  status: TransferStatus;
  required_date: string | null;
  expected_arrival_at: string | null;
  received_quantity: number;
  requested_quantity: number;
}

export interface OverdueInfo {
  overdue: boolean;
  /** Gün cinsinden gecikme (negatif ise henüz vadesi gelmemiş). */
  days: number;
  reference: "required_date" | "expected_arrival" | null;
}

const DAY = 86_400_000;

/**
 * Gecikme yalnızca kapanmamış transferler için hesaplanır. Referans olarak
 * ihtiyaç tarihi, yoksa tahmini varış zamanı kullanılır. Tarih yoksa gecikme
 * iddia edilmez.
 */
export const overdueInfo = (t: OverdueSource, now: Date = new Date()): OverdueInfo => {
  if (TERMINAL_STATUSES.includes(t.status)) return { overdue: false, days: 0, reference: null };
  const ref = t.required_date
    ? { at: new Date(`${t.required_date}T23:59:59`), reference: "required_date" as const }
    : t.expected_arrival_at
      ? { at: new Date(t.expected_arrival_at), reference: "expected_arrival" as const }
      : null;
  if (!ref || Number.isNaN(ref.at.getTime())) return { overdue: false, days: 0, reference: null };
  const days = Math.floor((now.getTime() - ref.at.getTime()) / DAY);
  return { overdue: days > 0, days, reference: ref.reference };
};

export const isOverdue = (t: OverdueSource, now?: Date) => overdueInfo(t, now).overdue;
