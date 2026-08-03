// Belge kartı — mobil erişilebilirlik: indirme ve silme hover'a bağlı olamaz.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const documents = [
  {
    id: "d1", user_id: "u1", transfer_id: "t1", doc_type: "dispatch_note" as const,
    file_name: "irsaliye.pdf", file_path: "u1/t1/irsaliye.pdf",
    mime_type: "application/pdf", file_size: 2048, uploaded_by: "u1",
    created_at: "2026-01-01T00:00:00Z",
  },
];

vi.mock("@/hooks/useTransferDocuments", async () => {
  const actual = await vi.importActual<any>("@/hooks/useTransferDocuments");
  return {
    ...actual,
    useTransferDocuments: () => ({
      documents,
      isLoading: false,
      upload: { isPending: false, mutateAsync: vi.fn() },
      remove: { isPending: false, mutateAsync: vi.fn() },
      open: vi.fn().mockResolvedValue(true),
    }),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({}) }, rpc: vi.fn(), from: vi.fn() },
}));
vi.mock("@/contexts/UserContext", () => ({ useUser: () => ({ user: { id: "u1" } }) }));

import { TransferDocumentsCard } from "@/components/desktop/warehouse/TransferDocumentsCard";

describe("TransferDocumentsCard mobil işlemler", () => {
  const setup = () =>
    render(
      <TransferDocumentsCard transferId="t1" ownerId="u1" references={[]} canManage />,
    );

  it("indirme ve silme düğmeleri erişilebilir etiketlerle gelir", () => {
    setup();
    expect(screen.getByLabelText("Belgeyi indir")).toBeTruthy();
    expect(screen.getByLabelText("Belgeyi sil")).toBeTruthy();
  });

  it("mobilde gizlenmez: opaklık yalnızca büyük ekranda hover'a bağlıdır", () => {
    setup();
    const del = screen.getByLabelText("Belgeyi sil");
    expect(del.className).not.toMatch(/(^|\s)opacity-0(\s|$)/);
    expect(del.className).toContain("lg:opacity-0");
    expect(screen.getByLabelText("Belgeyi indir").className).not.toMatch(/opacity-0/);
  });

  it("dokunma hedefleri en az 44px'dir", () => {
    setup();
    for (const label of ["Belgeyi indir", "Belgeyi sil"]) {
      const el = screen.getByLabelText(label);
      expect(el.className).toContain("min-h-[44px]");
      expect(el.className).toContain("min-w-[44px]");
    }
  });
});
