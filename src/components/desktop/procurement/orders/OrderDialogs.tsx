// Satın Alma → Siparişler: action dialogs (payment plan, payment, delivery,
// goods receipt, invoice, approval, cancel). Every dialog performs a real write.
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCashAccounts } from "@/hooks/useCashAccounts";
import {
  INSTALLMENT_TYPES,
  PAYMENT_METHODS,
  fmtMoney,
  summarizeOrder,
  type PurchaseOrder,
} from "./orderModel";
import type { OrderWorkflow } from "./usePurchaseOrders";

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const Busy = ({ busy, children }: { busy: boolean; children: React.ReactNode }) => (
  <>
    {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
    {children}
  </>
);

/* ── Payment plan ──────────────────────────────────────────── */

interface PlanRow {
  payment_type: string;
  due_date: string;
  amount: number;
  percentage: number | null;
  condition_note: string;
  planned_account_id: string | null;
}

export const PaymentPlanDialog = ({
  order,
  open,
  workflow,
  onClose,
}: {
  order: PurchaseOrder | null;
  open: boolean;
  workflow: OrderWorkflow;
  onClose: () => void;
}) => {
  const { accounts } = useCashAccounts();
  const [rows, setRows] = useState<PlanRow[]>([]);

  useEffect(() => {
    if (!order || !open) return;
    setRows(
      order.installments.length
        ? order.installments.map((i) => ({
            payment_type: i.payment_type,
            due_date: i.due_date,
            amount: Number(i.amount),
            percentage: i.percentage,
            condition_note: i.condition_note ?? "",
            planned_account_id: i.planned_account_id,
          }))
        : [
            {
              payment_type: "Avans",
              due_date: today(),
              amount: Math.round(order.total * 0.4),
              percentage: 40,
              condition_note: "Sipariş onayında",
              planned_account_id: null,
            },
            {
              payment_type: "Mal Kabulünde",
              due_date: order.expected_delivery_date || addDays(30),
              amount: order.total - Math.round(order.total * 0.4),
              percentage: 60,
              condition_note: "Mal kabulü sonrası",
              planned_account_id: null,
            },
          ]
    );
  }, [order, open]);

  if (!order) return null;
  const planned = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const diff = Math.round((order.total - planned) * 100) / 100;
  const busy = workflow.isPending(order.id, "plan_payment");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ödeme Planı · {order.order_no}</DialogTitle>
          <DialogDescription>
            {order.supplier_name} · Sipariş tutarı{" "}
            {fmtMoney(order.total, order.currency)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-border p-3 space-y-2 bg-muted/20"
            >
              <div className="flex items-center justify-between">
                <span className="text-fs-sm font-medium text-foreground">
                  {idx + 1}. Taksit
                </span>
                <button
                  type="button"
                  onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                  className="text-muted-foreground hover:text-red-400"
                  aria-label="Taksiti kaldır"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <Label className="text-fs-xs">Tür</Label>
                  <Select
                    value={row.payment_type}
                    onValueChange={(v) =>
                      setRows(
                        rows.map((r, i) =>
                          i === idx ? { ...r, payment_type: v } : r
                        )
                      )
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTALLMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-fs-xs">Vade</Label>
                  <Input
                    type="date"
                    value={row.due_date}
                    onChange={(e) =>
                      setRows(
                        rows.map((r, i) =>
                          i === idx ? { ...r, due_date: e.target.value } : r
                        )
                      )
                    }
                  />
                </div>
                <div>
                  <Label className="text-fs-xs">Tutar (₺)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={row.amount}
                    onChange={(e) =>
                      setRows(
                        rows.map((r, i) =>
                          i === idx
                            ? {
                                ...r,
                                amount: Number(e.target.value),
                                percentage:
                                  order.total > 0
                                    ? Math.round(
                                        (Number(e.target.value) / order.total) * 100
                                      )
                                    : null,
                              }
                            : r
                        )
                      )
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-fs-xs">Koşul</Label>
                  <Input
                    value={row.condition_note}
                    placeholder="Örn. sevkiyat sonrası 15 gün"
                    onChange={(e) =>
                      setRows(
                        rows.map((r, i) =>
                          i === idx ? { ...r, condition_note: e.target.value } : r
                        )
                      )
                    }
                  />
                </div>
                <div>
                  <Label className="text-fs-xs">Planlanan Hesap</Label>
                  <Select
                    value={row.planned_account_id ?? "none"}
                    onValueChange={(v) =>
                      setRows(
                        rows.map((r, i) =>
                          i === idx
                            ? { ...r, planned_account_id: v === "none" ? null : v }
                            : r
                        )
                      )
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Seçilmedi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seçilmedi</SelectItem>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setRows([
                ...rows,
                {
                  payment_type: "Vadeli",
                  due_date: addDays(30 * (rows.length + 1)),
                  amount: Math.max(diff, 0),
                  percentage: null,
                  condition_note: "",
                  planned_account_id: null,
                },
              ])
            }
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-1" /> Taksit Ekle
          </Button>

          <div className="flex items-center justify-between text-fs-sm rounded-lg border border-border p-3">
            <span className="text-muted-foreground">Planlanan toplam</span>
            <span
              className={
                Math.abs(diff) < 1 ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"
              }
            >
              {fmtMoney(planned, order.currency)}
              {Math.abs(diff) >= 1 &&
                ` · fark ${fmtMoney(Math.abs(diff), order.currency)}`}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button
            disabled={busy || rows.length === 0}
            onClick={async () => {
              const ok = await workflow.savePaymentPlan(
                order,
                rows.map((r, idx) => ({
                  installment_no: idx + 1,
                  payment_type: r.payment_type,
                  due_date: r.due_date,
                  amount: Number(r.amount),
                  currency: order.currency,
                  percentage: r.percentage,
                  condition_note: r.condition_note || null,
                  status: "Planlandı" as const,
                  planned_account_id: r.planned_account_id,
                }))
              );
              if (ok) onClose();
            }}
          >
            <Busy busy={busy}>Ödeme Planını Kaydet</Busy>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ── Record payment ────────────────────────────────────────── */

export const RecordPaymentDialog = ({
  order,
  open,
  workflow,
  onClose,
}: {
  order: PurchaseOrder | null;
  open: boolean;
  workflow: OrderWorkflow;
  onClose: () => void;
}) => {
  const { accounts } = useCashAccounts();
  const summary = order ? summarizeOrder(order) : null;
  const [installmentId, setInstallmentId] = useState("none");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<string>("Banka Havalesi");
  const [accountId, setAccountId] = useState("none");
  const [date, setDate] = useState(today());
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [checkNo, setCheckNo] = useState("");
  const [checkBank, setCheckBank] = useState("");
  const [checkDue, setCheckDue] = useState(addDays(30));

  useEffect(() => {
    if (!order || !open || !summary) return;
    const next = summary.nextInstallment;
    setInstallmentId(next?.id ?? "none");
    setAmount(
      next
        ? Math.min(Number(next.amount) - Number(next.paid_amount), summary.remaining)
        : summary.remaining
    );
    setAccountId(next?.planned_account_id ?? "none");
    setDescription(`${order.order_no} sipariş ödemesi`);
    setDate(today());
    setReference("");
  }, [order?.id, open]);

  if (!order || !summary) return null;
  const busy = workflow.isPending(order.id, "record_payment");
  const isCheque = method === "Çek" || method === "Senet";
  const invalid =
    amount <= 0 || amount > summary.remaining + 0.5 || (isCheque && !checkNo.trim());

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ödeme Kaydet · {order.order_no}</DialogTitle>
          <DialogDescription>
            {order.supplier_name} · Kalan borç{" "}
            <span className="text-foreground font-medium">
              {fmtMoney(summary.remaining, order.currency)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {order.installments.length > 0 && (
            <div>
              <Label className="text-fs-xs">Taksit</Label>
              <Select value={installmentId} onValueChange={(v) => {
                setInstallmentId(v);
                const inst = order.installments.find((i) => i.id === v);
                if (inst)
                  setAmount(
                    Math.min(
                      Number(inst.amount) - Number(inst.paid_amount),
                      summary.remaining
                    )
                  );
              }}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Taksite bağlama</SelectItem>
                  {order.installments
                    .filter((i) => i.status !== "Ödendi" && i.status !== "İptal")
                    .map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.installment_no}. {i.payment_type} ·{" "}
                        {fmtMoney(Number(i.amount) - Number(i.paid_amount), order.currency)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-fs-xs">Tutar (₺)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-fs-xs">Ödeme Tarihi</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-fs-xs">Yöntem</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-fs-xs">Kaynak Hesap</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Hesap seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Hesap seçilmedi</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} · {fmtMoney(Number(a.balance || 0))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isCheque && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-fs-xs">Çek/Senet No</Label>
                <Input value={checkNo} onChange={(e) => setCheckNo(e.target.value)} />
              </div>
              <div>
                <Label className="text-fs-xs">Banka</Label>
                <Input
                  value={checkBank}
                  onChange={(e) => setCheckBank(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-fs-xs">Vade</Label>
                <Input
                  type="date"
                  value={checkDue}
                  onChange={(e) => setCheckDue(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <Label className="text-fs-xs">Referans / Dekont No</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div>
            <Label className="text-fs-xs">Açıklama</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <p className="text-fs-xs text-muted-foreground">
            Kayıt sonrası: kasa/banka bakiyesi düşer, ödeme Ödemeler & Kasa
            ekranına, tutar proje maliyetine işlenir.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button
            disabled={busy || invalid}
            onClick={async () => {
              const ok = await workflow.recordPayment(order, {
                orderId: order.id,
                installmentId: installmentId === "none" ? null : installmentId,
                amount,
                method,
                accountId: accountId === "none" ? null : accountId,
                paymentDate: date,
                referenceNo: reference || undefined,
                description: description || undefined,
                checkNo: isCheque ? checkNo : undefined,
                checkBank: isCheque ? checkBank : undefined,
                checkDueDate: isCheque ? checkDue : undefined,
              });
              if (ok) onClose();
            }}
          >
            <Busy busy={busy}>
              {fmtMoney(amount || 0, order.currency)} Ödeme Kaydet
            </Busy>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ── Delivery ──────────────────────────────────────────────── */

export const DeliveryDialog = ({
  order,
  open,
  workflow,
  onClose,
}: {
  order: PurchaseOrder | null;
  open: boolean;
  workflow: OrderWorkflow;
  onClose: () => void;
}) => {
  const [carrier, setCarrier] = useState("");
  const [plate, setPlate] = useState("");
  const [driver, setDriver] = useState("");
  const [waybill, setWaybill] = useState("");
  const [dispatch, setDispatch] = useState(today());
  const [eta, setEta] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [status, setStatus] = useState<"Hazırlanıyor" | "Yolda" | "Şantiyede">("Yolda");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!order || !open) return;
    setLines(
      Object.fromEntries(
        order.items.map((i) => [
          i.id,
          Math.max(Number(i.quantity) - Number(i.delivered_quantity), 0),
        ])
      )
    );
    setEta(order.expected_delivery_date ?? "");
    setWarehouse(order.project_name ?? "");
  }, [order?.id, open]);

  if (!order) return null;
  const busy = workflow.isPending(order.id, "add_delivery");
  const totalQty = Object.values(lines).reduce((s, v) => s + (Number(v) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sevkiyat Ekle · {order.order_no}</DialogTitle>
          <DialogDescription>
            {order.supplier_name} · {order.project_name ?? "Proje atanmadı"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-fs-xs">Nakliyeci</Label>
              <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} />
            </div>
            <div>
              <Label className="text-fs-xs">Araç Plakası</Label>
              <Input value={plate} onChange={(e) => setPlate(e.target.value)} />
            </div>
            <div>
              <Label className="text-fs-xs">Şoför</Label>
              <Input value={driver} onChange={(e) => setDriver(e.target.value)} />
            </div>
            <div>
              <Label className="text-fs-xs">İrsaliye No</Label>
              <Input value={waybill} onChange={(e) => setWaybill(e.target.value)} />
            </div>
            <div>
              <Label className="text-fs-xs">Sevk Tarihi</Label>
              <Input
                type="date"
                value={dispatch}
                onChange={(e) => setDispatch(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-fs-xs">Tahmini Varış</Label>
              <Input type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
            </div>
            <div>
              <Label className="text-fs-xs">Teslim Yeri / Depo</Label>
              <Input
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-fs-xs">Durum</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hazırlanıyor">Hazırlanıyor</SelectItem>
                  <SelectItem value="Yolda">Yolda</SelectItem>
                  <SelectItem value="Şantiyede">Şantiyede</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-border divide-y divide-border">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-2">
                <div className="min-w-0 flex-1">
                  <div className="text-fs-sm text-foreground truncate">{item.name}</div>
                  <div className="text-fs-xs text-muted-foreground">
                    Sipariş {item.quantity} {item.unit} · Sevk edilen{" "}
                    {item.delivered_quantity} {item.unit}
                  </div>
                </div>
                <Input
                  type="number"
                  inputMode="decimal"
                  className="w-24"
                  value={lines[item.id] ?? 0}
                  onChange={(e) =>
                    setLines({ ...lines, [item.id]: Number(e.target.value) })
                  }
                />
              </div>
            ))}
          </div>

          <div>
            <Label className="text-fs-xs">Not</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button
            disabled={busy || totalQty <= 0}
            onClick={async () => {
              const ok = await workflow.createDelivery(order, {
                orderId: order.id,
                carrier,
                vehicle_plate: plate,
                driver_name: driver,
                waybill_no: waybill,
                dispatch_date: dispatch || undefined,
                expected_arrival: eta || undefined,
                warehouse_name: warehouse,
                status,
                notes,
                lines: order.items.map((i) => ({
                  order_item_id: i.id,
                  delivered_quantity: Number(lines[i.id] || 0),
                })),
              });
              if (ok) onClose();
            }}
          >
            <Busy busy={busy}>Sevkiyatı Kaydet</Busy>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ── Goods receipt ─────────────────────────────────────────── */

export const GoodsReceiptDialog = ({
  order,
  open,
  workflow,
  onClose,
  deliveryId,
}: {
  order: PurchaseOrder | null;
  open: boolean;
  workflow: OrderWorkflow;
  onClose: () => void;
  deliveryId?: string | null;
}) => {
  const pendingDeliveries = useMemo(
    () =>
      (order?.deliveries || []).filter(
        (d) =>
          d.status !== "İptal" &&
          !(order?.receipts || []).some((r) => r.delivery_id === d.id)
      ),
    [order]
  );
  const [selected, setSelected] = useState("");
  const [rows, setRows] = useState<
    Record<string, { accepted: number; rejected: number; note: string }>
  >({});
  const [note, setNote] = useState("");
  const [warehouse, setWarehouse] = useState("");

  useEffect(() => {
    if (!order || !open) return;
    const initial = deliveryId || pendingDeliveries[0]?.id || "";
    setSelected(initial);
  }, [order?.id, open, deliveryId, pendingDeliveries]);

  useEffect(() => {
    if (!order || !selected) return;
    const delivery = order.deliveries.find((d) => d.id === selected);
    setWarehouse(delivery?.warehouse_name ?? order.project_name ?? "");
    setRows(
      Object.fromEntries(
        (delivery?.items || []).map((li) => [
          li.order_item_id,
          { accepted: Number(li.delivered_quantity), rejected: 0, note: "" },
        ])
      )
    );
  }, [selected, order]);

  if (!order) return null;
  const delivery = order.deliveries.find((d) => d.id === selected);
  const busy = workflow.isPending(order.id, "goods_receipt");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mal Kabulü · {order.order_no}</DialogTitle>
          <DialogDescription>
            Kabul edilen malzemeler depo stoğuna işlenir ve sipariş teslim durumu
            güncellenir.
          </DialogDescription>
        </DialogHeader>

        {pendingDeliveries.length === 0 ? (
          <p className="text-fs-sm text-muted-foreground">
            Mal kabulü bekleyen sevkiyat yok. Önce sevkiyat kaydı oluşturun.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-fs-xs">Sevkiyat</Label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pendingDeliveries.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.delivery_no} · {d.status}
                      {d.waybill_no ? ` · İrsaliye ${d.waybill_no}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border divide-y divide-border">
              {(delivery?.items || []).map((li) => {
                const item = order.items.find((i) => i.id === li.order_item_id);
                if (!item) return null;
                const row = rows[li.order_item_id] || {
                  accepted: 0,
                  rejected: 0,
                  note: "",
                };
                return (
                  <div key={li.id} className="p-2 space-y-1.5">
                    <div className="text-fs-sm text-foreground">{item.name}</div>
                    <div className="text-fs-xs text-muted-foreground">
                      Sevk edilen {li.delivered_quantity} {item.unit}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-fs-xs">Kabul</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={row.accepted}
                          onChange={(e) =>
                            setRows({
                              ...rows,
                              [li.order_item_id]: {
                                ...row,
                                accepted: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-fs-xs">Red / Hasarlı</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={row.rejected}
                          onChange={(e) =>
                            setRows({
                              ...rows,
                              [li.order_item_id]: {
                                ...row,
                                rejected: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-fs-xs">Depo</Label>
                <Input
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-fs-xs">Tutanak Notu</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button
            disabled={busy || !selected}
            onClick={async () => {
              const ok = await workflow.receiveGoods(order, {
                orderId: order.id,
                deliveryId: selected,
                warehouse_name: warehouse,
                discrepancy_note: note || undefined,
                lines: Object.entries(rows).map(([order_item_id, r]) => ({
                  order_item_id,
                  accepted_quantity: Number(r.accepted || 0),
                  rejected_quantity: Number(r.rejected || 0),
                })),
              });
              if (ok) onClose();
            }}
          >
            <Busy busy={busy}>Mal Kabulünü Tamamla</Busy>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ── Supplier invoice ──────────────────────────────────────── */

export const InvoiceDialog = ({
  order,
  open,
  workflow,
  onClose,
}: {
  order: PurchaseOrder | null;
  open: boolean;
  workflow: OrderWorkflow;
  onClose: () => void;
}) => {
  const [no, setNo] = useState("");
  const [date, setDate] = useState(today());
  const [due, setDue] = useState(addDays(30));
  const [subtotal, setSubtotal] = useState(0);
  const [vat, setVat] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!order || !open) return;
    setNo("");
    setSubtotal(Number(order.subtotal));
    setVat(Number(order.vat_amount));
    setDate(today());
  }, [order?.id, open]);

  if (!order) return null;
  const busy = workflow.isPending(order.id, "add_invoice");
  const total = Math.round((subtotal + vat) * 100) / 100;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tedarikçi Faturası · {order.order_no}</DialogTitle>
          <DialogDescription>
            Fatura sipariş ve mal kabulü ile üçlü eşleştirmeye tabi tutulur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-fs-xs">Fatura No</Label>
              <Input value={no} onChange={(e) => setNo(e.target.value)} />
            </div>
            <div>
              <Label className="text-fs-xs">Fatura Tarihi</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-fs-xs">Vade</Label>
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
            <div>
              <Label className="text-fs-xs">Matrah (₺)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={subtotal}
                onChange={(e) => setSubtotal(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-fs-xs">KDV (₺)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={vat}
                onChange={(e) => setVat(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-fs-xs">Toplam</Label>
              <Input value={fmtMoney(total, order.currency)} readOnly />
            </div>
          </div>
          <div>
            <Label className="text-fs-xs">Not</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button
            disabled={busy || !no.trim() || total <= 0}
            onClick={async () => {
              const ok = await workflow.addInvoice(order, {
                orderId: order.id,
                invoice_no: no.trim(),
                invoice_date: date,
                due_date: due || undefined,
                subtotal,
                vat_amount: vat,
                total,
                notes: notes || undefined,
              });
              if (ok) onClose();
            }}
          >
            <Busy busy={busy}>Faturayı Kaydet</Busy>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ── Simple confirmations ──────────────────────────────────── */

export const ConfirmOrderDialog = ({
  order,
  open,
  title,
  description,
  confirmLabel,
  requireReason,
  busy,
  onCancel,
  onConfirm,
}: {
  order: PurchaseOrder | null;
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  requireReason?: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) => {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) setReason("");
  }, [open]);
  if (!order) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border p-3 text-fs-sm space-y-1">
          <div className="font-mono text-fs-xs text-muted-foreground">
            {order.order_no}
          </div>
          <div className="text-foreground">{order.supplier_name}</div>
          <div className="text-muted-foreground text-fs-xs">
            {order.project_name ?? "Proje atanmadı"} ·{" "}
            {fmtMoney(order.total, order.currency)}
          </div>
        </div>
        {requireReason && (
          <div>
            <Label className="text-fs-xs">Gerekçe (zorunlu)</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Kararın nedenini yazın"
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Vazgeç
          </Button>
          <Button
            disabled={busy || (requireReason && reason.trim().length < 3)}
            onClick={() => onConfirm(reason.trim())}
          >
            <Busy busy={busy}>{confirmLabel}</Busy>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
