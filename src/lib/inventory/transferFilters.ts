// DEPO — transfer listesi filtre durumu.
//
// Filtreler URL arama parametrelerinde tutulur. Böylece kullanıcı bir transfer
// detayına gidip geri döndüğünde (veya sayfayı yenilediğinde) arama, durum,
// depo, tarih, gecikme/uyuşmazlık ve sıralama seçimleri korunur.

import {
  TERMINAL_STATUSES, isOverdue, discrepancyTotal,
  type TransferStatus,
} from "./transferModel";

export type TransferBucket = "all" | "open" | "pending" | "transit" | "closed";
export type TransferSort = "newest" | "oldest" | "required" | "quantity";

export interface TransferFilterState {
  q: string;
  bucket: TransferBucket;
  status: TransferStatus | "";
  source: string;
  dest: string;
  from: string;
  to: string;
  overdue: boolean;
  discrepancy: boolean;
  sort: TransferSort;
  page: number;
}

export const DEFAULT_TRANSFER_FILTERS: TransferFilterState = {
  q: "", bucket: "all", status: "", source: "", dest: "",
  from: "", to: "", overdue: false, discrepancy: false, sort: "newest", page: 1,
};

const KEYS: Record<keyof TransferFilterState, string> = {
  q: "q", bucket: "d", status: "s", source: "kd", dest: "hd",
  from: "b", to: "e", overdue: "gec", discrepancy: "uyu", sort: "sir", page: "sf",
};

export const parseTransferFilters = (sp: URLSearchParams): TransferFilterState => ({
  q: sp.get(KEYS.q) ?? "",
  bucket: (["all", "open", "pending", "transit", "closed"].includes(sp.get(KEYS.bucket) ?? "")
    ? (sp.get(KEYS.bucket) as TransferBucket) : "all"),
  status: (sp.get(KEYS.status) as TransferStatus) ?? "",
  source: sp.get(KEYS.source) ?? "",
  dest: sp.get(KEYS.dest) ?? "",
  from: sp.get(KEYS.from) ?? "",
  to: sp.get(KEYS.to) ?? "",
  overdue: sp.get(KEYS.overdue) === "1",
  discrepancy: sp.get(KEYS.discrepancy) === "1",
  sort: (["newest", "oldest", "required", "quantity"].includes(sp.get(KEYS.sort) ?? "")
    ? (sp.get(KEYS.sort) as TransferSort) : "newest"),
  page: Math.max(1, Number(sp.get(KEYS.page)) || 1),
});

export const serializeTransferFilters = (f: TransferFilterState): URLSearchParams => {
  const sp = new URLSearchParams();
  const put = (k: string, v: string) => { if (v) sp.set(k, v); };
  put(KEYS.q, f.q.trim());
  if (f.bucket !== "all") put(KEYS.bucket, f.bucket);
  put(KEYS.status, f.status);
  put(KEYS.source, f.source);
  put(KEYS.dest, f.dest);
  put(KEYS.from, f.from);
  put(KEYS.to, f.to);
  if (f.overdue) sp.set(KEYS.overdue, "1");
  if (f.discrepancy) sp.set(KEYS.discrepancy, "1");
  if (f.sort !== "newest") sp.set(KEYS.sort, f.sort);
  if (f.page > 1) sp.set(KEYS.page, String(f.page));
  return sp;
};

/**
 * Sayfa parametresi normalizasyonu.
 *
 * `resolvedPage` sunucudan gelen geçerli sayfadır. Dönen değer yalnızca `sf`
 * parametresini düzeltir; diğer tüm arama parametreleri (filtreler, panel
 * durumları, sekme) korunur. Değişiklik gerekmiyorsa `null` döner — bu sayede
 * yönlendirme döngüsü oluşmaz (fonksiyon idempotenttir).
 */
export const pageParamPatch = (
  sp: URLSearchParams,
  resolvedPage: number,
): URLSearchParams | null => {
  const raw = sp.get(KEYS.page);
  const safe = Number.isFinite(resolvedPage) ? Math.max(1, Math.floor(resolvedPage)) : 1;
  const want = safe > 1 ? String(safe) : null;
  if (raw === want) return null;
  const next = new URLSearchParams(sp);
  if (want === null) next.delete(KEYS.page);
  else next.set(KEYS.page, want);
  return next;
};


/** Listeye dönüş bağlantısı — filtreler korunur. */
export const transferListPath = (f: TransferFilterState) => {
  const qs = serializeTransferFilters(f).toString();
  return qs ? `/depo?sekme=transferler&${qs}` : "/depo?sekme=transferler";
};

export interface FilterableTransfer {
  transfer_no: string;
  status: TransferStatus;
  source_warehouse_id: string;
  dest_warehouse_id: string;
  in_transit_quantity: number;
  requested_quantity: number;
  required_date: string | null;
  expected_arrival_at: string | null;
  received_quantity: number;
  damaged_quantity: number;
  missing_quantity: number;
  rejected_quantity: number;
  created_at: string;
}

export const applyTransferFilters = <T extends FilterableTransfer>(
  rows: T[],
  f: TransferFilterState,
  searchText: (row: T) => string,
  now: Date = new Date(),
): T[] => {
  const needle = f.q.trim().toLocaleLowerCase("tr");
  const out = rows.filter((t) => {
    if (f.bucket === "pending" && !["requested", "pending_approval"].includes(t.status)) return false;
    if (f.bucket === "transit" && t.in_transit_quantity <= 0) return false;
    if (f.bucket === "open" && TERMINAL_STATUSES.includes(t.status)) return false;
    if (f.bucket === "closed" && !TERMINAL_STATUSES.includes(t.status) && t.status !== "discrepancy") return false;
    if (f.status && t.status !== f.status) return false;
    if (f.source && t.source_warehouse_id !== f.source) return false;
    if (f.dest && t.dest_warehouse_id !== f.dest) return false;
    if (f.from && t.created_at.slice(0, 10) < f.from) return false;
    if (f.to && t.created_at.slice(0, 10) > f.to) return false;
    if (f.overdue && !isOverdue(t, now)) return false;
    if (f.discrepancy && discrepancyTotal(t) <= 0) return false;
    if (!needle) return true;
    return searchText(t).toLocaleLowerCase("tr").includes(needle);
  });

  const sorted = [...out];
  sorted.sort((a, b) => {
    if (f.sort === "oldest") return a.created_at.localeCompare(b.created_at);
    if (f.sort === "quantity") return b.requested_quantity - a.requested_quantity;
    if (f.sort === "required") {
      const av = a.required_date ?? "9999-12-31";
      const bv = b.required_date ?? "9999-12-31";
      return av.localeCompare(bv);
    }
    return b.created_at.localeCompare(a.created_at);
  });
  return sorted;
};

export const TRANSFER_SORT_LABEL: Record<TransferSort, string> = {
  newest: "En yeni",
  oldest: "En eski",
  required: "İhtiyaç tarihi",
  quantity: "Miktar",
};

export const PAGE_SIZE = 20;
