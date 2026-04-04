import { useState, useRef } from "react";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { Plus, Trash2, Package, X, Pencil, Check, GripVertical, Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useHakedisItems, type HakedisItem } from "@/hooks/useHakedisItems";
import { Progress } from "@/components/ui/progress";

const UNIT_OPTIONS = ["adet", "m²", "m³", "mt", "kg", "ton", "lt", "takım", "gün", "saat", "sefer"];

const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const inputStyle = { backgroundColor: "#161C23", color: "#F1F5F9", border: "1px solid #1E2732" };

interface ImportError {
  row: number;
  reason: string;
  data: string;
}

interface ImportProgress {
  total: number;
  current: number;
  added: number;
  errors: ImportError[];
}

function EditableRow({ item, index, onSave, onDelete, onDragStart, onDragOver, onDrop, isDragOver }: {
  item: HakedisItem; index: number;
  onSave: (id: string, updates: Partial<Pick<HakedisItem, "description" | "unit" | "quantity" | "unit_price">>) => void;
  onDelete: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  isDragOver: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(item.description);
  const [unit, setUnit] = useState(item.unit);
  const [qty, setQty] = useState(String(item.quantity));
  const [price, setPrice] = useState(String(item.unit_price));

  const handleSave = () => {
    onSave(item.id, {
      description: desc,
      unit,
      quantity: parseFloat(qty) || 0,
      unit_price: parseFloat(price) || 0,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setDesc(item.description);
    setUnit(item.unit);
    setQty(String(item.quantity));
    setPrice(String(item.unit_price));
    setEditing(false);
  };

  const dragProps = {
    draggable: !editing,
    onDragStart: () => onDragStart(index),
    onDragOver: (e: React.DragEvent) => onDragOver(e, index),
    onDrop: () => onDrop(index),
    onDragEnd: (e: React.DragEvent<HTMLTableRowElement>) => { (e.currentTarget as HTMLElement).style.opacity = "1"; },
  };

  if (editing) {
    const calcTotal = (parseFloat(qty) || 0) * (parseFloat(price) || 0);
    return (
      <tr style={{ backgroundColor: "rgba(255,107,43,0.05)" }}>
        <td className="px-1 py-1" style={{ color: "#64748B" }}>
          <GripVertical className="w-3 h-3 opacity-30" />
        </td>
        <td className="px-2 py-1 font-mono" style={{ color: "#64748B" }}>{index + 1}</td>
        <td className="px-1 py-1">
          <input value={desc} onChange={e => setDesc(e.target.value)}
            className="w-full rounded px-1.5 py-1 text-[11px] outline-none" style={inputStyle} />
        </td>
        <td className="px-1 py-1">
          <select value={unit} onChange={e => setUnit(e.target.value)}
            className="w-full rounded px-1 py-1 text-[11px] outline-none" style={inputStyle}>
            {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </td>
        <td className="px-1 py-1">
          <input type="number" value={qty} onChange={e => setQty(e.target.value)}
            className="w-full rounded px-1.5 py-1 text-[11px] text-right outline-none" style={inputStyle} />
        </td>
        <td className="px-1 py-1">
          <input type="number" value={price} onChange={e => setPrice(e.target.value)}
            className="w-full rounded px-1.5 py-1 text-[11px] text-right outline-none" style={inputStyle} />
        </td>
        <td className="px-2 py-1 font-mono text-right text-[11px] font-semibold" style={{ color: "#FF6B2B" }}>
          ₺{fmt(calcTotal)}
        </td>
        <td className="px-2 py-1">
          <div className="flex items-center gap-1">
            <button onClick={handleSave} title="Kaydet" style={{ color: "#22C55E" }}><Check className="w-3 h-3" /></button>
            <button onClick={handleCancel} title="İptal" style={{ color: "#94A3B8" }}><X className="w-3 h-3" /></button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr
      {...dragProps}
      style={{
        backgroundColor: isDragOver ? "rgba(255,107,43,0.12)" : index % 2 === 0 ? "transparent" : "rgba(15,20,25,0.5)",
        borderTop: isDragOver ? "2px solid #FF6B2B" : "none",
        cursor: "grab",
        transition: "background-color 0.15s",
      }}
    >
      <td className="px-1 py-1.5" style={{ color: "#64748B" }}>
        <GripVertical className="w-3 h-3 opacity-50 hover:opacity-100" />
      </td>
      <td className="px-2 py-1.5 font-mono" style={{ color: "#64748B" }}>{index + 1}</td>
      <td className="px-2 py-1.5" style={{ color: "#F1F5F9" }}>{item.description}</td>
      <td className="px-2 py-1.5" style={{ color: "#94A3B8" }}>{item.unit}</td>
      <td className="px-2 py-1.5 font-mono text-right" style={{ color: "#F1F5F9" }}>{fmt(item.quantity)}</td>
      <td className="px-2 py-1.5 font-mono text-right" style={{ color: "#F1F5F9" }}>₺{fmt(item.unit_price)}</td>
      <td className="px-2 py-1.5 font-mono text-right font-semibold" style={{ color: "#FF6B2B" }}>₺{fmt(item.total_price)}</td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(true)} title="Düzenle" style={{ color: "#3B82F6" }}>
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={() => onDelete(item.id)} style={{ color: "#EF4444" }}>
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function HakedisItemsSection({ hakedisId }: { hakedisId: string }) {
  const { items, loading, addItem, updateItem, deleteItem, reorderItems } = useHakedisItems(hakedisId);
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState("");
  const [unit, setUnit] = useState("adet");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const total = items.reduce((s, i) => s + i.total_price, 0);

  const handleAdd = () => {
    if (!desc || !qty || !price) return;
    addItem({ description: desc, unit, quantity: parseFloat(qty), unit_price: parseFloat(price) });
    setDesc(""); setQty(""); setPrice(""); setShowForm(false);
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDrop = (toIndex: number) => {
    if (dragIndex !== null && dragIndex !== toIndex) {
      reorderItems(dragIndex, toIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setShowErrors(false);
    setImportProgress(null);

    try {
      const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
      let rows: string[][] = [];

      if (isXlsx) {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        rows = data.map(r => r.map((c: any) => String(c ?? "").trim()));
      } else {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        const delimiter = lines[0]?.includes(";") ? ";" : ",";
        rows = lines.map(l => l.split(delimiter).map(c => c.trim().replace(/^"|"$/g, "")));
      }

      if (rows.length < 2) { toast.error("Dosya boş veya başlık satırı eksik"); return; }

      const dataRows = rows.slice(1);
      const progress: ImportProgress = { total: dataRows.length, current: 0, added: 0, errors: [] };
      setImportProgress({ ...progress });

      for (let i = 0; i < dataRows.length; i++) {
        const cols = dataRows[i];
        progress.current = i + 1;

        if (cols.length < 4) {
          progress.errors.push({ row: i + 2, reason: "Yetersiz sütun (en az 4 sütun gerekli)", data: cols.join(" | ") });
          setImportProgress({ ...progress });
          continue;
        }

        const description = cols[0];
        const csvUnit = cols[1] || "adet";
        const quantity = parseFloat(cols[2]?.replace(",", ".")) || 0;
        const unit_price = parseFloat(cols[3]?.replace(",", ".")) || 0;

        if (!description) {
          progress.errors.push({ row: i + 2, reason: "İş kalemi açıklaması boş", data: cols.join(" | ") });
        } else if (quantity <= 0) {
          progress.errors.push({ row: i + 2, reason: "Miktar 0 veya negatif", data: cols.join(" | ") });
        } else if (unit_price <= 0) {
          progress.errors.push({ row: i + 2, reason: "Birim fiyat 0 veya negatif", data: cols.join(" | ") });
        } else {
          await addItem({ description, unit: csvUnit, quantity, unit_price });
          progress.added++;
        }
        setImportProgress({ ...progress });
      }

      if (progress.added > 0 && progress.errors.length === 0) {
        toast.success(`${progress.added} iş kalemi başarıyla aktarıldı`);
      } else if (progress.added > 0 && progress.errors.length > 0) {
        toast.warning(`${progress.added} kalem aktarıldı, ${progress.errors.length} satırda hata`);
        setShowErrors(true);
      } else {
        toast.error("Geçerli kalem bulunamadı");
        if (progress.errors.length > 0) setShowErrors(true);
      }
    } catch {
      toast.error("Dosya okunamadı");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadSampleCsv = () => {
    const csv = "İş Kalemi;Birim;Miktar;Birim Fiyat\nBeton Dökümü C30;m³;120;850\nDemir İşçiliği;kg;5000;32\nKalıp İşçiliği;m²;400;180\n";
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "is_kalemleri_sablonu.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const progressPercent = importProgress ? Math.round((importProgress.current / importProgress.total) * 100) : 0;

  return (
    <div className="mt-2 pt-2" style={{ borderTop: "1px solid #1E2732" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Package className="w-3 h-3" style={{ color: "#FF6B2B" }} />
          <span className="text-[11px] font-semibold" style={{ color: "#94A3B8" }}>
            İş Kalemleri {items.length > 0 && `(${items.length})`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileImport} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="text-[10px] font-medium flex items-center gap-1"
            style={{ color: "#22C55E" }}
            title="CSV veya Excel dosyasından içe aktar"
          >
            <Upload className="w-3 h-3" />
            {importing ? "Aktarılıyor..." : "CSV/Excel Aktar"}
          </button>
          <button onClick={() => setShowForm(!showForm)} className="text-[10px] font-medium flex items-center gap-1" style={{ color: "#FF6B2B" }}>
            {showForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showForm ? "Kapat" : "Ekle"}
          </button>
        </div>
      </div>

      {/* Import Progress */}
      {importing && importProgress && (
        <div className="mb-2 rounded-lg p-2.5 space-y-1.5" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium" style={{ color: "#F1F5F9" }}>
              İçe aktarılıyor... ({importProgress.current}/{importProgress.total})
            </span>
            <span className="text-[11px] font-mono" style={{ color: "#FF6B2B" }}>%{progressPercent}</span>
          </div>
          <Progress value={progressPercent} className="h-1.5 bg-[#1E2732]" />
          <div className="flex items-center gap-3 text-[10px]">
            <span style={{ color: "#22C55E" }}>✓ {importProgress.added} eklendi</span>
            {importProgress.errors.length > 0 && (
              <span style={{ color: "#EF4444" }}>✗ {importProgress.errors.length} hata</span>
            )}
          </div>
        </div>
      )}

      {/* Import Result Summary */}
      {!importing && importProgress && importProgress.errors.length > 0 && (
        <div className="mb-2 rounded-lg p-2.5" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" style={{ color: "#F59E0B" }} />
              <span className="text-[11px] font-semibold" style={{ color: "#F59E0B" }}>
                {importProgress.errors.length} satırda hata bulundu
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowErrors(!showErrors)} className="text-[10px] underline" style={{ color: "#94A3B8" }}>
                {showErrors ? "Gizle" : "Detayları göster"}
              </button>
              <button onClick={() => setImportProgress(null)} style={{ color: "#64748B" }}>
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] mb-1">
            <span style={{ color: "#22C55E" }}>✓ {importProgress.added} başarılı</span>
            <span style={{ color: "#EF4444" }}>✗ {importProgress.errors.length} başarısız</span>
            <span style={{ color: "#64748B" }}>Toplam: {importProgress.total} satır</span>
          </div>
          {showErrors && (
            <div className="mt-1.5 max-h-32 overflow-y-auto rounded" style={{ border: "1px solid #1E2732" }}>
              <table className="w-full text-[10px]">
                <thead>
                  <tr style={{ backgroundColor: "#161C23" }}>
                    <th className="px-2 py-1 text-left font-semibold" style={{ color: "#64748B" }}>Satır</th>
                    <th className="px-2 py-1 text-left font-semibold" style={{ color: "#64748B" }}>Hata</th>
                    <th className="px-2 py-1 text-left font-semibold" style={{ color: "#64748B" }}>Veri</th>
                  </tr>
                </thead>
                <tbody>
                  {importProgress.errors.map((err, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #1E2732" }}>
                      <td className="px-2 py-1 font-mono" style={{ color: "#EF4444" }}>{err.row}</td>
                      <td className="px-2 py-1" style={{ color: "#F59E0B" }}>{err.reason}</td>
                      <td className="px-2 py-1 truncate max-w-[200px]" style={{ color: "#64748B" }}>{err.data}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {loading && <p className="text-[11px]" style={{ color: "#64748B" }}>Yükleniyor...</p>}

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid #1E2732" }}>
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{ backgroundColor: "#0F1419" }}>
                {["", "#", "İş Kalemi", "Birim", "Miktar", "Birim Fiyat", "Toplam", ""].map((h, i) => (
                  <th key={`${h}-${i}`} className="text-left px-2 py-1.5 font-semibold" style={{ color: "#64748B", fontSize: 10, borderBottom: "1px solid #1E2732", width: i === 0 ? 24 : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody onDragLeave={() => setDragOverIndex(null)}>
              {items.map((item, i) => (
                <EditableRow
                  key={item.id} item={item} index={i}
                  onSave={updateItem} onDelete={(id) => { const itm = items.find(x => x.id === id); setDeleteTarget({ id, name: itm?.description || "İş kalemi" }); }}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  isDragOver={dragOverIndex === i && dragIndex !== i}
                />
              ))}
              <tr style={{ backgroundColor: "#0F1419", borderTop: "1px solid #1E2732" }}>
                <td colSpan={6} className="px-2 py-1.5 text-right font-semibold" style={{ color: "#94A3B8" }}>TOPLAM</td>
                <td className="px-2 py-1.5 font-mono text-right font-bold" style={{ color: "#FF6B2B" }}>₺{fmt(total)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="mt-2 rounded-lg p-3 space-y-2" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="İş kalemi açıklaması"
            className="w-full rounded-lg px-2.5 py-1.5 text-[12px] outline-none" style={inputStyle} />
          <div className="grid grid-cols-3 gap-2">
            <select value={unit} onChange={e => setUnit(e.target.value)}
              className="rounded-lg px-2.5 py-1.5 text-[12px] outline-none" style={inputStyle}>
              {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="Miktar"
              className="rounded-lg px-2.5 py-1.5 text-[12px] outline-none" style={inputStyle} />
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Birim Fiyat ₺"
              className="rounded-lg px-2.5 py-1.5 text-[12px] outline-none" style={inputStyle} />
          </div>
          {qty && price && (
            <p className="text-[11px] text-right" style={{ color: "#94A3B8" }}>
              Toplam: <span className="font-semibold" style={{ color: "#FF6B2B" }}>₺{fmt(parseFloat(qty || "0") * parseFloat(price || "0"))}</span>
            </p>
          )}
          <button onClick={handleAdd} disabled={!desc || !qty || !price}
            className="w-full py-2 rounded-lg text-[12px] font-semibold text-white disabled:opacity-40" style={{ backgroundColor: "#FF6B2B" }}>
            Kalem Ekle
          </button>
          <button onClick={downloadSampleCsv} className="w-full text-center text-[10px] underline" style={{ color: "#64748B" }}>
            Örnek CSV şablonunu indir
          </button>
        </div>
      )}
    </div>
  );
}
