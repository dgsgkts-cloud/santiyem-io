// DEPO — Transferler listesi. Gerçek kayıtlar: talep → onay → sevk → teslim.
//
// Filtreler URL arama parametrelerinde tutulur (bkz. transferFilters.ts), bu
// yüzden detay sayfasına gidip geri dönüldüğünde veya sayfa yenilendiğinde
// arama/durum/depo/tarih/sıralama seçimleri korunur.
import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeftRight, Eye, Plus, Search } from "lucide-react";
import { SectionCard } from "@/components/ui/responsive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import {
  useInventoryTransfers, useTransferPage,
  type TransferListRow, type TransferRow,
} from "@/hooks/useInventoryTransfers";
import { useDepotPermissions } from "@/hooks/useDepotPermissions";
import {
  TRANSFER_STAGES, TRANSFER_STATUS_LABEL, TRANSFER_STATUS_TONE, TRANSFER_ACTION_LABEL,
  availableTransferActions, transferProgress, overdueInfo, discrepancyTotal,
  type TransferAction, type TransferActor, type TransferStatus,
} from "@/lib/inventory/transferModel";
import {
  DEFAULT_TRANSFER_FILTERS, TRANSFER_SORT_LABEL,
  parseTransferFilters, serializeTransferFilters,
  type TransferFilterState, type TransferSort,
} from "@/lib/inventory/transferFilters";
import type { WarehouseData } from "../useWarehouseData";
import { InsufficientData } from "../warehouseUi";
import { TRUTH_COPY, fmtQty } from "../inventoryTruth";
import { CreateTransferDialog, TransferActionDialog } from "../TransferDialogs";
import { TransferDetailSheet } from "../TransferDetailSheet";


interface Props { data: WarehouseData }

const BUCKETS: { key: TransferFilterState["bucket"]; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "open", label: "Açık" },
  { key: "pending", label: "Onay Bekleyen" },
  { key: "transit", label: "Yolda" },
  { key: "closed", label: "Kapanan" },
];

const STATUS_OPTIONS = Object.keys(TRANSFER_STATUS_LABEL) as TransferStatus[];

