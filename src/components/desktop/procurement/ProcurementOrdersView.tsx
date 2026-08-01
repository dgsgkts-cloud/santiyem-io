// Satın Alma → Siparişler: operational orders workspace.
import { useMemo, useState } from "react";
import { Building2, Calendar, FileText, Plus, Search, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState, ResponsiveGrid } from "@/components/ui/responsive";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DELIVERY_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  fmtDate,
  fmtMoney,
  summarizeOrder,
  type OrderAction,
  type PurchaseOrder,
} from "./orderModel";
import {
  DeliveryStatusPill,
  InvoiceStatusPill,
  OrderCardSkeleton,
  OrderStatusPill,
  PaymentProgress,
  PaymentStatusPill,
} from "./orderUi";
import { OrderActionBar } from "./OrderActionBar";
import type { OrderWorkflow } from "./usePurchaseOrders";

interface Props {
  workflow: OrderWorkflow;
  onAction: (action: OrderAction, order: PurchaseOrder) => void;
  onCreate: () => void;
  projectNames: string[];
}

const ALL = "all";

export const ProcurementOrdersView = ({
  workflow,
  onAction,
  onCreate,
  projectNames,
}: Props) => {
  const [query, setQuery] = useState("");
  const [orderStatus, setOrderStatus] = useState(ALL);
  const [paymentStatus, setPaymentStatus] = useState(ALL);
  const [deliveryStatus, setDeliveryStatus] = useState(ALL);
  const [project, setProject] = useState(ALL);
  const [supplier, setSupplier] = useState(ALL);

  const supplierOptions = useMemo(
    () => Array.from(new Set(workflow.orders.map((o) => o.supplier_name))).sort(),
    [workflow.orders]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return workflow.orders.filter((o) => {
      if (orderStatus !== ALL && o.order_status !== orderStatus) return false;
      if (paymentStatus !== ALL && o.payment_status !== paymentStatus) return false;
      if (deliveryStatus !== ALL && o.delivery_status !== deliveryStatus) return false;
      if (project !== ALL && (o.project_name ?? "") !== project) return false;
      if (supplier !== ALL && o.supplier_name !== supplier) return false;
      if (!q) return true;
      return [
        o.order_no,
        o.supplier_name,
        o.project_name,
        o.purchase_request_no,
        o.rfq_no,
        o.category,
        ...o.items.map((i) => i.name),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLocaleLowerCase("tr").includes(q));
    });
  }, [workflow.orders, query, orderStatus, paymentStatus, deliveryStatus, project, supplier]);

  const totals = useMemo(() => {
    const acc = { total: 0, paid: 0, remaining: 0, late: 0 };
    filtered.forEach((o) => {
      const s = summarizeOrder(o);
      acc.total += s.total;
      acc.paid += s.paid;
      acc.remaining += s.remaining;
      if (s.isLate) acc.late += 1;
    });
    return acc;
  }, [filtered]);

  if (workflow.isLoading)
    return (
      <ResponsiveGrid variant="auto" minItemWidth={300} className="gap-3">
        {[0, 1, 2, 3].map((i) => (
          <OrderCardSkeleton key={i} />
        ))}
      </ResponsiveGrid>
    );

  return (
    <div className="space-y-3">
      {/* Operational header */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sipariş no, tedarikçi, proje, kalem ara"
              className="pl-9"
              aria-label="Siparişlerde ara"
            />
          </div>
          <Button onClick={onCreate} className="min-h-[40px] shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Yeni Sipariş
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          <Select value={orderStatus} onValueChange={setOrderStatus}>
            <SelectTrigger className="h-10 text-fs-xs">
              <SelectValue placeholder="Sipariş durumu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm sipariş durumları</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentStatus} onValueChange={setPaymentStatus}>
            <SelectTrigger className="h-10 text-fs-xs">
              <SelectValue placeholder="Ödeme durumu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm ödeme durumları</SelectItem>
              {PAYMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
            <SelectTrigger className="h-10 text-fs-xs">
              <SelectValue placeholder="Teslimat durumu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm teslimat durumları</SelectItem>
              {DELIVERY_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={project} onValueChange={setProject}>
            <SelectTrigger className="h-10 text-fs-xs">
              <SelectValue placeholder="Proje" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm projeler</SelectItem>
              {projectNames.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={supplier} onValueChange={setSupplier}>
            <SelectTrigger className="h-10 text-fs-xs">
              <SelectValue placeholder="Tedarikçi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tüm tedarikçiler</SelectItem>
              {supplierOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-fs-xs text-muted-foreground border-t border-border pt-2">
          <span>
            {filtered.length} sipariş ·{" "}
            <span className="text-foreground font-medium">
              {fmtMoney(totals.total)}
            </span>
          </span>
          <span>
            Ödenen{" "}
            <span className="text-emerald-400 font-medium">
              {fmtMoney(totals.paid)}
            </span>
          </span>
          <span>
            Kalan{" "}
            <span className="text-amber-400 font-medium">
              {fmtMoney(totals.remaining)}
            </span>
          </span>
          {totals.late > 0 && (
            <span className="text-red-400">{totals.late} gecikmiş teslimat</span>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={
            workflow.orders.length === 0
              ? "Henüz sipariş oluşturulmadı"
              : "Filtreye uyan sipariş yok"
          }
          description={
            workflow.orders.length === 0
              ? "Onaylanan taleplerden sipariş oluşturun veya doğrudan yeni sipariş girin."
              : "Arama ve filtreleri temizleyerek tekrar deneyin."
          }
          action={
            workflow.orders.length === 0
              ? { label: "Yeni Sipariş", onClick: onCreate }
              : {
                  label: "Filtreleri Temizle",
                  onClick: () => {
                    setQuery("");
                    setOrderStatus(ALL);
                    setPaymentStatus(ALL);
                    setDeliveryStatus(ALL);
                    setProject(ALL);
                    setSupplier(ALL);
                  },
                }
          }
        />
      ) : (
        <ResponsiveGrid variant="auto" minItemWidth={340} className="gap-3">
          {filtered.map((order) => {
            const s = summarizeOrder(order);
            return (
              <div
                key={order.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3 transition-colors hover:border-border/70"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => onAction("detail", order)}
                    className="text-left min-w-0 flex-1"
                  >
                    <div className="text-fs-xs font-mono text-muted-foreground truncate">
                      {order.order_no}
                      {order.purchase_request_no
                        ? ` · ${order.purchase_request_no}`
                        : ""}
                    </div>
                    <div className="text-foreground text-fs-sm font-semibold truncate mt-0.5">
                      {order.supplier_name}
                    </div>
                    <div className="text-fs-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 min-w-0">
                      <Building2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {order.project_name ?? "Proje atanmadı"}
                      </span>
                    </div>
                  </button>
                  <div className="text-right shrink-0">
                    <div className="text-foreground text-fs-sm font-semibold">
                      {fmtMoney(order.total, order.currency)}
                    </div>
                    <div className="text-fs-xs text-muted-foreground">
                      {order.items.length} kalem
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <OrderStatusPill status={order.order_status} />
                  <PaymentStatusPill status={order.payment_status} />
                  <DeliveryStatusPill status={order.delivery_status} />
                  <InvoiceStatusPill status={order.invoice_status} />
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-fs-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Sipariş{" "}
                    {fmtDate(order.order_date)}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      s.isLate && "text-red-400"
                    )}
                  >
                    <Truck className="w-3 h-3" />
                    {order.expected_delivery_date
                      ? s.isLate
                        ? `${Math.abs(s.etaDays ?? 0)} gün gecikme`
                        : `Teslim ${fmtDate(order.expected_delivery_date)}`
                      : "Teslim tarihi yok"}
                  </span>
                  {s.nextInstallment && (
                    <span>
                      Sonraki ödeme {fmtDate(s.nextInstallment.due_date)} ·{" "}
                      {fmtMoney(
                        Number(s.nextInstallment.amount) -
                          Number(s.nextInstallment.paid_amount),
                        order.currency
                      )}
                    </span>
                  )}
                </div>

                <PaymentProgress
                  paid={s.paid}
                  total={s.total}
                  currency={order.currency}
                  overdue={s.overdueInstallments.length > 0}
                />

                <OrderActionBar
                  order={order}
                  workflow={workflow}
                  onAction={onAction}
                />
              </div>
            );
          })}
        </ResponsiveGrid>
      )}
    </div>
  );
};

export default ProcurementOrdersView;
