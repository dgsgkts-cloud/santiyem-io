// DEPO — transfer listesi için sunucu tarafı sorgu kurucusu.
//
// Tüm filtreler (arama, durum kovası, durum, kaynak/hedef depo, tarih aralığı,
// gecikme, uyuşmazlık ve sıralama) veritabanı seviyesinde uygulanır. Okuma
// `public.inventory_transfers_list` görünümü üzerinden yapılır; görünüm malzeme
// ve depo adlarını, arama metnini, uyuşmazlık miktarını ve gecikme referans
// tarihini kayıt ile birlikte döner. Böylece liste hiçbir zaman istemci
// tarafında kırpılmaz ve toplam kayıt sayısı doğru raporlanır.

import { PAGE_SIZE, type TransferFilterState } from "./transferFilters";

export const TRANSFER_LIST_VIEW = "inventory_transfers_list" as const;

/** Sunucudaki kapanmış (terminal) durumlar. */
export const CLOSED_STATUSES = ["received", "rejected", "cancelled"] as const;
export const PENDING_STATUSES = ["requested", "pending_approval"] as const;

/** Aramada joker karakterleri etkisizleştirir. */
export const sanitizeSearch = (q: string): string =>
  q.trim().toLocaleLowerCase("tr").replace(/[%*]/g, " ").replace(/\s+/g, " ").trim();

export interface RangeBounds { from: number; to: number }

export const pageRange = (page: number, size: number = PAGE_SIZE): RangeBounds => {
  const p = Math.max(1, Math.floor(page) || 1);
  return { from: (p - 1) * size, to: p * size - 1 };
};

/** Sayfa sayısı — toplam kayıt sayısından türetilir. */
export const pageCountOf = (total: number, size: number = PAGE_SIZE) =>
  Math.max(1, Math.ceil(Math.max(0, total) / size));

/** Geçersiz/aralık dışı sayfa numarasını normalize eder. */
export const normalizePage = (page: number, total: number, size: number = PAGE_SIZE) => {
  const count = pageCountOf(total, size);
  const p = Number.isFinite(page) ? Math.floor(page) : 1;
  return Math.min(Math.max(1, p), count);
};

/** Minimal PostgREST sorgu arayüzü — testlerde sahte kurucu kullanılabilir. */
export interface TransferQueryLike {
  eq(column: string, value: unknown): TransferQueryLike;
  in(column: string, values: readonly unknown[]): TransferQueryLike;
  not(column: string, op: string, value: unknown): TransferQueryLike;
  gt(column: string, value: unknown): TransferQueryLike;
  gte(column: string, value: unknown): TransferQueryLike;
  lt(column: string, value: unknown): TransferQueryLike;
  lte(column: string, value: unknown): TransferQueryLike;
  ilike(column: string, pattern: string): TransferQueryLike;
  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): TransferQueryLike;
  range(from: number, to: number): TransferQueryLike;
}

export interface TransferQuerySource {
  from(table: string): {
    select(cols: string, opts?: { count?: "exact"; head?: boolean }): TransferQueryLike;
  };
}

/**
 * PostgREST, istenen sayfa aralığı toplam kayıt sayısının ötesindeyse satır
 * döndürmek yerine HTTP 416 / `PGRST103` hatası verir. Bu durumda liste
 * boş kalmasın diye toplam kayıt sayısı ayrı bir sayım isteğiyle alınır ve
 * sayfa numarası normalize edilir.
 */
export const RANGE_NOT_SATISFIABLE = "PGRST103" as const;

export const isRangeNotSatisfiable = (error: unknown): boolean => {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  return e.code === RANGE_NOT_SATISFIABLE || /range not satisfiable/i.test(e.message ?? "");
};

/** Hata mesajındaki ("... there are only N rows") toplam kayıt sayısı. */
export const totalFromRangeError = (error: unknown): number | null => {
  const e = error as { details?: string; message?: string } | null;
  const text = `${e?.details ?? ""} ${e?.message ?? ""}`;
  const m = text.match(/there are only (\d+) rows/i);
  return m ? Number(m[1]) : null;
};


/**
 * Sıralama her zaman kararlıdır: seçilen anahtarın ardından
 * `created_at DESC, id DESC` gelir, böylece sayfalar arasında kayıt tekrarı
 * veya atlaması olmaz.
 */
export const applySort = (q: TransferQueryLike, sort: TransferFilterState["sort"]) => {
  let out = q;
  if (sort === "oldest") out = out.order("created_at", { ascending: true });
  else if (sort === "quantity") out = out.order("requested_quantity", { ascending: false });
  else if (sort === "required") out = out.order("required_date", { ascending: true, nullsFirst: false });
  if (sort !== "oldest") out = out.order("created_at", { ascending: false });
  return out.order("id", { ascending: false });
};

export const buildTransferListQuery = (
  source: TransferQuerySource,
  f: TransferFilterState,
  opts: { now?: Date; pageSize?: number; page?: number; countOnly?: boolean } = {},
): TransferQueryLike => {
  const size = opts.pageSize ?? PAGE_SIZE;
  const nowIso = (opts.now ?? new Date()).toISOString();
  let q: TransferQueryLike = source
    .from(TRANSFER_LIST_VIEW)
    .select("*", opts.countOnly ? { count: "exact", head: true } : { count: "exact" });

  if (f.bucket === "pending") q = q.in("status", PENDING_STATUSES as readonly string[]);
  if (f.bucket === "transit") q = q.gt("in_transit_quantity", 0);
  if (f.bucket === "open") q = q.not("status", "in", `(${CLOSED_STATUSES.join(",")})`);
  if (f.bucket === "closed") q = q.in("status", [...CLOSED_STATUSES, "discrepancy"]);

  if (f.status) q = q.eq("status", f.status);
  if (f.source) q = q.eq("source_warehouse_id", f.source);
  if (f.dest) q = q.eq("dest_warehouse_id", f.dest);
  if (f.from) q = q.gte("created_at", `${f.from}T00:00:00.000Z`);
  if (f.to) q = q.lte("created_at", `${f.to}T23:59:59.999Z`);

  if (f.overdue) {
    q = q.not("overdue_reference_at", "is", null).lt("overdue_reference_at", nowIso);
  }
  if (f.discrepancy) q = q.gt("discrepancy_quantity", 0);

  const needle = sanitizeSearch(f.q);
  if (needle) q = q.ilike("search_text", `%${needle}%`);

  q = applySort(q, f.sort);
  if (opts.countOnly) return q;
  const { from, to } = pageRange(opts.page ?? f.page, size);
  return q.range(from, to);
};

