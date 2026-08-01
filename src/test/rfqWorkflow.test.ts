import { describe, expect, it } from "vitest";
import {
  actionsForRfq,
  buildComparison,
  canRfqTransition,
  canRunRfqAction,
  quotationTotals,
  type Quotation,
  type RfqRecord,
  type RfqSupplierEntry,
} from "@/components/desktop/procurement/rfq/rfqModel";

const quote = (over: Partial<Quotation>): Quotation => ({
  version: 1,
  lines: [{ name: "Beton", qty: 10, unit: "m3", unitPrice: 100 }],
  subtotal: 1000,
  discount: 0,
  vatRate: 20,
  vat: 200,
  total: 1200,
  currency: "TRY",
  deliveryDays: 10,
  paymentTerm: "30 gün",
  warranty: "24 ay",
  technical: "Tam Uygun",
  submittedAt: new Date().toISOString(),
  recordedBy: "Test",
  ...over,
});

const supplier = (
  id: string,
  over: Partial<RfqSupplierEntry> = {}
): RfqSupplierEntry => ({
  supplierId: id,
  supplierName: `Tedarikçi ${id}`,
  category: "Beton",
  performance: 80,
  active: true,
  status: "Teklif Geldi",
  invitedAt: new Date().toISOString(),
  revisions: [],
  messages: [],
  ...over,
});

const record = (over: Partial<RfqRecord> = {}): RfqRecord => ({
  requestId: "req-1",
  no: "RFQ-001",
  requestNo: "PR-001",
  title: "Beton",
  project: "Proje A",
  status: "Karşılaştırma Aşamasında",
  deadline: new Date().toISOString(),
  budget: 5000,
  currency: "TRY",
  requester: "Talep Eden",
  owner: "Satın Alma",
  suppliers: [],
  createdAt: new Date().toISOString(),
  audit: [],
  version: 0,
  ...over,
});

describe("rfq status machine", () => {
  it("allows only defined transitions", () => {
    expect(canRfqTransition("Taslak", "Tedarikçilere Gönderildi")).toBe(true);
    expect(canRfqTransition("Taslak", "Siparişe Dönüştürüldü")).toBe(false);
    expect(canRfqTransition("Tedarikçi Seçildi", "Siparişe Dönüştürüldü")).toBe(true);
    expect(canRfqTransition("Siparişe Dönüştürüldü", "İptal")).toBe(false);
  });

  it("exposes status-aware actions", () => {
    expect(actionsForRfq(record({ status: "Taslak" })).primary).toBe("send");
    expect(
      actionsForRfq(record({ candidateSupplierId: "s1" })).primary
    ).toBe("confirm_selection");
    expect(actionsForRfq(record({ status: "Tedarikçi Seçildi" })).primary).toBe(
      "create_order"
    );
  });

  it("restricts privileged actions by role", () => {
    expect(canRunRfqAction("viewer", "confirm_selection")).toBe(false);
    expect(canRunRfqAction("viewer", "export_comparison")).toBe(true);
    expect(canRunRfqAction("procurement", "record_quotation")).toBe(true);
  });
});

describe("rfq comparison", () => {
  it("scores quotations and marks best-of badges", () => {
    const rfq = record({
      suppliers: [
        supplier("s1", { quotation: quote({ total: 1200, deliveryDays: 10 }) }),
        supplier("s2", {
          quotation: quote({ total: 1500, deliveryDays: 4, paymentTerm: "60 gün" }),
        }),
        supplier("s3", { status: "Teklif Bekleniyor" }),
      ],
    });
    const cmp = buildComparison(rfq);
    const byId = Object.fromEntries(cmp.map((c) => [c.entry.supplierId, c]));

    expect(byId.s1.badges).toContain("En Düşük Fiyat");
    expect(byId.s2.badges).toContain("En Hızlı Teslim");
    expect(byId.s2.badges).toContain("En İyi Ödeme Koşulu");
    expect(byId.s3.score).toBeNull();
    expect(byId.s1.score!.total).toBeGreaterThan(0);
    expect(byId.s1.score!.items.reduce((s, i) => s + i.earned, 0)).toBe(
      byId.s1.score!.total
    );
  });

  it("computes quotation totals with discount and vat", () => {
    const t = quotationTotals(
      [{ name: "x", qty: 2, unit: "adet", unitPrice: 500 }],
      100,
      20
    );
    expect(t.subtotal).toBe(1000);
    expect(t.vat).toBe(180);
    expect(t.total).toBe(1080);
  });
});
