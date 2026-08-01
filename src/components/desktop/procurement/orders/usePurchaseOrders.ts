// Satın Alma → Siparişler: backend data + mutation layer.
// Every mutation writes real records, logs an audit event and keeps
// the connected chain in sync (cash, stock, project cost).
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useLicense } from "@/lib/licenseStore";
import {
  ACTION_CAPABILITY,
  PERMISSION_MESSAGE,
  can,
  computeTotals,
  derivePaymentStatus,
  deriveDeliveryStatus,
  deriveOrderStatus,
  nextOrderNo,
  summarizeOrder,
  threeWayMatch,
  type OrderAction,
  type OrderInstallment,
  type PurchaseOrder,
} from "./orderModel";

const db = supabase as any;

const ORDER_SELECT = `
  *,
  items:purchase_order_items(*),
  installments:purchase_order_installments(*),
  payments:purchase_order_payments(*),
  deliveries:purchase_order_deliveries(*, items:purchase_order_delivery_items(*)),
  receipts:purchase_order_receipts(*),
  invoices:purchase_order_invoices(*),
  events:purchase_order_events(*)
`;

const sortOrder = (o: PurchaseOrder): PurchaseOrder => ({
  ...o,
  items: [...(o.items || [])].sort((a, b) => a.sort_order - b.sort_order),
  installments: [...(o.installments || [])].sort(
    (a, b) => a.installment_no - b.installment_no
  ),
  payments: [...(o.payments || [])].sort((a, b) =>
    b.payment_date.localeCompare(a.payment_date)
  ),
  deliveries: [...(o.deliveries || [])].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  ),
  receipts: o.receipts || [],
  invoices: o.invoices || [],
  events: [...(o.events || [])].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  ),
});

export interface NewOrderItemInput {
  name: string;
  description?: string;
  item_type?: "malzeme" | "hizmet" | "kiralama" | "diger";
  material_id?: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  warehouse_name?: string | null;
  cost_code?: string | null;
}

export interface NewOrderInput {
  supplier_name: string;
  supplier_id?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  category?: string | null;
  purchase_request_id?: string | null;
  purchase_request_no?: string | null;
  rfq_no?: string | null;
  quotation_ref?: string | null;
  order_date?: string;
  expected_delivery_date?: string | null;
  payment_terms?: string | null;
  delivery_address?: string | null;
  delivery_contact?: string | null;
  currency?: string;
  discount?: number;
  notes?: string | null;
  items: NewOrderItemInput[];
}

export interface RecordPaymentInput {
  orderId: string;
  installmentId?: string | null;
  amount: number;
  method: string;
  accountId?: string | null;
  paymentDate: string;
  referenceNo?: string;
  description?: string;
  checkNo?: string;
  checkBank?: string;
  checkDueDate?: string;
}

export interface DeliveryInput {
  orderId: string;
  carrier?: string;
  vehicle_plate?: string;
  driver_name?: string;
  waybill_no?: string;
  dispatch_date?: string;
  expected_arrival?: string;
  warehouse_name?: string;
  status?: "Hazırlanıyor" | "Yolda" | "Şantiyede";
  notes?: string;
  lines: { order_item_id: string; delivered_quantity: number }[];
}

export interface ReceiptInput {
  orderId: string;
  deliveryId: string;
  warehouse_name?: string;
  received_by?: string;
  discrepancy_note?: string;
  lines: {
    order_item_id: string;
    accepted_quantity: number;
    rejected_quantity: number;
    damaged_quantity?: number;
    note?: string;
  }[];
}

export interface InvoiceInput {
  orderId: string;
  invoice_no: string;
  invoice_date: string;
  due_date?: string;
  subtotal: number;
  vat_amount: number;
  withholding?: number;
  total: number;
  notes?: string;
}

