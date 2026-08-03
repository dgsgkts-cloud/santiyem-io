// DEPO — transfer mutasyonlarının RPC entegrasyon testleri.
//
// Supabase istemcisi taklit edilir; doğrulanan şey hook'ların gerçekten doğru
// RPC adını ve parametrelerini göndermesi, hataları Türkçeleştirmesi, başarı
// sonrası önbelleği geçersiz kılması ve çift tıklamayı engellemesidir.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const rpc = vi.fn();
const from = vi.fn(() => {
  const chain: any = {
    select: () => chain,
    order: () => chain,
    limit: () => Promise.resolve({ data: [], error: null }),
    then: (r: any) => Promise.resolve({ data: [], error: null }).then(r),
  };
  return chain;
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...a: unknown[]) => rpc(...a), from: (...a: unknown[]) => from(...(a as [])) },
}));

vi.mock("@/contexts/UserContext", () => ({
  useUser: () => ({ user: { id: "u-actor" } }),
}));

import { useInventoryTransfers } from "@/hooks/useInventoryTransfers";
import { transferErrorText } from "@/lib/inventory/transferModel";

const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const setup = () => {
  const qc = makeClient();
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  const hook = renderHook(() => useInventoryTransfers(), { wrapper });
  return { qc, hook };
};

const lastCall = () => rpc.mock.calls[rpc.mock.calls.length - 1];

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: { ok: true }, error: null });
});

describe("useInventoryTransfers — mutasyonlar RPC'ye bağlı", () => {
  it("transfer oluşturur ve tüm parametreleri gönderir", async () => {
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.createTransfer.mutateAsync({
        sourceWarehouseId: "w1", destWarehouseId: "w2", materialId: "m1",
        quantity: 25, unit: "adet", requiredAt: "2026-04-01", reason: "saha ihtiyacı",
        notes: "not", projectId: "p1", allowSafetyBreach: true,
      });
    });
    const [fn, args] = lastCall();
    expect(fn).toBe("create_stock_transfer");
    expect(args).toMatchObject({
      _source_warehouse_id: "w1", _dest_warehouse_id: "w2", _material_id: "m1",
      _requested_quantity: 25, _unit: "adet", _required_at: "2026-04-01",
      _project_id: "p1", _allow_safety_breach: true,
    });
    // Firma ve talep sahibi sunucuda türetilir; istemci bunları göndermez.
    expect(Object.keys(args)).not.toContain("_user_id");
    expect(Object.keys(args)).not.toContain("_requester_id");
  });

  it("onaylar", async () => {
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.decideTransfer.mutateAsync({ transferId: "t1", decision: "approve" });
    });
    expect(lastCall()[0]).toBe("approve_stock_transfer");
    expect(lastCall()[1]).toMatchObject({ _transfer_id: "t1", _decision: "approve", _reason: null });
  });

  it("sebep ile reddeder", async () => {
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.decideTransfer.mutateAsync({
        transferId: "t1", decision: "reject", reason: "stok kritik",
      });
    });
    expect(lastCall()[1]).toMatchObject({ _decision: "reject", _reason: "stok kritik" });
  });

  it("revizyon isteğini sunucu karar adına çevirir", async () => {
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.decideTransfer.mutateAsync({
        transferId: "t1", decision: "revise", reason: "miktarı düşür",
      });
    });
    expect(lastCall()[1]).toMatchObject({ _decision: "request_revision", _reason: "miktarı düşür" });
  });

  it("tam sevk yapar", async () => {
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.dispatchTransfer.mutateAsync({
        transferId: "t1", quantity: 100, unit: "adet",
        dispatchedAt: "2026-03-01T08:00:00Z", expectedArrivalAt: "2026-03-02T08:00:00Z",
        reference: "SEV-1", notes: "kamyon",
      });
    });
    expect(lastCall()[0]).toBe("dispatch_stock_transfer");
    expect(lastCall()[1]).toMatchObject({
      _transfer_id: "t1", _dispatched_quantity: 100, _reference: "SEV-1",
    });
  });

  it("kısmi sevk yapar", async () => {
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.dispatchTransfer.mutateAsync({ transferId: "t1", quantity: 40 });
    });
    expect(lastCall()[1]).toMatchObject({ _dispatched_quantity: 40, _unit: null });
  });

  it("teslim alır", async () => {
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.receiveTransfer.mutateAsync({ transferId: "t1", accepted: 100 });
    });
    expect(lastCall()[0]).toBe("receive_stock_transfer");
    expect(lastCall()[1]).toMatchObject({
      _accepted_quantity: 100, _damaged_quantity: 0, _missing_quantity: 0, _rejected_quantity: 0,
    });
  });

  it("kısmi teslim alır", async () => {
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.receiveTransfer.mutateAsync({ transferId: "t1", accepted: 60 });
    });
    expect(lastCall()[1]).toMatchObject({ _accepted_quantity: 60 });
  });

  it("uyuşmazlıklı teslim kaydeder", async () => {
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.receiveTransfer.mutateAsync({
        transferId: "t1", accepted: 80, damaged: 10, missing: 6, rejected: 4, notes: "hasar tutanağı",
      });
    });
    expect(lastCall()[1]).toMatchObject({
      _accepted_quantity: 80, _damaged_quantity: 10, _missing_quantity: 6, _rejected_quantity: 4,
    });
  });

  it("sevk öncesi iptal eder", async () => {
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.cancelTransfer.mutateAsync({ transferId: "t1", reason: "ihtiyaç kalmadı" });
    });
    expect(lastCall()[0]).toBe("cancel_stock_transfer");
    expect(lastCall()[1]).toMatchObject({ _reason: "ihtiyaç kalmadı" });
  });

  it("transit sevkiyatı kaynağa geri alır", async () => {
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.returnTransfer.mutateAsync({
        transferId: "t1", quantity: 30, unit: "adet", reason: "yanlış saha",
      });
    });
    expect(lastCall()[0]).toBe("return_stock_transfer");
    expect(lastCall()[1]).toMatchObject({ _quantity: 30, _reason: "yanlış saha" });
  });
});

