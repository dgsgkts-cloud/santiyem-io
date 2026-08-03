// DEPO & ENVANTER — composition shell.
// Every tab reads from the canonical inventory hook; modules without a backing
// table render an explicit truthful state instead of demo content.

import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Warehouse } from "lucide-react";
import { PageShell } from "@/components/ui/responsive";
import { useWarehouseData } from "./warehouse/useWarehouseData";
import type { SubTab } from "./warehouse/warehouseConstants";
import type { InventoryItem } from "./warehouse/inventoryTruth";
import { WarehouseHeaderActions } from "./warehouse/WarehouseHeaderActions";
import { WarehouseTabs } from "./warehouse/WarehouseTabs";
import { OverviewView } from "./warehouse/views/OverviewView";
import { StocksView } from "./warehouse/views/StocksView";
import { WarehousesView } from "./warehouse/views/WarehousesView";
import { MovementsView } from "./warehouse/views/MovementsView";
import { TransfersView } from "./warehouse/views/TransfersView";
import { AssignmentsView } from "./warehouse/views/AssignmentsView";
import { CountsView } from "./warehouse/views/CountsView";
import { AnalyticsView } from "./warehouse/views/AnalyticsView";
import { CEOView } from "./warehouse/views/CEOView";
import { StockSheet } from "./warehouse/StockSheet";
import { QuickActionFAB } from "./warehouse/QuickActionFAB";
import { StockActionDialog, type StockActionKind } from "./warehouse/StockActionDialogs";

// URL slug ↔ sekme eşlemesi. Transfer detayından listeye dönüşte doğru sekme açılır.
const SLUG_TO_TAB: Record<string, SubTab> = {
  ozet: "overview", overview: "overview",
  stoklar: "stocks", stocks: "stocks",
  depolar: "warehouses", warehouses: "warehouses",
  hareketler: "movements", movements: "movements",
  transferler: "transfers", transfers: "transfers",
  zimmet: "assignments", assignments: "assignments",
  sayimlar: "counts", counts: "counts",
  analitik: "analytics", analytics: "analytics",
};
const TAB_TO_SLUG: Record<SubTab, string> = {
  overview: "ozet", stocks: "stoklar", warehouses: "depolar", movements: "hareketler",
  transfers: "transferler", assignments: "zimmet", counts: "sayimlar", analytics: "analitik",
};

export default function WarehousePage() {
  const data = useWarehouseData();
  const [sp, setSp] = useSearchParams();
  const tab = useMemo<SubTab>(() => SLUG_TO_TAB[sp.get("sekme") ?? ""] ?? "overview", [sp]);
  const setTab = (t: SubTab) => {
    const next = new URLSearchParams(sp);
    next.set("sekme", TAB_TO_SLUG[t]);
    setSp(next, { replace: true });
  };
  const ceoMode = sp.get("ceo") === "1";
  const setCeoMode = (v: boolean) => {
    const next = new URLSearchParams(sp);
    if (v) next.set("ceo", "1"); else next.delete("ceo");
    setSp(next, { replace: true });
  };
  const [openStock, setOpenStock] = useState<InventoryItem | null>(null);
  const [action, setAction] = useState<StockActionKind>(null);


  // Purchase-request handoff for a low/critical item, routed through the
  // existing assistant follow-up channel (no fabricated procurement records).
  const requestPurchase = (item: InventoryItem) =>
    window.dispatchEvent(
      new CustomEvent("canvas-followup", {
        detail: {
          text: `${item.name} için satın alma talebi oluştur. Mevcut kullanılabilir stok ${item.available} ${item.rawUnit}, minimum seviye ${item.minStock} ${item.rawUnit}.`,
        },
      }),
    );

  return (
    <>
      <PageShell
        title={
          <span className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-[#FF6B2B] shrink-0" />
            Depo Merkezi
          </span>
        }
        subtitle="Depo & Envanter"
        actions={<WarehouseHeaderActions ceoMode={ceoMode} onToggleCeo={() => setCeoMode(!ceoMode)} />}
      >
        {ceoMode ? (
          <CEOView data={data} onCreateRequest={requestPurchase} />
        ) : (
          <div className="space-y-4 lg:space-y-5">
            <WarehouseTabs active={tab} onChange={setTab} />
            {tab === "overview" && <OverviewView data={data} onCreateRequest={requestPurchase} />}
            {tab === "stocks" && <StocksView data={data} onOpen={setOpenStock} />}
            {tab === "warehouses" && <WarehousesView data={data} />}
            {tab === "movements" && <MovementsView data={data} />}
            {tab === "transfers" && <TransfersView data={data} />}
            {tab === "assignments" && <AssignmentsView data={data} />}
            {tab === "counts" && <CountsView data={data} />}
            {tab === "analytics" && <AnalyticsView data={data} />}
          </div>
        )}
      </PageShell>

      <StockSheet stock={openStock} onClose={() => setOpenStock(null)} data={data} />
      <StockActionDialog kind={action} onClose={() => setAction(null)} data={data} />
      <QuickActionFAB onAction={setAction} />
    </>
  );
}

