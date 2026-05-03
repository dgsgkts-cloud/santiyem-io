import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useEInvoices, EInvoiceItem, generateInvoiceNo } from "@/hooks/useEInvoices";
import { useProjects } from "@/hooks/useProjects";
import { formatCurrencyFull } from "@/lib/formatCurrency";

const KDV_OPTIONS = [0, 1, 8, 10, 18, 20];
const DEFAULT_KDV = 20;

const emptyItem = (): EInvoiceItem => ({ description: "", quantity: 1, unit_price: 0, kdv_rate: DEFAULT_KDV });

interface Props {
  open: boolean;
  onClose: () => void;
}

const InvoiceWizard = ({ open, onClose }: Props) => {
  const { invoices, addInvoice } = useEInvoices();
  const { projects } = useProjects();

  const [direction, setDirection] = useState<"gelen" | "giden">("giden");
  const [invoiceType, setInvoiceType] = useState<"e_fatura" | "e_arsiv">("e_fatura");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [counterpartyTaxNo, setCounterpartyTaxNo] = useState("");
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<EInvoiceItem[]>([emptyItem()]);
  const [autoLink, setAutoLink] = useState(true);
  const [saving, setSaving] = useState(false);

  // Auto-generate invoice no when opened or direction changes
  useEffect(() => {
    if (open) {
      setInvoiceNo(generateInvoiceNo(direction, invoices));
    }
  }, [open, direction, invoices]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let kdv = 0;
    for (const it of items) {
      const line = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
      subtotal += line;
      kdv += line * (Number(it.kdv_rate) || 0) / 100;
    }
    return { subtotal, kdv, grand: subtotal + kdv };
  }, [items]);

  const updateItem = (idx: number, patch: Partial<EInvoiceItem>) => {
    setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };
  const removeItem = (idx: number) => {
    setItems(items.length > 1 ? items.filter((_, i) => i !== idx) : items);
  };
  const addItem = () => setItems([...items, emptyItem()]);

  const reset = () => {
    setDirection("giden");
    setInvoiceType("e_fatura");
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setDueDate("");
    setCounterpartyName("");
    setCounterpartyTaxNo("");
    setProjectId("");
    setDescription("");
    setItems([emptyItem()]);
    setAutoLink(true);
  };

  const handleSave = async () => {
    if (!counterpartyName.trim()) { toast.error("Karşı taraf zorunludur"); return; }
    if (totals.grand <= 0) { toast.error("Toplam tutar 0'dan büyük olmalı"); return; }
    setSaving(true);
    const r = await addInvoice({
      direction,
      invoice_type: invoiceType,
      invoice_no: invoiceNo,
      invoice_date: invoiceDate,
      due_date: dueDate || undefined,
      counterparty_name: counterpartyName.trim(),
      counterparty_tax_no: counterpartyTaxNo.trim() || undefined,
      subtotal: Number(totals.subtotal.toFixed(2)),
      kdv_total: Number(totals.kdv.toFixed(2)),
      grand_total: Number(totals.grand.toFixed(2)),
      description: description.trim() || undefined,
      project_id: projectId || undefined,
      items,
      source: "manuel",
    }, { autoLinkToCash: autoLink });
    setSaving(false);
    if (r) {
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni Fatura</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Üst bilgi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Yön</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="giden">Giden (Satış / Tahsilat)</SelectItem>
                  <SelectItem value="gelen">Gelen (Alış / Gider)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Fatura Tipi</Label>
              <Select value={invoiceType} onValueChange={(v) => setInvoiceType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="e_fatura">E-Fatura</SelectItem>
                  <SelectItem value="e_arsiv">E-Arşiv</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Fatura No</Label>
              <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Fatura Tarihi</Label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Vade Tarihi</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">{direction === "giden" ? "Müşteri *" : "Tedarikçi *"}</Label>
              <Input value={counterpartyName} onChange={(e) => setCounterpartyName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">VKN/TCKN</Label>
              <Input value={counterpartyTaxNo} onChange={(e) => setCounterpartyTaxNo(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Proje (opsiyonel)</Label>
              <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Proje yok</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Kalemler */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Fatura Kalemleri</Label>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="w-3 h-3 mr-1" /> Kalem Ekle
              </Button>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-[11px] uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-2 py-2">Açıklama</th>
                    <th className="text-right px-2 py-2 w-20">Miktar</th>
                    <th className="text-right px-2 py-2 w-28">Birim Fiyat</th>
                    <th className="text-right px-2 py-2 w-20">KDV %</th>
                    <th className="text-right px-2 py-2 w-28">Tutar</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const line = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
                    const lineWithKdv = line * (1 + (Number(it.kdv_rate) || 0) / 100);
                    return (
                      <tr key={idx} className="border-t border-border">
                        <td className="px-2 py-1">
                          <Input
                            value={it.description}
                            onChange={(e) => updateItem(idx, { description: e.target.value })}
                            placeholder="Mal/hizmet açıklaması"
                            className="h-8 text-sm"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            type="number"
                            value={it.quantity}
                            onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                            className="h-8 text-sm text-right"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            type="number"
                            value={it.unit_price}
                            onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })}
                            className="h-8 text-sm text-right"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Select
                            value={String(it.kdv_rate)}
                            onValueChange={(v) => updateItem(idx, { kdv_rate: Number(v) })}
                          >
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {KDV_OPTIONS.map((r) => <SelectItem key={r} value={String(r)}>%{r}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1 text-right text-xs font-medium">
                          {formatCurrencyFull(lineWithKdv)}
                        </td>
                        <td className="px-2 py-1">
                          <button
                            onClick={() => removeItem(idx)}
                            disabled={items.length === 1}
                            className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Açıklama */}
          <div>
            <Label className="text-xs">Açıklama / Not</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opsiyonel" />
          </div>

          {/* Toplamlar */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Matrah</span>
              <span className="font-medium">{formatCurrencyFull(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">KDV</span>
              <span className="font-medium">{formatCurrencyFull(totals.kdv)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-border text-base">
              <span className="font-semibold">Genel Toplam</span>
              <span className="font-bold text-primary">{formatCurrencyFull(totals.grand)}</span>
            </div>
          </div>

          {/* Auto link */}
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox checked={autoLink} onCheckedChange={(v) => setAutoLink(!!v)} />
            <span>
              Kaydedince Kasa & Ödemeler'e otomatik
              {direction === "giden" ? " tahsilat" : " gider"} olarak işle
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" onClick={onClose} disabled={saving}>Vazgeç</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Kaydediliyor…" : "Faturayı Kaydet"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceWizard;
