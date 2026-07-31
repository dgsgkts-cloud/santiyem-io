import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownLeft, ArrowUpRight, History, Package, PackagePlus,
  Plus, Search, Sparkles, Trash2, X,
} from "lucide-react";

import { useUser } from "@/contexts/UserContext";
import { useProjects } from "@/hooks/useProjects";
import { useMaterials } from "@/hooks/useMaterials";
import { useContracts } from "@/hooks/useContracts";
import { useContractItems } from "@/hooks/useContractItems";
import { useProjectExpenses } from "@/hooks/useProjectExpenses";
import { formatCurrency } from "@/lib/formatCurrency";
import { getStockStatus } from "@/components/materials/materialStatus";
import { SkeletonList } from "@/components/ui/Skeletons";
import { cn } from "@/lib/utils";

import { MobileSheet } from "@/components/mobile/sheets/MobileSheet";
import { MobileActionRows, type MobileActionRowItem } from "@/components/mobile/sheets/MobileActionRows";
import { MobileSelectorSheet } from "@/components/mobile/sheets/MobileSelectorSheet";
import { MobileConfirmSheet } from "@/components/mobile/sheets/MobileConfirmSheet";

import { MobileStockCard } from "./MobileStockCard";
import { MobileMovementsList, type MobileMovement } from "./MobileMovementsList";
import { MovementDetailSheet } from "./MovementDetailSheet";
import { NewMaterialSheet } from "./NewMaterialSheet";
import { StockEntrySheet } from "./StockEntrySheet";
import { StockExitSheet } from "./StockExitSheet";

const fmt = (n: number) =>
  new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
const fmtMoney = (n: number) => formatCurrency(Math.round(n));

type View = "cards" | "movements";
type Op = null | "material" | "entry" | "exit";

/**
 * SPRINT 41B — mobile Stok Takibi workspace.
 * Presentation + flow only: every write goes through the existing useMaterials
 * mutations, so backend logic and schema are untouched. Only operations the
 * product actually supports are offered (material card, stock in, stock out).
 */
