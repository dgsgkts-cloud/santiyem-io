// Transfer belge doğrulama yardımcıları — sunucu kontrollerinin istemci aynası.
import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({}) }, rpc: vi.fn(), from: vi.fn() },
}));
vi.mock("@/contexts/UserContext", () => ({ useUser: () => ({ user: null }) }));

import {
  sanitizeFileName, fmtFileSize, validateTransferFile,
  MAX_TRANSFER_DOC_BYTES, TRANSFER_DOC_TYPE_LABEL,
} from "@/hooks/useTransferDocuments";

const file = (name: string, type: string, size: number) => {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
};

describe("sanitizeFileName", () => {
  it("Türkçe karakterleri ve boşlukları temizler", () => {
    expect(sanitizeFileName("Sevk İrsaliyesi Şubat.pdf")).toBe("sevk-irsaliyesi-subat.pdf");
  });
  it("boş kalırsa varsayılan ad verir", () => {
    expect(sanitizeFileName("///")).toBe("belge");
  });
  it("uzun adları kısaltır", () => {
    expect(sanitizeFileName("a".repeat(300)).length).toBeLessThanOrEqual(120);
  });
});

describe("fmtFileSize", () => {
  it("byte, KB ve MB birimlerini biçimler", () => {
    expect(fmtFileSize(512)).toBe("512 B");
    expect(fmtFileSize(2048)).toBe("2 KB");
    expect(fmtFileSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });
  it("geçersiz boyutta tire döner", () => {
    expect(fmtFileSize(0)).toBe("—");
  });
});

describe("validateTransferFile", () => {
  it("PDF ve görselleri kabul eder", () => {
    expect(validateTransferFile(file("a.pdf", "application/pdf", 1000))).toBeNull();
    expect(validateTransferFile(file("a.png", "image/png", 1000))).toBeNull();
  });
  it("desteklenmeyen türü reddeder", () => {
    expect(validateTransferFile(file("a.exe", "application/x-msdownload", 10))).toMatch(/PDF/);
  });
  it("20 MB üstünü reddeder", () => {
    expect(validateTransferFile(file("a.pdf", "application/pdf", MAX_TRANSFER_DOC_BYTES + 1)))
      .toMatch(/20 MB/);
  });
  it("boş dosyayı reddeder", () => {
    expect(validateTransferFile(file("a.pdf", "application/pdf", 0))).toMatch(/boş/);
  });
});

describe("belge türleri", () => {
  it("sunucudaki dört tür ile aynıdır", () => {
    expect(Object.keys(TRANSFER_DOC_TYPE_LABEL).sort())
      .toEqual(["dispatch_note", "other", "photo", "receipt_note"]);
  });
});
