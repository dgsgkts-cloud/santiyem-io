// Sprint M1.4 — Procurement page composition shell.
// Owns the purchase-request workflow state, dialogs and detail-URL sync.
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";
import { PageShell } from "@/components/ui/responsive";
import { useLicense } from "@/lib/licenseStore";
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
import {
  ApproveRequestDialog,
  PlanUnavailableDialog,
  RejectRequestDialog,
  RfqPrepareDialog,
} from "./procurement/RequestActionDialogs";
import { useProcurementDemoData } from "./procurement/useProcurementDemoData";
import { useRequestWorkflow } from "./procurement/useRequestWorkflow";
import { PERMISSION_MESSAGE, type WorkflowAction } from "./procurement/procurementWorkflow";
import type { Request } from "./procurement/procurementConstants";

const ProcurementCEOView = lazy(() =>
  import("./procurement/ProcurementCEOView").then((m) => ({
    default: m.ProcurementCEOView,
  }))
);

export default function ProcurementPage() {
  const data = useProcurementDemoData();
  const license = useLicense();
  const workflow = useRequestWorkflow(data.requests);
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<ProcurementSubTab>("dashboard");
  const [ceoMode, setCeoMode] = useState(false);
  const [rfqRequest, setRfqRequest] = useState<Request | null>(null);
  const [detail, setDetail] = useState<ProcurementDetail>(null);
  const [approveTarget, setApproveTarget] = useState<Request | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Request | null>(null);
  const [rfqTarget, setRfqTarget] = useState<Request | null>(null);
  const [submitTarget, setSubmitTarget] = useState<Request | null>(null);
  const [planBlocked, setPlanBlocked] = useState(false);
  const { user } = useUser();
  const approverResolution = useRequestApprovers(submitTarget);

  const detailId = params.get("talep");
  const planAllows = license.hasFeature("purchasing");

  // Deep-link / refresh / browser-back support for the request detail view.
  useEffect(() => {
    if (!detailId) {
      setDetail((d) => (d?.kind === "request" ? null : d));
      return;
    }
    const found = workflow.requests.find((r) => r.id === detailId);
    if (found) {
      setTab("requests");
      setDetail({ kind: "request", item: found });
    } else if (workflow.requests.length > 0) {
      setDetail({ kind: "request", item: null });
    }
  }, [detailId, workflow.requests]);

  const openDetail = useCallback(
    (r: Request) => {
      const next = new URLSearchParams(params);
      next.set("talep", r.id);
      setParams(next, { replace: false });
    },
    [params, setParams]
  );

  const closeDetail = useCallback(() => {
    setDetail(null);
    if (params.get("talep")) {
      const next = new URLSearchParams(params);
      next.delete("talep");
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const handleAction = useCallback(
    async (action: WorkflowAction, request: Request) => {
      if (!request?.id) {
        toast.error("İşlem tamamlanamadı. Lütfen tekrar deneyin.");
        return;
      }
      if (action === "detail") {
        openDetail(request);
        return;
      }
      if (!planAllows) {
        setPlanBlocked(true);
        return;
      }
      if (!workflow.can(action)) {
        toast.error(PERMISSION_MESSAGE);
        return;
      }
      switch (action) {
        case "approve":
          setApproveTarget(request);
          return;
        case "reject":
          setRejectTarget(request);
          return;
        case "rfq":
          setRfqTarget(request);
          return;
        case "send_rfq": {
          const ok = await workflow.sendRfq(request.id);
          if (ok) {
            setRfqRequest(request);
            setTab("rfq");
          }
          return;
        }
        case "submit":
          // Never submits blindly — the approver dialog resolves the approver first.
          setSubmitTarget(request);
          return;
        case "to_order": {
          const ok = await workflow.toOrder(request.id);
          if (ok) setTab("orders");
          return;
        }
        case "reopen":
          await workflow.reopen(request.id);
          return;
        case "delete":
          await workflow.remove(request.id);
          return;
        case "open_order":
          setTab("orders");
          toast.info(`${request.orderNo ?? "Sipariş"} sipariş listesinde açıldı.`);
          return;
        case "track_delivery":
          setTab("deliveries");
          return;
        case "copy":
          try {
            await navigator.clipboard.writeText(request.no);
            toast.success("Talep numarası kopyalandı.");
          } catch {
            toast.error("Kopyalama yapılamadı.");
          }
          return;
        case "edit":
          toast.info(
            "Talep düzenleme ekranı henüz kullanıma açılmadı. Şimdilik yeni talep oluşturabilirsiniz."
          );
          return;
        default:
          return;
      }
    },
    [openDetail, planAllows, workflow]
  );

  const detailRequest = useMemo(
    () =>
      detail?.kind === "request" && detail.item
        ? workflow.requests.find((r) => r.id === detail.item?.id) ?? null
        : null,
    [detail, workflow.requests]
  );

  const shownDetail: ProcurementDetail =
    detail?.kind === "request" ? { kind: "request", item: detailRequest } : detail;

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
            <ProcurementRequestsView workflow={workflow} onAction={handleAction} />
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
      <ProcurementDetailSheet
        detail={shownDetail}
        onClose={closeDetail}
        onAction={handleAction}
        workflow={workflow}
      />

      <ApproveRequestDialog
        request={approveTarget}
        loading={!!approveTarget && workflow.isPending(approveTarget.id, "approve")}
        onCancel={() => setApproveTarget(null)}
        onConfirm={async () => {
          if (!approveTarget) return;
          const ok = await workflow.approve({ id: approveTarget.id });
          if (ok) setApproveTarget(null);
        }}
      />
      <RejectRequestDialog
        request={rejectTarget}
        loading={!!rejectTarget && workflow.isPending(rejectTarget.id, "reject")}
        onCancel={() => setRejectTarget(null)}
        onConfirm={async (reason, note) => {
          if (!rejectTarget) return;
          const ok = await workflow.reject({ id: rejectTarget.id, reason, note });
          if (ok) setRejectTarget(null);
        }}
      />
      <RfqPrepareDialog
        request={rfqTarget}
        suppliers={data.suppliers}
        loading={!!rfqTarget && workflow.isPending(rfqTarget.id, "rfq")}
        onCancel={() => setRfqTarget(null)}
        onConfirm={async (payload) => {
          if (!rfqTarget) return;
          const rfq = await workflow.createRfq({ id: rfqTarget.id, ...payload });
          if (rfq) {
            setRfqRequest(rfqTarget);
            setRfqTarget(null);
            setTab("rfq");
          }
        }}
      />
      <PlanUnavailableDialog
        open={planBlocked}
        onClose={() => setPlanBlocked(false)}
        onReviewPlan={() => {
          setPlanBlocked(false);
          window.dispatchEvent(
            new CustomEvent("navigate-tab", { detail: { tab: "settings" } })
          );
        }}
      />
    </PageShell>
  );
}
