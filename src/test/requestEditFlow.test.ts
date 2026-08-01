import { describe, expect, it } from "vitest";
import {
  blankForm,
  dateToNeedBy,
  diffRequest,
  formToRequestPatch,
  itemsTotal,
  needByToDate,
  requestToForm,
  summarizeDiff,
  validateRequestForm,
} from "@/components/desktop/procurement/requestFormSchema";
import {
  actionsForRequest,
  canTransition,
  isEditableStatus,
} from "@/components/desktop/procurement/procurementWorkflow";
import type { Request } from "@/components/desktop/procurement/procurementConstants";

const draft: Request = {
  id: "req-1",
  no: "PR-2026-1028",
  project: "Levent Rezidans A/B Blok",
  category: "Beton",
  requester: "Ahmet Y.",
  priority: "Orta",
  budget: 120000,
  needBy: 10,
  status: "Taslak",
  approvalStage: 0,
  items: [{ name: "C30 beton", qty: 20, unit: "m³", unitPrice: 2000 }],
};

describe("purchase request edit flow", () => {
  it("only drafts are editable in place", () => {
    expect(isEditableStatus("Taslak")).toBe(true);
    for (const s of ["Onay Bekliyor", "Onaylandı", "Sipariş Verildi", "İptal"] as const) {
      expect(isEditableStatus(s)).toBe(false);
    }
  });

  it("exposes Düzenle only for drafts and withdrawal for pending approval", () => {
    expect(actionsForRequest(draft).secondary).toBe("edit");
    const pending = actionsForRequest({ ...draft, status: "Onay Bekliyor" });
    expect(pending.overflow).toContain("withdraw");
    expect([pending.primary, pending.secondary]).not.toContain("edit");
    const approved = actionsForRequest({ ...draft, status: "Onaylandı" });
    expect(approved.overflow).toContain("revision");
  });

  it("allows withdrawal transition back to draft", () => {
    expect(canTransition("Onay Bekliyor", "Taslak")).toBe(true);
    expect(canTransition("Onaylandı", "Taslak")).toBe(false);
  });

  it("round-trips a request through the shared form mapping", () => {
    const values = requestToForm(draft);
    expect(values.no).toBe("PR-2026-1028");
    expect(values.items).toHaveLength(1);
    const patch = formToRequestPatch(values);
    expect(patch.project).toBe(draft.project);
    expect(patch.needBy).toBe(draft.needBy);
    expect(patch.items?.[0].qty).toBe(20);
  });

  it("converts need-by days and dates symmetrically", () => {
    expect(dateToNeedBy(needByToDate(7))).toBe(7);
    expect(dateToNeedBy(needByToDate(-3))).toBe(-3);
  });

  it("recalculates estimated totals", () => {
    expect(itemsTotal(requestToForm(draft).items)).toBe(40000);
  });

  it("rejects invalid forms with field-level messages", () => {
    const v = requestToForm(draft);
    v.project = "";
    v.items[0].qty = 0;
    v.items[0].name = "";
    v.budget = -5;
    const res = validateRequestForm(v);
    expect(res.ok).toBe(false);
    expect(res.errors.project).toBeTruthy();
    expect(res.errors["items.0.qty"]).toBeTruthy();
    expect(res.errors["items.0.name"]).toBeTruthy();
    expect(res.errors.budget).toBeTruthy();
  });

  it("requires at least one item", () => {
    const v = requestToForm(draft);
    v.items = [];
    expect(validateRequestForm(v).errors.items).toBeTruthy();
  });

  it("accepts a valid blank create form once filled", () => {
    const v = blankForm({ no: "PR-2026-9001", project: "Şantiye A", requester: "Merve K." });
    v.items[0].name = "Q Hasır Çelik";
    expect(validateRequestForm(v).ok).toBe(true);
  });

  it("summarises a diff for the audit trail", () => {
    const v = requestToForm(draft);
    v.priority = "Yüksek";
    v.items.push({ key: "x", name: "Pompa bedeli", category: "Beton", qty: 1, unit: "sefer" });
    const d = diffRequest(draft, formToRequestPatch(v));
    expect(summarizeDiff(d)).toContain("Öncelik");
    expect(summarizeDiff(d)).toContain("1 kalem eklendi");
  });

  it("reports no change when nothing was edited", () => {
    const d = diffRequest(draft, formToRequestPatch(requestToForm(draft)));
    expect(summarizeDiff(d)).toBe("Değişiklik yok");
  });
});
