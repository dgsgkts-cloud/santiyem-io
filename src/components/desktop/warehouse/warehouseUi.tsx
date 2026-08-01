// DEPO — shared pills, badges, evidence-backed insight panel and risk strip.
// Every value here is derived from the canonical inventory calculation. Where
// evidence is missing, a truthful "insufficient data" state is rendered instead
// of a number.
import {
  ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, RefreshCcw, PackageMinus,
  AlertTriangle, ClipboardCheck, Truck, PackageX, Wrench, Sparkles, Info,
  ShieldAlert,
} from "lucide-react";
import { ResponsiveGrid } from "@/components/ui/responsive";
import { cn } from "@/lib/utils";
import type { Movement, MovementKind } from "./warehouseConstants";
import type { WarehouseData } from "./useWarehouseData";
import {
  TRUTH_COPY, CONFIDENCE_LABEL, STATUS_LABEL, fmtQty, fmtDateTime,
  type InventoryItem, type StockStatus, type Confidence,
} from "./inventoryTruth";

/* ─────────────────────────────── status pills ─────────────────────────────── */

const STATUS_TONE: Record<StockStatus, string> = {
  healthy: "bg-emerald-500/[0.08] text-emerald-300/90 border-emerald-500/20",
  low: "bg-amber-500/[0.08] text-amber-300/90 border-amber-500/20",
  critical: "bg-rose-500/[0.08] text-rose-300/90 border-rose-500/20",
  out: "bg-muted/60 text-muted-foreground border-border/70",
  data_missing: "bg-violet-500/[0.08] text-violet-300/90 border-violet-500/25",
  non_stock: "bg-sky-500/[0.08] text-sky-300/90 border-sky-500/25",
};

export const StatePill = ({ status }: { status: StockStatus }) => (
  <span className={cn("text-fs-xs px-2 py-0.5 rounded-full border whitespace-nowrap", STATUS_TONE[status])}>
    {STATUS_LABEL[status]}
  </span>
);

const CONF_TONE: Record<Confidence, string> = {
  high: "bg-emerald-500/[0.08] text-emerald-300/90 border-emerald-500/20",
  medium: "bg-amber-500/[0.08] text-amber-300/90 border-amber-500/20",
  low: "bg-orange-500/[0.08] text-orange-300/90 border-orange-500/20",
  insufficient: "bg-muted/60 text-muted-foreground border-border/70",
};

export const ConfidencePill = ({ confidence }: { confidence: Confidence }) => (
  <span className={cn("text-fs-xs px-2 py-0.5 rounded-full border whitespace-nowrap", CONF_TONE[confidence])}>
    {CONFIDENCE_LABEL[confidence]}
  </span>
);

/* ──────────────────────── canonical movement type badges ──────────────────── */

