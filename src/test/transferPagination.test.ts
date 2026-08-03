// Sunucu tarafı transfer sayfalaması ve belge güvenliği — istemci aynası testleri.
import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({}) }, rpc: vi.fn(), from: vi.fn() },
}));
vi.mock("@/contexts/UserContext", () => ({ useUser: () => ({ user: null }) }));

import {
  buildTransferListQuery, pageRange, pageCountOf, normalizePage, sanitizeSearch,
  TRANSFER_LIST_VIEW,
} from "@/lib/inventory/transferQuery";
import {
  DEFAULT_TRANSFER_FILTERS, PAGE_SIZE, parseTransferFilters, serializeTransferFilters, pageParamPatch,
  type TransferFilterState,
} from "@/lib/inventory/transferFilters";
import {
  validateTransferFile, isDuplicateDocument, fileExtension, sanitizeFileName,
} from "@/hooks/useTransferDocuments";

// ---- sahte PostgREST sorgu kurucusu -------------------------------------
interface Call { op: string; args: unknown[] }
const fakeSource = () => {
  const calls: Call[] = [];
  const q: any = new Proxy({}, {
    get: (_t, op: string) => (...args: unknown[]) => {
      calls.push({ op, args });
      return q;
    },
  });
  return {
    calls,
    source: {
      from: (table: string) => {
        calls.push({ op: "from", args: [table] });
        return { select: (cols: string, opts?: unknown) => { calls.push({ op: "select", args: [cols, opts] }); return q; } };
      },
    } as any,
  };
};

const F = (p: Partial<TransferFilterState> = {}): TransferFilterState => ({
  ...DEFAULT_TRANSFER_FILTERS, ...p,
});

const opsOf = (calls: Call[], op: string) => calls.filter((c) => c.op === op).map((c) => c.args);

describe("sayfa aritmetiği", () => {
  it("1000'den fazla kayıtta doğru sayfa sayısı üretir", () => {
    expect(pageCountOf(1000)).toBe(Math.ceil(1000 / PAGE_SIZE));
    expect(pageCountOf(2437)).toBe(Math.ceil(2437 / PAGE_SIZE));
    expect(pageCountOf(0)).toBe(1);
  });
  it("son sayfa aralığı toplam kayda göre hesaplanır", () => {
    const total = 2437;
    const last = pageCountOf(total);
    const { from, to } = pageRange(last);
    expect(from).toBe((last - 1) * PAGE_SIZE);
    expect(to).toBe(last * PAGE_SIZE - 1);
    expect(from).toBeLessThan(total);
  });
  it("geçersiz ve aralık dışı sayfa numaralarını normalize eder", () => {
    expect(normalizePage(0, 100)).toBe(1);
    expect(normalizePage(-5, 100)).toBe(1);
    expect(normalizePage(Number.NaN, 100)).toBe(1);
    expect(normalizePage(9999, 100)).toBe(pageCountOf(100));
    // kayıt silindikten sonra boşalan sayfa son sayfaya iner
    expect(normalizePage(5, PAGE_SIZE * 2)).toBe(2);
    expect(normalizePage(3, 0)).toBe(1);
  });
});

describe("veritabanı seviyesinde filtreleme", () => {
  it("liste görünümünü tam sayım ile okur", () => {
    const { calls, source } = fakeSource();
    buildTransferListQuery(source, F());
    expect(opsOf(calls, "from")[0][0]).toBe(TRANSFER_LIST_VIEW);
    expect(opsOf(calls, "select")[0][1]).toEqual({ count: "exact" });
  });

  it("durum kovalarını sunucuda uygular", () => {
    const pending = fakeSource();
    buildTransferListQuery(pending.source, F({ bucket: "pending" }));
    expect(opsOf(pending.calls, "in")[0]).toEqual(["status", ["requested", "pending_approval"]]);

    const open = fakeSource();
    buildTransferListQuery(open.source, F({ bucket: "open" }));
    expect(opsOf(open.calls, "not")[0]).toEqual(["status", "in", "(received,rejected,cancelled)"]);

    const transit = fakeSource();
    buildTransferListQuery(transit.source, F({ bucket: "transit" }));
    expect(opsOf(transit.calls, "gt")[0]).toEqual(["in_transit_quantity", 0]);

    const closed = fakeSource();
    buildTransferListQuery(closed.source, F({ bucket: "closed" }));
    expect(opsOf(closed.calls, "in")[0]).toEqual(["status", ["received", "rejected", "cancelled", "discrepancy"]]);
  });

  it("durum, depo ve tarih filtrelerini sorguya yazar", () => {
    const { calls, source } = fakeSource();
    buildTransferListQuery(source, F({
      status: "in_transit", source: "w1", dest: "w2", from: "2026-01-01", to: "2026-01-31",
    }));
    expect(opsOf(calls, "eq")).toEqual([
      ["status", "in_transit"], ["source_warehouse_id", "w1"], ["dest_warehouse_id", "w2"],
    ]);
    expect(opsOf(calls, "gte")[0]).toEqual(["created_at", "2026-01-01T00:00:00.000Z"]);
    expect(opsOf(calls, "lte")[0]).toEqual(["created_at", "2026-01-31T23:59:59.999Z"]);
  });

  it("gecikme ve uyuşmazlık filtrelerini sunucuda uygular", () => {
    const now = new Date("2026-02-01T10:00:00.000Z");
    const { calls, source } = fakeSource();
    buildTransferListQuery(source, F({ overdue: true, discrepancy: true }), { now });
    expect(opsOf(calls, "not")[0]).toEqual(["overdue_reference_at", "is", null]);
    expect(opsOf(calls, "lt")[0]).toEqual(["overdue_reference_at", now.toISOString()]);
    expect(opsOf(calls, "gt")).toContainEqual(["discrepancy_quantity", 0]);
  });

  it("aramayı görünümün arama metni üzerinde yapar ve jokerleri temizler", () => {
    const { calls, source } = fakeSource();
    buildTransferListQuery(source, F({ q: "  TRF-01 %Çimento  " }));
    expect(opsOf(calls, "ilike")[0]).toEqual(["search_text", "%trf-01 çimento%"]);
    expect(sanitizeSearch("%%%")).toBe("");
  });

  it("boş aramada ilike uygulanmaz", () => {
    const { calls, source } = fakeSource();
    buildTransferListQuery(source, F({ q: "   " }));
    expect(opsOf(calls, "ilike")).toHaveLength(0);
  });
});

