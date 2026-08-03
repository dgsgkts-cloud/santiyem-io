// DEPO — transfer modeli birim testleri.
// Amaç: her sunucu durumu için okunabilir etiket, geçerli aksiyonlar, yetki
// gereksinimi, aşama ilerlemesi, gecikme ve uyuşmazlık davranışını doğrulamak.

import { describe, it, expect } from "vitest";
import {
  TRANSFER_STATUS_LABEL, TRANSFER_STATUS_TONE, TRANSFER_ACTION_LABEL,
  TRANSFER_ACTION_EXPLANATION, SERVER_DECISION, TERMINAL_STATUSES,
  NO_PERMISSIONS, availableTransferActions, transferProgress, quantityChain,
  overdueInfo, discrepancyTotal, transferErrorText, REASON_REQUIRED,
  type DepotPermissions, type TransferStatus, type TransferActor,
} from "@/lib/inventory/transferModel";
import {
  DEFAULT_TRANSFER_FILTERS, applyTransferFilters, parseTransferFilters,
  serializeTransferFilters,
} from "@/lib/inventory/transferFilters";

/** Sunucudaki inventory_transfers_status_check ile birebir aynı liste. */
const SERVER_STATUSES: TransferStatus[] = [
  "requested", "pending_approval", "approved", "ready_to_dispatch",
  "partially_dispatched", "in_transit", "partially_received", "received",
  "discrepancy", "rejected", "cancelled",
];

const ALL: DepotPermissions = {
  create_transfer: true, approve_transfer: true, dispatch_transfer: true,
  receive_transfer: true, override_safety_stock: true,
};

const actor = (permissions: DepotPermissions, userId = "u-actor", isOwner = false): TransferActor =>
  ({ userId, isOwner, permissions });

const row = (over: Partial<Record<string, unknown>> = {}) => ({
  status: "requested" as TransferStatus,
  requester_id: "u-req",
  requested_quantity: 100,
  dispatched_quantity: 0,
  in_transit_quantity: 0,
  received_quantity: 0,
  damaged_quantity: 0,
  missing_quantity: 0,
  rejected_quantity: 0,
  required_date: null as string | null,
  expected_arrival_at: null as string | null,
  ...over,
}) as any;

describe("transferModel — durum sözlüğü", () => {
  it("her sunucu durumu için Türkçe etiket ve ton tanımlı", () => {
    for (const s of SERVER_STATUSES) {
      expect(TRANSFER_STATUS_LABEL[s], s).toBeTruthy();
      expect(TRANSFER_STATUS_TONE[s], s).toBeTruthy();
    }
  });

  it("frontend fazladan durum uydurmaz", () => {
    expect(Object.keys(TRANSFER_STATUS_LABEL).sort()).toEqual([...SERVER_STATUSES].sort());
  });

  it("terminal durumlar sabit", () => {
    expect(TERMINAL_STATUSES).toEqual(["received", "rejected", "cancelled"]);
  });

  it("her aksiyonun etiketi ve açıklaması var", () => {
    for (const a of Object.keys(TRANSFER_ACTION_LABEL) as (keyof typeof TRANSFER_ACTION_LABEL)[]) {
      expect(TRANSFER_ACTION_LABEL[a]).toBeTruthy();
      expect(TRANSFER_ACTION_EXPLANATION[a]).toBeTruthy();
    }
  });

  it("kontrollü iade etiketi genel 'İade Et' değil, transit kapsamını anlatır", () => {
    expect(TRANSFER_ACTION_LABEL.return).not.toBe("İade Et");
    expect(TRANSFER_ACTION_LABEL.return).toMatch(/Transit/i);
    expect(TRANSFER_ACTION_EXPLANATION.return).toMatch(/kabul edilmiş stok/i);
  });

  it("revizyon kararı sunucu adına çevrilir", () => {
    expect(SERVER_DECISION.revise).toBe("request_revision");
    expect(SERVER_DECISION.approve).toBe("approve");
    expect(SERVER_DECISION.reject).toBe("reject");
  });

  it("sebep zorunlu aksiyonlar", () => {
    expect(REASON_REQUIRED).toEqual(["reject", "revise", "cancel", "return"]);
  });
});

