// Satın Alma → Siparişler: one place that maps an action to a real effect.
// Used by both the orders list and the order detail page.
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  ACTION_LABELS,
  PERMISSION_MESSAGE,
  actionBlockedReason,
  type OrderAction,
  type PurchaseOrder,
} from "./orderModel";
import type { OrderWorkflow } from "./usePurchaseOrders";
import { generateOrderPdf } from "./orderPdf";
import {
  ConfirmOrderDialog,
  DeliveryDialog,
  GoodsReceiptDialog,
  InvoiceDialog,
  PaymentPlanDialog,
  RecordPaymentDialog,
} from "./OrderDialogs";
import { OrderFormDialog } from "./OrderFormDialog";

type DialogKind =
  | "form"
  | "plan"
  | "payment"
  | "delivery"
  | "receipt"
  | "invoice"
  | "approve"
  | "reject"
  | "cancel"
  | "delete"
  | "submit"
  | "send"
  | null;

export const useOrderActions = ({
  workflow,
  projectNames,
  supplierNames,
  onOpenDetail,
}: {
  workflow: OrderWorkflow;
  projectNames: string[];
  supplierNames: string[];
  onOpenDetail?: (order: PurchaseOrder) => void;
}) => {
  const navigate = useNavigate();
  const [kind, setKind] = useState<DialogKind>(null);
  const [target, setTarget] = useState<PurchaseOrder | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [receiptDeliveryId, setReceiptDeliveryId] = useState<string | null>(null);

  const close = useCallback(() => {
    setKind(null);
    setTarget(null);
    setReceiptDeliveryId(null);
  }, []);

  const openCreate = useCallback(() => setCreateOpen(true), []);

  const openReceipt = useCallback((order: PurchaseOrder, deliveryId?: string) => {
    setTarget(order);
    setReceiptDeliveryId(deliveryId ?? null);
    setKind("receipt");
  }, []);

  const perform = useCallback(
    async (action: OrderAction, order: PurchaseOrder) => {
      if (!order?.id) {
        toast.error("Sipariş bulunamadı. Sayfayı yenileyin.");
        return;
      }
      if (!workflow.canDo(action)) {
        toast.error(PERMISSION_MESSAGE);
        return;
      }
      const blocked = actionBlockedReason(order, action);
      if (blocked) {
        toast.error(blocked);
        return;
      }

      switch (action) {
        case "detail":
          if (onOpenDetail) onOpenDetail(order);
          else navigate(`/satin-alma/siparisler/${order.id}`);
          return;
        case "pdf":
          try {
            toast.loading("Sipariş PDF hazırlanıyor…", { id: `pdf-${order.id}` });
            await generateOrderPdf(order);
            toast.success("Sipariş PDF indirildi.", { id: `pdf-${order.id}` });
          } catch (e) {
            console.error("[orders] pdf failed", e);
            toast.error("PDF oluşturulamadı.", { id: `pdf-${order.id}` });
          }
          return;
        case "duplicate":
          await workflow.duplicateOrder(order);
          return;
        case "edit":
          setTarget(order);
          setKind("form");
          return;
        case "plan_payment":
          setTarget(order);
          setKind("plan");
          return;
        case "record_payment":
          setTarget(order);
          setKind("payment");
          return;
        case "add_delivery":
          setTarget(order);
          setKind("delivery");
          return;
        case "goods_receipt":
          openReceipt(order);
          return;
        case "add_invoice":
          setTarget(order);
          setKind("invoice");
          return;
        case "submit_approval":
          setTarget(order);
          setKind("submit");
          return;
        case "approve":
          setTarget(order);
          setKind("approve");
          return;
        case "reject":
          setTarget(order);
          setKind("reject");
          return;
        case "send_supplier":
          setTarget(order);
          setKind("send");
          return;
        case "cancel":
          setTarget(order);
          setKind("cancel");
          return;
        case "delete":
          setTarget(order);
          setKind("delete");
          return;
        default:
          toast.info(`${ACTION_LABELS[action]} bu sipariş için kullanılamıyor.`);
      }
    },
    [navigate, onOpenDetail, openReceipt, workflow]
  );

  const live = target ? workflow.find(target.id) ?? target : null;

  const dialogs = (
    <>
      <OrderFormDialog
        open={createOpen}
        order={null}
        workflow={workflow}
        projectNames={projectNames}
        supplierNames={supplierNames}
        onClose={() => setCreateOpen(false)}
      />
      <OrderFormDialog
        open={kind === "form"}
        order={live}
        workflow={workflow}
        projectNames={projectNames}
        supplierNames={supplierNames}
        onClose={close}
      />
      <PaymentPlanDialog
        open={kind === "plan"}
        order={live}
        workflow={workflow}
        onClose={close}
      />
      <RecordPaymentDialog
        open={kind === "payment"}
        order={live}
        workflow={workflow}
        onClose={close}
      />
      <DeliveryDialog
        open={kind === "delivery"}
        order={live}
        workflow={workflow}
        onClose={close}
      />
      <GoodsReceiptDialog
        open={kind === "receipt"}
        order={live}
        workflow={workflow}
        deliveryId={receiptDeliveryId}
        onClose={close}
      />
      <InvoiceDialog
        open={kind === "invoice"}
        order={live}
        workflow={workflow}
        onClose={close}
      />
      <ConfirmOrderDialog
        open={kind === "submit"}
        order={live}
        title="Siparişi Onaya Gönder"
        description="Sipariş onay sürecine alınır ve onay verilene kadar düzenlenebilir kalır."
        confirmLabel="Onaya Gönder"
        busy={!!live && workflow.isPending(live.id, "submit_approval")}
        onCancel={close}
        onConfirm={async () => {
          if (!live) return;
          const ok = await workflow.submitForApproval(live, live.approver_name ?? undefined);
          if (ok) close();
        }}
      />
      <ConfirmOrderDialog
        open={kind === "approve"}
        order={live}
        title="Siparişi Onayla"
        description="Onay sonrası sipariş tedarikçiye gönderilebilir ve ödeme planı oluşturulabilir."
        confirmLabel="Onayla"
        busy={!!live && workflow.isPending(live.id, "approve")}
        onCancel={close}
        onConfirm={async () => {
          if (!live) return;
          const ok = await workflow.approveOrder(live);
          if (ok) close();
        }}
      />
      <ConfirmOrderDialog
        open={kind === "reject"}
        order={live}
        title="Siparişi Reddet"
        description="Sipariş taslağa döner; gerekçe geçmişe kaydedilir."
        confirmLabel="Reddet"
        requireReason
        busy={!!live && workflow.isPending(live.id, "reject")}
        onCancel={close}
        onConfirm={async (reason) => {
          if (!live) return;
          const ok = await workflow.rejectOrder(live, reason);
          if (ok) close();
        }}
      />
      <ConfirmOrderDialog
        open={kind === "send"}
        order={live}
        title="Tedarikçiye Gönder"
        description="Sipariş tedarikçiye iletildi olarak işaretlenir ve sevkiyat takibi başlar."
        confirmLabel="Gönderildi Olarak İşaretle"
        busy={!!live && workflow.isPending(live.id, "send_supplier")}
        onCancel={close}
        onConfirm={async () => {
          if (!live) return;
          const ok = await workflow.sendToSupplier(live);
          if (ok) close();
        }}
      />
      <ConfirmOrderDialog
        open={kind === "cancel"}
        order={live}
        title="Siparişi İptal Et"
        description="İptal sonrası ödeme ve teslimat takibi durur. Geçmiş kayıtlar korunur."
        confirmLabel="Siparişi İptal Et"
        requireReason
        busy={!!live && workflow.isPending(live.id, "cancel")}
        onCancel={close}
        onConfirm={async (reason) => {
          if (!live) return;
          const ok = await workflow.cancelOrder(live, reason);
          if (ok) close();
        }}
      />
      <ConfirmOrderDialog
        open={kind === "delete"}
        order={live}
        title="Siparişi Sil"
        description="Sadece taslak siparişler silinebilir. Bu işlem geri alınamaz."
        confirmLabel="Siparişi Sil"
        busy={!!live && workflow.isPending(live.id, "delete")}
        onCancel={close}
        onConfirm={async () => {
          if (!live) return;
          const ok = await workflow.deleteOrder(live);
          if (ok) {
            close();
            if (!onOpenDetail) navigate("/satin-alma");
          }
        }}
      />
    </>
  );

  return { perform, dialogs, openCreate, openReceipt };
};
