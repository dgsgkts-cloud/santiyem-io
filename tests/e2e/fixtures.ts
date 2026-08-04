// DEPO E2E — depoya ait (secret-free) fikstür tanımları.
//
// Bu dosya yalnızca deterministik tanımlar içerir: parola, servis anahtarı,
// oturum içeriği veya üretim kiracı kimliği BULUNMAZ. Ayrıcalıklı değerler
// yalnızca ortam değişkenlerinden okunur.

/** Tüm sentetik kayıtları işaretleyen deterministik kimlik. */
export const E2E_TAG = "E2E_DEPO_FINAL";

/** İzole E2E kiracısındaki roller. */
export const E2E_ROLES = ["admin", "source", "dest", "readonly", "outsider"] as const;
export type E2ERoleName = (typeof E2E_ROLES)[number];

/** E2E kullanıcı e-postaları — gerçek alan adı kullanılmaz (.invalid). */
export const e2eEmail = (role: E2ERoleName) => `e2e-final-${role}@santiyem-e2e.invalid`;

/** Ofis (şirket) üyelik rolleri — depot_permission() eşlemesine göre. */
export const OFFICE_ROLE: Record<E2ERoleName, string | null> = {
  admin: "owner",
  source: "editor",
  dest: "editor",
  readonly: "viewer",
  outsider: null,
};

export const WAREHOUSES = [
  { code: `${E2E_TAG}-WH-S`, name: `${E2E_TAG} Kaynak Depo`, warehouse_type: "merkez" },
  { code: `${E2E_TAG}-WH-D`, name: `${E2E_TAG} Hedef Depo`, warehouse_type: "saha" },
] as const;

export const MATERIAL = {
  name: `${E2E_TAG} Çimento`,
  code: `${E2E_TAG}-MAT-1`,
  unit: "adet",
  allowed_units: ["adet"],
  stock_type: "stockable",
  category: "test",
} as const;

/** Açılış stoğu — tüm sevkleri karşılayacak kadar. */
export const OPENING_STOCK = 100000;

/** Sayfa boyutu 20 → 53 kayıt tam olarak 3 sayfa (son sayfa 13 kayıt). */
export const TRANSFER_COUNT = 53;

/**
 * Yaşam döngüsü kapsaması. Her durum en az bir kayıtla temsil edilir;
 * kalan kayıtlar `pending_approval` ile doldurulur.
 */
export const LIFECYCLE_STATUSES = [
  "requested",
  "pending_approval",
  "approved",
  "ready_to_dispatch",
  "partially_dispatched",
  "in_transit",
  "partially_received",
  "received",
  "discrepancy",
  "rejected",
  "cancelled",
] as const;
