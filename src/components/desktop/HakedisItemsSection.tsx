import { useState } from "react";
import { Plus, Trash2, Package, X, Pencil, Check } from "lucide-react";
import { useHakedisItems, type HakedisItem } from "@/hooks/useHakedisItems";

const UNIT_OPTIONS = ["adet", "m²", "m³", "mt", "kg", "ton", "lt", "takım", "gün", "saat", "sefer"];

const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const inputStyle = { backgroundColor: "#161C23", color: "#F1F5F9", border: "1px solid #1E2732" };

function EditableRow({ item, index, onSave, onDelete }: {
  item: HakedisItem; index: number;
  onSave: (id: string, updates: Partial<Pick<HakedisItem, "description" | "unit" | "quantity" | "unit_price">>) => void;
  onDelete: (id: string) => void;
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

  if (editing) {
    const calcTotal = (parseFloat(qty) || 0) * (parseFloat(price) || 0);
    return (
      <tr style={{ backgroundColor: "rgba(255,107,43,0.05)" }}>
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
    <tr style={{ backgroundColor: index % 2 === 0 ? "transparent" : "rgba(15,20,25,0.5)" }}>
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
          <button onClick={() => { if (confirm("Bu kalem silinsin mi?")) onDelete(item.id); }} style={{ color: "#EF4444" }}>
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function HakedisItemsSection({ hakedisId }: { hakedisId: string }) {
  const { items, loading, addItem, updateItem, deleteItem } = useHakedisItems(hakedisId);
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState("");
  const [unit, setUnit] = useState("adet");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");

  const total = items.reduce((s, i) => s + i.total_price, 0);

  const handleAdd = () => {
    if (!desc || !qty || !price) return;
    addItem({ description: desc, unit, quantity: parseFloat(qty), unit_price: parseFloat(price) });
    setDesc(""); setQty(""); setPrice(""); setShowForm(false);
  };

  return (
    <div className="mt-2 pt-2" style={{ borderTop: "1px solid #1E2732" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Package className="w-3 h-3" style={{ color: "#FF6B2B" }} />
          <span className="text-[11px] font-semibold" style={{ color: "#94A3B8" }}>
            İş Kalemleri {items.length > 0 && `(${items.length})`}
          </span>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="text-[10px] font-medium flex items-center gap-1" style={{ color: "#FF6B2B" }}>
          {showForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {showForm ? "Kapat" : "Ekle"}
        </button>
      </div>

      {loading && <p className="text-[11px]" style={{ color: "#64748B" }}>Yükleniyor...</p>}

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid #1E2732" }}>
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{ backgroundColor: "#0F1419" }}>
                {["#", "İş Kalemi", "Birim", "Miktar", "Birim Fiyat", "Toplam", ""].map(h => (
                  <th key={h} className="text-left px-2 py-1.5 font-semibold" style={{ color: "#64748B", fontSize: 10, borderBottom: "1px solid #1E2732" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <EditableRow key={item.id} item={item} index={i} onSave={updateItem} onDelete={deleteItem} />
              ))}
              <tr style={{ backgroundColor: "#0F1419", borderTop: "1px solid #1E2732" }}>
                <td colSpan={5} className="px-2 py-1.5 text-right font-semibold" style={{ color: "#94A3B8" }}>TOPLAM</td>
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
        </div>
      )}
    </div>
  );
}