describe("transferModel — aksiyon matrisi", () => {
  it("yetki yoksa hiçbir aksiyon görünmez", () => {
    for (const s of SERVER_STATUSES) {
      expect(availableTransferActions(row({ status: s }), actor(NO_PERMISSIONS)), s).toEqual([]);
    }
  });

  it("onay bekleyen: onayla / reddet / revizyon", () => {
    for (const s of ["requested", "pending_approval"] as TransferStatus[]) {
      const acts = availableTransferActions(row({ status: s }), actor(ALL));
      expect(acts).toContain("approve");
      expect(acts).toContain("reject");
      expect(acts).toContain("revise");
      expect(acts).not.toContain("dispatch");
      expect(acts).not.toContain("receive");
    }
  });

  it("kendi talebini onaylama yalnızca firma sahibinde açık", () => {
    const t = row({ status: "pending_approval", requester_id: "u-actor" });
    expect(availableTransferActions(t, actor(ALL, "u-actor", false))).not.toContain("approve");
    expect(availableTransferActions(t, actor(ALL, "u-actor", true))).toContain("approve");
  });

  it("onaylı/sevke hazır: sevk edilebilir, teslim alınamaz", () => {
    for (const s of ["approved", "ready_to_dispatch"] as TransferStatus[]) {
      const acts = availableTransferActions(row({ status: s }), actor(ALL));
      expect(acts, s).toContain("dispatch");
      expect(acts, s).not.toContain("receive");
      expect(acts, s).toContain("cancel");
    }
  });

  it("kalan sevk miktarı yoksa sevk aksiyonu gizlenir", () => {
    const acts = availableTransferActions(
      row({ status: "approved", dispatched_quantity: 100 }), actor(ALL));
    expect(acts).not.toContain("dispatch");
  });

  it("kısmi sevk: sevk ve teslim birlikte olabilir", () => {
    const acts = availableTransferActions(
      row({ status: "partially_dispatched", dispatched_quantity: 40, in_transit_quantity: 40 }),
      actor(ALL));
    expect(acts).toContain("dispatch");
    expect(acts).toContain("receive");
    expect(acts).toContain("return");
    expect(acts).not.toContain("cancel"); // sevk başladıktan sonra iptal yok
  });

  it("yolda: yalnızca teslim ve transit geri alma", () => {
    const acts = availableTransferActions(
      row({ status: "in_transit", dispatched_quantity: 100, in_transit_quantity: 100 }),
      actor(ALL));
    expect(acts).toEqual(["receive", "return"]);
  });

  it("kısmi teslim: kalan teslim alınabilir", () => {
    const acts = availableTransferActions(
      row({ status: "partially_received", dispatched_quantity: 100, in_transit_quantity: 30, received_quantity: 70 }),
      actor(ALL));
    expect(acts).toContain("receive");
  });

  it("transit sıfırsa geri alma gizlenir", () => {
    const acts = availableTransferActions(
      row({ status: "discrepancy", dispatched_quantity: 100, received_quantity: 90 }), actor(ALL));
    expect(acts).not.toContain("return");
    expect(acts).not.toContain("receive");
  });

  it("terminal durumlarda hiçbir mutasyon aksiyonu görünmez", () => {
    for (const s of TERMINAL_STATUSES) {
      expect(availableTransferActions(row({ status: s }), actor(ALL)), s).toEqual([]);
    }
  });

  it("aksiyonlar yalnızca ilgili yetkiyle görünür", () => {
    const only = (k: keyof DepotPermissions): DepotPermissions => ({ ...NO_PERMISSIONS, [k]: true });
    expect(availableTransferActions(row({ status: "pending_approval" }), actor(only("approve_transfer"))))
      .toContain("approve");
    expect(availableTransferActions(row({ status: "approved" }), actor(only("dispatch_transfer"))))
      .toEqual(["dispatch"]);
    expect(availableTransferActions(
      row({ status: "in_transit", dispatched_quantity: 10, in_transit_quantity: 10 }),
      actor(only("receive_transfer")))).toEqual(["receive"]);
  });

  it("talep sahibi kendi taslak talebini iptal edebilir", () => {
    const acts = availableTransferActions(
      row({ status: "requested", requester_id: "u-actor" }),
      actor({ ...NO_PERMISSIONS, create_transfer: true }, "u-actor"));
    expect(acts).toEqual(["cancel"]);
  });
});

describe("transferModel — ilerleme, miktar zinciri, gecikme", () => {
  it("aşama sayısı duruma göre artar", () => {
    expect(transferProgress(row({ status: "requested" })).completed).toBe(1);
    expect(transferProgress(row({ status: "approved" })).completed).toBe(2);
    expect(transferProgress(row({ status: "in_transit", dispatched_quantity: 10 })).completed).toBe(3);
    expect(transferProgress(row({ status: "received", dispatched_quantity: 10 })).completed).toBe(4);
    expect(transferProgress(row({ status: "discrepancy", dispatched_quantity: 10 })).completed).toBe(4);
  });

  it("reddedilen/iptal edilen akış başarısız işaretlenir", () => {
    for (const s of ["rejected", "cancelled"] as TransferStatus[]) {
      const p = transferProgress(row({ status: s }));
      expect(p.failed, s).toBe(true);
      expect(p.ratio, s).toBe(1);
    }
  });

  it("miktar zinciri dokuz kalemi görünür şekilde döndürür", () => {
    const chain = quantityChain(row({
      status: "discrepancy", requested_quantity: 100, dispatched_quantity: 100,
      in_transit_quantity: 0, received_quantity: 85, damaged_quantity: 10,
      missing_quantity: 3, rejected_quantity: 2,
    }));
    expect(chain.map((c) => c.key)).toEqual([
      "requested", "approved", "dispatched", "transit", "received",
      "damaged", "missing", "rejected", "remaining",
    ]);
    expect(chain.every((c) => !!c.label)).toBe(true);
  });

  it("uyuşmazlık toplamı hasar + eksik + red", () => {
    expect(discrepancyTotal({ damaged_quantity: 2, missing_quantity: 3, rejected_quantity: 4 })).toBe(9);
    expect(discrepancyTotal({})).toBe(0);
  });

  it("gecikme yalnızca açık kayıtlarda hesaplanır", () => {
    const now = new Date("2026-03-10T12:00:00Z");
    expect(overdueInfo(row({ status: "in_transit", required_date: "2026-03-05" }), now).overdue).toBe(true);
    expect(overdueInfo(row({ status: "in_transit", required_date: "2026-03-20" }), now).overdue).toBe(false);
    expect(overdueInfo(row({ status: "received", required_date: "2026-01-01" }), now).overdue).toBe(false);
    expect(overdueInfo(row({ status: "in_transit" }), now).reference).toBeNull();
  });

  it("tarih yoksa beklenen varış referans alınır", () => {
    const now = new Date("2026-03-10T12:00:00Z");
    const info = overdueInfo(row({ status: "in_transit", expected_arrival_at: "2026-03-08T00:00:00Z" }), now);
    expect(info.overdue).toBe(true);
    expect(info.reference).toBe("expected_arrival");
  });
});

