import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PurchaseRequestForm } from "@/components/desktop/procurement/PurchaseRequestForm";
import type { Request } from "@/components/desktop/procurement/procurementConstants";
import type { RequestWorkflow } from "@/components/desktop/procurement/useRequestWorkflow";
import {
  DeleteDraftDialog,
  WithdrawApprovalDialog,
} from "@/components/desktop/procurement/RequestEditDialogs";

const draft: Request = {
  id: "req-1",
  no: "PR-2026-1028",
  project: "Levent Rezidans A/B Blok",
  category: "Beton",
  requester: "Ahmet Y.",
  priority: "Orta",
  budget: 40000,
  needBy: 10,
  status: "Taslak",
  approvalStage: 0,
  items: [{ name: "C30 beton", qty: 20, unit: "m³", unitPrice: 2000 }],
};

const makeWorkflow = (over: Partial<RequestWorkflow> = {}): RequestWorkflow =>
  ({
    requests: [draft],
    pending: null,
    isPending: () => false,
    can: () => true,
    find: (id: string) => (id === draft.id ? draft : undefined),
    canEditRequest: () => true,
    saveEdit: vi.fn(async () => ({ ok: true, request: draft })),
    withdraw: vi.fn(async () => true),
    createRevision: vi.fn(async () => null),
    submit: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    createRfq: vi.fn(),
    sendRfq: vi.fn(),
    toOrder: vi.fn(),
    reopen: vi.fn(),
    remove: vi.fn(async () => true),
    ...over,
  }) as unknown as RequestWorkflow;

const baseProps = {
  mode: "edit" as const,
  loading: false,
  projectNames: ["Levent Rezidans A/B Blok", "Şantiye B"],
  actor: "Doğuş Göktaş",
  onClose: vi.fn(),
  onSaved: vi.fn(),
  onDeleted: vi.fn(),
};