export const usePurchaseOrders = () => {
  const { user } = useUser();
  const license = useLicense();
  const qc = useQueryClient();
  const [pending, setPending] = useState<Record<string, OrderAction | null>>({});

  const actor =
    user?.user_metadata?.full_name || user?.email || "Yetkili Kullanıcı";

  const query = useQuery({
    queryKey: ["purchase_orders", user?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("purchase_orders")
        .select(ORDER_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data || []) as PurchaseOrder[]).map(sortOrder);
    },
    enabled: !!user,
  });

  const orders = query.data || [];

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["purchase_orders"] });
    qc.invalidateQueries({ queryKey: ["cash_payments"] });
    qc.invalidateQueries({ queryKey: ["cash_accounts"] });
    qc.invalidateQueries({ queryKey: ["material_entries"] });
    qc.invalidateQueries({ queryKey: ["materials"] });
    qc.invalidateQueries({ queryKey: ["project_expenses"] });
  }, [qc]);

  const logEvent = useCallback(
    async (
      orderId: string,
      event: string,
      extra?: {
        from?: string | null;
        to?: string | null;
        detail?: string | null;
        refTable?: string;
        refId?: string;
      }
    ) => {
      await db.from("purchase_order_events").insert({
        order_id: orderId,
        actor,
        event,
        from_value: extra?.from ?? null,
        to_value: extra?.to ?? null,
        detail: extra?.detail ?? null,
        ref_table: extra?.refTable ?? null,
        ref_id: extra?.refId ?? null,
      });
    },
    [actor]
  );

  const canDo = useCallback(
    (action: OrderAction) => {
      const capability = ACTION_CAPABILITY[action];
      if (!capability) return true;
      return can(license.role, capability);
    },
    [license.role]
  );

  const guard = useCallback(
    (action: OrderAction) => {
      if (canDo(action)) return true;
      toast.error(PERMISSION_MESSAGE);
      return false;
    },
    [canDo]
  );

  /** Recompute + persist the derived status trio after any chain change. */
  const syncStatuses = useCallback(
    async (orderId: string) => {
      const { data } = await db
        .from("purchase_orders")
        .select(ORDER_SELECT)
        .eq("id", orderId)
        .maybeSingle();
      if (!data) return;
      const order = sortOrder(data as PurchaseOrder);
      const s = summarizeOrder(order);
      const payment_status = derivePaymentStatus(
        order.total,
        order.installments,
        s.paid
      );
      const delivery_status = deriveDeliveryStatus(order.items, order.deliveries);
      const order_status = deriveOrderStatus(
        order.order_status,
        delivery_status,
        payment_status
      );
      const invoice_status =
        order.invoices.length === 0
          ? "Fatura Bekleniyor"
          : order.invoices.some((i) => i.status === "İtirazlı")
          ? "İtirazlı"
          : order.invoices.every((i) => i.status === "Eşleştirildi" || i.status === "Ödendi")
          ? payment_status === "Ödendi"
            ? "Ödendi"
            : "Eşleştirildi"
          : "Fatura Geldi";

      if (
        payment_status !== order.payment_status ||
        delivery_status !== order.delivery_status ||
        order_status !== order.order_status ||
        invoice_status !== order.invoice_status
      ) {
        await db
          .from("purchase_orders")
          .update({
            payment_status,
            delivery_status,
            order_status,
            invoice_status,
            completed_at:
              order_status === "Tamamlandı"
                ? order.completed_at || new Date().toISOString()
                : order.completed_at,
            updated_by: actor,
          })
          .eq("id", orderId);
      }
    },
    [actor]
  );

  const run = useCallback(
    async <T,>(
      orderId: string,
      action: OrderAction,
      fn: () => Promise<T>,
      messages: { success: string; error?: string }
    ): Promise<T | null> => {
      if (!guard(action)) return null;
      setPending((p) => ({ ...p, [orderId]: action }));
      try {
        const result = await fn();
        invalidate();
        toast.success(messages.success);
        return result;
      } catch (e: any) {
        console.error(`[orders] ${action} failed`, e);
        toast.error(
          messages.error || e?.message || "İşlem tamamlanamadı. Tekrar deneyin."
        );
        return null;
      } finally {
        setPending((p) => ({ ...p, [orderId]: null }));
      }
    },
    [guard, invalidate]
  );

  /* ── Create / edit ─────────────────────────────────────── */

  const createOrder = useCallback(
    async (input: NewOrderInput): Promise<PurchaseOrder | null> => {
      if (!guard("edit") || !user) return null;
      setPending((p) => ({ ...p, new: "edit" }));
      try {
        const totals = computeTotals(
          input.items.map((i) => ({
            quantity: i.quantity,
            unit_price: i.unit_price,
            vat_rate: i.vat_rate,
          })),
          input.discount || 0
        );
        const order_no = nextOrderNo(orders.map((o) => o.order_no));
        const { data, error } = await db
          .from("purchase_orders")
          .insert({
            user_id: user.id,
            order_no,
            supplier_name: input.supplier_name,
            supplier_id: input.supplier_id ?? null,
            project_id: input.project_id ?? null,
            project_name: input.project_name ?? null,
            category: input.category ?? null,
            purchase_request_id: input.purchase_request_id ?? null,
            purchase_request_no: input.purchase_request_no ?? null,
            rfq_no: input.rfq_no ?? null,
            quotation_ref: input.quotation_ref ?? null,
            order_date: input.order_date || new Date().toISOString().slice(0, 10),
            expected_delivery_date: input.expected_delivery_date ?? null,
            payment_terms: input.payment_terms ?? null,
            delivery_address: input.delivery_address ?? null,
            delivery_contact: input.delivery_contact ?? null,
            currency: input.currency || "TRY",
            discount: input.discount || 0,
            notes: input.notes ?? null,
            owner_name: actor,
            created_by: actor,
            updated_by: actor,
            ...totals,
          })
          .select("id, order_no")
          .single();
        if (error) throw error;

        if (input.items.length) {
          const { error: itemErr } = await db.from("purchase_order_items").insert(
            input.items.map((i, idx) => ({
              order_id: data.id,
              name: i.name,
              description: i.description ?? null,
              item_type: i.item_type || "malzeme",
              material_id: i.material_id ?? null,
              quantity: i.quantity,
              unit: i.unit,
              unit_price: i.unit_price,
              vat_rate: i.vat_rate,
              line_total: Math.round(i.quantity * i.unit_price * 100) / 100,
              warehouse_name: i.warehouse_name ?? null,
              cost_code: i.cost_code ?? null,
              sort_order: idx,
            }))
          );
          if (itemErr) throw itemErr;
        }
        await logEvent(data.id, "Sipariş oluşturuldu", { to: "Taslak" });
        invalidate();
        toast.success(`${data.order_no} taslak olarak oluşturuldu.`);
        return data as unknown as PurchaseOrder;
      } catch (e: any) {
        console.error("[orders] create failed", e);
        toast.error(e?.message || "Sipariş oluşturulamadı.");
        return null;
      } finally {
        setPending((p) => ({ ...p, new: null }));
      }
    },
    [actor, guard, invalidate, logEvent, orders, user]
  );

  const updateOrder = useCallback(
    async (
      order: PurchaseOrder,
      patch: Record<string, unknown>,
      items?: NewOrderItemInput[]
    ) =>
      run(
        order.id,
        "edit",
        async () => {
          let totals: Record<string, number> | undefined;
          if (items) {
            totals = computeTotals(
              items.map((i) => ({
                quantity: i.quantity,
                unit_price: i.unit_price,
                vat_rate: i.vat_rate,
              })),
              (patch.discount as number) ?? order.discount
            );
          }
          const { error, data } = await db
            .from("purchase_orders")
            .update({
              ...patch,
              ...(totals || {}),
              version: order.version + 1,
              updated_by: actor,
            })
            .eq("id", order.id)
            .eq("version", order.version)
            .select("id")
            .maybeSingle();
          if (error) throw error;
          if (!data)
            throw new Error(
              "Bu sipariş başka bir kullanıcı tarafından güncellendi. Sayfayı yenileyin."
            );

          if (items) {
            await db.from("purchase_order_items").delete().eq("order_id", order.id);
            if (items.length)
              await db.from("purchase_order_items").insert(
                items.map((i, idx) => ({
                  order_id: order.id,
                  name: i.name,
                  description: i.description ?? null,
                  item_type: i.item_type || "malzeme",
                  material_id: i.material_id ?? null,
                  quantity: i.quantity,
                  unit: i.unit,
                  unit_price: i.unit_price,
                  vat_rate: i.vat_rate,
                  line_total: Math.round(i.quantity * i.unit_price * 100) / 100,
                  warehouse_name: i.warehouse_name ?? null,
                  cost_code: i.cost_code ?? null,
                  sort_order: idx,
                }))
              );
          }
          await logEvent(order.id, "Sipariş güncellendi");
          return true;
        },
        { success: "Sipariş güncellendi." }
      ),
    [actor, logEvent, run]
  );

  const setStatus = useCallback(
    (
      order: PurchaseOrder,
      action: OrderAction,
      patch: Record<string, unknown>,
      event: string,
      successMessage: string
    ) =>
      run(
        order.id,
        action,
        async () => {
          const { error } = await db
            .from("purchase_orders")
            .update({ ...patch, updated_by: actor })
            .eq("id", order.id);
          if (error) throw error;
          await logEvent(order.id, event, {
            from: order.order_status,
            to: (patch.order_status as string) ?? order.order_status,
            detail: (patch.rejection_reason as string) ?? null,
          });
          return true;
        },
        { success: successMessage }
      ),
    [actor, logEvent, run]
  );

  const submitForApproval = (order: PurchaseOrder, approverName?: string) =>
    setStatus(
      order,
      "submit_approval",
      {
        order_status: "Onay Bekliyor",
        approver_name: approverName ?? null,
        submitted_for_approval_at: new Date().toISOString(),
      },
      "Onaya gönderildi",
      approverName
        ? `${order.order_no} ${approverName} onayına gönderildi.`
        : `${order.order_no} onaya gönderildi.`
    );

  const approveOrder = (order: PurchaseOrder) =>
    setStatus(
      order,
      "approve",
      {
        order_status: "Onaylandı",
        approved_at: new Date().toISOString(),
        approved_by: actor,
      },
      "Sipariş onaylandı",
      `${order.order_no} onaylandı.`
    );

  const rejectOrder = (order: PurchaseOrder, reason: string) =>
    setStatus(
      order,
      "reject",
      {
        order_status: "Taslak",
        rejected_at: new Date().toISOString(),
        rejected_by: actor,
        rejection_reason: reason,
      },
      "Sipariş reddedildi",
      `${order.order_no} reddedildi ve taslağa döndü.`
    );

  const sendToSupplier = (order: PurchaseOrder) =>
    setStatus(
      order,
      "send_supplier",
      {
        order_status: "Tedarikçiye Gönderildi",
        sent_to_supplier_at: new Date().toISOString(),
      },
      "Tedarikçiye gönderildi",
      `${order.order_no} ${order.supplier_name} firmasına gönderildi.`
    );

  const cancelOrder = (order: PurchaseOrder, reason: string) =>
    setStatus(
      order,
      "cancel",
      {
        order_status: "İptal",
        payment_status: "İptal",
        delivery_status: "İptal",
        cancelled_at: new Date().toISOString(),
        rejection_reason: reason,
      },
      "Sipariş iptal edildi",
      `${order.order_no} iptal edildi.`
    );

  const deleteOrder = (order: PurchaseOrder) =>
    run(
      order.id,
      "delete",
      async () => {
        const { error } = await db
          .from("purchase_orders")
          .delete()
          .eq("id", order.id);
        if (error) throw error;
        return true;
      },
      { success: `${order.order_no} silindi.` }
    );

  const duplicateOrder = async (order: PurchaseOrder) =>
    createOrder({
      supplier_name: order.supplier_name,
      supplier_id: order.supplier_id,
      project_id: order.project_id,
      project_name: order.project_name,
      category: order.category,
      expected_delivery_date: order.expected_delivery_date,
      payment_terms: order.payment_terms,
      delivery_address: order.delivery_address,
      delivery_contact: order.delivery_contact,
      currency: order.currency,
      discount: order.discount,
      notes: order.notes,
      items: order.items.map((i) => ({
        name: i.name,
        description: i.description ?? undefined,
        item_type: i.item_type,
        material_id: i.material_id,
        quantity: i.quantity,
        unit: i.unit,
        unit_price: i.unit_price,
        vat_rate: i.vat_rate,
        warehouse_name: i.warehouse_name,
        cost_code: i.cost_code,
      })),
    });

  /* ── Payment plan & payments ───────────────────────────── */

  const savePaymentPlan = (
    order: PurchaseOrder,
    installments: Omit<OrderInstallment, "id" | "order_id" | "paid_amount">[]
  ) =>
    run(
      order.id,
      "plan_payment",
      async () => {
        const paidIds = order.installments
          .filter((i) => i.paid_amount > 0)
          .map((i) => i.id);
        if (paidIds.length)
          throw new Error(
            "Ödeme alınmış taksitler bulunan plan değiştirilemez. Yeni taksit ekleyin."
          );
        await db
          .from("purchase_order_installments")
          .delete()
          .eq("order_id", order.id);
        const { error } = await db.from("purchase_order_installments").insert(
          installments.map((i, idx) => ({
            order_id: order.id,
            installment_no: idx + 1,
            payment_type: i.payment_type,
            due_date: i.due_date,
            amount: i.amount,
            currency: order.currency,
            percentage: i.percentage ?? null,
            condition_note: i.condition_note ?? null,
            planned_account_id: i.planned_account_id ?? null,
            status: "Planlandı",
          }))
        );
        if (error) throw error;
        await logEvent(order.id, "Ödeme planı oluşturuldu", {
          detail: `${installments.length} taksit`,
        });
        await syncStatuses(order.id);
        return true;
      },
      { success: "Ödeme planı kaydedildi." }
    );

  const recordPayment = (order: PurchaseOrder, input: RecordPaymentInput) =>
    run(
      order.id,
      "record_payment",
      async () => {
        if (!user) throw new Error("Oturum bulunamadı.");
        const s = summarizeOrder(order);
        if (input.amount > s.remaining + 0.5)
          throw new Error(
            `Kalan borçtan fazla ödeme kaydedilemez (kalan: ${s.remaining.toLocaleString("tr-TR")} ₺).`
          );

        // 1) Real cash/bank record — feeds Ödemeler & Kasa.
        const { data: cash, error: cashErr } = await db
          .from("cash_payments")
          .insert({
            user_id: user.id,
            payment_date: input.paymentDate,
            recipient: order.supplier_name,
            category: "Satın Alma",
            project_id: order.project_id,
            amount: input.amount,
            payment_type: input.method,
            status: input.method === "Çek" || input.method === "Senet" ? "Bekliyor" : "Ödendi",
            description:
              input.description || `${order.order_no} sipariş ödemesi`,
            account_id: input.accountId ?? null,
            check_no: input.checkNo ?? null,
            check_bank: input.checkBank ?? null,
            check_due_date: input.checkDueDate ?? null,
            source_type: "purchase_order",
            source_id: order.id,
          })
          .select("id")
          .single();
        if (cashErr) throw cashErr;

        // 2) Bank/cash account balance effect.
        if (input.accountId) {
          const { data: acc } = await db
            .from("cash_accounts")
            .select("balance")
            .eq("id", input.accountId)
            .maybeSingle();
          if (acc)
            await db
              .from("cash_accounts")
              .update({ balance: Number(acc.balance || 0) - input.amount })
              .eq("id", input.accountId);
        }

        // 3) Order-side allocation.
        const { error: allocErr } = await db
          .from("purchase_order_payments")
          .insert({
            order_id: order.id,
            installment_id: input.installmentId ?? null,
            cash_payment_id: cash.id,
            account_id: input.accountId ?? null,
            amount: input.amount,
            currency: order.currency,
            payment_date: input.paymentDate,
            method: input.method,
            reference_no: input.referenceNo ?? null,
            description: input.description ?? null,
            created_by: actor,
          });
        if (allocErr) throw allocErr;

        // 4) Installment progress.
        if (input.installmentId) {
          const inst = order.installments.find((i) => i.id === input.installmentId);
          if (inst) {
            const paid = Number(inst.paid_amount || 0) + input.amount;
            await db
              .from("purchase_order_installments")
              .update({
                paid_amount: paid,
                status: paid >= inst.amount - 0.5 ? "Ödendi" : "Kısmen Ödendi",
              })
              .eq("id", inst.id);
          }
        }

        // 5) Project cost.
        if (order.project_id)
          await db.from("project_expenses").insert({
            user_id: user.id,
            project_id: order.project_id,
            category: "Satın Alma",
            description: `${order.order_no} · ${order.supplier_name}`,
            amount: input.amount,
            expense_date: input.paymentDate,
            source: "purchase_order",
          });

        await logEvent(order.id, "Ödeme kaydedildi", {
          detail: `${input.amount.toLocaleString("tr-TR")} ₺ · ${input.method}`,
          refTable: "cash_payments",
          refId: cash.id,
        });
        await syncStatuses(order.id);
        return true;
      },
      { success: "Ödeme kaydedildi ve kasa/banka bakiyesi güncellendi." }
    );

  /* ── Deliveries & goods receipt ────────────────────────── */

  const createDelivery = (order: PurchaseOrder, input: DeliveryInput) =>
    run(
      order.id,
      "add_delivery",
      async () => {
        const deliveryNo = `SVK-${String(order.deliveries.length + 1).padStart(2, "0")}`;
        const { data, error } = await db
          .from("purchase_order_deliveries")
          .insert({
            order_id: order.id,
            delivery_no: deliveryNo,
            carrier: input.carrier ?? null,
            vehicle_plate: input.vehicle_plate ?? null,
            driver_name: input.driver_name ?? null,
            waybill_no: input.waybill_no ?? null,
            dispatch_date: input.dispatch_date ?? null,
            expected_arrival: input.expected_arrival ?? null,
            project_id: order.project_id,
            warehouse_name: input.warehouse_name ?? null,
            status: input.status || "Hazırlanıyor",
            notes: input.notes ?? null,
            created_by: actor,
          })
          .select("id")
          .single();
        if (error) throw error;

        const lines = input.lines.filter((l) => l.delivered_quantity > 0);
        if (lines.length)
          await db.from("purchase_order_delivery_items").insert(
            lines.map((l) => ({
              delivery_id: data.id,
              order_item_id: l.order_item_id,
              delivered_quantity: l.delivered_quantity,
            }))
          );

        await logEvent(order.id, `Sevkiyat oluşturuldu (${deliveryNo})`, {
          to: input.status || "Hazırlanıyor",
          refTable: "purchase_order_deliveries",
          refId: data.id,
        });
        await syncStatuses(order.id);
        return true;
      },
      { success: "Sevkiyat kaydı oluşturuldu." }
    );

  const updateDeliveryStatus = (
    order: PurchaseOrder,
    deliveryId: string,
    status: OrderDeliveryStatus
  ) =>
    run(
      order.id,
      "add_delivery",
      async () => {
        const { error } = await db
          .from("purchase_order_deliveries")
          .update({
            status,
            actual_arrival:
              status === "Şantiyede" ? new Date().toISOString().slice(0, 10) : undefined,
          })
          .eq("id", deliveryId);
        if (error) throw error;
        await logEvent(order.id, `Sevkiyat durumu: ${status}`, {
          refTable: "purchase_order_deliveries",
          refId: deliveryId,
        });
        await syncStatuses(order.id);
        return true;
      },
      { success: `Sevkiyat durumu "${status}" olarak güncellendi.` }
    );

  const receiveGoods = (order: PurchaseOrder, input: ReceiptInput) =>
    run(
      order.id,
      "goods_receipt",
      async () => {
        if (!user) throw new Error("Oturum bulunamadı.");
        const delivery = order.deliveries.find((d) => d.id === input.deliveryId);
        if (!delivery) throw new Error("Sevkiyat kaydı bulunamadı.");
        if (order.receipts.some((r) => r.delivery_id === delivery.id))
          throw new Error("Bu sevkiyat için mal kabulü daha önce yapılmış.");

        const receiptNo = `MK-${order.order_no.split("-").slice(-1)[0]}-${String(
          order.receipts.length + 1
        ).padStart(2, "0")}`;
        const { data: receipt, error: recErr } = await db
          .from("purchase_order_receipts")
          .insert({
            order_id: order.id,
            delivery_id: delivery.id,
            receipt_no: receiptNo,
            received_by: input.received_by || actor,
            warehouse_name: input.warehouse_name ?? delivery.warehouse_name,
            discrepancy_note: input.discrepancy_note ?? null,
            created_by: actor,
          })
          .select("id")
          .single();
        if (recErr) throw recErr;

        let stockPosted = false;
        for (const line of input.lines) {
          const item = order.items.find((i) => i.id === line.order_item_id);
          if (!item) continue;
          const accepted = Math.max(line.accepted_quantity || 0, 0);
          const rejected = Math.max(line.rejected_quantity || 0, 0);
          const delivered = Math.min(
            item.quantity,
            Math.max(
              item.delivered_quantity,
              item.delivered_quantity + accepted + rejected
            )
          );

          await db
            .from("purchase_order_delivery_items")
            .update({
              accepted_quantity: accepted,
              rejected_quantity: rejected,
              damaged_quantity: line.damaged_quantity || 0,
              note: line.note ?? null,
            })
            .eq("delivery_id", delivery.id)
            .eq("order_item_id", item.id);

          await db
            .from("purchase_order_items")
            .update({
              delivered_quantity: delivered,
              accepted_quantity: Math.min(
                item.quantity,
                item.accepted_quantity + accepted
              ),
              rejected_quantity: item.rejected_quantity + rejected,
            })
            .eq("id", item.id);

          // Stock effect — accepted material quantities enter the warehouse.
          if (accepted > 0 && item.item_type === "malzeme") {
            let materialId = item.material_id;
            if (!materialId) {
              const { data: existing } = await db
                .from("materials")
                .select("id")
                .eq("name", item.name)
                .eq("project_id", order.project_id)
                .maybeSingle();
              if (existing?.id) materialId = existing.id;
              else {
                const { data: created } = await db
                  .from("materials")
                  .insert({
                    user_id: user.id,
                    project_id: order.project_id,
                    name: item.name,
                    unit: item.unit,
                    min_stock: 0,
                  })
                  .select("id")
                  .single();
                materialId = created?.id ?? null;
              }
              if (materialId)
                await db
                  .from("purchase_order_items")
                  .update({ material_id: materialId })
                  .eq("id", item.id);
            }
            if (materialId) {
              await db.from("material_entries").insert({
                user_id: user.id,
                material_id: materialId,
                entry_date: new Date().toISOString().slice(0, 10),
                quantity: accepted,
                unit_price: item.unit_price,
                total_amount: Math.round(accepted * item.unit_price * 100) / 100,
                supplier: order.supplier_name,
                waybill_no: delivery.waybill_no,
                note: `${order.order_no} · ${receiptNo}`,
                source_type: "purchase_order_receipt",
                source_id: receipt.id,
              });
              stockPosted = true;
            }
          }
        }

        await db
          .from("purchase_order_receipts")
          .update({
            stock_posted: stockPosted,
            stock_posted_at: stockPosted ? new Date().toISOString() : null,
          })
          .eq("id", receipt.id);

        await db
          .from("purchase_order_deliveries")
          .update({
            status: "Teslim Edildi",
            actual_arrival: new Date().toISOString().slice(0, 10),
          })
          .eq("id", delivery.id);

        await logEvent(order.id, `Mal kabulü yapıldı (${receiptNo})`, {
          detail: stockPosted ? "Stok girişi oluşturuldu" : "Stok girişi yok",
          refTable: "purchase_order_receipts",
          refId: receipt.id,
        });
        await syncStatuses(order.id);
        return true;
      },
      { success: "Mal kabulü tamamlandı, stok güncellendi." }
    );

  /* ── Supplier invoice ──────────────────────────────────── */

  const addInvoice = (order: PurchaseOrder, input: InvoiceInput) =>
    run(
      order.id,
      "add_invoice",
      async () => {
        const match = threeWayMatch(order, {
          subtotal: input.subtotal,
          vat_amount: input.vat_amount,
          total: input.total,
        });
        const allOk = match.every((m) => m.ok);
        const { data, error } = await db
          .from("purchase_order_invoices")
          .insert({
            order_id: order.id,
            invoice_no: input.invoice_no,
            invoice_date: input.invoice_date,
            due_date: input.due_date ?? null,
            subtotal: input.subtotal,
            vat_amount: input.vat_amount,
            withholding: input.withholding || 0,
            total: input.total,
            currency: order.currency,
            status: allOk ? "Eşleştirildi" : "İtirazlı",
            match_result: match,
            notes: input.notes ?? null,
            created_by: actor,
          })
          .select("id")
          .single();
        if (error)
          throw new Error(
            error.code === "23505"
              ? "Bu fatura numarası bu siparişe zaten eklenmiş."
              : error.message
          );
        await logEvent(order.id, `Fatura eklendi (${input.invoice_no})`, {
          detail: allOk ? "3'lü eşleştirme başarılı" : "Eşleştirme farkı var",
          refTable: "purchase_order_invoices",
          refId: data.id,
        });
        await syncStatuses(order.id);
        return true;
      },
      { success: "Fatura kaydedildi ve sipariş ile eşleştirildi." }
    );

  const find = useCallback(
    (id?: string | null) => orders.find((o) => o.id === id) ?? null,
    [orders]
  );

  const summaries = useMemo(
    () => new Map(orders.map((o) => [o.id, summarizeOrder(o)])),
    [orders]
  );

  return {
    orders,
    summaries,
    isLoading: query.isLoading,
    refetch: query.refetch,
    actor,
    role: license.role,
    canDo,
    pendingAction: (id: string) => pending[id] ?? null,
    isPending: (id: string, action?: OrderAction) =>
      action ? pending[id] === action : !!pending[id],
    find,
    createOrder,
    updateOrder,
    submitForApproval,
    approveOrder,
    rejectOrder,
    sendToSupplier,
    cancelOrder,
    deleteOrder,
    duplicateOrder,
    savePaymentPlan,
    recordPayment,
    createDelivery,
    updateDeliveryStatus,
    receiveGoods,
    addInvoice,
  };
};

type OrderDeliveryStatus = PurchaseOrder["deliveries"][number]["status"];

export type OrderWorkflow = ReturnType<typeof usePurchaseOrders>;