const MOVE_META: Record<MovementKind, { label: string; icon: any; color: string }> = {
  in:                { label: "Mal Kabulü", icon: ArrowDownToLine, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  out:               { label: "Malzeme Çıkışı", icon: ArrowUpFromLine, color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  consume:           { label: "Tüketim", icon: PackageMinus, color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  transfer_out:      { label: "Transfer Çıkışı", icon: ArrowLeftRight, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  transfer_in:       { label: "Transfer Girişi", icon: ArrowLeftRight, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  transfer:          { label: "Transfer", icon: ArrowLeftRight, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  return_in:         { label: "İade Girişi", icon: RefreshCcw, color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  supplier_return:   { label: "Tedarikçiye İade", icon: RefreshCcw, color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  count_up:          { label: "Sayım Artışı", icon: ClipboardCheck, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  count_down:        { label: "Sayım Azalışı", icon: ClipboardCheck, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  adjust:            { label: "Sayım Düzeltmesi", icon: RefreshCcw, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  scrap:             { label: "Fire / Hurda", icon: PackageX, color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  assignment:        { label: "Zimmet", icon: Wrench, color: "bg-violet-500/10 text-violet-300 border-violet-500/20" },
  assignment_return: { label: "Zimmet İadesi", icon: Wrench, color: "bg-violet-500/10 text-violet-300 border-violet-500/20" },
  reversal:          { label: "Ters Kayıt", icon: RefreshCcw, color: "bg-muted/60 text-muted-foreground border-border/70" },
  return:            { label: "İade", icon: RefreshCcw, color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
};

export const NEGATIVE_KINDS: MovementKind[] = [
  "out", "consume", "transfer_out", "supplier_return", "count_down", "scrap", "assignment",
];

export const MoveBadge = ({ kind }: { kind: Movement["kind"] }) => {
  const { label, icon: Icon, color } = MOVE_META[kind];
  return (
    <span className={cn("text-fs-xs px-2 py-0.5 rounded-full border inline-flex items-center gap-1 whitespace-nowrap", color)}>
      <Icon className="w-2.5 h-2.5" /> {label}
    </span>
  );
};

/* ───────────────────────── insufficient-data placeholder ──────────────────── */

export const InsufficientData = ({
  title, hint, icon: Icon = Info,
}: { title: string; hint?: string; icon?: any }) => (
  <div className="rounded-card border border-dashed border-border/80 bg-card/40 p-4 flex items-start gap-3">
    <Icon className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
    <div className="min-w-0">
      <p className="ds-body text-foreground/80">{title}</p>
      {hint && <p className="ds-caption text-muted-foreground mt-1">{hint}</p>}
    </div>
  </div>
);

/* ─────────────────────── evidence-backed depot insights ───────────────────── */

/**
 * AI Depo Öngörüleri.
 *
 * Only renders a forecast when forecastDepletion() confirms real evidence
 * (≥14 days of history and ≥3 issue movements). Every card shows its
 * conclusion, evidence, data period, freshness, confidence and one action.
 * Nothing is hardcoded; when no item qualifies, the truthful empty state
 * is shown instead of a claim.
 */
export const AIInsightsCard = ({
  data, onCreateRequest,
}: { data: WarehouseData; onCreateRequest?: (item: InventoryItem) => void }) => {
  const candidates = data.stockItems
    .map((item) => ({ item, forecast: data.forecastFor(item) }))
    .filter((r) => r.forecast.eligible)
    .sort((a, b) =>
      (a.forecast.eligible ? a.forecast.daysToMinimum : 0) -
      (b.forecast.eligible ? b.forecast.daysToMinimum : 0))
    .slice(0, 3);

  return (
    <section className="rounded-2xl border border-border/80 bg-card p-4 lg:p-5">
      <header className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/15 border border-[#FF6B2B]/25 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[#FF6B2B]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-foreground font-semibold text-fs-sm truncate">AI Depo Öngörüleri</h3>
            <p className="text-muted-foreground text-fs-xs truncate">
              Gerçek tüketim hareketlerinden hesaplanır
            </p>
          </div>
        </div>
        <span className="ds-caption text-muted-foreground shrink-0 hidden sm:block">
          {fmtDateTime(data.lastUpdated)}
        </span>
      </header>

      {candidates.length === 0 ? (
        <InsufficientData title={TRUTH_COPY.noForecast} hint={TRUTH_COPY.noForecastHint} />
      ) : (
        <div className="space-y-2.5">
          {candidates.map(({ item, forecast }) => {
            if (!forecast.eligible) return null;
            return (
              <article key={item.id} className="rounded-card border border-border/70 bg-background/40 p-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <h4 className="ds-body font-medium text-foreground truncate">{item.name}</h4>
                    <p className="ds-caption text-amber-300/90 mt-0.5">
                      Yaklaşık {forecast.daysToMinimum} gün içinde minimum stok seviyesinin altına
                      düşme riski oluşabilir.
                    </p>
                  </div>
                  <ConfidencePill confidence={forecast.confidence} />
                </div>

                <dl className="mt-2.5 grid sm:grid-cols-2 gap-x-4 gap-y-1">
                  {forecast.evidence.map((e) => (
                    <div key={e.label} className="flex justify-between gap-2 ds-caption">
                      <dt className="text-muted-foreground truncate">{e.label}</dt>
                      <dd className="text-foreground/80 shrink-0">{e.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-2.5 pt-2.5 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
                  <span className="ds-caption text-muted-foreground">
                    Veri dönemi: son {forecast.windowDays} gün
                  </span>
                  <button
                    type="button"
                    onClick={() => onCreateRequest?.(item)}
                    disabled={!onCreateRequest}
                    className="min-h-[40px] px-3 rounded-control ds-caption border border-[#FF6B2B]/40 text-[#FF6B2B] hover:bg-[#FF6B2B]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Satın Alma Talebi Oluştur
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

/* ───────────────────────────── operational risks ─────────────────────────── */

/**
 * Risk strip. Only metrics with a real source render a number; the rest render
 * "—" with an explicit reason, because no backing records exist yet.
 */
export const SmartAlerts = ({ data }: { data: WarehouseData }) => {
  const critical = data.stockItems.filter((s) => s.status === "critical" || s.status === "out").length;
  const dataMissing = data.stockItems.filter((s) => s.status === "data_missing").length;

  const alerts: { icon: any; label: string; value: string | number; note?: string; tone: string }[] = [
    {
      icon: AlertTriangle, label: "Kritik / Stok Yok", value: critical,
      tone: critical > 0 ? "text-rose-300/90 border-rose-500/30 bg-rose-500/[0.04]" : "text-muted-foreground border-border bg-card",
    },
    {
      icon: ShieldAlert, label: "Veri Doğrulaması Gerekli", value: dataMissing,
      note: dataMissing > 0 ? "Birim veya maliyet eksik" : undefined,
      tone: dataMissing > 0 ? "text-violet-300/90 border-violet-500/30 bg-violet-500/[0.04]" : "text-muted-foreground border-border bg-card",
    },
    {
      icon: Truck, label: "Mal Kabulü Bekleyen", value: "—",
      note: "Sipariş/teslimat kaydı bulunmuyor", tone: "text-muted-foreground border-border bg-card",
    },
    {
      icon: ArrowLeftRight, label: "Açık Transferler", value: "—",
      note: TRUTH_COPY.noTransfers, tone: "text-muted-foreground border-border bg-card",
    },
    {
      icon: ClipboardCheck, label: "Sayım Farkı", value: "—",
      note: TRUTH_COPY.noCounts, tone: "text-muted-foreground border-border bg-card",
    },
    {
      icon: Wrench, label: "Geciken Zimmet", value: "—",
      note: TRUTH_COPY.noAssignments, tone: "text-muted-foreground border-border bg-card",
    },
  ];

  return (
    <ResponsiveGrid variant="auto" minItemWidth={170} className="gap-2">
      {alerts.map((a) => (
        <div key={a.label} className={cn("rounded-xl border p-3", a.tone)}>
          <div className="flex items-center gap-1.5 ds-caption uppercase tracking-wide opacity-70">
            <a.icon className="w-3 h-3 shrink-0" /> <span className="truncate">{a.label}</span>
          </div>
          <div className="text-fs-xl font-semibold mt-1 tabular-nums">{a.value}</div>
          {a.note && <div className="ds-caption text-muted-foreground mt-0.5 leading-snug">{a.note}</div>}
        </div>
      ))}
    </ResponsiveGrid>
  );
};

export { fmtQty };
