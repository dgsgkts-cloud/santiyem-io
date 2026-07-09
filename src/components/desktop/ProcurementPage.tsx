// Sprint M1.4 — Procurement page composition shell.
// Uses PageShell + responsive design system. Zero business logic changes.
import { Suspense, lazy, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { PageShell } from "@/components/ui/responsive";
import { ProcurementHeaderActions } from "./procurement/ProcurementHeaderActions";
import {
  ProcurementTabs,
  type ProcurementSubTab,
} from "./procurement/ProcurementTabs";
import { ProcurementDashboardView } from "./procurement/ProcurementDashboardView";
import { ProcurementRequestsView } from "./procurement/ProcurementRequestsView";
import { ProcurementRFQView } from "./procurement/ProcurementRFQView";
import { ProcurementOrdersView } from "./procurement/ProcurementOrdersView";
import { ProcurementDeliveriesView } from "./procurement/ProcurementDeliveriesView";
import { ProcurementSuppliersView } from "./procurement/ProcurementSuppliersView";
import { ProcurementAnalyticsView } from "./procurement/ProcurementAnalyticsView";
import { ProcurementQuickCreateFAB } from "./procurement/ProcurementQuickCreateFAB";
import {
  ProcurementDetailSheet,
  type ProcurementDetail,
} from "./procurement/ProcurementDetailSheet";
import { useProcurementDemoData } from "./procurement/useProcurementDemoData";
import type { Request } from "./procurement/procurementConstants";

const ProcurementCEOView = lazy(() =>
  import("./procurement/ProcurementCEOView").then((m) => ({
    default: m.ProcurementCEOView,
  }))
);

export default function ProcurementPage() {
  const data = useProcurementDemoData();
  const [tab, setTab] = useState<ProcurementSubTab>("dashboard");
  const [ceoMode, setCeoMode] = useState(false);
  const [rfqRequest, setRfqRequest] = useState<Request | null>(null);
  const [detail, setDetail] = useState<ProcurementDetail>(null);

  const goRFQ = (r: Request) => {
    setRfqRequest(r);
    setTab("rfq");
  };

  return (
    <PageShell
      title="Satın Alma Merkezi"
      subtitle={
        <span className="flex items-center gap-1.5">
          <ShoppingCart className="w-3.5 h-3.5" /> SATIN ALMA & TEDARİK ZİNCİRİ
        </span>
      }
      actions={
        <ProcurementHeaderActions
          ceoMode={ceoMode}
          onToggleCeo={() => setCeoMode((v) => !v)}
        />
      }
    >
      {ceoMode ? (
        <Suspense fallback={null}>
          <ProcurementCEOView data={data} />
        </Suspense>
      ) : (
        <>
          <ProcurementTabs tab={tab} onChange={setTab} />

          {tab === "dashboard" && <ProcurementDashboardView data={data} />}
          {tab === "requests" && (
            <ProcurementRequestsView
              data={data}
              onRFQ={goRFQ}
              onOpen={(r) => setDetail({ kind: "request", item: r })}
            />
          )}
          {tab === "rfq" && (
            <ProcurementRFQView
              data={data}
              activeRequest={rfqRequest}
              onSelect={() => {
                /* preserves existing no-op selection behavior */
              }}
            />
          )}
          {tab === "orders" && (
            <ProcurementOrdersView
              data={data}
              onOpen={(o) => setDetail({ kind: "order", item: o })}
            />
          )}
          {tab === "deliveries" && <ProcurementDeliveriesView data={data} />}
          {tab === "suppliers" && (
            <ProcurementSuppliersView
              data={data}
              onOpen={(s) => setDetail({ kind: "supplier", item: s })}
            />
          )}
          {tab === "analytics" && <ProcurementAnalyticsView data={data} />}
        </>
      )}

      <ProcurementQuickCreateFAB />
      <ProcurementDetailSheet detail={detail} onClose={() => setDetail(null)} />
    </PageShell>
  );
}
