// RFQ (Teklif Toplama) workspace: supplier list, quotation comparison,
// selection and order conversion. Every action is status-aware, permission
// checked and produces feedback — no silent no-ops.
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  Download,
  Eye,
  FileText,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Truck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ResponsiveTable,
  SectionCard,
  type ResponsiveColumn,
} from "@/components/ui/responsive";
import type { Order, Request, Supplier } from "./procurementConstants";
import {
  RFQ_ACTION_LABELS,
  actionsForRfq,
  buildComparison,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  isDeadlinePassed,
  isQuotationExpired,
  type RfqAction,
  type RfqRecord,
  type RfqSupplierEntry,
  type ScoredEntry,
} from "./rfq/rfqModel";
import { useRfqWorkflow } from "./rfq/useRfqWorkflow";
import {
  BestBadge,
  MetaItem,
  QuoteStatusPill,
  RfqStatusPill,
  ScoreChip,
  TableSkeleton,
} from "./rfq/rfqUi";
import {
  AddSuppliersDialog,
  ConfirmSelectionDialog,
  ConvertToOrderDialog,
  DeadlineDialog,
  QuotationDetailDialog,
  RecordQuotationDialog,
  RequestRevisionDialog,
  RfqConfirmDialog,
  ScoreExplainerDialog,
} from "./rfq/RfqDialogs";

const ACTION_ICONS: Partial<Record<RfqAction, typeof Send>> = {
  send: Send,
  add_supplier: Plus,
  remind: BellRing,
  update_deadline: CalendarClock,
  confirm_selection: ArrowRight,
  change_selection: RefreshCw,
  export_comparison: Download,
  create_order: Package,
  open_order: FileText,
  track_delivery: Truck,
  cancel: XCircle,
};

type SortKey = "score" | "price" | "delivery" | "supplier";

interface Props {
  /** approved / RFQ-stage purchase requests from the request workflow */
  requests: Request[];
  suppliers: Supplier[];
  loading?: boolean;
  activeRequestId?: string | null;
  onActiveRequestChange?: (id: string) => void;
  actor: string;
  onOpenOrder?: (order: Order | null) => void;
  onTrackDelivery?: () => void;
  onOpenRequest?: (requestId: string) => void;
}

