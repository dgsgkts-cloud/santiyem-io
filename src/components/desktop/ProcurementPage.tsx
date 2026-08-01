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
import { usePurchaseOrders } from "./procurement/orders/usePurchaseOrders";
import { useOrderActions } from "./procurement/orders/useOrderActions";
import { useUser } from "@/contexts/UserContext";
import { useRequestApprovers } from "./procurement/useRequestApprovers";
import { SubmitForApprovalDialog } from "./procurement/SubmitForApprovalDialog";
import { notifyApprover } from "./procurement/approvalNotifications";
import { useRequestWorkflow } from "./procurement/useRequestWorkflow";
import { PurchaseRequestForm } from "./procurement/PurchaseRequestForm";
import { WithdrawApprovalDialog } from "./procurement/RequestEditDialogs";
import {
  NOT_EDITABLE_MESSAGE,
  PERMISSION_MESSAGE,
  isEditableStatus,
  type WorkflowAction,
} from "./procurement/procurementWorkflow";
import type { Request } from "./procurement/procurementConstants";
import {
  DELIVERY_PERMISSION_MESSAGE,
  canManageDeliveries,
  emptyDeliveryFilters,
  type DeliveryAction,
  type DeliveryFilterState,
  type DeliveryRow,
} from "./procurement/deliveries/deliveryModel";
import { DeliveryNoteDialog } from "./procurement/deliveries/DeliveryNoteDialog";

const ProcurementCEOView = lazy(() =>
  import("./procurement/ProcurementCEOView").then((m) => ({
    default: m.ProcurementCEOView,
  }))
);

