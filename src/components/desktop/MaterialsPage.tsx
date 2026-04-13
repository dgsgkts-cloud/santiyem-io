import { useState, useMemo } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useMaterials, Material } from "@/hooks/useMaterials";
import { useContractItems } from "@/hooks/useContractItems";
import { useContracts } from "@/hooks/useContracts";
import { useProjectExpenses } from "@/hooks/useProjectExpenses";
import { useUser } from "@/contexts/UserContext";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { toast } from "sonner";
import {
  Package, Plus, ArrowDownLeft, ArrowUpRight, Search, AlertTriangle,
  Trash2, X, BarChart3, Users as SuppliersIcon, FileDown
} from "lucide-react";

type View = "stock" | "entry-form" | "exit-form" | "suppliers" | "reports";

const UNITS = ["m³", "m²", "m", "ton", "kg", "adet", "litre", "çuval", "paket"];

const fmt = (n: number) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
const fmtMoney = (n: number) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + " ₺";

const MaterialsPage = () => {
  const { user } = useUser();
  const { projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const {
    materials, entries, exits, stockMap, supplierSummary, isLoading,
    addMaterial, deleteMaterial, addEntry, deleteEntry, addExit, deleteExit,
  } = useMaterials(selectedProjectId || undefined);
  const { expenses, addExpense } = useProjectExpenses(selectedProjectId || undefined);

  // Get contracts for this project to find contract items
  const { contracts } = useContracts();
  const projectContracts = contracts.filter(c => c.project_id === selectedProjectId);
  const firstContractId = projectContracts[0]?.id;
  const { items: contractItems } = useContractItems(firstContractId);

  const [view, setView] = useState<View>("stock");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: "material" | "entry" | "exit" } | null>(null);

  // New material form
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newMatName, setNewMatName] = useState("");
  const [newMatUnit, setNewMatUnit] = useState("kg");
  const [newMatMinStock, setNewMatMinStock] = useState("");

  // Entry form
  const [entryMaterialId, setEntryMaterialId] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [entryQty, setEntryQty] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [entrySupplier, setEntrySupplier] = useState("");
  const [entryWaybill, setEntryWaybill] = useState("");
  const [entryNote, setEntryNote] = useState("");

  // Exit form
  const [exitMaterialId, setExitMaterialId] = useState("");
  const [exitDate, setExitDate] = useState(new Date().toISOString().slice(0, 10));
  const [exitQty, setExitQty] = useState("");
  const [exitContractItemId, setExitContractItemId] = useState("");
  const [exitLocation, setExitLocation] = useState("");
  const [exitNote, setExitNote] = useState("");

  const filteredStock = useMemo(() => {
    if (!search) return stockMap;
    const s = search.toLowerCase();
    return stockMap.filter(m => m.name.toLowerCase().includes(s));
  }, [stockMap, search]);

  const belowMinCount = stockMap.filter(m => m.belowMin).length;

  const handleAddMaterial = () => {
    if (!newMatName.trim() || !selectedProjectId) return;
    addMaterial.mutate({
      project_id: selectedProjectId,
      name: newMatName.trim(),
      unit: newMatUnit,
      min_stock: Number(newMatMinStock) || 0,
    }, {
      onSuccess: () => { setNewMatName(""); setNewMatMinStock(""); setShowAddMaterial(false); toast.success("Malzeme eklendi"); },
    });
  };

  const handleAddEntry = () => {
    if (!entryMaterialId || !entryQty) return;
    const qty = Number(entryQty);
    const price = Number(entryPrice) || 0;
    const total = qty * price;
    addEntry.mutate({
      material_id: entryMaterialId,
      entry_date: entryDate,
      quantity: qty,
      unit_price: price,
      total_amount: total,
      supplier: entrySupplier,
      waybill_no: entryWaybill || null,
      waybill_photo_url: null,
      note: entryNote || null,
    }, {
      onSuccess: () => {
        // Auto-add expense to project expenses
        if (total > 0 && selectedProjectId && user) {
          addExpense.mutate({
            project_id: selectedProjectId,
            user_id: user.id,
            category: "Malzeme",
            description: `${materials.find(m => m.id === entryMaterialId)?.name || "Malzeme"} — ${fmt(qty)} ${materials.find(m => m.id === entryMaterialId)?.unit || ""}`,
            amount: total,
            expense_date: entryDate,
            has_invoice: !!entryWaybill,
            invoice_no: entryWaybill || null,
            invoice_url: null,
            note: entrySupplier ? `Tedarikçi: ${entrySupplier}` : null,
            source: "material_entry",
          });
        }
        setEntryMaterialId(""); setEntryQty(""); setEntryPrice(""); setEntrySupplier(""); setEntryWaybill(""); setEntryNote("");
        setView("stock");
        toast.success("Malzeme girişi kaydedildi");
      },
    });
  };

  const handleAddExit = () => {
    if (!exitMaterialId || !exitQty) return;
    const mat = stockMap.find(m => m.id === exitMaterialId);
    const qty = Number(exitQty);
    if (mat && qty > mat.currentStock) {
      toast.error(`Stokta yeterli miktar yok! Mevcut: ${fmt(mat.currentStock)} ${mat.unit}`);
      return;
    }
    addExit.mutate({
      material_id: exitMaterialId,
      exit_date: exitDate,
      quantity: qty,
      contract_item_id: exitContractItemId || null,
      location: exitLocation || null,
      note: exitNote || null,
    }, {
      onSuccess: () => {
        setExitMaterialId(""); setExitQty(""); setExitContractItemId(""); setExitLocation(""); setExitNote("");
        setView("stock");
        toast.success("Malzeme çıkışı kaydedildi");
      },
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "material") deleteMaterial.mutate(deleteTarget.id, { onSuccess: () => toast.success("Silindi") });
    else if (deleteTarget.type === "entry") deleteEntry.mutate(deleteTarget.id, { onSuccess: () => toast.success("Silindi") });
    else deleteExit.mutate(deleteTarget.id, { onSuccess: () => toast.success("Silindi") });
    setDeleteTarget(null);
  };

  // Unique supplier names for autocomplete
  const uniqueSuppliers = [...new Set(entries.map(e => e.supplier).filter(Boolean))];

  const cardStyle = { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" };
  const textStyle = { color: "hsl(var(--foreground))" };
  const labelStyle = { color: "hsl(var(--muted-foreground))" };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg lg:text-xl font-bold" style={textStyle}>Malzeme Takibi</h2>
          <p className="text-xs lg:text-sm" style={labelStyle}>Stok, giriş/çıkış ve tedarikçi yönetimi</p>
        </div>
        <select
          value={selectedProjectId}
          onChange={e => setSelectedProjectId(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border border-border bg-card text-foreground min-w-[200px]"
        >
          <option value="">Proje seçin...</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {!selectedProjectId ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground))" }} />
          <p className="text-sm" style={labelStyle}>Malzeme takibi için bir proje seçin</p>
        </div>
      ) : (
        <>
          {/* Tab bar */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {([
              { id: "stock" as View, label: "Stok Durumu", icon: Package },
              { id: "entry-form" as View, label: "Malzeme Girişi", icon: ArrowDownLeft },
              { id: "exit-form" as View, label: "Malzeme Çıkışı", icon: ArrowUpRight },
              { id: "suppliers" as View, label: "Tedarikçiler", icon: SuppliersIcon },
            ]).map(t => (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                style={{
                  backgroundColor: view === t.id ? "rgba(255,107,43,0.12)" : "transparent",
                  color: view === t.id ? "#FF6B2B" : "hsl(var(--muted-foreground))",
                }}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl p-3 lg:p-4" style={cardStyle}>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={labelStyle}>Toplam Malzeme</p>
              <p className="text-xl font-bold mt-1" style={textStyle}>{materials.length}</p>
            </div>
            <div className="rounded-xl p-3 lg:p-4" style={cardStyle}>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={labelStyle}>Toplam Giriş</p>
              <p className="text-xl font-bold mt-1" style={textStyle}>{entries.length}</p>
            </div>
            <div className="rounded-xl p-3 lg:p-4" style={cardStyle}>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={labelStyle}>Toplam Çıkış</p>
              <p className="text-xl font-bold mt-1" style={textStyle}>{exits.length}</p>
            </div>
            <div className="rounded-xl p-3 lg:p-4" style={{ ...cardStyle, borderColor: belowMinCount > 0 ? "hsl(var(--destructive))" : undefined }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: belowMinCount > 0 ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))" }}>
                {belowMinCount > 0 && <AlertTriangle className="w-3 h-3 inline mr-1" />}Düşük Stok
              </p>
              <p className="text-xl font-bold mt-1" style={{ color: belowMinCount > 0 ? "hsl(var(--destructive))" : "hsl(var(--foreground))" }}>{belowMinCount}</p>
            </div>
          </div>

          {/* STOCK VIEW */}
          {view === "stock" && (
            <div className="rounded-xl" style={cardStyle}>
              <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                <div className="relative flex-1 min-w-0 w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={labelStyle} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Malzeme ara..." className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" />
                </div>
                <button onClick={() => setShowAddMaterial(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: "#FF6B2B" }}>
                  <Plus className="w-3.5 h-3.5" /> Yeni Malzeme
                </button>
              </div>

              {showAddMaterial && (
                <div className="p-4 flex flex-col sm:flex-row gap-3 items-end" style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--muted) / 0.3)" }}>
                  <div className="flex-1 min-w-0 w-full">
                    <label className="text-[11px] font-medium" style={labelStyle}>Malzeme Adı</label>
                    <input value={newMatName} onChange={e => setNewMatName(e.target.value)} placeholder="Çimento, Demir vb." className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" />
                  </div>
                  <div className="w-full sm:w-28">
                    <label className="text-[11px] font-medium" style={labelStyle}>Birim</label>
                    <select value={newMatUnit} onChange={e => setNewMatUnit(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="text-[11px] font-medium" style={labelStyle}>Min. Stok</label>
                    <input value={newMatMinStock} onChange={e => setNewMatMinStock(e.target.value)} type="number" placeholder="0" className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddMaterial} className="px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: "#22C55E" }}>Ekle</button>
                    <button onClick={() => setShowAddMaterial(false)} className="px-3 py-2 rounded-lg text-xs text-muted-foreground"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              )}

              {isLoading ? (
                <div className="p-8 text-center text-sm" style={labelStyle}>Yükleniyor...</div>
              ) : filteredStock.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="w-8 h-8 mx-auto mb-2" style={labelStyle} />
                  <p className="text-sm" style={labelStyle}>Henüz malzeme kaydı yok</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30">
                        {["Malzeme", "Birim", "Giren", "Çıkan", "Stok", "Min.", "Maliyet", ""].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wide" style={labelStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStock.map(m => (
                        <tr key={m.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium" style={textStyle}>
                            {m.belowMin && <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" style={{ color: "hsl(var(--destructive))" }} />}
                            {m.name}
                          </td>
                          <td className="px-4 py-3" style={labelStyle}>{m.unit}</td>
                          <td className="px-4 py-3" style={{ color: "#22C55E" }}>{fmt(m.totalIn)}</td>
                          <td className="px-4 py-3" style={{ color: "#EF4444" }}>{fmt(m.totalOut)}</td>
                          <td className="px-4 py-3 font-semibold" style={{ color: m.belowMin ? "hsl(var(--destructive))" : "hsl(var(--foreground))" }}>{fmt(m.currentStock)}</td>
                          <td className="px-4 py-3" style={labelStyle}>{m.min_stock > 0 ? fmt(m.min_stock) : "—"}</td>
                          <td className="px-4 py-3" style={labelStyle}>{m.totalCost > 0 ? fmtMoney(m.totalCost) : "—"}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => setDeleteTarget({ id: m.id, name: m.name, type: "material" })} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Total cost row */}
                  <div className="px-4 py-3 flex justify-end" style={{ borderTop: "1px solid hsl(var(--border))" }}>
                    <span className="text-sm font-semibold" style={textStyle}>
                      Toplam Maliyet: {fmtMoney(stockMap.reduce((s, m) => s + m.totalCost, 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ENTRY FORM */}
          {view === "entry-form" && (
            <div className="rounded-xl p-4 lg:p-6 space-y-4" style={cardStyle}>
              <h3 className="text-sm font-semibold" style={textStyle}>Yeni Malzeme Girişi</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-medium" style={labelStyle}>Malzeme *</label>
                  <select value={entryMaterialId} onChange={e => setEntryMaterialId(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
                    <option value="">Seçin...</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium" style={labelStyle}>Tarih</label>
                  <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" />
                </div>
                <div>
                  <label className="text-[11px] font-medium" style={labelStyle}>Miktar *</label>
                  <input type="number" value={entryQty} onChange={e => setEntryQty(e.target.value)} placeholder="0" className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" />
                </div>
                <div>
                  <label className="text-[11px] font-medium" style={labelStyle}>Birim Fiyat (₺)</label>
                  <input type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="0" className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" />
                </div>
                <div>
                  <label className="text-[11px] font-medium" style={labelStyle}>Toplam Tutar</label>
                  <p className="mt-1 px-3 py-2 rounded-lg text-sm bg-muted/50 border border-border font-semibold" style={textStyle}>
                    {fmtMoney((Number(entryQty) || 0) * (Number(entryPrice) || 0))}
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-medium" style={labelStyle}>Tedarikçi</label>
                  <input value={entrySupplier} onChange={e => setEntrySupplier(e.target.value)} list="supplier-list" placeholder="Tedarikçi adı" className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" />
                  <datalist id="supplier-list">
                    {uniqueSuppliers.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-[11px] font-medium" style={labelStyle}>İrsaliye No</label>
                  <input value={entryWaybill} onChange={e => setEntryWaybill(e.target.value)} placeholder="Opsiyonel" className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium" style={labelStyle}>Not</label>
                  <textarea value={entryNote} onChange={e => setEntryNote(e.target.value)} rows={2} placeholder="Opsiyonel" className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground resize-none" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleAddEntry} disabled={!entryMaterialId || !entryQty} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: "#22C55E" }}>
                  <ArrowDownLeft className="w-4 h-4 inline mr-1.5" />Girişi Kaydet
                </button>
                <button onClick={() => setView("stock")} className="px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">İptal</button>
              </div>
              <p className="text-[11px]" style={labelStyle}>* Giriş kaydedildiğinde tutar otomatik olarak Gelir/Gider modülüne "Malzeme Gideri" olarak eklenir.</p>
            </div>
          )}

          {/* EXIT FORM */}
          {view === "exit-form" && (
            <div className="rounded-xl p-4 lg:p-6 space-y-4" style={cardStyle}>
              <h3 className="text-sm font-semibold" style={textStyle}>Yeni Malzeme Çıkışı</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-medium" style={labelStyle}>Malzeme *</label>
                  <select value={exitMaterialId} onChange={e => setExitMaterialId(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
                    <option value="">Seçin...</option>
                    {stockMap.filter(m => m.currentStock > 0).map(m => (
                      <option key={m.id} value={m.id}>{m.name} (Stok: {fmt(m.currentStock)} {m.unit})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium" style={labelStyle}>Tarih</label>
                  <input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" />
                </div>
                <div>
                  <label className="text-[11px] font-medium" style={labelStyle}>Miktar *</label>
                  <input type="number" value={exitQty} onChange={e => setExitQty(e.target.value)} placeholder="0" className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" />
                </div>
                <div>
                  <label className="text-[11px] font-medium" style={labelStyle}>İş Kalemi</label>
                  <select value={exitContractItemId} onChange={e => setExitContractItemId(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground">
                    <option value="">Seçin (opsiyonel)...</option>
                    {contractItems.map(ci => <option key={ci.id} value={ci.id}>{ci.poz_no} — {ci.description}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium" style={labelStyle}>Kullanılan Alan / Konum</label>
                  <input value={exitLocation} onChange={e => setExitLocation(e.target.value)} placeholder="Bodrum kat kalıp vb." className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground" />
                </div>
                <div>
                  <label className="text-[11px] font-medium" style={labelStyle}>Not</label>
                  <textarea value={exitNote} onChange={e => setExitNote(e.target.value)} rows={2} placeholder="Opsiyonel" className="w-full mt-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground resize-none" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleAddExit} disabled={!exitMaterialId || !exitQty} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: "#EF4444" }}>
                  <ArrowUpRight className="w-4 h-4 inline mr-1.5" />Çıkışı Kaydet
                </button>
                <button onClick={() => setView("stock")} className="px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">İptal</button>
              </div>
            </div>
          )}

          {/* SUPPLIERS VIEW */}
          {view === "suppliers" && (
            <div className="rounded-xl" style={cardStyle}>
              <div className="p-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                <h3 className="text-sm font-semibold" style={textStyle}>Tedarikçi Özeti</h3>
              </div>
              {supplierSummary.length === 0 ? (
                <div className="p-8 text-center">
                  <SuppliersIcon className="w-8 h-8 mx-auto mb-2" style={labelStyle} />
                  <p className="text-sm" style={labelStyle}>Henüz tedarikçi kaydı yok</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30">
                        {["Tedarikçi", "İşlem Sayısı", "Toplam Tutar"].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 font-semibold text-[11px] uppercase tracking-wide" style={labelStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {supplierSummary.map(s => (
                        <tr key={s.supplier} className="border-b border-border hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium" style={textStyle}>{s.supplier}</td>
                          <td className="px-4 py-3" style={labelStyle}>{s.count}</td>
                          <td className="px-4 py-3 font-semibold" style={textStyle}>{fmtMoney(s.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Recent entries & exits */}
          {view === "stock" && (entries.length > 0 || exits.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recent entries */}
              <div className="rounded-xl" style={cardStyle}>
                <div className="p-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={textStyle}>
                    <ArrowDownLeft className="w-4 h-4" style={{ color: "#22C55E" }} /> Son Girişler
                  </h3>
                </div>
                <div className="divide-y divide-border">
                  {entries.slice(0, 5).map(e => {
                    const mat = materials.find(m => m.id === e.material_id);
                    return (
                      <div key={e.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium" style={textStyle}>{mat?.name || "—"}</p>
                          <p className="text-[11px]" style={labelStyle}>{e.entry_date} · {e.supplier || "—"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold" style={{ color: "#22C55E" }}>+{fmt(e.quantity)} {mat?.unit}</p>
                          {e.total_amount > 0 && <p className="text-[11px]" style={labelStyle}>{fmtMoney(e.total_amount)}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent exits */}
              <div className="rounded-xl" style={cardStyle}>
                <div className="p-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={textStyle}>
                    <ArrowUpRight className="w-4 h-4" style={{ color: "#EF4444" }} /> Son Çıkışlar
                  </h3>
                </div>
                <div className="divide-y divide-border">
                  {exits.slice(0, 5).map(e => {
                    const mat = materials.find(m => m.id === e.material_id);
                    return (
                      <div key={e.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium" style={textStyle}>{mat?.name || "—"}</p>
                          <p className="text-[11px]" style={labelStyle}>{e.exit_date} · {e.location || "—"}</p>
                        </div>
                        <p className="text-sm font-semibold" style={{ color: "#EF4444" }}>-{fmt(e.quantity)} {mat?.unit}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Silme Onayı"
        itemName={deleteTarget?.name}
        extraWarning="Bu işlem geri alınamaz."
      />
    </div>
  );
};

export default MaterialsPage;