describe("transferModel — sunucu hata metinleri", () => {
  it("bilinen kodlar Türkçeleştirilir", () => {
    expect(transferErrorText(new Error("permission_denied"))).toBe("Bu işlem için yetkiniz yok.");
    expect(transferErrorText(new Error("insufficient_available_stock"))).toBe("Kullanılabilir stok yetersiz.");
    expect(transferErrorText(new Error("self_approval_not_allowed"))).toMatch(/onaylayamazsınız/);
  });

  it("bilinmeyen hata boş bırakılmaz", () => {
    expect(transferErrorText(new Error(""))).toBe("İşlem tamamlanamadı.");
  });
});

describe("transferFilters — kalıcı filtre durumu", () => {
  const f = (o: Partial<typeof DEFAULT_TRANSFER_FILTERS>) => ({ ...DEFAULT_TRANSFER_FILTERS, ...o });

  it("serialize → parse tur bilgi kaybetmez", () => {
    const state = f({
      q: "çimento", bucket: "transit", status: "in_transit", source: "w1", dest: "w2",
      from: "2026-01-01", to: "2026-02-01", overdue: true, discrepancy: true,
      sort: "quantity", page: 3,
    });
    expect(parseTransferFilters(serializeTransferFilters(state))).toEqual(state);
  });

  it("varsayılanlar URL'i kirletmez", () => {
    expect(serializeTransferFilters(DEFAULT_TRANSFER_FILTERS).toString()).toBe("");
  });

  const rows = [
    { transfer_no: "TR-1", status: "in_transit", source_warehouse_id: "w1", dest_warehouse_id: "w2",
      created_at: "2026-03-01T00:00:00Z", required_date: "2026-02-01", requested_quantity: 10,
      dispatched_quantity: 10, in_transit_quantity: 10, received_quantity: 0,
      damaged_quantity: 0, missing_quantity: 0, rejected_quantity: 0, expected_arrival_at: null },
    { transfer_no: "TR-2", status: "received", source_warehouse_id: "w2", dest_warehouse_id: "w1",
      created_at: "2026-03-05T00:00:00Z", required_date: null, requested_quantity: 50,
      dispatched_quantity: 50, in_transit_quantity: 0, received_quantity: 45,
      damaged_quantity: 5, missing_quantity: 0, rejected_quantity: 0, expected_arrival_at: null },
  ] as any[];
  const label = (t: any) => t.transfer_no;

  it("arama, durum, depo ve uyuşmazlık filtreleri çalışır", () => {
    expect(applyTransferFilters(rows, f({ q: "TR-2" }), label).map(label)).toEqual(["TR-2"]);
    expect(applyTransferFilters(rows, f({ status: "in_transit" }), label).map(label)).toEqual(["TR-1"]);
    expect(applyTransferFilters(rows, f({ source: "w2" }), label).map(label)).toEqual(["TR-2"]);
    expect(applyTransferFilters(rows, f({ discrepancy: true }), label).map(label)).toEqual(["TR-2"]);
    expect(applyTransferFilters(rows, f({ overdue: true }), label).map(label)).toEqual(["TR-1"]);
    expect(applyTransferFilters(rows, f({ bucket: "closed" }), label).map(label)).toEqual(["TR-2"]);
  });

  it("sıralama seçenekleri uygulanır", () => {
    expect(applyTransferFilters(rows, f({ sort: "oldest" }), label).map(label)).toEqual(["TR-1", "TR-2"]);
    expect(applyTransferFilters(rows, f({ sort: "newest" }), label).map(label)).toEqual(["TR-2", "TR-1"]);
    expect(applyTransferFilters(rows, f({ sort: "quantity" }), label).map(label)).toEqual(["TR-2", "TR-1"]);
  });
});
