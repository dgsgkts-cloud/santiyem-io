// DEPO FAZ 1 — Mal Kabulü ve Malzeme Çıkışı işlem diyalogları.
//
// Her iki işlem de sunucu tarafı fonksiyonlara yazar; birim uyumu, negatif stok
// ve mükerrer belge kontrolleri veritabanında yapılır ve hatası burada gösterilir.

import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useInventoryLedger } from "@/hooks/useInventoryLedger";
import { fmtQty } from "./inventoryTruth";
import type { WarehouseData } from "./useWarehouseData";

export type StockActionKind = "receipt" | "issue" | null;

const today = () => new Date().toISOString().slice(0, 10);

const errText = (e: unknown) =>
  (e as any)?.message?.replace(/^.*?:\s?/, "") || "İşlem tamamlanamadı.";

export const StockActionDialog = ({
  kind, onClose, data, presetMaterialId,
}: {
  kind: StockActionKind;
  onClose: () => void;
  data: WarehouseData;
  presetMaterialId?: string | null;
}) => {
  const { warehouses, postGoodsReceipt, postStockIssue, ensureDefaultWarehouse } = useInventoryLedger();
  const isReceipt = kind === "receipt";

  const activeWarehouses = warehouses.filter((w) => w.is_active);
  const [materialId, setMaterialId] = useState(presetMaterialId ?? "");
  const [warehouseId, setWarehouseId] = useState(activeWarehouses[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [document, setDocument] = useState("");
  const [reason, setReason] = useState("");
  const [person, setPerson] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(today());
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () => data.stockItems.filter((i) => i.unitVerdict.ok).sort((a, b) => a.name.localeCompare(b.name, "tr")),
    [data.stockItems],
  );
  const selected = options.find((i) => i.id === materialId) ?? null;
  const wh = warehouseId || activeWarehouses[0]?.id || "";

  const available = useMemo(() => {
    if (!selected || !wh) return null;
    const row = data.warehouseStock.find((s) => s.materialId === selected.id && s.warehouseId === wh);
    return row ? row.onHand : 0;
  }, [selected, wh, data.warehouseStock]);

  const qty = Number(quantity.replace(",", "."));
  const qtyValid = Number.isFinite(qty) && qty > 0;
  const overIssue = !isReceipt && available !== null && qtyValid && qty > available;
  const busy = postGoodsReceipt.isPending || postStockIssue.isPending || ensureDefaultWarehouse.isPending;
  const canSubmit = !!selected && qtyValid && !overIssue && !busy;

  const submit = async () => {
    if (!selected) return;
    setError(null);
    try {
      let targetWarehouse = wh;
      if (!targetWarehouse) targetWarehouse = await ensureDefaultWarehouse.mutateAsync();

      if (isReceipt) {
        await postGoodsReceipt.mutateAsync({
          materialId: selected.id,
          warehouseId: targetWarehouse,
          quantity: qty,
          unit: selected.rawUnit || selected.unit || "adet",
          unitCost: unitCost ? Number(unitCost.replace(",", ".")) : null,
          supplier: supplier.trim() || null,
          projectId: selected.projectId || null,
          sourceDocument: document.trim() || null,
          notes: notes.trim() || null,
          transactionDate: date,
          manual: true,
          reason: reason.trim() || "yetkili manuel giriş",
        });
        toast.success("Mal kabulü kaydedildi", {
          description: `${selected.name} · ${fmtQty(qty)} ${selected.rawUnit}`,
        });
      } else {
        await postStockIssue.mutateAsync({
          materialId: selected.id,
          warehouseId: targetWarehouse,
          quantity: qty,
          unit: selected.rawUnit || selected.unit || "adet",
          movementType: "project_issue",
          reason: reason.trim() || null,
          projectId: selected.projectId || null,
          person: person.trim() || null,
          sourceDocument: document.trim() || null,
          notes: notes.trim() || null,
          transactionDate: date,
        });
        toast.success("Malzeme çıkışı kaydedildi", {
          description: `${selected.name} · ${fmtQty(qty)} ${selected.rawUnit}`,
        });
      }
      onClose();
    } catch (e) {
      const msg = errText(e);
      setError(msg);
      toast.error("İşlem kaydedilemedi", { description: msg });
    }
  };

  return (
    <Dialog open={kind !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isReceipt
              ? <ArrowDownToLine className="w-4 h-4 text-emerald-400 shrink-0" />
              : <ArrowUpFromLine className="w-4 h-4 text-rose-400 shrink-0" />}
            {isReceipt ? "Mal Kabulü" : "Malzeme Çıkışı"}
          </DialogTitle>
          <DialogDescription>
            {isReceipt
              ? "Depoya giren malzeme kaydı oluşturulur. Kayıt sonradan değiştirilemez, yalnızca ters kayıt ile düzeltilir."
              : "Depodan çıkan malzeme kaydı oluşturulur. Kullanılabilir stoktan fazlası çıkışa izin verilmez."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-fs-xs">Malzeme</Label>
            <Select value={materialId} onValueChange={setMaterialId}>
              <SelectTrigger className="min-h-[44px] text-base sm:text-fs-sm">
                <SelectValue placeholder="Malzeme seçin" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {options.length === 0 && (
                  <div className="px-3 py-2 text-fs-xs text-muted-foreground">
                    Birimi doğrulanmış stoklanabilir malzeme bulunmuyor.
                  </div>
                )}
                {options.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} · {i.rawUnit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-fs-xs">Depo</Label>
            <Select value={wh} onValueChange={setWarehouseId}>
              <SelectTrigger className="min-h-[44px] text-base sm:text-fs-sm">
                <SelectValue placeholder="Depo seçin" />
              </SelectTrigger>
              <SelectContent>
                {activeWarehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name} · {w.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeWarehouses.length === 0 && (
              <p className="text-fs-xs text-muted-foreground">
                Tanımlı depo yok. Kayıt sırasında Merkez Depo otomatik oluşturulur.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-fs-xs">
                Miktar {selected ? `(${selected.rawUnit})` : ""}
              </Label>
              <Input
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="min-h-[44px] text-base sm:text-fs-sm"
              />
              {!isReceipt && selected && available !== null && (
                <p className="text-fs-xs text-muted-foreground">
                  Kullanılabilir: {fmtQty(available)} {selected.rawUnit}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-fs-xs">{isReceipt ? "Birim fiyat (₺)" : "İşlem tarihi"}</Label>
              {isReceipt ? (
                <Input
                  inputMode="decimal"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="Bilinmiyorsa boş bırakın"
                  className="min-h-[44px] text-base sm:text-fs-sm"
                />
              ) : (
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="min-h-[44px] text-base sm:text-fs-sm"
                />
              )}
            </div>
          </div>

          {isReceipt ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-fs-xs">Tedarikçi</Label>
                <Input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="min-h-[44px] text-base sm:text-fs-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-fs-xs">İşlem tarihi</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="min-h-[44px] text-base sm:text-fs-sm"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-fs-xs">Teslim alan / kullanan</Label>
              <Input
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                className="min-h-[44px] text-base sm:text-fs-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-fs-xs">{isReceipt ? "İrsaliye / belge no" : "Talep / belge no"}</Label>
              <Input
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                className="min-h-[44px] text-base sm:text-fs-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-fs-xs">Sebep</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={isReceipt ? "yetkili manuel giriş" : "şantiye kullanımı"}
                className="min-h-[44px] text-base sm:text-fs-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-fs-xs">Açıklama</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-base sm:text-fs-sm"
            />
          </div>

          {(overIssue || error) && (
            <div className="flex items-start gap-2 p-2.5 rounded-card border border-rose-500/25 bg-rose-500/[0.06]">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-fs-xs text-rose-200/90">
                {overIssue
                  ? `Kullanılabilir stok yetersiz. Mevcut: ${fmtQty(available ?? 0)} ${selected?.rawUnit ?? ""}.`
                  : error}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="min-h-[44px]">Vazgeç</Button>
          <Button onClick={submit} disabled={!canSubmit} className="min-h-[44px]">
            {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {isReceipt ? "Mal Kabulünü Kaydet" : "Çıkışı Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StockActionDialog;
