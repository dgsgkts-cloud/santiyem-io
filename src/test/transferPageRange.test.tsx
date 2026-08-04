// DEPO — aralık dışı sayfa numarasının sunucu yanıtına göre normalize edilmesi.
//
// PostgREST, istenen aralık toplam kayıt sayısının ötesindeyse satır döndürmek
// yerine HTTP 416 / PGRST103 hatası verir. Bu test, `useTransferPage`'in bu
// hatada listeyi boş bırakmayıp son geçerli sayfayı getirdiğini doğrular.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const TOTAL = 53;
const PAGE = 20;
const rangeCalls: [number, number][] = [];
let countOnlyCalls = 0;

/** Sunucunun aralık davranışını taklit eden zincir. */
const makeChain = (head: boolean) => {
  const chain: any = new Proxy(
    {},
    {
      get: (_t, prop: string) => {
        if (prop === "then") {
          return (resolve: any) => {
            if (head) {
              countOnlyCalls += 1;
              return Promise.resolve({ data: null, count: TOTAL, error: null }).then(resolve);
            }
            const last = rangeCalls[rangeCalls.length - 1];
            const [from, to] = last ?? [0, PAGE - 1];
            if (from >= TOTAL) {
              return Promise.resolve({
                data: null,
                count: null,
                error: {
                  code: "PGRST103",
                  message: "Requested range not satisfiable",
                  details: `An offset of ${from} was requested, but there are only ${TOTAL} rows.`,
                },
              }).then(resolve);
            }
            const rows = Array.from({ length: Math.min(to, TOTAL - 1) - from + 1 }, (_, i) => ({
              id: `t-${from + i}`,
              transfer_no: `E2E-${from + i}`,
              status: "requested",
            }));
            return Promise.resolve({ data: rows, count: TOTAL, error: null }).then(resolve);
          };
        }
        if (prop === "range") {
          return (from: number, to: number) => {
            rangeCalls.push([from, to]);
            return chain;
          };
        }
        return () => chain;
      },
    },
  );
  return chain;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: (_cols: string, opts?: { head?: boolean }) => makeChain(!!opts?.head),
    }),
    rpc: vi.fn(),
  },
}));
vi.mock("@/contexts/UserContext", () => ({ useUser: () => ({ user: { id: "u-1" } }) }));

import { useTransferPage } from "@/hooks/useInventoryTransfers";
import { DEFAULT_TRANSFER_FILTERS } from "@/lib/inventory/transferFilters";
import { isRangeNotSatisfiable, totalFromRangeError } from "@/lib/inventory/transferQuery";

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    children,
  );

beforeEach(() => {
  rangeCalls.length = 0;
  countOnlyCalls = 0;
});

describe("aralık dışı sayfa — sunucu 416 yanıtı", () => {
  it("416 hatası tanınır ve toplam kayıt sayısı mesajdan okunur", () => {
    const err = {
      code: "PGRST103",
      message: "Requested range not satisfiable",
      details: "An offset of 1999960 was requested, but there are only 53 rows.",
    };
    expect(isRangeNotSatisfiable(err)).toBe(true);
    expect(totalFromRangeError(err)).toBe(53);
    expect(isRangeNotSatisfiable({ code: "42501", message: "denied" })).toBe(false);
  });

  it("sf=99999 son sayfaya iner ve son 13 kaydı getirir", async () => {
    const { result } = renderHook(
      () => useTransferPage({ ...DEFAULT_TRANSFER_FILTERS, page: 99999 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.page).toBe(3);
    expect(result.current.pageCount).toBe(3);
    expect(result.current.total).toBe(TOTAL);
    expect(result.current.rows).toHaveLength(13);
    expect(result.current.rows[0].id).toBe("t-40");
    // Toplam sayı hata mesajından okunduğu için ek sayım isteği gerekmez.
    expect(countOnlyCalls).toBe(0);
    expect(rangeCalls).toEqual([
      [1999960, 1999979],
      [40, 59],
    ]);
  });

  it("geçerli son sayfa tek istekte döner", async () => {
    const { result } = renderHook(
      () => useTransferPage({ ...DEFAULT_TRANSFER_FILTERS, page: 3 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.page).toBe(3);
    expect(result.current.rows).toHaveLength(13);
    expect(rangeCalls).toEqual([[40, 59]]);
  });

  it("orta sayfa tam sayfa döner", async () => {
    const { result } = renderHook(
      () => useTransferPage({ ...DEFAULT_TRANSFER_FILTERS, page: 2 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.page).toBe(2);
    expect(result.current.rows).toHaveLength(20);
    expect(rangeCalls).toEqual([[20, 39]]);
  });
});