export const ProcurementRFQView = ({
  requests,
  suppliers,
  loading,
  activeRequestId,
  onActiveRequestChange,
  actor,
  onOpenOrder,
  onTrackDelivery,
  onOpenRequest,
}: Props) => {
  const workflow = useRfqWorkflow(requests, suppliers);
  const records = workflow.records;

  const [localId, setLocalId] = useState<string | null>(activeRequestId ?? null);
  useEffect(() => {
    if (activeRequestId) setLocalId(activeRequestId);
  }, [activeRequestId]);

  const rfq = useMemo(
    () => records.find((r) => r.requestId === localId) ?? records[0] ?? null,
    [records, localId]
  );

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("score");

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [quoteTarget, setQuoteTarget] = useState<RfqSupplierEntry | null>(null);
  const [revisionTarget, setRevisionTarget] = useState<RfqSupplierEntry | null>(null);
  const [detailTarget, setDetailTarget] = useState<RfqSupplierEntry | null>(null);
  const [removeTarget, setRemoveTarget] = useState<RfqSupplierEntry | null>(null);
  const [selectTarget, setSelectTarget] = useState<RfqSupplierEntry | null>(null);
  const [scoreTarget, setScoreTarget] = useState<ScoredEntry | null>(null);

  const comparison = useMemo(() => (rfq ? buildComparison(rfq) : []), [rfq]);

  // Keep open dialogs bound to the freshest entry after a mutation.
  const syncEntry = (entry: RfqSupplierEntry | null) =>
    entry && rfq
      ? rfq.suppliers.find((s) => s.supplierId === entry.supplierId) ?? null
      : null;

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    let list = comparison.filter((c) => {
      if (q && !c.entry.supplierName.toLocaleLowerCase("tr").includes(q)) return false;
      if (statusFilter === "quoted" && !c.entry.quotation) return false;
      if (statusFilter === "waiting" && c.entry.quotation) return false;
      if (statusFilter === "revision" && c.entry.status !== "Revizyon İstendi") return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      const aq = a.entry.quotation;
      const bq = b.entry.quotation;
      if (sortKey === "supplier")
        return a.entry.supplierName.localeCompare(b.entry.supplierName, "tr");
      if (!aq && !bq) return 0;
      if (!aq) return 1;
      if (!bq) return -1;
      if (sortKey === "price") return aq.total - bq.total;
      if (sortKey === "delivery") return aq.deliveryDays - bq.deliveryDays;
      return (b.score?.total ?? 0) - (a.score?.total ?? 0);
    });
    return list;
  }, [comparison, query, statusFilter, sortKey]);

  const cheapestTotal = useMemo(() => {
    const totals = comparison
      .map((c) => c.entry.quotation?.total)
      .filter((t): t is number => typeof t === "number");
    return totals.length ? Math.min(...totals) : 0;
  }, [comparison]);

  const quotedCount = comparison.filter((c) => !!c.entry.quotation).length;

  const exportComparison = () => {
    if (!rfq) return;
    if (!quotedCount) {
      toast.error("Dışa aktarılacak teklif bulunmuyor.");
      return;
    }
    const header = [
      "Tedarikçi",
      "Durum",
      "Toplam",
      "Para Birimi",
      "Teslim (gün)",
      "Ödeme",
      "Garanti",
      "Teknik",
      "Puan",
    ];
    const lines = comparison.map((c) => {
      const q = c.entry.quotation;
      return [
        c.entry.supplierName,
        c.entry.status,
        q ? Math.round(q.total) : "",
        q?.currency ?? "",
        q?.deliveryDays ?? "",
        q?.paymentTerm ?? "",
        q?.warranty ?? "",
        q?.technical ?? "",
        c.score?.total ?? "",
      ].join(";");
    });
    const csv = `\uFEFF${[header.join(";"), ...lines].join("\n")}`;
    try {
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${rfq.no}-teklif-karsilastirma.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Teklif karşılaştırması indirildi.");
    } catch {
      toast.error("Dosya oluşturulamadı. Lütfen tekrar deneyin.");
    }
  };

  const runAction = async (action: RfqAction) => {
    if (!rfq) return;
    if (!workflow.can(action)) {
      toast.error("Bu işlem için yetkiniz bulunmuyor.");
      return;
    }
    switch (action) {
      case "add_supplier":
        setAddOpen(true);
        return;
      case "send":
        await workflow.send(rfq.requestId, actor);
        return;
      case "remind":
        await workflow.remind(rfq.requestId, actor);
        return;
      case "update_deadline":
        setDeadlineOpen(true);
        return;
      case "confirm_selection": {
        const candidate = rfq.suppliers.find(
          (s) => s.supplierId === rfq.candidateSupplierId
        );
        if (!candidate) {
          toast.error("Önce karşılaştırma tablosundan bir tedarikçi seçin.");
          return;
        }
        setSelectTarget(candidate);
        return;
      }
      case "change_selection":
        await workflow.changeSelection(rfq.requestId, actor);
        return;
      case "export_comparison":
        exportComparison();
        return;
      case "create_order":
        setOrderOpen(true);
        return;
      case "open_order":
        if (onOpenOrder) onOpenOrder(workflow.orders.find((o) => o.no === rfq.orderNo) ?? null);
        else toast.info(`${rfq.orderNo ?? "Sipariş"} sipariş listesinde görüntülenebilir.`);
        return;
      case "track_delivery":
        if (onTrackDelivery) onTrackDelivery();
        else toast.info("Teslimat takibi sipariş kaydı üzerinden yapılır.");
        return;
      case "cancel":
        setCancelOpen(true);
        return;
      default:
        toast.error("Bu işlem şu anda kullanılamıyor.");
    }
  };

  if (loading) {
    return (
      <SectionCard title="Teklif Toplama (RFQ)" subtitle="Yükleniyor">
        <TableSkeleton />
      </SectionCard>
    );
  }

  if (!rfq) {
    return (
      <SectionCard
        title="Teklif Toplama (RFQ)"
        subtitle="Onaylanmış taleplerden RFQ oluşturarak teklif toplamaya başlayın"
      >
        <div className="py-10 text-center space-y-3">
          <p className="text-fs-sm text-foreground">Henüz teklif toplama kaydı yok.</p>
          <p className="text-fs-sm text-muted-foreground max-w-md mx-auto">
            Talepler sekmesinde onaylanmış bir talebi açıp "RFQ Oluştur" ile tedarikçi ve son
            tarih belirleyin.
          </p>
        </div>
      </SectionCard>
    );
  }

  const plan = actionsForRfq(rfq);
  const busy = (action: RfqAction) => workflow.isPending(rfq.requestId, action);
  const overdue = isDeadlinePassed(rfq) && rfq.status !== "Siparişe Dönüştürüldü";

  const actionButton = (
    action: RfqAction | undefined,
    variant: "default" | "outline" | "ghost"
  ) => {
    if (!action) return null;
    const Icon = ACTION_ICONS[action];
    const disabled = !workflow.can(action) || busy(action);
    return (
      <Button
        key={action}
        variant={variant}
        size="sm"
        disabled={disabled}
        onClick={() => runAction(action)}
        title={!workflow.can(action) ? "Bu işlem için yetkiniz bulunmuyor." : undefined}
        className="min-h-[36px]"
      >
        {Icon && <Icon className="w-3.5 h-3.5 mr-1.5" />}
        {busy(action) ? "İşleniyor…" : RFQ_ACTION_LABELS[action]}
      </Button>
    );
  };

  const columns: ResponsiveColumn<ScoredEntry>[] = [
    {
      key: "supplier",
      header: "Tedarikçi",
      primary: true,
      cell: (c) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-foreground font-medium">{c.entry.supplierName}</span>
          {c.badges.map((b) => (
            <BestBadge key={b} label={b} />
          ))}
          {isQuotationExpired(c.entry.quotation) && (
            <span className="text-fs-xs text-red-400">Süresi geçti</span>
          )}
        </span>
      ),
    },
    {
      key: "status",
      header: "Durum",
      align: "center",
      cell: (c) => <QuoteStatusPill status={c.entry.status} />,
    },
    {
      key: "total",
      header: "Toplam",
      align: "right",
      cell: (c) =>
        c.entry.quotation ? (
          <span className="font-semibold text-foreground">
            {fmtMoney(c.entry.quotation.total, c.entry.quotation.currency)}
          </span>
        ) : (
          <span className="text-muted-foreground">Teklif yok</span>
        ),
    },
    {
      key: "delivery",
      header: "Teslim",
      align: "center",
      cell: (c) => (
        <span className="text-muted-foreground">
          {c.entry.quotation ? `${c.entry.quotation.deliveryDays} gün` : "—"}
        </span>
      ),
    },
    {
      key: "payment",
      header: "Ödeme",
      align: "center",
      cell: (c) => (
        <span className="text-muted-foreground">{c.entry.quotation?.paymentTerm ?? "—"}</span>
      ),
    },
    {
      key: "technical",
      header: "Teknik",
      align: "center",
      cell: (c) => (
        <span className="text-muted-foreground">{c.entry.quotation?.technical ?? "—"}</span>
      ),
    },
    {
      key: "score",
      header: "Puan",
      align: "center",
      cell: (c) => (
        <ScoreChip
          score={c.score?.total ?? null}
          supplierName={c.entry.supplierName}
          onExplain={() => setScoreTarget(c)}
        />
      ),
    },
    {
      key: "actions",
      header: "Eylem",
      align: "right",
      cell: (c) => {
        const hasQuote = !!c.entry.quotation;
        const isCandidate = rfq.candidateSupplierId === c.entry.supplierId;
        const isSelected = rfq.selection?.supplierId === c.entry.supplierId;
        const comparing =
          rfq.status === "Karşılaştırma Aşamasında" || rfq.status === "Teklifler Bekleniyor";
        return (
          <span className="flex items-center justify-end gap-1.5">
            {!hasQuote ? (
              <Button
                size="sm"
                variant="outline"
                className="min-h-[32px]"
                disabled={
                  !workflow.can("record_quotation") || busy("record_quotation")
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setQuoteTarget(c.entry);
                }}
              >
                Teklif Gir
              </Button>
            ) : comparing ? (
              <Button
                size="sm"
                variant={isCandidate ? "default" : "outline"}
                className="min-h-[32px]"
                onClick={(e) => {
                  e.stopPropagation();
                  workflow.setCandidate(
                    rfq.requestId,
                    isCandidate ? null : c.entry.supplierId
                  );
                }}
              >
                {isCandidate ? "Seçili" : "Seç"}
              </Button>
            ) : (
              <span className="text-fs-xs text-muted-foreground">
                {isSelected ? "Seçildi" : "—"}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`${c.entry.supplierName} için diğer işlemler`}
                  className="min-h-[32px] min-w-[32px] grid place-items-center rounded-md text-muted-foreground hover:bg-muted"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDetailTarget(c.entry)}>
                  <Eye className="w-3.5 h-3.5 mr-2" /> Teklifi Görüntüle
                </DropdownMenuItem>
                {hasQuote && (
                  <DropdownMenuItem onClick={() => setQuoteTarget(c.entry)}>
                    <RefreshCw className="w-3.5 h-3.5 mr-2" /> Revize Teklif Gir
                  </DropdownMenuItem>
                )}
                {hasQuote && (
                  <DropdownMenuItem onClick={() => setRevisionTarget(c.entry)}>
                    <BellRing className="w-3.5 h-3.5 mr-2" /> Revizyon İste
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-red-400"
                  onClick={() => setRemoveTarget(c.entry)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> RFQ'dan Çıkar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Context header */}
      <SectionCard
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>
              {rfq.no} · {rfq.title}
            </span>
            <RfqStatusPill status={rfq.status} />
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{rfq.project}</span>
            <span aria-hidden>·</span>
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => onOpenRequest?.(rfq.requestId)}
            >
              {rfq.requestNo}
            </button>
            <span aria-hidden>·</span>
            <span className={cn(overdue && "text-red-400")}>
              Son teklif tarihi {fmtDate(rfq.deadline)}
              {overdue ? " (süre doldu)" : ""}
            </span>
          </span>
        }
        action={
          <span className="flex flex-wrap items-center gap-2">
            {records.length > 1 && (
              <Select
                value={rfq.requestId}
                onValueChange={(v) => {
                  setLocalId(v);
                  onActiveRequestChange?.(v);
                }}
              >
                <SelectTrigger className="h-9 w-[190px]" aria-label="RFQ seç">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {records.map((r) => (
                    <SelectItem key={r.requestId} value={r.requestId}>
                      {r.no} · {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {actionButton(plan.primary, "default")}
            {actionButton(plan.secondary, "outline")}
            {actionButton(plan.tertiary, "ghost")}
            {plan.overflow.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[36px]"
                    aria-label="Diğer RFQ işlemleri"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {plan.overflow.map((a) => (
                    <DropdownMenuItem
                      key={a}
                      disabled={!workflow.can(a)}
                      onClick={() => runAction(a)}
                    >
                      {RFQ_ACTION_LABELS[a]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </span>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetaItem label="Bütçe" value={fmtMoney(rfq.budget, rfq.currency)} />
          <MetaItem
            label="Teklifler"
            value={`${quotedCount} / ${rfq.suppliers.length} tedarikçi`}
          />
          <MetaItem label="Talep eden" value={rfq.requester} />
          <MetaItem label="Satın alma sorumlusu" value={rfq.owner} />
          <MetaItem
            label="Seçim"
            value={
              rfq.selection
                ? `${rfq.selection.supplierName} · ${fmtMoney(
                    rfq.selection.total,
                    rfq.selection.currency
                  )}`
                : "Henüz yapılmadı"
            }
          />
        </div>

        {rfq.selection && (
          <div className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-fs-sm">
            <p className="text-emerald-300">
              {rfq.selection.supplierName} seçildi ·{" "}
              {fmtMoney(rfq.selection.total, rfq.selection.currency)}
            </p>
            <p className="text-muted-foreground text-fs-xs mt-0.5">
              {rfq.selection.by} · {fmtDateTime(rfq.selection.at)} · Gerekçe:{" "}
              {rfq.selection.reason}
            </p>
          </div>
        )}
        {rfq.orderNo && (
          <p className="mt-2 text-fs-sm text-[#FF6B2B]">
            Sipariş oluşturuldu: {rfq.orderNo}
          </p>
        )}
      </SectionCard>

      {/* Comparison */}
      <SectionCard
        title="Teklif Karşılaştırması"
        subtitle={
          quotedCount
            ? "Puan; fiyat, teslim, ödeme, teknik uygunluk ve performans ağırlıklarıyla hesaplanır."
            : "Teklifler kaydedildikçe karşılaştırma burada oluşur."
        }
        action={
          <span className="flex flex-wrap items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tedarikçi ara"
              aria-label="Tedarikçi ara"
              className="h-9 w-[150px]"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[150px]" aria-label="Teklif durumu filtresi">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm tedarikçiler</SelectItem>
                <SelectItem value="quoted">Teklif verenler</SelectItem>
                <SelectItem value="waiting">Bekleyenler</SelectItem>
                <SelectItem value="revision">Revizyon istenenler</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-9 w-[150px]" aria-label="Sıralama">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Puana göre</SelectItem>
                <SelectItem value="price">Fiyata göre</SelectItem>
                <SelectItem value="delivery">Teslim süresine göre</SelectItem>
                <SelectItem value="supplier">Tedarikçi adına göre</SelectItem>
              </SelectContent>
            </Select>
          </span>
        }
      >
        {rows.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-fs-sm text-foreground">
              {rfq.suppliers.length === 0
                ? "Bu RFQ'ya henüz tedarikçi eklenmedi."
                : "Filtrelerle eşleşen tedarikçi yok."}
            </p>
            {rfq.suppliers.length === 0 && workflow.can("add_supplier") && (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Tedarikçi Ekle
              </Button>
            )}
          </div>
        ) : (
          <ResponsiveTable<ScoredEntry>
            columns={columns}
            rows={rows}
            rowKey={(c) => c.entry.supplierId}
            onRowClick={(c) => setDetailTarget(c.entry)}
          />
        )}
      </SectionCard>

      {/* Activity */}
      <SectionCard title="RFQ Geçmişi" subtitle="Tüm işlemler kullanıcı ve zaman damgasıyla kaydedilir">
        <ol className="space-y-3">
          {[...rfq.audit].reverse().map((a, i) => (
            <li key={`${a.at}-${i}`} className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#FF6B2B]" aria-hidden />
              <div className="min-w-0">
                <p className="text-fs-sm text-foreground">{a.event}</p>
                <p className="text-fs-xs text-muted-foreground">
                  {a.actor} · {fmtDateTime(a.at)}
                  {a.from && a.to ? ` · ${a.from} → ${a.to}` : ""}
                </p>
                {a.detail && (
                  <p className="text-fs-xs text-muted-foreground mt-0.5">{a.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </SectionCard>

      {/* Dialogs */}
      <AddSuppliersDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        rfq={rfq}
        catalog={suppliers}
        busy={busy("add_supplier")}
        onSubmit={async (picked) => {
          const ok = await workflow.addSuppliers({
            requestId: rfq.requestId,
            suppliers: picked.map((supplier) => ({ supplier })),
            actor,
          });
          if (ok) setAddOpen(false);
        }}
      />

      <DeadlineDialog
        open={deadlineOpen}
        onOpenChange={setDeadlineOpen}
        rfq={rfq}
        busy={busy("update_deadline")}
        onSubmit={async (iso) => {
          const ok = await workflow.updateDeadline(rfq.requestId, iso, actor);
          if (ok) setDeadlineOpen(false);
        }}
      />

      <RecordQuotationDialog
        open={!!quoteTarget}
        onOpenChange={(v) => !v && setQuoteTarget(null)}
        rfq={rfq}
        entry={syncEntry(quoteTarget)}
        busy={busy("record_quotation")}
        onSubmit={async (draft) => {
          if (!quoteTarget) return;
          const ok = await workflow.recordQuotation({
            requestId: rfq.requestId,
            supplierId: quoteTarget.supplierId,
            quotation: draft,
            actor,
          });
          if (ok) setQuoteTarget(null);
        }}
      />

      <RequestRevisionDialog
        open={!!revisionTarget}
        onOpenChange={(v) => !v && setRevisionTarget(null)}
        entry={syncEntry(revisionTarget)}
        busy={busy("request_revision")}
        onSubmit={async (note) => {
          if (!revisionTarget) return;
          const ok = await workflow.requestRevision(
            rfq.requestId,
            revisionTarget.supplierId,
            note,
            actor
          );
          if (ok) setRevisionTarget(null);
        }}
      />

      <QuotationDetailDialog
        open={!!detailTarget}
        onOpenChange={(v) => !v && setDetailTarget(null)}
        entry={syncEntry(detailTarget)}
      />

      <ScoreExplainerDialog
        open={!!scoreTarget}
        onOpenChange={(v) => !v && setScoreTarget(null)}
        supplierName={scoreTarget?.entry.supplierName}
        score={scoreTarget?.score ?? null}
      />

      <ConfirmSelectionDialog
        open={!!selectTarget}
        onOpenChange={(v) => !v && setSelectTarget(null)}
        rfq={rfq}
        entry={syncEntry(selectTarget)}
        score={
          comparison.find((c) => c.entry.supplierId === selectTarget?.supplierId)?.score ?? null
        }
        cheapestTotal={cheapestTotal}
        busy={busy("confirm_selection")}
        onSubmit={async ({ reason, note, acceptExpired }) => {
          if (!selectTarget) return;
          const ok = await workflow.confirmSelection({
            requestId: rfq.requestId,
            supplierId: selectTarget.supplierId,
            reason,
            note,
            actor,
            acceptExpired,
          });
          if (ok) setSelectTarget(null);
        }}
      />

      <ConvertToOrderDialog
        open={orderOpen}
        onOpenChange={setOrderOpen}
        rfq={rfq}
        busy={busy("create_order")}
        onSubmit={async ({ etaDays, notes }) => {
          const order = await workflow.createOrder({
            requestId: rfq.requestId,
            actor,
            etaDays,
            notes,
          });
          if (order) {
            setOrderOpen(false);
            onOpenOrder?.(order);
          }
        }}
      />

      <RfqConfirmDialog
        open={!!removeTarget}
        onOpenChange={(v) => !v && setRemoveTarget(null)}
        title="Tedarikçiyi RFQ'dan Çıkar"
        description={`${removeTarget?.supplierName ?? ""} bu teklif listesinden çıkarılacak. Kayıtlı teklifi karşılaştırmadan kalkar.`}
        confirmLabel="Çıkar"
        destructive
        busy={busy("remove_supplier")}
        onConfirm={async () => {
          if (!removeTarget) return;
          const ok = await workflow.removeSupplier(
            rfq.requestId,
            removeTarget.supplierId,
            actor
          );
          if (ok) setRemoveTarget(null);
        }}
      />

      <RfqConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="RFQ'yu Kapat"
        description="Teklif toplama süreci kapatılır. Kayıtlı teklifler ve geçmiş korunur, yeni teklif girilemez."
        confirmLabel="RFQ'yu Kapat"
        destructive
        busy={busy("cancel")}
        onConfirm={async () => {
          const ok = await workflow.cancel(rfq.requestId, actor);
          if (ok) setCancelOpen(false);
        }}
      />
    </div>
  );
};

export default ProcurementRFQView;