describe("useInventoryTransfers — hata, önbellek ve çift tıklama", () => {
  it("yetkisiz işlem hata fırlatır ve başarı sinyali üretmez", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "permission_denied" } });
    const { hook } = setup();
    await expect(
      hook.result.current.decideTransfer.mutateAsync({ transferId: "t1", decision: "approve" }),
    ).rejects.toThrow(/permission_denied/);
    await waitFor(() => expect(hook.result.current.decideTransfer.isSuccess).toBe(false));
  });

  it("sunucu hataları okunabilir Türkçeye çevrilir", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "invalid_transfer_status" } });
    const { hook } = setup();
    let msg = "";
    try {
      await hook.result.current.dispatchTransfer.mutateAsync({ transferId: "t1", quantity: 5 });
    } catch (e) {
      msg = transferErrorText(e);
    }
    expect(msg).toBe("Transferin mevcut durumu bu işleme izin vermiyor.");
  });

  it("başarısız işlemden sonra form değerleri korunabilir (durum sıfırlanmaz)", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "insufficient_available_stock" } });
    const { hook } = setup();
    const input = { transferId: "t1", quantity: 500 };
    await hook.result.current.dispatchTransfer.mutateAsync(input).catch(() => undefined);
    await waitFor(() => expect(hook.result.current.dispatchTransfer.isError).toBe(true));
    expect(hook.result.current.dispatchTransfer.variables).toMatchObject(input);
  });

  it("başarı sonrası ilgili sorgular geçersiz kılınır", async () => {
    const { qc, hook } = setup();
    const spy = vi.spyOn(qc, "invalidateQueries");
    await act(async () => {
      await hook.result.current.createTransfer.mutateAsync({
        sourceWarehouseId: "w1", destWarehouseId: "w2", materialId: "m1", quantity: 1, unit: "adet",
      });
    });
    const keys = spy.mock.calls.map((c: any) => c[0]?.queryKey?.[0]);
    expect(keys).toContain("inventory_transfers");
    expect(keys).toContain("inventory_transfer_events");
    expect(keys).toContain("inventory_transit_balances");
    expect(keys).toContain("stock_movements");
  });

  it("işlem sürerken busy bayrağı çift tıklamayı engeller", async () => {
    let release: (v: unknown) => void = () => undefined;
    rpc.mockImplementation(() => new Promise((res) => { release = res; }));
    const { hook } = setup();
    act(() => { void hook.result.current.decideTransfer.mutate({ transferId: "t1", decision: "approve" }); });
    await waitFor(() => expect(hook.result.current.busy).toBe(true));
    await act(async () => {
      release({ data: { ok: true }, error: null });
    });
    await waitFor(() => expect(hook.result.current.busy).toBe(false));
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
