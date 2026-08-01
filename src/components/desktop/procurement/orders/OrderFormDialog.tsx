// Satın Alma → Siparişler: create / edit order form dialog.
import { useEffect, useState } from "react";
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
import { computeTotals, fmtMoney, type PurchaseOrder } from "./orderModel";
import type { NewOrderItemInput, OrderWorkflow } from "./usePurchaseOrders";

interface Row extends NewOrderItemInput {}

const emptyRow = (): Row => ({
  name: "",
  quantity: 1,
  unit: "adet",
  unit_price: 0,
  vat_rate: 20,
  item_type: "malzeme",
});

export const OrderFormDialog = ({
  open,
  order,
  workflow,
  projectNames,
  supplierNames,
  onClose,
}: {
  open: boolean;
  /** null → create mode */
  order: PurchaseOrder | null;
  workflow: OrderWorkflow;
  projectNames: string[];
  supplierNames: string[];
  onClose: () => void;
}) => {
  const [supplier, setSupplier] = useState("");
  const [project, setProject] = useState("");
  const [category, setCategory] = useState("");
  const [eta, setEta] = useState("");
  const [terms, setTerms] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);

  useEffect(() => {
    if (!open) return;
    setSupplier(order?.supplier_name ?? "");
    setProject(order?.project_name ?? "");
    setCategory(order?.category ?? "");
    setEta(order?.expected_delivery_date ?? "");
    setTerms(order?.payment_terms ?? "");
    setAddress(order?.delivery_address ?? "");
    setContact(order?.delivery_contact ?? "");
    setDiscount(Number(order?.discount ?? 0));
    setNotes(order?.notes ?? "");
    setRows(
      order?.items?.length
        ? order.items.map((i) => ({
            name: i.name,
            description: i.description ?? undefined,
            item_type: i.item_type,
            material_id: i.material_id,
            quantity: Number(i.quantity),
            unit: i.unit,
            unit_price: Number(i.unit_price),
            vat_rate: Number(i.vat_rate),
            warehouse_name: i.warehouse_name,
            cost_code: i.cost_code,
          }))
        : [emptyRow()]
    );
  }, [open, order]);

  const valid =
    supplier.trim().length > 1 &&
    rows.some((r) => r.name.trim() && r.quantity > 0 && r.unit_price >= 0);
  const totals = computeTotals(rows, discount);
  const busy = workflow.isPending(order?.id ?? "new");

  const save = async () => {
    const items = rows.filter((r) => r.name.trim() && r.quantity > 0);
    if (order) {
      const ok = await workflow.updateOrder(
        order,
        {
          supplier_name: supplier.trim(),
          project_name: project || null,
          category: category || null,
          expected_delivery_date: eta || null,
          payment_terms: terms || null,
          delivery_address: address || null,
          delivery_contact: contact || null,
          discount,
          notes: notes || null,
        },
        items
      );
      if (ok) onClose();
      return;
    }
    const created = await workflow.createOrder({
      supplier_name: supplier.trim(),
      project_name: project || null,
      category: category || null,
      expected_delivery_date: eta || null,
      payment_terms: terms || null,
      delivery_address: address || null,
      delivery_contact: contact || null,
      discount,
      notes: notes || null,
      items,
    });
    if (created) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {order ? `Siparişi Düzenle · ${order.order_no}` : "Yeni Sipariş"}
          </DialogTitle>
          <DialogDescription>
            Sipariş taslak olarak kaydedilir; onay sonrası tedarikçiye gönderilir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-fs-xs">Tedarikçi *</Label>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                list="po-suppliers"
                placeholder="Firma adı"
              />
              <datalist id="po-suppliers">
                {supplierNames.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <Label className="text-fs-xs">Proje</Label>
              <Select value={project || "none"} onValueChange={(v) => setProject(v === "none" ? "" : v)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Proje seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Proje seçilmedi</SelectItem>
                  {projectNames.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-fs-xs">Kategori</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div>
              <Label className="text-fs-xs">Teslim Tarihi</Label>
              <Input type="date" value={eta} onChange={(e) => setEta(e.target.value)} />
            </div>
            <div>
              <Label className="text-fs-xs">Ödeme Şartı</Label>
              <Input
                value={terms}
                placeholder="Örn. %40 avans, kalan 30 gün vadeli"
                onChange={(e) => setTerms(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-fs-xs">Teslim Adresi</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <Label className="text-fs-xs">Teslim Yetkilisi</Label>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
            <div>
              <Label className="text-fs-xs">İskonto (₺)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-fs-xs">Kalemler *</Label>
            {rows.map((row, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border p-2 bg-muted/20 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Kalem adı"
                    value={row.name}
                    onChange={(e) =>
                      setRows(
                        rows.map((r, i) =>
                          i === idx ? { ...r, name: e.target.value } : r
                        )
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setRows(rows.length > 1 ? rows.filter((_, i) => i !== idx) : rows)
                    }
                    className="text-muted-foreground hover:text-red-400 p-2"
                    aria-label="Kalemi kaldır"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Miktar"
                    value={row.quantity}
                    onChange={(e) =>
                      setRows(
                        rows.map((r, i) =>
                          i === idx ? { ...r, quantity: Number(e.target.value) } : r
                        )
                      )
                    }
                  />
                  <Input
                    placeholder="Birim"
                    value={row.unit}
                    onChange={(e) =>
                      setRows(
                        rows.map((r, i) =>
                          i === idx ? { ...r, unit: e.target.value } : r
                        )
                      )
                    }
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Birim fiyat"
                    value={row.unit_price}
                    onChange={(e) =>
                      setRows(
                        rows.map((r, i) =>
                          i === idx ? { ...r, unit_price: Number(e.target.value) } : r
                        )
                      )
                    }
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="KDV %"
                    value={row.vat_rate}
                    onChange={(e) =>
                      setRows(
                        rows.map((r, i) =>
                          i === idx ? { ...r, vat_rate: Number(e.target.value) } : r
                        )
                      )
                    }
                  />
                  <Select
                    value={row.item_type ?? "malzeme"}
                    onValueChange={(v) =>
                      setRows(
                        rows.map((r, i) =>
                          i === idx ? { ...r, item_type: v as Row["item_type"] } : r
                        )
                      )
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="malzeme">Malzeme</SelectItem>
                      <SelectItem value="hizmet">Hizmet</SelectItem>
                      <SelectItem value="kiralama">Kiralama</SelectItem>
                      <SelectItem value="diger">Diğer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setRows([...rows, emptyRow()])}
            >
              <Plus className="w-4 h-4 mr-1" /> Kalem Ekle
            </Button>
          </div>

          <div>
            <Label className="text-fs-xs">Not</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="rounded-lg border border-border p-3 text-fs-sm space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Ara toplam</span>
              <span className="text-foreground">{fmtMoney(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>KDV</span>
              <span className="text-foreground">{fmtMoney(totals.vat_amount)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Genel toplam</span>
              <span className="text-[#FF6B2B]">{fmtMoney(totals.total)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button disabled={!valid || busy} onClick={save}>
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {order ? "Değişiklikleri Kaydet" : "Siparişi Oluştur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