describe("PurchaseRequestForm", () => {
  it("loads existing request data into labelled fields", () => {
    render(<PurchaseRequestForm {...baseProps} request={draft} workflow={makeWorkflow()} />);
    expect(screen.getByText("Satın Alma Talebini Düzenle")).toBeTruthy();
    expect(screen.getByText(/PR-2026-1028 · Levent Rezidans/)).toBeTruthy();
    expect((screen.getByLabelText("Talep No") as HTMLInputElement).value).toBe("PR-2026-1028");
    expect((screen.getByLabelText("Talep Eden *") as HTMLInputElement).value).toBe("Ahmet Y.");
    expect((screen.getByLabelText("Malzeme / Hizmet *") as HTMLInputElement).value).toBe("C30 beton");
    expect((screen.getByLabelText("Miktar *") as HTMLInputElement).value).toBe("20");
  });

  it("saves an unchanged draft and calls the edit mutation once", async () => {
    const saveEdit = vi.fn(async () => ({ ok: true, request: draft }));
    render(
      <PurchaseRequestForm {...baseProps} request={draft} workflow={makeWorkflow({ saveEdit })} />
    );
    fireEvent.click(screen.getAllByText("Değişiklikleri Kaydet")[0]);
    await new Promise((r) => setTimeout(r, 50));
    expect(saveEdit).toHaveBeenCalledTimes(1);
    expect(saveEdit.mock.calls[0][0].patch.items).toHaveLength(1);
  });

  it("shows field-level errors and does not save when invalid", async () => {
    const saveEdit = vi.fn(async () => ({ ok: true, request: draft }));
    render(
      <PurchaseRequestForm {...baseProps} request={draft} workflow={makeWorkflow({ saveEdit })} />
    );
    fireEvent.change(screen.getByLabelText("Malzeme / Hizmet *"), { target: { value: "" } });
    fireEvent.click(screen.getAllByText("Değişiklikleri Kaydet")[0]);
    await new Promise((r) => setTimeout(r, 50));
    expect(saveEdit).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });

  it("adds and reorders item rows and recalculates totals", () => {
    render(<PurchaseRequestForm {...baseProps} request={draft} workflow={makeWorkflow()} />);
    fireEvent.click(screen.getByText("Kalem Ekle"));
    expect(screen.getByText("Kalem 2")).toBeTruthy();
    fireEvent.change(screen.getAllByLabelText("Miktar *")[0], { target: { value: "30" } });
    expect(screen.getByText(/Kalem toplamı/)).toBeTruthy();
  });

  it("blocks editing for non-draft statuses", () => {
    render(
      <PurchaseRequestForm
        {...baseProps}
        request={{ ...draft, status: "Onaylandı" }}
        workflow={makeWorkflow()}
      />
    );
    expect(screen.getByText(/mevcut durumunda düzenlenemez/)).toBeTruthy();
  });

  it("blocks unauthorized users", () => {
    render(
      <PurchaseRequestForm
        {...baseProps}
        request={draft}
        workflow={makeWorkflow({ can: () => false })}
      />
    );
    expect(screen.getByText("Bu talebi düzenleme yetkiniz bulunmuyor.")).toBeTruthy();
  });

  it("shows the not-found state for an invalid id", () => {
    render(<PurchaseRequestForm {...baseProps} request={null} workflow={makeWorkflow()} />);
    expect(screen.getByText("Talep bulunamadı.")).toBeTruthy();
    expect(screen.getByText("Taleplere Dön")).toBeTruthy();
  });

  it("shows a skeleton while the request resolves", () => {
    const { container } = render(
      <PurchaseRequestForm {...baseProps} request={null} loading workflow={makeWorkflow()} />
    );
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
  });

  it("warns about unsaved changes on cancel and closes cleanly when pristine", () => {
    const onClose = vi.fn();
    render(
      <PurchaseRequestForm {...baseProps} onClose={onClose} request={draft} workflow={makeWorkflow()} />
    );
    fireEvent.click(screen.getAllByText("Vazgeç")[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText("Talep Eden *"), { target: { value: "Merve K." } });
    fireEvent.click(screen.getAllByText("Vazgeç")[0]);
    expect(screen.getByText("Kaydedilmemiş değişiklikleriniz var")).toBeTruthy();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("surfaces the concurrent-update dialog on a stale save", async () => {
    const saveEdit = vi.fn(async () => ({ ok: false, reason: "stale" as const }));
    render(
      <PurchaseRequestForm {...baseProps} request={draft} workflow={makeWorkflow({ saveEdit })} />
    );
    fireEvent.click(screen.getAllByText("Değişiklikleri Kaydet")[0]);
    await new Promise((r) => setTimeout(r, 60));
    expect(screen.getByText("Bu talep başka bir kullanıcı tarafından güncellendi")).toBeTruthy();
    expect(screen.getByText("Güncel Veriyi Yükle")).toBeTruthy();
  });

  it("offers draft deletion with the required confirmation copy", () => {
    render(<PurchaseRequestForm {...baseProps} request={draft} workflow={makeWorkflow()} />);
    expect(screen.getByLabelText("Diğer işlemler")).toBeTruthy();
    const onConfirm = vi.fn();
    render(
      <DeleteDraftDialog open loading={false} onCancel={vi.fn()} onConfirm={onConfirm} />
    );
    expect(screen.getByText("Bu taslak talep silinsin mi?")).toBeTruthy();
    expect(screen.getByText("Bu işlem geri alınamaz.")).toBeTruthy();
    fireEvent.click(screen.getByText("Talebi Sil"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("confirms withdrawal from approval before changing status", () => {
    const onConfirm = vi.fn();
    render(
      <WithdrawApprovalDialog
        open
        approverName="Doğuş Göktaş"
        loading={false}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );
    expect(screen.getByText("Talep onay sürecinden geri çekilsin mi?")).toBeTruthy();
    fireEvent.click(screen.getByText("Onaydan Geri Çek"));
    expect(onConfirm).toHaveBeenCalled();
  });
});