export const TransfersView = ({ data }: Props) => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const { permissions } = useDepotPermissions();

  const filters = useMemo(() => parseTransferFilters(sp), [sp]);
  const { rows, total, pageCount, page, isLoading, isFetching } = useTransferPage(filters);

  const createOpen = sp.get("yeni") === "1";
  const quickId = sp.get("onizleme");
  const actionParam = sp.get("islem") as TransferAction | null;
  const actionId = sp.get("islemId");

  /** Filtreleri URL'e yazar; diğer parametreler (panel durumları) korunur. */
  const patch = (p: Partial<TransferFilterState>) => {
    const next = { ...filters, ...p };
    if (!("page" in p)) next.page = 1;
    const base = serializeTransferFilters(next);
    const tab = sp.get("sekme");
    if (tab) base.set("sekme", tab);
    setSp(base, { replace: true });
  };

  const setPanel = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp);
    if (value === null) next.delete(key); else next.set(key, value);
    setSp(next, { replace: true });
  };

  const openAction = (a: TransferAction, t: TransferRow) => {
    const next = new URLSearchParams(sp);
    next.set("islem", a);
    next.set("islemId", t.id);
    next.delete("onizleme");
    setSp(next, { replace: true });
  };

  const closeAction = () => {
    const next = new URLSearchParams(sp);
    next.delete("islem"); next.delete("islemId");
    setSp(next, { replace: true });
  };

  const actor: TransferActor = {
    userId: user?.id ?? null,
    isOwner: permissions.approve_transfer && permissions.override_safety_stock,
    permissions,
  };

  const nameOfMaterial = (id: string) => data.items.find((i) => i.id === id)?.name ?? "—";
  const nameOfWarehouse = (id: string) => data.warehouses.find((w) => w.id === id)?.name ?? "—";

  /** Sayfa numarası aralık dışına düşerse URL son geçerli sayfaya normalize edilir. */
  useEffect(() => {
    if (!isLoading && filters.page !== page) patch({ page });
  }, [isLoading, page, filters.page]);

  /** Detaya giderken mevcut liste adresi "geri" parametresinde taşınır. */
  const openDetail = (t: TransferRow) => {
    const qs = serializeTransferFilters(filters);
    qs.set("sekme", "transferler");
    navigate(`/depo/transferler/${t.id}?geri=${encodeURIComponent(`/depo?${qs.toString()}`)}`);
  };

  const activeWarehouses = data.warehouses;
  const quick = quickId ? rows.find((t) => t.id === quickId) ?? null : null;
  const actionTransfer = actionId ? rows.find((t) => t.id === actionId) ?? null : null;
  const hasActiveFilters =
    !!filters.q || filters.bucket !== "all" || !!filters.status || !!filters.source ||
    !!filters.dest || !!filters.from || !!filters.to || filters.overdue || filters.discrepancy;


  const header = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.q}
            onChange={(e) => patch({ q: e.target.value })}
            placeholder="Transfer no, malzeme veya depo ara"
            className="pl-8 min-h-[44px] text-base sm:text-fs-sm"
          />
        </div>
        {permissions.create_transfer && (
          <Button onClick={() => setPanel("yeni", "1")} className="min-h-[44px]">
            <Plus className="w-4 h-4 mr-1.5" /> Yeni Transfer
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {BUCKETS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => patch({ bucket: f.key })}
            className={cn(
              "px-2.5 h-9 rounded-pill ds-caption border transition-colors whitespace-nowrap",
              filters.bucket === f.key
                ? "border-[#FF6B2B]/40 bg-[#FF6B2B]/[0.10] text-[#FF6B2B]"
                : "border-border/70 bg-card text-muted-foreground hover:bg-muted/25",
            )}
          >
            {f.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => patch({ overdue: !filters.overdue })}
          className={cn("px-2.5 h-9 rounded-pill ds-caption border transition-colors whitespace-nowrap",
            filters.overdue
              ? "border-rose-500/40 bg-rose-500/[0.10] text-rose-300"
              : "border-border/70 bg-card text-muted-foreground hover:bg-muted/25")}
        >
          Geciken
        </button>
        <button
          type="button"
          onClick={() => patch({ discrepancy: !filters.discrepancy })}
          className={cn("px-2.5 h-9 rounded-pill ds-caption border transition-colors whitespace-nowrap",
            filters.discrepancy
              ? "border-rose-500/40 bg-rose-500/[0.10] text-rose-300"
              : "border-border/70 bg-card text-muted-foreground hover:bg-muted/25")}
        >
          Uyuşmazlık
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
        <Select value={filters.status || "all"} onValueChange={(v) => patch({ status: v === "all" ? "" : (v as TransferStatus) })}>
          <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm durumlar</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{TRANSFER_STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.source || "all"} onValueChange={(v) => patch({ source: v === "all" ? "" : v })}>
          <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Kaynak depo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm kaynak depolar</SelectItem>
            {activeWarehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.dest || "all"} onValueChange={(v) => patch({ dest: v === "all" ? "" : v })}>
          <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Hedef depo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm hedef depolar</SelectItem>
            {activeWarehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={filters.from} onChange={(e) => patch({ from: e.target.value })}
            className="min-h-[44px] text-base sm:text-fs-sm" aria-label="Başlangıç tarihi" />
          <Input type="date" value={filters.to} onChange={(e) => patch({ to: e.target.value })}
            className="min-h-[44px] text-base sm:text-fs-sm" aria-label="Bitiş tarihi" />
        </div>
        <Select value={filters.sort} onValueChange={(v) => patch({ sort: v as TransferSort })}>
          <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Sıralama" /></SelectTrigger>
          <SelectContent>
            {(Object.keys(TRANSFER_SORT_LABEL) as TransferSort[]).map((s) => (
              <SelectItem key={s} value={s}>{TRANSFER_SORT_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 min-w-0">
      {header}

      {isLoading ? (
        <InsufficientData icon={ArrowLeftRight} title="Transfer kayıtları yükleniyor." />
      ) : transfers.length === 0 ? (
        <div className="space-y-3">
          <InsufficientData
            icon={ArrowLeftRight}
            title={TRUTH_COPY.noTransfers}
            hint="Yeni Transfer ile talep oluşturduğunuzda akış burada takip edilir."
          />
          <SectionCard title="Transfer Akışı" subtitle="Kayıt oluşturulduğunda izlenecek durumlar">
            <ol className="flex items-center gap-2 flex-wrap">
              {TRANSFER_STAGES.map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="px-2.5 h-8 inline-flex items-center rounded-pill ds-caption border border-border/70 bg-card text-muted-foreground">
                    {i + 1}. {s}
                  </span>
                  {i < TRANSFER_STAGES.length - 1 && <span className="text-muted-foreground">→</span>}
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      ) : rows.length === 0 ? (
        <div className="space-y-2">
          <InsufficientData icon={Search} title="Bu filtreye uyan transfer bulunmuyor." />
          <Button variant="outline" className="min-h-[44px]"
            onClick={() => patch({ ...DEFAULT_TRANSFER_FILTERS })}>
            Filtreleri temizle
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((t) => {
            const p = transferProgress(t);
            const acts = availableTransferActions(t, actor);
            const od = overdueInfo(t);
            const disc = discrepancyTotal(t);
            const primary = acts[0] ?? null;
            const secondary = acts.slice(1);
            return (
              <article
                key={t.id}
                className="rounded-card border border-border/60 bg-background/40 hover:bg-muted/20 transition-colors min-w-0"
              >
                <button
                  type="button"
                  onClick={() => openDetail(t)}
                  className="w-full text-left p-3 space-y-2 min-w-0"
                  style={{ minHeight: 68 }}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="ds-body text-foreground truncate">
                        {nameOfMaterial(t.material_id)}
                        <span className="text-muted-foreground"> · {fmtQty(t.requested_quantity)} {t.unit}</span>
                      </p>
                      <p className="ds-caption text-muted-foreground break-words">
                        {t.transfer_no} · {nameOfWarehouse(t.source_warehouse_id)} → {nameOfWarehouse(t.dest_warehouse_id)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      {od.overdue && (
                        <span className="text-fs-xs px-2 py-0.5 rounded-full border border-rose-500/25 bg-rose-500/[0.08] text-rose-300/90 whitespace-nowrap">
                          {od.days} gün gecikme
                        </span>
                      )}
                      {disc > 0 && (
                        <span className="text-fs-xs px-2 py-0.5 rounded-full border border-rose-500/25 bg-rose-500/[0.08] text-rose-300/90 whitespace-nowrap">
                          Uyuşmazlık
                        </span>
                      )}
                      <span className={cn("text-fs-xs px-2 py-0.5 rounded-full border whitespace-nowrap",
                        TRANSFER_STATUS_TONE[t.status as TransferStatus])}>
                        {TRANSFER_STATUS_LABEL[t.status as TransferStatus] ?? t.status}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="ds-caption text-muted-foreground">Transfer Akışı</span>
                      <span className="ds-caption text-muted-foreground">{p.label}</span>
                    </div>
                    <div className="h-[5px] w-full rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all",
                          p.failed ? "bg-rose-400/80" : "bg-emerald-400/80")}
                        style={{ width: `${Math.round(p.ratio * 100)}%` }}
                      />
                    </div>
                    {t.in_transit_quantity > 0 && (
                      <p className="ds-caption text-indigo-300/90">
                        Yolda: {fmtQty(t.in_transit_quantity)} {t.unit}
                      </p>
                    )}
                  </div>
                </button>

                <div className="flex flex-wrap items-center gap-2 px-3 pb-3">
                  {primary && (
                    <Button
                      size="sm"
                      className="min-h-[40px]"
                      onClick={() => openAction(primary, t)}
                    >
                      {TRANSFER_ACTION_LABEL[primary]}
                    </Button>
                  )}
                  {secondary.length > 0 && (
                    <Select value="" onValueChange={(v) => openAction(v as TransferAction, t)}>
                      <SelectTrigger className="min-h-[40px] w-auto min-w-[150px]">
                        <SelectValue placeholder="Diğer işlemler" />
                      </SelectTrigger>
                      <SelectContent>
                        {secondary.map((a) => (
                          <SelectItem key={a} value={a}>{TRANSFER_ACTION_LABEL[a]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button size="sm" variant="ghost" className="min-h-[40px]"
                    onClick={() => setPanel("onizleme", t.id)}>
                    <Eye className="w-4 h-4 mr-1.5" /> Hızlı Bakış
                  </Button>
                  <Button size="sm" variant="outline" className="min-h-[40px]" onClick={() => openDetail(t)}>
                    Detayı Aç
                  </Button>
                </div>
              </article>
            );
          })}

          {pageCount > 1 && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button variant="outline" className="min-h-[44px]" disabled={page <= 1}
                onClick={() => patch({ page: page - 1 })}>Önceki</Button>
              <span className="ds-caption text-muted-foreground">{page} / {pageCount}</span>
              <Button variant="outline" className="min-h-[44px]" disabled={page >= pageCount}
                onClick={() => patch({ page: page + 1 })}>Sonraki</Button>
            </div>
          )}
        </div>
      )}

      <CreateTransferDialog open={createOpen} onClose={() => setPanel("yeni", null)} data={data} />
      <TransferActionDialog
        action={actionTransfer ? actionParam : null}
        transfer={actionTransfer}
        materialName={actionTransfer ? nameOfMaterial(actionTransfer.material_id) : ""}
        onClose={closeAction}
      />
      <TransferDetailSheet
        transfer={quick}
        onClose={() => setPanel("onizleme", null)}
        actor={actor}
        materialName={quick ? nameOfMaterial(quick.material_id) : ""}
        sourceName={quick ? nameOfWarehouse(quick.source_warehouse_id) : ""}
        destName={quick ? nameOfWarehouse(quick.dest_warehouse_id) : ""}
        onAction={(a, t) => openAction(a, t)}
        onOpenFull={(t) => openDetail(t)}
      />
    </div>
  );
};

export default TransfersView;
