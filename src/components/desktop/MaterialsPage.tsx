import { useState, useMemo } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useMaterials } from "@/hooks/useMaterials";
import { useContractItems } from "@/hooks/useContractItems";
import { useContracts } from "@/hooks/useContracts";
import { useProjectExpenses } from "@/hooks/useProjectExpenses";
import { useUser } from "@/contexts/UserContext";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import EmptyState from "@/components/desktop/EmptyState";
import { SkeletonList } from "@/components/ui/Skeletons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Package, Plus, ArrowDownLeft, ArrowUpRight, Search, X, Users as SuppliersIcon,
} from "lucide-react";

// SPRINT 38D — Materials premium UX pass. Presentation only:
// no new features, no backend logic changes, no schema changes.
import { InventoryStatStrip, type StripKey } from "@/components/materials/InventoryStatStrip";
import { MaterialRow } from "@/components/materials/MaterialRow";
import { MaterialDetailSheet } from "@/components/materials/MaterialDetailSheet";
import { RecentMovementsCard, type MovementItem } from "@/components/materials/RecentMovementsCard";
import { getStockStatus } from "@/components/materials/materialStatus";

type View = "stock" | "entry-form" | "exit-form" | "suppliers";

const UNITS = ["m³", "m²", "m", "ton", "kg", "adet", "litre", "çuval", "paket"];

import { formatCurrency } from "@/lib/formatCurrency";
const fmt = (n: number) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
const fmtMoney = (n: number) => formatCurrency(Math.round(n));

const inputClass = "w-full px-3 h-11 rounded-control text-fs-sm bg-background border border-border text-foreground focus:outline-none focus:border-primary/50";

