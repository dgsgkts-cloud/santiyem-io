// Sprint M1.5 — Warehouse & Inventory composition shell.
// Frontend-only responsive migration. No backend/schema/hook/business logic
// changes. All views live under ./warehouse/* and use the M1 responsive DS.

import { useState } from "react";
import { Warehouse } from "lucide-react";
import { PageShell } from "@/components/ui/responsive";
import { useWarehouseData } from "./warehouse/useWarehouseData";
import type { SubTab, Stock } from "./warehouse/warehouseConstants";
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

export default function WarehousePage() {
  const data = useWarehouseData();
  const [tab, setTab] = useState<SubTab>("overview");
  const [ceoMode, setCeoMode] = useState(false);
  const [openStock, setOpenStock] = useState<Stock | null>(null);

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
        actions={
          <WarehouseHeaderActions ceoMode={ceoMode} onToggleCeo={() => setCeoMode(v => !v)} />
        }
      >
        {ceoMode ? (
          <CEOView data={data} />
        ) : (
          <div className="space-y-4 lg:space-y-5">
            <WarehouseTabs active={tab} onChange={setTab} />
            {tab === "overview" && <OverviewView data={data} />}
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
