// DEPO & ENVANTER — composition shell.
// Every tab reads from the canonical inventory hook; modules without a backing
// table render an explicit truthful state instead of demo content.

import { useState } from "react";
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

export default function WarehousePage() {
  const data = useWarehouseData();
  const [tab, setTab] = useState<SubTab>("overview");
  const [ceoMode, setCeoMode] = useState(false);
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
        actions={<WarehouseHeaderActions ceoMode={ceoMode} onToggleCeo={() => setCeoMode((v) => !v)} />}
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
      <QuickActionFAB />
    </>
  );
}