describe("kararlı sıralama ve sayfa aralığı", () => {
  it("her sıralama created_at/id ikincil anahtarı ile kapanır", () => {
    const newest = fakeSource();
    buildTransferListQuery(newest.source, F({ sort: "newest" }));
    expect(opsOf(newest.calls, "order")).toEqual([
      ["created_at", { ascending: false }], ["id", { ascending: false }],
    ]);

    const oldest = fakeSource();
    buildTransferListQuery(oldest.source, F({ sort: "oldest" }));
    expect(opsOf(oldest.calls, "order")).toEqual([
      ["created_at", { ascending: true }], ["id", { ascending: false }],
    ]);

    const qty = fakeSource();
    buildTransferListQuery(qty.source, F({ sort: "quantity" }));
    expect(opsOf(qty.calls, "order")).toEqual([
      ["requested_quantity", { ascending: false }],
      ["created_at", { ascending: false }],
      ["id", { ascending: false }],
    ]);

    const req = fakeSource();
    buildTransferListQuery(req.source, F({ sort: "required" }));
    expect(opsOf(req.calls, "order")[0]).toEqual(["required_date", { ascending: true, nullsFirst: false }]);
  });

  it("sayfa aralığını sorguya uygular; 1000 kayıt sınırı yoktur", () => {
    const { calls, source } = fakeSource();
    buildTransferListQuery(source, F({ page: 73 }));
    expect(opsOf(calls, "range")[0]).toEqual([72 * PAGE_SIZE, 73 * PAGE_SIZE - 1]);
    expect(opsOf(calls, "limit")).toHaveLength(0);
  });
});

describe("URL durumu", () => {
  it("yenileme/geri sonrası tüm filtreler ve sayfa geri yüklenir", () => {
    const f = F({
      q: "çimento", bucket: "transit", status: "in_transit", source: "w1", dest: "w2",
      from: "2026-01-01", to: "2026-02-01", overdue: true, discrepancy: true,
      sort: "quantity", page: 4,
    });
    const restored = parseTransferFilters(new URLSearchParams(serializeTransferFilters(f).toString()));
    expect(restored).toEqual(f);
  });

  it("geçersiz sayfa parametresi 1'e normalize edilir", () => {
    expect(parseTransferFilters(new URLSearchParams("sf=abc")).page).toBe(1);
    expect(parseTransferFilters(new URLSearchParams("sf=-3")).page).toBe(1);
    expect(parseTransferFilters(new URLSearchParams("sf=0")).page).toBe(1);
  });

  it("eşzamanlı filtre değişiminde son durum tek sorguya dönüşür", () => {
    // Kullanıcı hızla iki filtre değiştirir; her değişim sayfayı 1'e çeker.
    let f = F({ page: 6 });
    f = { ...f, status: "in_transit", page: 1 };
    f = { ...f, source: "w1", page: 1 };
    const { calls, source } = fakeSource();
    buildTransferListQuery(source, f);
    expect(opsOf(calls, "range")[0]).toEqual([0, PAGE_SIZE - 1]);
    expect(opsOf(calls, "eq")).toEqual([["status", "in_transit"], ["source_warehouse_id", "w1"]]);
  });
});