export default function ProcurementPage() {
  const data = useProcurementDemoData();
  const license = useLicense();
  const workflow = useRequestWorkflow(data.requests);
  const orderWorkflow = usePurchaseOrders();
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
  const [withdrawTarget, setWithdrawTarget] = useState<Request | null>(null);
  const [requestQuery, setRequestQuery] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState("all");
  const { user } = useUser();
  const approverResolution = useRequestApprovers(submitTarget);
  const actorName =
    user?.user_metadata?.full_name || user?.email || "Yetkili Kullanıcı";

  const detailId = params.get("talep");
  const editId = params.get("duzenle");
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

  const openEdit = useCallback(
    (id: string) => {
      const next = new URLSearchParams(params);
      next.delete("talep");
      next.set("duzenle", id);
      setParams(next, { replace: false });
      setDetail(null);
    },
    [params, setParams]
  );

  const closeEdit = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete("duzenle");
    setParams(next, { replace: false });
    setTab("requests");
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
        case "edit": {
          if (!isEditableStatus(request.status)) {
            toast.error(NOT_EDITABLE_MESSAGE);
            return;
          }
          openEdit(request.id);
          return;
        }
        case "withdraw":
          setWithdrawTarget(request);
          return;
        case "revision": {
          const revision = await workflow.createRevision(request.id, actorName);
          if (revision) openEdit(revision.id);
          return;
        }
        default:
          return;
      }
    },
    [openDetail, openEdit, planAllows, workflow, actorName]
  );

  const orderActions = useOrderActions({
    workflow: orderWorkflow,
    projectNames: data.projNames,
    supplierNames: data.suppliers.map((s) => s.name),
  });

  /* ── Deliveries workspace ──────────────────────────────── */
  const [deliveryFilters, setDeliveryFilters] = useState<DeliveryFilterState>(
    emptyDeliveryFilters
  );
  const [deliveryNoteTarget, setDeliveryNoteTarget] = useState<{
    row: DeliveryRow;
    kind: "discrepancy" | "return";
  } | null>(null);

  const handleDeliveryAction = useCallback(
    async (action: DeliveryAction, row: DeliveryRow) => {
      if (!canManageDeliveries(license.role) && action !== "detail" && action !== "open_order") {
        toast.error(DELIVERY_PERMISSION_MESSAGE);
        return;
      }
      switch (action) {
        case "detail":
        case "receipt_detail":
          if (row.deliveryId) {
            const next = new URLSearchParams(params);
            next.set("teslimat", row.deliveryId);
            setParams(next, { replace: false });
          }
          else orderActions.perform("detail", row.order);
          return;
        case "open_order":
          orderActions.perform("detail", row.order);
          return;
        case "plan":
        case "edit_shipment":
        case "update_eta":
        case "track_remaining":
          orderActions.perform("add_delivery", row.order);
          return;
        case "goods_receipt":
          orderActions.openReceipt(row.order, row.deliveryId ?? undefined);
          return;
        case "mark_ready":
        case "mark_dispatched":
        case "mark_arrived": {
          if (!row.deliveryId) {
            toast.error("Önce teslimatı planlayın.");
            return;
          }
          const status =
            action === "mark_ready"
              ? "Sevke Hazır"
              : action === "mark_dispatched"
              ? "Yolda"
              : "Şantiyeye Ulaştı";
          await orderWorkflow.setShipmentStage(row.order, row.deliveryId, status);
          return;
        }
        case "stock_entry":
          setTab("orders");
          toast.info("Depo girişleri Malzeme modülünde kayıtlı.");
          return;
        case "match_invoice":
          orderActions.perform("add_invoice", row.order);
          return;
        case "discrepancy":
        case "return": {
          if (!row.deliveryId) {
            toast.error("Bu sipariş için sevkiyat kaydı yok.");
            return;
          }
          setDeliveryNoteTarget({ row, kind: action });
          return;
        }
        default:
          return;
      }
    },
    [license.role, orderActions, orderWorkflow, params, setParams]
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
      {editId ? (
        <PurchaseRequestForm
          mode="edit"
          request={workflow.find(editId) ?? null}
          loading={workflow.requests.length === 0}
          workflow={workflow}
          projectNames={data.projNames}
          actor={actorName}
          onClose={closeEdit}
          onSaved={(saved) => {
            closeEdit();
            const next = new URLSearchParams(params);
            next.delete("duzenle");
            next.set("talep", saved.id);
            setParams(next, { replace: false });
          }}
          onDeleted={closeEdit}
        />
      ) : ceoMode ? (
        <Suspense fallback={null}>
          <ProcurementCEOView data={data} />
        </Suspense>
      ) : (
        <>
          <ProcurementTabs tab={tab} onChange={setTab} />

          {tab === "dashboard" && <ProcurementDashboardView data={data} />}
          {tab === "requests" && (
            <ProcurementRequestsView
              workflow={workflow}
              onAction={handleAction}
              query={requestQuery}
              onQueryChange={setRequestQuery}
              statusFilter={requestStatusFilter}
              onStatusFilterChange={setRequestStatusFilter}
            />
          )}
          {tab === "rfq" && (
            <ProcurementRFQView
              requests={workflow.requests}
              suppliers={data.suppliers}
              loading={workflow.requests.length === 0}
              activeRequestId={rfqRequest?.id ?? null}
              onActiveRequestChange={(id) =>
                setRfqRequest(workflow.requests.find((r) => r.id === id) ?? null)
              }
              actor={actorName}
              onOpenOrder={(order) => {
                setTab("orders");
                if (order) setDetail({ kind: "order", item: order });
              }}
              onTrackDelivery={() => setTab("deliveries")}
              onOpenRequest={(id) => {
                const found = workflow.requests.find((r) => r.id === id);
                if (found) openDetail(found);
              }}
            />
          )}
          {tab === "orders" && (
            <ProcurementOrdersView
              workflow={orderWorkflow}
              onAction={orderActions.perform}
              onCreate={orderActions.openCreate}
              projectNames={data.projNames}
            />
          )}
          {tab === "deliveries" && (
            <ProcurementDeliveriesView
              workflow={orderWorkflow}
              filters={deliveryFilters}
              onFiltersChange={(patch) =>
                setDeliveryFilters((prev) => ({ ...prev, ...patch }))
              }
              onAction={handleDeliveryAction}
              role={license.role}
              projectNames={data.projNames}
            />
          )}

          {tab === "suppliers" && (
            <ProcurementSuppliersView
              data={data}
              onOpen={(s) => setDetail({ kind: "supplier", item: s })}
            />
          )}
          {tab === "analytics" && <ProcurementAnalyticsView data={data} />}
        </>
      )}

      {orderActions.dialogs}
      <DeliveryNoteDialog
        open={!!deliveryNoteTarget}
        kind={deliveryNoteTarget?.kind ?? "discrepancy"}
        deliveryNo={deliveryNoteTarget?.row.deliveryNo ?? ""}
        onCancel={() => setDeliveryNoteTarget(null)}
        onConfirm={async (note) => {
          if (!deliveryNoteTarget?.row.deliveryId) return;
          const { row, kind } = deliveryNoteTarget;
          const ok =
            kind === "discrepancy"
              ? await orderWorkflow.reportDiscrepancy(row.order, row.deliveryId!, note)
              : await orderWorkflow.startReturn(row.order, row.deliveryId!, note);
          if (ok) setDeliveryNoteTarget(null);
        }}
      />
      <WithdrawApprovalDialog
        open={!!withdrawTarget}
        approverName={withdrawTarget?.approverName}
        loading={!!withdrawTarget && workflow.isPending(withdrawTarget.id, "withdraw")}
        onCancel={() => setWithdrawTarget(null)}
        onConfirm={async () => {
          if (!withdrawTarget) return;
          const target = withdrawTarget;
          const ok = await workflow.withdraw(target.id, actorName);
          if (ok) {
            setWithdrawTarget(null);
            if (target.approverUserId) {
              await notifyApprover({
                request: { ...target, status: "Taslak" },
                approverUserId: target.approverUserId,
                approverName: target.approverName ?? "",
                withdrawn: true,
              });
            }
          }
        }}
      />
      <ProcurementDetailSheet
        detail={shownDetail}
        onClose={closeDetail}
        onAction={handleAction}
        workflow={workflow}
      />

      <SubmitForApprovalDialog
        request={submitTarget}
        resolution={approverResolution}
        loading={!!submitTarget && workflow.isPending(submitTarget.id, "submit")}
        onCancel={() => setSubmitTarget(null)}
        onManagePermissions={() => {
          setSubmitTarget(null);
          window.dispatchEvent(
            new CustomEvent("navigate-tab", { detail: { tab: "team" } })
          );
        }}
        onConfirm={async ({ approver, dueDate, note }) => {
          if (!submitTarget || !approver) return;
          const target = submitTarget;
          const ok = await workflow.submit({
            id: target.id,
            approverUserId: approver.userId,
            approverName: approver.name,
            approverRole: approver.roleLabel,
            approvalDueAt: dueDate,
            approvalNote: note,
            submittedBy: user?.user_metadata?.full_name || target.requester,
          });
          if (ok) {
            setSubmitTarget(null);
            await notifyApprover({
              request: target,
              approverUserId: approver.userId,
              approverName: approver.name,
              dueDate,
              note,
            });
          }
        }}
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
