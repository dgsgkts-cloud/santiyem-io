import { useState } from "react";
import { useContractItems, UNITS } from "@/hooks/useContractItems";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Upload, Save, X, Edit2, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0 }).format(n);

interface Props {
  contractId: string;
  onTotalChange?: (total: number) => void;
}

const emptyRow = () => ({ poz_no: "", description: "", unit: "adet", quantity: 0, unit_price: 0 });

export default function ContractItemsSection({ contractId, onTotalChange }: Props) {
  const { items, loading, addItem, updateItem, deleteItem, bulkInsert, grandTotal } = useContractItems(contractId);
  const [newRow, setNewRow] = useState(emptyRow());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState(emptyRow());
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");

  // Notify parent of total changes
  const prevTotal = items.reduce((s, i) => s + Number(i.total_price || 0), 0);
  if (onTotalChange && prevTotal !== grandTotal) {
    // defer to avoid render loop
    setTimeout(() => onTotalChange(grandTotal), 0);
  }

  const handleAdd = async () => {
    if (!newRow.description.trim()) { toast.error("İş kalemi tarifi zorunludur"); return; }
    await addItem(newRow);
    setNewRow(emptyRow());
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditRow({ poz_no: item.poz_no, description: item.description, unit: item.unit, quantity: item.quantity, unit_price: item.unit_price });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateItem(editingId, editRow);
    setEditingId(null);
  };

  const handleBulkImport = async () => {
    const lines = bulkText.trim().split("\n").filter(Boolean);
    const rows = lines.map(line => {
      const cols = line.split("\t").length > 1 ? line.split("\t") : line.split(",");
      return {
        poz_no: cols[0]?.trim() || "",
        description: cols[1]?.trim() || "",
        unit: cols[2]?.trim() || "adet",
        quantity: parseFloat(cols[3]?.trim() || "0") || 0,
        unit_price: parseFloat(cols[4]?.trim() || "0") || 0,
      };
    }).filter(r => r.description);

    if (!rows.length) { toast.error("Geçerli kalem bulunamadı"); return; }
    await bulkInsert(rows);
    setBulkText("");
    setShowBulk(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">İş Kalemleri ({items.length})</h3>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowBulk(!showBulk)} variant="outline" size="sm" className="h-8 text-xs">
            <ClipboardPaste className="w-3 h-3 mr-1" /> Toplu Ekle
          </Button>
        </div>
      </div>

      {/* Bulk import */}
      {showBulk && (
        <div className="rounded-lg p-3 space-y-2 bg-muted/50 border border-border">
          <p className="text-[10px] text-muted-foreground">
            Excel/CSV'den satırları yapıştırın. Kolon sırası: <strong>Poz No, Tarif, Birim, Miktar, Birim Fiyat</strong> (Tab veya virgül ile ayırın)
          </p>
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            rows={5}
            className="w-full rounded-lg px-3 py-2 text-xs outline-none bg-background border border-border text-foreground font-mono resize-y"
            placeholder={"23.001\tBeton C25/30 dökülmesi\tm³\t150\t850\n23.002\tKalıp işleri\tm²\t400\t120"}
          />
          <div className="flex gap-2">
            <Button onClick={handleBulkImport} size="sm" className="h-7 text-xs text-primary-foreground bg-primary hover:bg-primary/90">
              <Upload className="w-3 h-3 mr-1" /> İçe Aktar
            </Button>
            <Button onClick={() => { setShowBulk(false); setBulkText(""); }} variant="outline" size="sm" className="h-7 text-xs">İptal</Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left py-2.5 px-3 font-medium text-muted-foreground w-20">Poz No</th>
              <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">İş Kalemi Tarifi</th>
              <th className="text-left py-2.5 px-3 font-medium text-muted-foreground w-20">Birim</th>
              <th className="text-right py-2.5 px-3 font-medium text-muted-foreground w-24">Miktar</th>
              <th className="text-right py-2.5 px-3 font-medium text-muted-foreground w-28">Birim Fiyat</th>
              <th className="text-right py-2.5 px-3 font-medium text-muted-foreground w-28">Toplam</th>
              <th className="w-16 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                {editingId === item.id ? (
                  <>
                    <td className="py-1.5 px-2"><input value={editRow.poz_no} onChange={e => setEditRow(r => ({ ...r, poz_no: e.target.value }))} className="w-full rounded px-1.5 py-1 text-xs bg-background border border-border text-foreground" /></td>
                    <td className="py-1.5 px-2"><input value={editRow.description} onChange={e => setEditRow(r => ({ ...r, description: e.target.value }))} className="w-full rounded px-1.5 py-1 text-xs bg-background border border-border text-foreground" /></td>
                    <td className="py-1.5 px-2">
                      <select value={editRow.unit} onChange={e => setEditRow(r => ({ ...r, unit: e.target.value }))} className="w-full rounded px-1 py-1 text-xs bg-background border border-border text-foreground">
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="py-1.5 px-2"><input type="number" value={editRow.quantity} onChange={e => setEditRow(r => ({ ...r, quantity: parseFloat(e.target.value) || 0 }))} className="w-full rounded px-1.5 py-1 text-xs text-right bg-background border border-border text-foreground" /></td>
                    <td className="py-1.5 px-2"><input type="number" value={editRow.unit_price} onChange={e => setEditRow(r => ({ ...r, unit_price: parseFloat(e.target.value) || 0 }))} className="w-full rounded px-1.5 py-1 text-xs text-right bg-background border border-border text-foreground" /></td>
                    <td className="py-2 px-3 text-right font-medium text-foreground">{formatCurrency(editRow.quantity * editRow.unit_price)}</td>
                    <td className="py-1.5 px-2 flex gap-1">
                      <button onClick={saveEdit} className="p-1 rounded hover:bg-primary/10 text-primary"><Save className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2 px-3 text-muted-foreground font-mono">{item.poz_no}</td>
                    <td className="py-2 px-3 text-foreground">{item.description}</td>
                    <td className="py-2 px-3 text-muted-foreground">{item.unit}</td>
                    <td className="py-2 px-3 text-right text-foreground">{item.quantity.toLocaleString("tr-TR")}</td>
                    <td className="py-2 px-3 text-right text-foreground">{formatCurrency(item.unit_price)}</td>
                    <td className="py-2 px-3 text-right font-medium text-foreground">{formatCurrency(item.total_price)}</td>
                    <td className="py-1.5 px-2 flex gap-1">
                      <button onClick={() => startEdit(item)} className="p-1 rounded hover:bg-muted text-muted-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteItem(item.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {/* New item row */}
            <tr className="bg-muted/20">
              <td className="py-1.5 px-2"><input value={newRow.poz_no} onChange={e => setNewRow(r => ({ ...r, poz_no: e.target.value }))} placeholder="23.001" className="w-full rounded px-1.5 py-1 text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground/50" /></td>
              <td className="py-1.5 px-2"><input value={newRow.description} onChange={e => setNewRow(r => ({ ...r, description: e.target.value }))} placeholder="İş kalemi tarifi" className="w-full rounded px-1.5 py-1 text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground/50" /></td>
              <td className="py-1.5 px-2">
                <select value={newRow.unit} onChange={e => setNewRow(r => ({ ...r, unit: e.target.value }))} className="w-full rounded px-1 py-1 text-xs bg-background border border-border text-foreground">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </td>
              <td className="py-1.5 px-2"><input type="number" value={newRow.quantity || ""} onChange={e => setNewRow(r => ({ ...r, quantity: parseFloat(e.target.value) || 0 }))} placeholder="0" className="w-full rounded px-1.5 py-1 text-xs text-right bg-background border border-border text-foreground placeholder:text-muted-foreground/50" /></td>
              <td className="py-1.5 px-2"><input type="number" value={newRow.unit_price || ""} onChange={e => setNewRow(r => ({ ...r, unit_price: parseFloat(e.target.value) || 0 }))} placeholder="0" className="w-full rounded px-1.5 py-1 text-xs text-right bg-background border border-border text-foreground placeholder:text-muted-foreground/50" /></td>
              <td className="py-2 px-3 text-right font-medium text-muted-foreground">{formatCurrency(newRow.quantity * newRow.unit_price)}</td>
              <td className="py-1.5 px-2">
                <button onClick={handleAdd} className="p-1 rounded hover:bg-primary/10 text-primary"><Plus className="w-4 h-4" /></button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/30">
              <td colSpan={5} className="py-2.5 px-3 text-right font-semibold text-foreground">Genel Toplam</td>
              <td className="py-2.5 px-3 text-right font-bold text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{formatCurrency(grandTotal)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {loading && <p className="text-xs text-center text-muted-foreground">Yükleniyor...</p>}
    </div>
  );
}
