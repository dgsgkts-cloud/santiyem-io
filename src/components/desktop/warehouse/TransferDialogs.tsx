// DEPO — transfer işlem diyalogları.
//
// Her form doğrudan ilgili sunucu fonksiyonunu çağırır; miktar, birim, stok ve
// yetki kontrolleri veritabanında yapılır ve hatası olduğu gibi gösterilir.

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useInventoryTransfers, type TransferRow } from "@/hooks/useInventoryTransfers";
import { useDepotPermissions } from "@/hooks/useDepotPermissions";
import {
  TRANSFER_ACTION_LABEL, REASON_REQUIRED, remainingToDispatch, transitQuantity,
  transferErrorText, type TransferAction,
} from "@/lib/inventory/transferModel";
import { fmtQty } from "./inventoryTruth";
import type { WarehouseData } from "./useWarehouseData";

const inputCls = "min-h-[44px] text-base sm:text-fs-sm";
const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

/* ───────────────────────── yeni transfer talebi ───────────────────────── */

export const CreateTransferDialog = ({
  open, onClose, data, presetMaterialId,
}: {
  open: boolean;
  onClose: () => void;
  data: WarehouseData;
  presetMaterialId?: string | null;
}) => {
  const { createTransfer } = useInventoryTransfers();
  const { permissions } = useDepotPermissions();
  const activeWarehouses = data.warehouses.filter((w) => w.isActive);

  const [materialId, setMaterialId] = useState(presetMaterialId ?? "");
  const [source, setSource] = useState("");
  const [dest, setDest] = useState("");
  const [quantity, setQuantity] = useState("");
  const [requiredAt, setRequiredAt] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [override, setOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setMaterialId(presetMaterialId ?? "");
  }, [open, presetMaterialId]);

  const options = useMemo(
    () => data.stockItems.filter((i) => i.unitVerdict.ok)
      .sort((a, b) => a.name.localeCompare(b.name, "tr")),
    [data.stockItems],
  );
  const selected = options.find((i) => i.id === materialId) ?? null;

  const onHand = useMemo(() => {
    if (!selected || !source) return null;
    const row = data.warehouseStock.find((s) => s.materialId === selected.id && s.warehouseId === source);
    return row ? row.onHand : 0;
  }, [selected, source, data.warehouseStock]);

  const qty = Number(quantity.replace(",", "."));
  const qtyValid = Number.isFinite(qty) && qty > 0;
  const sameWarehouse = !!source && source === dest;
  const overStock = onHand !== null && qtyValid && qty > onHand;
  const canSubmit = !!selected && !!source && !!dest && qtyValid && !sameWarehouse && !createTransfer.isPending;

  const submit = async () => {
    if (!selected) return;
    setError(null);
    try {
      const res: any = await createTransfer.mutateAsync({
        sourceWarehouseId: source,
        destWarehouseId: dest,
        materialId: selected.id,
        quantity: qty,
        unit: selected.rawUnit || selected.unit || "adet",
        requiredAt: requiredAt || null,
        reason: reason.trim() || null,
        notes: notes.trim() || null,
        projectId: selected.projectId || null,
        allowSafetyBreach: override && permissions.override_safety_stock,
      });
      toast.success("Transfer talebi oluşturuldu", {
        description: `${res?.transfer_no ?? ""} · ${selected.name} · ${fmtQty(qty)} ${selected.rawUnit}`,
      });
      setQuantity(""); setReason(""); setNotes(""); setOverride(false);
      onClose();
    } catch (e) {
      const msg = transferErrorText(e);
      setError(msg);
      toast.error("Transfer oluşturulamadı", { description: msg });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Depolar Arası Transfer Talebi</DialogTitle>
          <DialogDescription>
            Talep onaylandıktan sonra stok rezerve edilir; fiziksel stok yalnızca sevk anında düşer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-fs-xs">Malzeme</Label>
            <Select value={materialId} onValueChange={setMaterialId}>
              <SelectTrigger className={inputCls}><SelectValue placeholder="Malzeme seçin" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {options.length === 0 && (
                  <div className="px-3 py-2 text-fs-xs text-muted-foreground">
                    Birimi doğrulanmış stoklanabilir malzeme bulunmuyor.
                  </div>
                )}
                {options.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name} · {i.rawUnit}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-fs-xs">Kaynak depo</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>
                  {activeWarehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name} · {w.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selected && onHand !== null && (
                <p className="text-fs-xs text-muted-foreground">
                  Depodaki stok: {fmtQty(onHand)} {selected.rawUnit}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-fs-xs">Hedef depo</Label>
              <Select value={dest} onValueChange={setDest}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Seçin" /></SelectTrigger>
                <SelectContent>
                  {activeWarehouses.filter((w) => w.id !== source).map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name} · {w.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-fs-xs">Miktar {selected ? `(${selected.rawUnit})` : ""}</Label>
              <Input inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                placeholder="0" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-fs-xs">İhtiyaç tarihi</Label>
              <Input type="date" value={requiredAt} onChange={(e) => setRequiredAt(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-fs-xs">Sebep</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="şantiye ihtiyacı" className={inputCls} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-fs-xs">Açıklama</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="text-base sm:text-fs-sm" />
          </div>

          {permissions.override_safety_stock && (
            <label className="flex items-start gap-2 p-2.5 rounded-card border border-border/60 bg-background/40 cursor-pointer">
              <Checkbox checked={override} onCheckedChange={(v) => setOverride(v === true)} className="mt-0.5" />
              <span className="text-fs-xs text-muted-foreground">
                Güvenlik stoğunun altına düşmesine izin ver. Gerekçe kayda geçer.
              </span>
            </label>
          )}

          {(sameWarehouse || overStock || error) && (
            <div className="flex items-start gap-2 p-2.5 rounded-card border border-rose-500/25 bg-rose-500/[0.06]">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-fs-xs text-rose-200/90">
                {sameWarehouse
                  ? "Kaynak ve hedef depo aynı olamaz."
                  : overStock
                    ? `Kaynak depodaki stok yetersiz. Mevcut: ${fmtQty(onHand ?? 0)} ${selected?.rawUnit ?? ""}.`
                    : error}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="min-h-[44px]">Vazgeç</Button>
          <Button onClick={submit} disabled={!canSubmit} className="min-h-[44px]">
            {createTransfer.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Talebi Oluştur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ───────────────────── durum bazlı işlem diyalogları ───────────────────── */

const ACTION_COPY: Record<TransferAction, { title: string; desc: string }> = {
  approve: { title: "Transferi Onayla", desc: "Onaydan sonra miktar kaynak depoda rezerve edilir; fiziksel stok sevkte düşer." },
  reject: { title: "Transferi Reddet", desc: "Red sebebi talep sahibine bildirim olarak iletilir." },
  revise: { title: "Revizyon İste", desc: "Talep, düzeltilmek üzere talep sahibine geri döner." },
  dispatch: { title: "Sevk Et", desc: "Sevk edilen miktar kaynak depodan düşer ve yolda stoğa geçer." },
  receive: { title: "Teslim Al", desc: "Yalnızca kabul edilen miktar hedef depoya girer. Hasarlı, eksik ve reddedilen miktarlar uyuşmazlık olarak kaydedilir." },
  cancel: { title: "Transferi İptal Et", desc: "Sevk başlamadan önce iptal edilebilir. Stok hareketi oluşmaz." },
  return: { title: "Kaynağa İade", desc: "Yolda olan miktar kaynak depoya geri yazılır." },
};

export const TransferActionDialog = ({
  action, transfer, onClose, materialName,
}: {
  action: TransferAction | null;
  transfer: TransferRow | null;
  onClose: () => void;
  materialName: string;
}) => {
  const { decideTransfer, dispatchTransfer, receiveTransfer, cancelTransfer, returnTransfer, busy } =
    useInventoryTransfers();

  const [quantity, setQuantity] = useState("");
  const [damaged, setDamaged] = useState("");
  const [missing, setMissing] = useState("");
  const [rejected, setRejected] = useState("");
  const [reference, setReference] = useState("");
  const [when, setWhen] = useState(nowLocal());
  const [eta, setEta] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = action !== null && transfer !== null;
  const remaining = transfer ? remainingToDispatch(transfer) : 0;
  const transit = transfer ? transitQuantity(transfer) : 0;

  useEffect(() => {
    if (!open || !transfer || !action) return;
    setError(null); setReason(""); setNotes(""); setReference("");
    setDamaged(""); setMissing(""); setRejected(""); setEta("");
    setWhen(nowLocal());
    setQuantity(
      action === "dispatch" ? String(remaining)
        : action === "receive" ? String(transit)
          : action === "return" ? String(transit) : "",
    );
  }, [open, action, transfer?.id]);

  if (!open || !transfer || !action) return null;

  const num = (s: string) => {
    const v = Number(s.replace(",", "."));
    return Number.isFinite(v) ? v : NaN;
  };
  const qty = num(quantity || "0");
  const dmg = damaged ? num(damaged) : 0;
  const mis = missing ? num(missing) : 0;
  const rej = rejected ? num(rejected) : 0;
  const receiveTotal = qty + dmg + mis + rej;

  const needsQty = action === "dispatch" || action === "receive" || action === "return";
  const needsReason = REASON_REQUIRED.includes(action);
  const overRemaining = action === "dispatch" && qty > remaining;
  const overTransit =
    (action === "return" && qty > transit) || (action === "receive" && receiveTotal > transit);
  const qtyOk = !needsQty
    || (action === "receive"
      ? [qty, dmg, mis, rej].every((v) => Number.isFinite(v) && v >= 0) && receiveTotal > 0
      : Number.isFinite(qty) && qty > 0);

  const canSubmit = qtyOk && !overRemaining && !overTransit && (!needsReason || reason.trim().length > 0) && !busy;

  const submit = async () => {
    setError(null);
    try {
      if (action === "approve" || action === "reject" || action === "revise") {
        await decideTransfer.mutateAsync({
          transferId: transfer.id, decision: action, reason: reason.trim() || null,
        });
      } else if (action === "dispatch") {
        await dispatchTransfer.mutateAsync({
          transferId: transfer.id, quantity: qty, unit: transfer.unit,
          dispatchedAt: when ? new Date(when).toISOString() : null,
          expectedArrivalAt: eta ? new Date(eta).toISOString() : null,
          reference: reference.trim() || null, notes: notes.trim() || null,
        });
      } else if (action === "receive") {
        await receiveTransfer.mutateAsync({
          transferId: transfer.id, accepted: qty, damaged: dmg, missing: mis, rejected: rej,
          unit: transfer.unit, receivedAt: when ? new Date(when).toISOString() : null,
          reference: reference.trim() || null, notes: notes.trim() || null,
        });
      } else if (action === "cancel") {
        await cancelTransfer.mutateAsync({ transferId: transfer.id, reason: reason.trim() });
      } else {
        await returnTransfer.mutateAsync({
          transferId: transfer.id, quantity: qty, unit: transfer.unit, reason: reason.trim(),
        });
      }
      toast.success(`${TRANSFER_ACTION_LABEL[action]} tamamlandı`, {
        description: `${transfer.transfer_no} · ${materialName}`,
      });
      onClose();
    } catch (e) {
      const msg = transferErrorText(e);
      setError(msg);
      toast.error("İşlem kaydedilemedi", { description: msg });
    }
  };

  const copy = ACTION_COPY[action];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="p-2.5 rounded-card border border-border/60 bg-background/40 space-y-1">
            <p className="text-fs-sm text-foreground">{transfer.transfer_no} · {materialName}</p>
            <p className="text-fs-xs text-muted-foreground">
              Talep {fmtQty(transfer.requested_quantity)} {transfer.unit} ·
              {" "}Sevk {fmtQty(transfer.dispatched_quantity)} ·
              {" "}Yolda {fmtQty(transit)} ·
              {" "}Teslim {fmtQty(transfer.received_quantity)}
            </p>
          </div>

          {action === "dispatch" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-fs-xs">Sevk miktarı ({transfer.unit})</Label>
                  <Input inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputCls} />
                  <p className="text-fs-xs text-muted-foreground">Kalan: {fmtQty(remaining)} {transfer.unit}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-fs-xs">Sevk zamanı</Label>
                  <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-fs-xs">Tahmini varış</Label>
                  <Input type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-fs-xs">Sevk irsaliye no</Label>
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} className={inputCls} />
                </div>
              </div>
            </>
          )}

          {action === "receive" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-fs-xs">Kabul edilen ({transfer.unit})</Label>
                  <Input inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-fs-xs">Hasarlı</Label>
                  <Input inputMode="decimal" value={damaged} onChange={(e) => setDamaged(e.target.value)} placeholder="0" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-fs-xs">Eksik</Label>
                  <Input inputMode="decimal" value={missing} onChange={(e) => setMissing(e.target.value)} placeholder="0" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-fs-xs">Reddedilen</Label>
                  <Input inputMode="decimal" value={rejected} onChange={(e) => setRejected(e.target.value)} placeholder="0" className={inputCls} />
                </div>
              </div>
              <p className="text-fs-xs text-muted-foreground">
                Toplam işlenen {fmtQty(Number.isFinite(receiveTotal) ? receiveTotal : 0)} / yolda {fmtQty(transit)} {transfer.unit}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-fs-xs">Teslim zamanı</Label>
                  <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-fs-xs">Teslim belge no</Label>
                  <Input value={reference} onChange={(e) => setReference(e.target.value)} className={inputCls} />
                </div>
              </div>
            </>
          )}

          {action === "return" && (
            <div className="space-y-1.5">
              <Label className="text-fs-xs">İade miktarı ({transfer.unit})</Label>
              <Input inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputCls} />
              <p className="text-fs-xs text-muted-foreground">Yolda: {fmtQty(transit)} {transfer.unit}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-fs-xs">
              {needsReason ? "Sebep (zorunlu)" : "Not"}
            </Label>
            <Textarea
              value={needsReason ? reason : notes}
              onChange={(e) => (needsReason ? setReason(e.target.value) : setNotes(e.target.value))}
              rows={2}
              className="text-base sm:text-fs-sm"
            />
          </div>

          {(overRemaining || overTransit || error) && (
            <div className="flex items-start gap-2 p-2.5 rounded-card border border-rose-500/25 bg-rose-500/[0.06]">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-fs-xs text-rose-200/90">
                {overRemaining
                  ? `Sevk miktarı kalan ${fmtQty(remaining)} ${transfer.unit} miktarını aşıyor.`
                  : overTransit
                    ? `İşlenen miktar yolda olan ${fmtQty(transit)} ${transfer.unit} miktarını aşıyor.`
                    : error}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="min-h-[44px]">Vazgeç</Button>
          <Button
            onClick={submit}
            disabled={!canSubmit}
            variant={action === "reject" || action === "cancel" ? "destructive" : "default"}
            className="min-h-[44px]"
          >
            {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {TRANSFER_ACTION_LABEL[action]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