// ---- sayfa parametresi normalizasyonu ----------------------------------
describe("sayfa parametresi normalizasyonu (URL)", () => {
  const patchOf = (qs: string, resolved: number) => {
    const sp = new URLSearchParams(qs);
    const next = pageParamPatch(sp, resolved);
    return next === null ? null : next.toString();
  };

  it("geçerli sayfada URL değiştirilmez (döngü yok)", () => {
    expect(patchOf("sekme=transferler&sf=2", 2)).toBeNull();
    expect(patchOf("sekme=transferler", 1)).toBeNull();
  });

  it("sıfır, negatif ve sayısal olmayan değerler 1'e indirilir", () => {
    for (const raw of ["sf=0", "sf=-3", "sf=abc"]) {
      const out = patchOf(`sekme=transferler&${raw}`, normalizePage(parseTransferFilters(new URLSearchParams(raw)).page, 1500));
      expect(out).toBe("sekme=transferler");
    }
  });

  it("aralık dışı çok büyük sayfa son geçerli sayfaya normalize edilir", () => {
    const total = 1510;
    const last = pageCountOf(total);
    expect(patchOf("sekme=transferler&sf=9999", normalizePage(9999, total))).toBe(
      `sekme=transferler&sf=${last}`,
    );
  });

  it("ilgisiz tüm filtre parametreleri korunur", () => {
    const out = patchOf("sekme=transferler&q=çimento&kova=transit&sir=oldest&gec=1&sf=9999", 3);
    expect(out).toBe("sekme=transferler&q=%C3%A7imento&kova=transit&sir=oldest&gec=1&sf=3");
  });

  it("sonuç kümesi boşsa sayfa 1 olur ve sf kaldırılır", () => {
    expect(patchOf("q=ZZZ&sf=5", normalizePage(5, 0))).toBe("q=ZZZ");
  });

  it("filtre sonrası son sayfa ve mutasyonla küçülen sayfa sayısı", () => {
    // 1510 kayıt → 76 sayfa; filtre 25 kayda düşürür → 2 sayfa
    expect(normalizePage(76, 25)).toBe(pageCountOf(25));
    expect(patchOf("sf=76", normalizePage(76, 25))).toBe(`sf=${pageCountOf(25)}`);
    // son sayfadaki tek kayıt silinir → bir önceki sayfaya iner
    const before = PAGE_SIZE * 3 + 1;
    expect(normalizePage(4, before)).toBe(4);
    expect(patchOf("sf=4", normalizePage(4, before - 1))).toBe("sf=3");
  });
});


// ---- belge güvenliği ----------------------------------------------------
const file = (name: string, type: string, size: number) => {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
};

describe("belge doğrulama sıkılaştırması", () => {
  it("uzantı ile MIME uyuşmazlığını reddeder", () => {
    expect(validateTransferFile(file("fatura.png", "application/pdf", 100))).toMatch(/uyuşmuyor/);
    expect(validateTransferFile(file("fatura.pdf", "image/png", 100))).toMatch(/uyuşmuyor/);
    expect(validateTransferFile(file("foto.jpeg", "image/jpeg", 100))).toBeNull();
  });
  it("uzantısız dosyayı reddeder", () => {
    expect(validateTransferFile(file("irsaliye", "application/pdf", 100))).toMatch(/uzantı/);
    expect(fileExtension("irsaliye")).toBe("");
  });
  it("zararlı yol denemelerini dosya adında engeller", () => {
    expect(validateTransferFile(file("../../gizli.pdf", "application/pdf", 100))).toMatch(/geçersiz karakter/);
    expect(validateTransferFile(file("a\\b.pdf", "application/pdf", 100))).toMatch(/geçersiz karakter/);
    // depolama yolu her zaman temizlenir
    expect(sanitizeFileName("../../etc/passwd.pdf")).not.toContain("/");
    expect(sanitizeFileName("../../etc/passwd.pdf")).not.toMatch(/etc\//);
  });
  it("sıfır bayt dosyayı reddeder", () => {
    expect(validateTransferFile(file("a.pdf", "application/pdf", 0))).toMatch(/boş/);
  });
  it("aynı ad, tür ve boyuttaki aktif belgeyi mükerrer sayar", () => {
    const docs = [{ file_name: "Sevk Irsaliyesi.pdf", file_size: 1234, doc_type: "dispatch_note" }];
    expect(isDuplicateDocument(docs, { name: "sevk irsaliyesi.pdf", size: 1234 }, "dispatch_note")).toBe(true);
    expect(isDuplicateDocument(docs, { name: "Sevk Irsaliyesi.pdf", size: 9999 }, "dispatch_note")).toBe(false);
    expect(isDuplicateDocument(docs, { name: "Sevk Irsaliyesi.pdf", size: 1234 }, "photo")).toBe(false);
    expect(isDuplicateDocument([], { name: "a.pdf", size: 1 }, "other")).toBe(false);
  });

});