export default function MaterialsMobile() {
  const { user } = useUser();
  const { projects } = useProjects();
  const [projectId, setProjectId] = useState("");
  const {
    materials, entries, exits, stockMap, isLoading,
    addMaterial, deleteMaterial, addEntry, deleteEntry, addExit, deleteExit,
  } = useMaterials(projectId || undefined);
  const { addExpense } = useProjectExpenses(projectId || undefined);

  const { contracts } = useContracts();
  const firstContractId = contracts.filter(c => c.project_id === projectId)[0]?.id;
  const { items: contractItems } = useContractItems(firstContractId);

  const [view, setView] = useState<View>("cards");
  const [search, setSearch] = useState("");
  const [projectPicker, setProjectPicker] = useState(false);
  const [opPicker, setOpPicker] = useState(false);
  const [op, setOp] = useState<Op>(null);
  const [presetMaterialId, setPresetMaterialId] = useState<string | null>(null);
  const [cardMenuId, setCardMenuId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [movementDetail, setMovementDetail] = useState<MobileMovement | null>(null);
  const [deleteMaterialTarget, setDeleteMaterialTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteMovementTarget, setDeleteMovementTarget] = useState<MobileMovement | null>(null);
  const [aiDismissed, setAiDismissed] = useState(false);
  const [saving, setSaving] = useState(false);

  const project = projects.find(p => p.id === projectId);
  const projectName = project?.name || "Proje seçilmedi";

  /* ---------------- derived (presentation only) ---------------- */

  const withStatus = useMemo(
    () => stockMap.map(m => ({ ...m, status: getStockStatus(m.currentStock, m.min_stock) })),
    [stockMap],
  );

  const movements: MobileMovement[] = useMemo(() => {
    const matOf = (id: string) => materials.find(m => m.id === id);
    const list: MobileMovement[] = [
      ...entries.map(e => {
        const mat = matOf(e.material_id);
        return {
          id: `in-${e.id}`, rawId: e.id, kind: "in" as const, date: e.entry_date,
          materialName: mat?.name || "—", unit: mat?.unit || "", qty: Number(e.quantity),
          detail: e.source_type === "site_diary" ? "Şantiye Günlüğü" : (e.supplier || undefined),
          amount: Number(e.total_amount), note: e.note, document: e.waybill_no,
          sourceType: e.source_type ?? null,
        };
      }),
      ...exits.map(e => {
        const mat = matOf(e.material_id);
        return {
          id: `out-${e.id}`, rawId: e.id, kind: "out" as const, date: e.exit_date,
          materialName: mat?.name || "—", unit: mat?.unit || "", qty: Number(e.quantity),
          detail: e.source_type === "site_diary" ? "Şantiye Günlüğü" : (e.location || undefined),
          note: e.note, document: null, sourceType: e.source_type ?? null,
        };
      }),
    ];
    return list.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [entries, exits, materials]);

  const lastMovementOf = (materialId: string) => {
    const mat = materials.find(m => m.id === materialId);
    const found = movements.find(mv => mv.materialName === mat?.name);
    if (!found) return undefined;
    return new Date(found.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  };

  const s = search.trim().toLocaleLowerCase("tr");
  const filteredStock = useMemo(
    () => withStatus.filter(m => !s || m.name.toLocaleLowerCase("tr").includes(s)),
    [withStatus, s],
  );
  const filteredMovements = useMemo(
    () => movements.filter(m =>
      !s || m.materialName.toLocaleLowerCase("tr").includes(s) || (m.detail || "").toLocaleLowerCase("tr").includes(s)),
    [movements, s],
  );

  const criticalCount = withStatus.filter(m => m.status === "critical" || m.status === "out").length;
  const suppliers = useMemo(
    () => [...new Set(entries.map(e => e.supplier).filter(Boolean))] as string[],
    [entries],
  );
  const materialOptions = withStatus.map(m => ({
    id: m.id, name: m.name, unit: m.unit, currentStock: m.currentStock,
  }));
  const workItems = (contractItems || []).map((i: any) => ({
    id: i.id, label: `${i.item_no ? `${i.item_no} · ` : ""}${i.description || i.name || "İş kalemi"}`,
  }));
  const detailMaterial = withStatus.find(m => m.id === detailId) || null;
  const cardMenuMaterial = withStatus.find(m => m.id === cardMenuId) || null;

  /* ---------------- operations (existing mutations) ---------------- */

  const failMessage = (e: unknown) => {
    const msg = String((e as any)?.message || "");
    if (/Failed to fetch|NetworkError/i.test(msg)) return "Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.";
    if (/permission|row-level|not authorized/i.test(msg)) return "Bu işlem için yetkiniz yok.";
    if (/duplicate/i.test(msg)) return "Bu kayıt zaten mevcut.";
    return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
  };

  const handleAddMaterial = (v: { name: string; unit: string; min_stock: number }) => {
    if (!projectId || saving) return;
    if (materials.some(m => m.name.toLocaleLowerCase("tr") === v.name.toLocaleLowerCase("tr"))) {
      toast.error("Bu isimde bir malzeme kartı zaten var.");
      return;
    }
    setSaving(true);
    addMaterial.mutate({ project_id: projectId, ...v }, {
      onSuccess: () => { setOp(null); toast.success("Malzeme kartı oluşturuldu."); },
      onError: (e) => toast.error(failMessage(e)),
      onSettled: () => setSaving(false),
    });
  };

  const handleEntry = (v: {
    material_id: string; entry_date: string; quantity: number; unit_price: number;
    supplier: string; waybill_no: string | null; note: string | null;
  }) => {
    if (saving) return;
    setSaving(true);
    const total = v.quantity * v.unit_price;
    const mat = materials.find(m => m.id === v.material_id);
    addEntry.mutate({ ...v, total_amount: total, waybill_photo_url: null }, {
      onSuccess: () => {
        if (total > 0 && projectId && user) {
          addExpense.mutate({
            project_id: projectId, user_id: user.id, category: "Malzeme",
            description: `${mat?.name || "Malzeme"} — ${fmt(v.quantity)} ${mat?.unit || ""}`,
            amount: total, expense_date: v.entry_date, has_invoice: !!v.waybill_no,
            invoice_no: v.waybill_no, invoice_url: null,
            note: v.supplier ? `Tedarikçi: ${v.supplier}` : null, source: "material_entry",
          } as any);
        }
        setOp(null); setPresetMaterialId(null);
        toast.success("Stok girişi kaydedildi.");
      },
      onError: (e) => toast.error(failMessage(e)),
      onSettled: () => setSaving(false),
    });
  };

  const handleExit = (v: {
    material_id: string; exit_date: string; quantity: number;
    contract_item_id: string | null; location: string | null; note: string | null;
  }) => {
    if (saving) return;
    const mat = stockMap.find(m => m.id === v.material_id);
    if (mat && v.quantity > mat.currentStock) {
      toast.error(`Stokta yeterli miktar yok. Mevcut: ${fmt(mat.currentStock)} ${mat.unit}`);
      return;
    }
    setSaving(true);
    addExit.mutate(v, {
      onSuccess: () => {
        setOp(null); setPresetMaterialId(null);
        toast.success("Stok çıkışı kaydedildi.");
      },
      onError: (e) => toast.error(failMessage(e)),
      onSettled: () => setSaving(false),
    });
  };

  const confirmDeleteMovement = () => {
    const m = deleteMovementTarget;
    if (!m || saving) return;
    setSaving(true);
    const mut = m.kind === "in" ? deleteEntry : deleteExit;
    mut.mutate(m.rawId, {
      onSuccess: () => {
        setDeleteMovementTarget(null); setMovementDetail(null);
        toast.success("Stok hareketi iptal edildi.");
      },
      onError: (e) => toast.error(failMessage(e)),
      onSettled: () => setSaving(false),
    });
  };

  const confirmDeleteMaterial = () => {
    const t = deleteMaterialTarget;
    if (!t || saving) return;
    setSaving(true);
    deleteMaterial.mutate(t.id, {
      onSuccess: () => { setDeleteMaterialTarget(null); toast.success("Malzeme kartı silindi."); },
      onError: (e) => toast.error(failMessage(e)),
      onSettled: () => setSaving(false),
    });
  };

  /* ---------------- operation picker ---------------- */

  const operations: MobileActionRowItem[] = [
    {
      id: "material", label: "Yeni Malzeme Tanımla", description: "Yeni stok kartı oluşturun.",
      tone: "primary", icon: <PackagePlus className="w-[18px] h-[18px]" />,
      onSelect: () => { setOpPicker(false); setTimeout(() => setOp("material"), 140); },
    },
    {
      id: "entry", label: "Stok Girişi", description: "Satın alınan veya teslim alınan malzemeyi ekleyin.",
      tone: "success", icon: <ArrowDownLeft className="w-[18px] h-[18px]" />,
      disabled: materials.length === 0,
      onSelect: () => { setOpPicker(false); setTimeout(() => setOp("entry"), 140); },
    },
    {
      id: "exit", label: "Stok Çıkışı", description: "Sahada kullanılan veya teslim edilen malzemeyi kaydedin.",
      tone: "danger", icon: <ArrowUpRight className="w-[18px] h-[18px]" />,
      disabled: materials.length === 0,
      onSelect: () => { setOpPicker(false); setTimeout(() => setOp("exit"), 140); },
    },
  ];

  const cardMenuActions: MobileActionRowItem[] = cardMenuMaterial ? [
    {
      id: "open", label: "Detayı Aç", description: "Stok durumu ve son hareketler.",
      tone: "neutral", icon: <Package className="w-[18px] h-[18px]" />,
      onSelect: () => { const id = cardMenuMaterial.id; setCardMenuId(null); setTimeout(() => setDetailId(id), 140); },
    },
    {
      id: "entry", label: "Stok Girişi", description: "Bu malzemeye giriş kaydı ekleyin.",
      tone: "success", icon: <ArrowDownLeft className="w-[18px] h-[18px]" />,
      onSelect: () => { setPresetMaterialId(cardMenuMaterial.id); setCardMenuId(null); setTimeout(() => setOp("entry"), 140); },
    },
    {
      id: "exit", label: "Stok Çıkışı", description: "Bu malzemeden çıkış kaydedin.",
      tone: "danger", icon: <ArrowUpRight className="w-[18px] h-[18px]" />,
      onSelect: () => { setPresetMaterialId(cardMenuMaterial.id); setCardMenuId(null); setTimeout(() => setOp("exit"), 140); },
    },
    {
      id: "history", label: "Hareketleri Gör", description: "Giriş ve çıkış geçmişi.",
      tone: "info", icon: <History className="w-[18px] h-[18px]" />,
      onSelect: () => {
        const name = cardMenuMaterial.name;
        setCardMenuId(null); setSearch(name); setView("movements");
      },
    },
    {
      id: "delete", label: "Malzemeyi Sil", description: "Stok kartını kalıcı olarak kaldırır.",
      destructive: true, icon: <Trash2 className="w-[18px] h-[18px]" />,
      onSelect: () => {
        const t = { id: cardMenuMaterial.id, name: cardMenuMaterial.name };
        setCardMenuId(null); setTimeout(() => setDeleteMaterialTarget(t), 140);
      },
    },
  ] : [];

  /* ---------------- render ---------------- */

  return (
    <div
      className="w-full no-overflow-x"
      style={{
        paddingLeft: "max(env(safe-area-inset-left, 0px), 16px)",
        paddingRight: "max(env(safe-area-inset-right, 0px), 16px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)",
      }}
    >
      {/* 1 — compact page header (sits under the app shell header) */}
      <header className="flex items-center gap-2 pt-3 pb-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-semibold text-foreground leading-tight truncate">Stok Takibi</h1>
        </div>
        <button
          type="button"
          onClick={() => (projectId ? setOpPicker(true) : setProjectPicker(true))}
          aria-label="Stok işlemi oluştur"
          className="w-11 h-11 shrink-0 rounded-[13px] bg-primary text-primary-foreground flex items-center justify-center active:opacity-90"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      {/* project scope */}
      <button
        type="button"
        onClick={() => setProjectPicker(true)}
        className="w-full h-12 px-3.5 mb-3 rounded-[13px] border border-border bg-card flex items-center justify-between gap-2 active:bg-muted/50"
      >
        <span className="flex items-center gap-2 min-w-0">
          <Package className="w-4 h-4 text-primary shrink-0" />
          <span className={cn("text-[15px] truncate", projectId ? "text-foreground" : "text-muted-foreground")}>
            {projectName}
          </span>
        </span>
        <span className="text-[13px] text-primary shrink-0">Değiştir</span>
      </button>

      {!projectId ? (
        <div className="rounded-[16px] border border-border/70 bg-card p-6 text-center">
          <div className="text-[28px] mb-2">📦</div>
          <h2 className="text-[16px] font-semibold text-foreground">Önce bir proje seçin</h2>
          <p className="text-[13.5px] text-muted-foreground mt-1.5 leading-snug">
            Stok her projede ayrı takip edilir. Proje seçtiğinizde malzeme kartları ve hareketler listelenir.
          </p>
          <button
            type="button"
            onClick={() => setProjectPicker(true)}
            className="mt-4 h-12 w-full rounded-[13px] bg-primary text-primary-foreground text-[15px] font-semibold active:opacity-90"
          >
            Proje Seç
          </button>
        </div>
      ) : (
        <>
          {/* 2 — search + segmented control */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Malzeme veya işlem ara"
              className="w-full h-12 pl-9 pr-11 rounded-[13px] bg-card border border-border text-[16px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Aramayı temizle"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Stok görünümü"
            className="flex items-center gap-1 p-1 mb-4 rounded-[14px] bg-muted/50 border border-border/60"
          >
            {([["cards", "Stok Kartları"], ["movements", "Hareketler"]] as const).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={view === id}
                onClick={() => setView(id)}
                className={cn(
                  "flex-1 h-[42px] rounded-[11px] text-[14.5px] font-medium transition-colors",
                  view === id
                    ? "bg-primary/15 text-primary border border-primary/25"
                    : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 19 — one compact, real AI insight */}
          {criticalCount > 0 && !aiDismissed && (
            <div className="rounded-[16px] border border-primary/25 bg-primary/[0.06] p-3.5 mb-4 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] text-foreground leading-snug">
                  {criticalCount} malzeme kritik stok seviyesinde.
                </p>
                <button
                  type="button"
                  onClick={() => { setView("cards"); setSearch(""); }}
                  className="mt-1.5 text-[13.5px] font-semibold text-primary"
                >
                  Kritikleri Gör
                </button>
              </div>
              <button
                type="button"
                onClick={() => setAiDismissed(true)}
                aria-label="Öneriyi kapat"
                className="w-8 h-8 -mt-1 -mr-1 rounded-full flex items-center justify-center text-muted-foreground shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {isLoading ? (
            <SkeletonList rows={5} />
          ) : view === "cards" ? (
            filteredStock.length === 0 ? (
              <EmptyBlock
                icon="🧱"
                title={withStatus.length === 0 ? "Bu projede malzeme yok" : "Eşleşen malzeme yok"}
                text={withStatus.length === 0
                  ? "İlk stok kartını tanımlayın, ardından giriş kaydı ekleyin."
                  : "Aramayı temizleyerek tüm kartları görebilirsiniz."}
                actionLabel={withStatus.length === 0 ? "Yeni Malzeme Tanımla" : "Aramayı Temizle"}
                onAction={() => (withStatus.length === 0 ? setOp("material") : setSearch(""))}
              />
            ) : (
              <div className="flex flex-col gap-3">
                {filteredStock.map(m => (
                  <MobileStockCard
                    key={m.id}
                    item={{
                      id: m.id, name: m.name, unit: m.unit, currentStock: m.currentStock,
                      min_stock: m.min_stock, status: m.status,
                      location: project?.name, lastMovement: lastMovementOf(m.id),
                    }}
                    fmt={fmt}
                    onOpen={() => setDetailId(m.id)}
                    onMenu={() => setCardMenuId(m.id)}
                  />
                ))}
              </div>
            )
          ) : filteredMovements.length === 0 ? (
            <EmptyBlock
              icon="📋"
              title={movements.length === 0 ? "Henüz stok hareketi yok" : "Eşleşen hareket yok"}
              text={movements.length === 0
                ? "Giriş ve çıkış kaydettikçe hareketler burada tarihe göre gruplanır."
                : "Aramayı temizleyerek tüm hareketleri görebilirsiniz."}
              actionLabel={movements.length === 0 ? "Stok Girişi" : "Aramayı Temizle"}
              onAction={() => (movements.length === 0 ? setOp("entry") : setSearch(""))}
            />
          ) : (
            <MobileMovementsList movements={filteredMovements} fmt={fmt} onOpen={setMovementDetail} />
          )}
        </>
      )}

      {/* ---------- sheets ---------- */}

      <MobileSelectorSheet
        open={projectPicker}
        onOpenChange={setProjectPicker}
        title="Proje / Depo Seç"
        description="Stok kayıtları seçtiğiniz projeye bağlıdır."
        options={projects.map(p => ({ id: p.id, label: p.name }))}
        value={projectId}
        onSelect={(id) => { setProjectId(id); setSearch(""); }}
        searchPlaceholder="Proje ara"
        emptyText="Kayıtlı proje bulunamadı."
      />

      <MobileSheet
        open={opPicker}
        onOpenChange={setOpPicker}
        title="Stok İşlemi"
        description="Yapmak istediğiniz işlemi seçin."
        variant="action"
      >
        <MobileActionRows items={operations} />
        {materials.length === 0 && (
          <p className="text-[12.5px] text-muted-foreground pb-2">
            Giriş ve çıkış kaydı için önce en az bir malzeme kartı tanımlamalısınız.
          </p>
        )}
      </MobileSheet>

      <MobileSheet
        open={!!cardMenuId}
        onOpenChange={(v) => { if (!v) setCardMenuId(null); }}
        title={cardMenuMaterial?.name ?? "Malzeme"}
        description="Bu malzeme için yapmak istediğiniz işlemi seçin."
        variant="action"
      >
        <MobileActionRows items={cardMenuActions} />
      </MobileSheet>

      <MobileSheet
        open={!!detailId}
        onOpenChange={(v) => { if (!v) setDetailId(null); }}
        title={detailMaterial?.name ?? "Malzeme"}
        description={detailMaterial ? `${projectName} · ${detailMaterial.unit}` : undefined}
        variant="detail"
      >
        {detailMaterial && (
          <div className="flex flex-col gap-3 pb-2">
            <div className="rounded-[16px] border border-border/70 bg-background/40 p-4">
              <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Mevcut stok</div>
              <div className="text-[30px] font-semibold text-foreground leading-none mt-1 tabular-nums">
                {fmt(detailMaterial.currentStock)} <span className="text-[14px] font-normal text-muted-foreground">{detailMaterial.unit}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/60">
                {[
                  ["Toplam giriş", `${fmt(detailMaterial.totalIn)}`],
                  ["Toplam çıkış", `${fmt(detailMaterial.totalOut)}`],
                  ["Min. stok", `${fmt(detailMaterial.min_stock)}`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[11.5px] text-muted-foreground">{k}</div>
                    <div className="text-[14px] text-foreground tabular-nums">{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setPresetMaterialId(detailMaterial.id); setDetailId(null); setTimeout(() => setOp("entry"), 140); }}
                className="h-12 rounded-[13px] border border-border text-[15px] font-medium text-foreground active:bg-muted"
              >
                Stok Girişi
              </button>
              <button
                type="button"
                onClick={() => { setPresetMaterialId(detailMaterial.id); setDetailId(null); setTimeout(() => setOp("exit"), 140); }}
                className="h-12 rounded-[13px] border border-border text-[15px] font-medium text-foreground active:bg-muted"
              >
                Stok Çıkışı
              </button>
            </div>
            <div className="text-[12px] uppercase tracking-wide text-muted-foreground mt-1">Son hareketler</div>
            {movements.filter(mv => mv.materialName === detailMaterial.name).slice(0, 5).length === 0 ? (
              <p className="text-[13.5px] text-muted-foreground">Bu kalem için hareket kaydı yok.</p>
            ) : (
              <div className="rounded-[16px] border border-border/70 divide-y divide-border/60">
                {movements.filter(mv => mv.materialName === detailMaterial.name).slice(0, 5).map(mv => (
                  <div key={mv.id} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                    <span className="text-[13.5px] text-muted-foreground">
                      {mv.kind === "in" ? "Giriş" : "Çıkış"} · {new Date(mv.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                    </span>
                    <span className={cn("text-[14px] font-medium tabular-nums", mv.kind === "in" ? "text-emerald-400" : "text-amber-400")}>
                      {mv.kind === "in" ? "+" : "−"}{fmt(mv.qty)} {mv.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </MobileSheet>

      {op === "material" && (
        <NewMaterialSheet
          open
          onClose={() => setOp(null)}
          projectName={projectName}
          busy={saving}
          onSubmit={handleAddMaterial}
        />
      )}

      {op === "entry" && (
        <StockEntrySheet
          open
          onClose={() => { setOp(null); setPresetMaterialId(null); }}
          materials={materialOptions}
          suppliers={suppliers}
          projectName={projectName}
          presetMaterialId={presetMaterialId}
          busy={saving}
          fmt={fmt}
          fmtMoney={fmtMoney}
          onCreateMaterial={() => { setOp(null); setTimeout(() => setOp("material"), 140); }}
          onSubmit={handleEntry}
        />
      )}

      {op === "exit" && (
        <StockExitSheet
          open
          onClose={() => { setOp(null); setPresetMaterialId(null); }}
          materials={materialOptions}
          workItems={workItems}
          projectName={projectName}
          presetMaterialId={presetMaterialId}
          busy={saving}
          fmt={fmt}
          onSubmit={handleExit}
        />
      )}

      <MovementDetailSheet
        movement={movementDetail}
        onClose={() => setMovementDetail(null)}
        fmt={fmt}
        fmtMoney={fmtMoney}
        projectName={projectName}
        canDelete={!!user && movementDetail?.sourceType !== "site_diary"}
        onDelete={(m) => setDeleteMovementTarget(m)}
        onOpenDocument={(m) =>
          window.dispatchEvent(new CustomEvent("navigate-tab", { detail: { tab: "site-diary", entryId: (m as any).sourceId } }))}
      />

      <MobileConfirmSheet
        open={!!deleteMovementTarget}
        onOpenChange={(v) => { if (!v) setDeleteMovementTarget(null); }}
        title="Stok hareketi iptal edilsin mi?"
        description="Bu stok hareketini iptal etmek mevcut miktarı yeniden hesaplayacaktır."
        confirmLabel="Hareketi İptal Et"
        tone="danger"
        busy={saving}
        onConfirm={confirmDeleteMovement}
      />

      <MobileConfirmSheet
        open={!!deleteMaterialTarget}
        onOpenChange={(v) => { if (!v) setDeleteMaterialTarget(null); }}
        title="Malzeme kartı silinsin mi?"
        description={`“${deleteMaterialTarget?.name ?? ""}” kartı silinecek; bu kaleme ait stok geçmişi listelerde görünmez olacak.`}
        confirmLabel="Malzemeyi Sil"
        tone="danger"
        busy={saving}
        onConfirm={confirmDeleteMaterial}
      />
    </div>
  );
}

function EmptyBlock({
  icon, title, text, actionLabel, onAction,
}: { icon: string; title: string; text: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="rounded-[16px] border border-border/70 bg-card p-6 text-center">
      <div className="text-[26px] mb-2">{icon}</div>
      <h2 className="text-[15.5px] font-semibold text-foreground">{title}</h2>
      <p className="text-[13.5px] text-muted-foreground mt-1.5 leading-snug">{text}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-4 h-12 w-full rounded-[13px] bg-primary text-primary-foreground text-[15px] font-semibold active:opacity-90"
      >
        {actionLabel}
      </button>
    </div>
  );
}