const MaterialsPage = () => {
  const { user } = useUser();
  const { projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const {
    materials, entries, exits, stockMap, supplierSummary, isLoading,
    addMaterial, deleteMaterial, addEntry, deleteEntry, addExit, deleteExit,
  } = useMaterials(selectedProjectId || undefined);
  const { addExpense } = useProjectExpenses(selectedProjectId || undefined);

  // Get contracts for this project to find contract items
  const { contracts } = useContracts();
  const projectContracts = contracts.filter(c => c.project_id === selectedProjectId);
  const firstContractId = projectContracts[0]?.id;
  const { items: contractItems } = useContractItems(firstContractId);

  const [view, setView] = useState<View>("stock");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StripKey>("all");
  const [detailId, setDetailId] = useState<string | null>(null);
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

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  /* ---------------- derived (presentation only) ---------------- */

  const withStatus = useMemo(
    () => stockMap.map(m => ({ ...m, status: getStockStatus(m.currentStock, m.min_stock) })),
    [stockMap]
  );

  const stats = useMemo(() => ({
    totalValue: fmtMoney(withStatus.reduce((s, m) => s + m.totalCost, 0)),
    totalItems: withStatus.length,
    lowCount: withStatus.filter(m => m.status === "low" || m.status === "critical").length,
    outCount: withStatus.filter(m => m.status === "out").length,
  }), [withStatus]);

  const filteredStock = useMemo(() => {
    const s = search.trim().toLowerCase();
    return withStatus.filter(m => {
      if (s && !m.name.toLowerCase().includes(s)) return false;
      if (statusFilter === "low") return m.status === "low" || m.status === "critical";
      if (statusFilter === "out") return m.status === "out";
      return true;
    });
  }, [withStatus, search, statusFilter]);

  const recentMovements: MovementItem[] = useMemo(() => {
    const nameOf = (id: string) => materials.find(m => m.id === id);
    const list: MovementItem[] = [
      ...entries.map(e => {
        const mat = nameOf(e.material_id);
        const fromDiary = e.source_type === "site_diary";
        return {
          id: `in-${e.id}`,
          kind: "in" as const,
          date: e.entry_date,
          materialName: mat?.name || "—",
          unit: mat?.unit || "",
          qty: Number(e.quantity),
          detail: fromDiary ? "Şantiye Günlüğü" : (e.supplier || undefined),
          amount: Number(e.total_amount),
          onClick: fromDiary
            ? () => window.dispatchEvent(new CustomEvent("navigate-tab", { detail: { tab: "site-diary", entryId: e.source_id } }))
            : undefined,
        };
      }),
      ...exits.map(e => {
        const mat = nameOf(e.material_id);
        const fromDiary = e.source_type === "site_diary";
        return {
          id: `out-${e.id}`,
          kind: "out" as const,
          date: e.exit_date,
          materialName: mat?.name || "—",
          unit: mat?.unit || "",
          qty: Number(e.quantity),
          detail: fromDiary ? "Şantiye Günlüğü" : (e.location || undefined),
          onClick: fromDiary
            ? () => window.dispatchEvent(new CustomEvent("navigate-tab", { detail: { tab: "site-diary", entryId: e.source_id } }))
            : undefined,
        };
      }),
    ];
    return list.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  }, [entries, exits, materials]);

  const detailMaterial = useMemo(
    () => withStatus.find(m => m.id === detailId) || null,
    [withStatus, detailId]
  );

  /* ---------------- handlers (unchanged logic) ---------------- */

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

  const openEntryFor = (id: string) => { setEntryMaterialId(id); setDetailId(null); setView("entry-form"); };
  const openExitFor = (id: string) => { setExitMaterialId(id); setDetailId(null); setView("exit-form"); };

  const TABS: { id: View; label: string; icon: typeof Package }[] = [
    { id: "stock", label: "Stok", icon: Package },
    { id: "entry-form", label: "Giriş", icon: ArrowDownLeft },
    { id: "exit-form", label: "Çıkış", icon: ArrowUpRight },
    { id: "suppliers", label: "Tedarikçi", icon: SuppliersIcon },
  ];

  return (
    <div className="px-5 pt-5 pb-6 space-y-4 mx-auto w-full max-w-[1400px]">
      {/* Header — compact, one line on desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ds-heading text-foreground">Malzeme Takibi</h1>
          <p className="ds-caption text-muted-foreground">Stok, giriş/çıkış ve tedarikçi yönetimi</p>
        </div>
        <select
          value={selectedProjectId}
          onChange={e => setSelectedProjectId(e.target.value)}
          className="px-3 h-11 rounded-control text-fs-sm border border-border bg-card text-foreground min-w-[200px]"
        >
          <option value="">Proje seçin...</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {!selectedProjectId ? (
        <div className="rounded-card border border-border/80 bg-card">
          <EmptyState
            icon="📦"
            title="Önce bir proje seçin"
            description="Malzeme stoğu her projede ayrı tutulur, bu yüzden liste proje seçilmeden doldurulamaz."
            firstStep="Yukarıdaki menüden bir proje seçin."
            aiHint="Proje seçtiğinizde AI, tüketim hızına bakarak hangi malzemenin ne zaman biteceğini tahmin eder."
          />
        </div>
      ) : (
        <>
          {/* Segmented control — single compact row */}
          <div className="flex items-center gap-1 p-1 rounded-control bg-muted/40 border border-border/70 overflow-x-auto no-scrollbar w-full sm:w-auto sm:inline-flex">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-9 rounded-[10px] ds-caption font-medium whitespace-nowrap transition-colors flex-1 sm:flex-none justify-center",
                  view === t.id ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>

          {/* STOCK VIEW */}
          {view === "stock" && (
            <>
              {/* Inventory overview — value, items, low, out (also the filter) */}
              <InventoryStatStrip stats={stats} active={statusFilter} onSelect={setStatusFilter} />

              {/* Always-visible search + primary action */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Malzeme ara…"
                    className="w-full pl-9 pr-9 h-11 rounded-control text-fs-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      aria-label="Aramayı temizle"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Button onClick={() => setShowAddMaterial(v => !v)} className="shrink-0">
                  <Plus className="w-4 h-4 sm:mr-1.5" /> <span className="hidden sm:inline">Yeni Malzeme</span>
                </Button>
              </div>

              {showAddMaterial && (
                <div className="rounded-card border border-border/80 bg-muted/20 p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
                  <div className="flex-1 min-w-0">
                    <label className="ds-label">Malzeme Adı</label>
                    <input value={newMatName} onChange={e => setNewMatName(e.target.value)} placeholder="Çimento, Demir vb." className={cn(inputClass, "mt-1")} />
                  </div>
                  <div className="w-full sm:w-28">
                    <label className="ds-label">Birim</label>
                    <select value={newMatUnit} onChange={e => setNewMatUnit(e.target.value)} className={cn(inputClass, "mt-1")}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="ds-label">Min. Stok</label>
                    <input value={newMatMinStock} onChange={e => setNewMatMinStock(e.target.value)} type="number" placeholder="0" className={cn(inputClass, "mt-1")} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddMaterial}>Ekle</Button>
                    <Button variant="ghost" size="icon" onClick={() => setShowAddMaterial(false)} aria-label="Kapat"><X className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}

              {/* Material list — the primary focus */}
              <section className="rounded-card border border-border/80 bg-card shadow-soft overflow-hidden">
                {isLoading ? (
                  <div className="p-3"><SkeletonList rows={6} /></div>
                ) : filteredStock.length === 0 ? (
                  withStatus.length === 0 ? (
                    <EmptyState
                      icon="🧱"
                      title="Bu projede malzeme yok"
                      description="Stok listesi, projeye tanımladığınız malzemelerden oluşur."
                      firstStep="'Yeni Malzeme' ile ilk kalemi tanımlayın, ardından giriş yapın."
                      aiHint="Kayıtlar biriktikçe AI, kritik stokları ve tüketim eğilimini otomatik yorumlar."
                      buttonText="Yeni Malzeme"
                      onButtonClick={() => setShowAddMaterial(true)}
                    />
                  ) : (
                    <EmptyState
                      icon="🔍"
                      title="Eşleşen malzeme yok"
                      description="Arama ve filtre birlikte hiçbir kalemle eşleşmedi."
                      firstStep="Aramayı temizleyin veya durum filtresini 'Kalem' olarak sıfırlayın."
                    />
                  )
                ) : (
                  <>
                    <div className="divide-y divide-border/60">
                      {filteredStock.map(m => (
                        <MaterialRow
                          key={m.id}
                          item={{
                            id: m.id,
                            name: m.name,
                            unit: m.unit,
                            currentStock: m.currentStock,
                            min_stock: m.min_stock,
                            status: m.status,
                            location: selectedProject?.name,
                            secondary: m.min_stock > 0 ? `Min. ${fmt(m.min_stock)} ${m.unit}` : undefined,
                          }}
                          fmt={fmt}
                          onOpen={setDetailId}
                          onEntry={openEntryFor}
                          onExit={openExitFor}
                          onDelete={(id, name) => setDeleteTarget({ id, name, type: "material" })}
                        />
                      ))}
                    </div>
                    <div className="px-4 py-2.5 flex items-center justify-between border-t border-border/60">
                      <span className="ds-caption text-muted-foreground">{filteredStock.length} kalem</span>
                      <span className="ds-caption text-foreground/80">
                        Toplam maliyet <span className="ds-numeric font-semibold">{stats.totalValue}</span>
                      </span>
                    </div>
                  </>
                )}
              </section>

              <RecentMovementsCard items={recentMovements} fmt={fmt} fmtMoney={fmtMoney} />
            </>
          )}

          {/* ENTRY FORM */}
          {view === "entry-form" && (
            <div className="rounded-card border border-border/80 bg-card p-4 lg:p-5 space-y-4">
              <h3 className="ds-title text-foreground">Yeni Malzeme Girişi</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="ds-label">Malzeme *</label>
                  <select value={entryMaterialId} onChange={e => setEntryMaterialId(e.target.value)} className={cn(inputClass, "mt-1")}>
                    <option value="">Seçin...</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                  </select>
                </div>
                <div>
                  <label className="ds-label">Tarih</label>
                  <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className={cn(inputClass, "mt-1")} />
                </div>
                <div>
                  <label className="ds-label">Miktar *</label>
                  <input type="number" value={entryQty} onChange={e => setEntryQty(e.target.value)} placeholder="0" className={cn(inputClass, "mt-1")} />
                </div>
                <div>
                  <label className="ds-label">Birim Fiyat (₺)</label>
                  <input type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="0" className={cn(inputClass, "mt-1")} />
                </div>
                <div>
                  <label className="ds-label">Toplam Tutar</label>
                  <p className="mt-1 px-3 h-11 flex items-center rounded-control text-fs-sm bg-muted/50 border border-border font-semibold text-foreground">
                    {fmtMoney((Number(entryQty) || 0) * (Number(entryPrice) || 0))}
                  </p>
                </div>
                <div>
                  <label className="ds-label">Tedarikçi</label>
                  <input value={entrySupplier} onChange={e => setEntrySupplier(e.target.value)} list="supplier-list" placeholder="Tedarikçi adı" className={cn(inputClass, "mt-1")} />
                  <datalist id="supplier-list">
                    {uniqueSuppliers.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div>
                  <label className="ds-label">İrsaliye No</label>
                  <input value={entryWaybill} onChange={e => setEntryWaybill(e.target.value)} placeholder="Opsiyonel" className={cn(inputClass, "mt-1")} />
                </div>
                <div className="sm:col-span-2">
                  <label className="ds-label">Not</label>
                  <textarea value={entryNote} onChange={e => setEntryNote(e.target.value)} rows={2} placeholder="Opsiyonel" className="w-full mt-1 px-3 py-2 rounded-control text-fs-sm bg-background border border-border text-foreground resize-none focus:outline-none focus:border-primary/50" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleAddEntry} disabled={!entryMaterialId || !entryQty}>
                  <ArrowDownLeft className="w-4 h-4 mr-1.5" />Girişi Kaydet
                </Button>
                <Button variant="ghost" onClick={() => setView("stock")}>İptal</Button>
              </div>
              <p className="ds-caption text-muted-foreground">* Giriş kaydedildiğinde tutar otomatik olarak Gelir/Gider modülüne "Malzeme Gideri" olarak eklenir.</p>
            </div>
          )}

          {/* EXIT FORM */}
          {view === "exit-form" && (
            <div className="rounded-card border border-border/80 bg-card p-4 lg:p-5 space-y-4">
              <h3 className="ds-title text-foreground">Yeni Malzeme Çıkışı</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="ds-label">Malzeme *</label>
                  <select value={exitMaterialId} onChange={e => setExitMaterialId(e.target.value)} className={cn(inputClass, "mt-1")}>
                    <option value="">Seçin...</option>
                    {stockMap.filter(m => m.currentStock > 0).map(m => (
                      <option key={m.id} value={m.id}>{m.name} (Stok: {fmt(m.currentStock)} {m.unit})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="ds-label">Tarih</label>
                  <input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} className={cn(inputClass, "mt-1")} />
                </div>
                <div>
                  <label className="ds-label">Miktar *</label>
                  <input type="number" value={exitQty} onChange={e => setExitQty(e.target.value)} placeholder="0" className={cn(inputClass, "mt-1")} />
                </div>
                <div>
                  <label className="ds-label">İş Kalemi</label>
                  <select value={exitContractItemId} onChange={e => setExitContractItemId(e.target.value)} className={cn(inputClass, "mt-1")}>
                    <option value="">Seçin (opsiyonel)...</option>
                    {contractItems.map(ci => <option key={ci.id} value={ci.id}>{ci.poz_no} — {ci.description}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ds-label">Kullanılan Alan / Konum</label>
                  <input value={exitLocation} onChange={e => setExitLocation(e.target.value)} placeholder="Bodrum kat kalıp vb." className={cn(inputClass, "mt-1")} />
                </div>
                <div>
                  <label className="ds-label">Not</label>
                  <textarea value={exitNote} onChange={e => setExitNote(e.target.value)} rows={2} placeholder="Opsiyonel" className="w-full mt-1 px-3 py-2 rounded-control text-fs-sm bg-background border border-border text-foreground resize-none focus:outline-none focus:border-primary/50" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="destructive" onClick={handleAddExit} disabled={!exitMaterialId || !exitQty}>
                  <ArrowUpRight className="w-4 h-4 mr-1.5" />Çıkışı Kaydet
                </Button>
                <Button variant="ghost" onClick={() => setView("stock")}>İptal</Button>
              </div>
            </div>
          )}

          {/* SUPPLIERS VIEW */}
          {view === "suppliers" && (
            <section className="rounded-card border border-border/80 bg-card shadow-soft overflow-hidden">
              <header className="px-4 py-3 border-b border-border/60">
                <h3 className="ds-title text-foreground">Tedarikçi Özeti</h3>
                <p className="ds-caption text-muted-foreground">Alım tutarına göre sıralı</p>
              </header>
              {supplierSummary.length === 0 ? (
                <EmptyState
                  icon="🚚"
                  title="Henüz tedarikçi kaydı yok"
                  description="Tedarikçi listesi, malzeme girişlerine yazdığınız tedarikçi adlarından oluşur."
                  firstStep="Bir malzeme girişi yaparken 'Tedarikçi' alanını doldurun."
                  aiHint="Birden fazla alım biriktiğinde AI, fiyat farklarını ve en uygun tedarikçiyi karşılaştırır."
                />
              ) : (
                <div className="divide-y divide-border/60">
                  {supplierSummary.map(s => (
                    <div key={s.supplier} className="flex items-center justify-between gap-3 px-4 py-3 min-w-0" style={{ minHeight: 56 }}>
                      <div className="min-w-0">
                        <div className="ds-body text-foreground truncate">{s.supplier}</div>
                        <div className="ds-caption text-muted-foreground">{s.count} işlem</div>
                      </div>
                      <span className="ds-body ds-numeric font-semibold text-foreground shrink-0">{fmtMoney(s.totalAmount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      <MaterialDetailSheet
        material={detailMaterial}
        entries={entries}
        exits={exits}
        fmt={fmt}
        fmtMoney={fmtMoney}
        onClose={() => setDetailId(null)}
        onEntry={openEntryFor}
        onExit={openExitFor}
      />

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
