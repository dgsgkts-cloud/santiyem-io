// Satın Alma → Analitik: connected procurement analytics workspace.
// Every number comes from the shared engine (analyticsModel) fed with real
// purchase orders, requests, RFQ records and project budgets. CEO Modu reads
// the same result object, so the two views can never disagree.
import { useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  ResponsiveGrid,
  ResponsiveSheet,
  SectionCard,
} from "@/components/ui/responsive";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  DELIVERY_STATUSES,
  INVOICE_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
} from "./orders/orderModel";
import { AnalyticsFilters } from "./analytics/AnalyticsFilters";
import {
  AGING_TONE,
  ANALYTICS_PERMISSION_MESSAGE,
  FINANCIAL_MASK,
  SAVINGS_METHOD,
  fmtDay,
  fmtMoney,
  fmtPct,
  fmtStamp,
  type AgingBucket,
  type CriticalAction,
  type KpiValue,
  type OpenLiabilityRow,
} from "./analytics/analyticsModel";
import type { ProcurementAnalytics } from "./analytics/useProcurementAnalytics";

interface Props {
  analytics: ProcurementAnalytics;
  onOpenOrder?: (orderId: string) => void;
}

const EMPTY = "Seçili dönem ve filtreler için satın alma kaydı bulunmuyor.";

const toneClass: Record<string, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
  muted: "bg-muted-foreground/50",
};

const Empty = ({ text }: { text: string }) => (
  <p className="ds-caption py-6 text-center">{text}</p>
);

const Kpi = ({
  kpi,
  masked,
  onClick,
  active,
}: {
  kpi: KpiValue;
  masked: boolean;
  onClick: () => void;
  active: boolean;
}) => {
  const up = (kpi.changePct ?? 0) >= 0;
  return (
    <button
      type="button"
      onClick={onClick}
      title={kpi.method}
      className={cn(
        "rounded-card border bg-card shadow-soft text-left w-full p-3 flex flex-col gap-1 min-w-0 transition-colors",
        active ? "border-primary/60" : "border-border/80 hover:border-primary/40"
      )}
    >
      <span className="ds-caption truncate">{kpi.label}</span>
      <span className="text-foreground text-fs-lg font-semibold truncate">
        {masked && kpi.sensitive ? FINANCIAL_MASK : fmtMoney(kpi.value)}
      </span>
      <span className="ds-caption flex items-center gap-1 truncate">
        {kpi.comparable && kpi.changePct !== null ? (
          <>
            {up ? (
              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-3 h-3 text-red-400" />
            )}
            {fmtPct(Math.abs(kpi.changePct), 0)} önceki dönem
          </>
        ) : (
          kpi.scope
        )}
      </span>
    </button>
  );
};

export const ProcurementAnalyticsView = ({ analytics, onOpenOrder }: Props) => {
  const { result: r, filters, canViewFinancials, canView } = analytics;
  const [drill, setDrill] = useState<{
    title: string;
    note?: string;
    rows: OpenLiabilityRow[];
  } | null>(null);

  if (!canView) {
    return (
      <SectionCard title="Analitik">
        <Empty text={ANALYTICS_PERMISSION_MESSAGE} />
      </SectionCard>
    );
  }

  const masked = !canViewFinancials;
  const openBucketDrill = (b: AgingBucket) =>
    setDrill({
      title: b.label,
      note: `${b.records} kayıt · ${b.suppliers} tedarikçi`,
      rows: b.rows,
    });

  const runAction = (a: CriticalAction) => {
    if (a.target.kind === "aging") {
      const bucket = r.aging.find((b) => b.key === a.target.kind && true);
      const found = r.aging.find(
        (b) => a.target.kind === "aging" && b.key === a.target.bucket
      );
      if (found) openBucketDrill(found ?? bucket!);
      return;
    }
    if (a.target.kind === "supplier") {
      const name = a.target.name;
      setDrill({
        title: name,
        note: "Açık tedarikçi borcu",
        rows: r.openLiabilities.filter((row) => row.supplier === name),
      });
      return;
    }
    if (a.target.kind === "project") {
      const name = a.target.name;
      setDrill({
        title: name,
        note: "Proje açık borcu",
        rows: r.openLiabilities.filter((row) => row.project === name),
      });
      return;
    }
    if (a.target.kind === "invoice") {
      analytics.setFilters({});
      const risk = r.invoiceRisks.find((x) => x.key === a.target.kind);
      setDrill({
        title: a.title,
        note: risk ? `${risk.count} sipariş` : undefined,
        rows: [],
      });
      return;
    }
    setDrill({ title: a.title, note: a.reason, rows: [] });
  };

  return (
    <div className="space-y-4">
      <AnalyticsFilters
        filters={filters}
        options={r.options}
        orderStatuses={[...ORDER_STATUSES]}
        paymentStatuses={[...PAYMENT_STATUSES]}
        deliveryStatuses={[...DELIVERY_STATUSES]}
        invoiceStatuses={[...INVOICE_STATUSES]}
        onChange={analytics.setFilters}
        onPreset={analytics.setPreset}
        onClear={analytics.clearFilters}
        onRefresh={analytics.refresh}
        refreshedLabel={`Son güncelleme ${fmtStamp(analytics.lastRefreshedAt)}`}
      />

      {r.mixedCurrency && (
        <div className="rounded-card border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="min-w-0 ds-caption">
            Kayıtlar birden fazla para biriminde. Kur dönüşümü tanımlı olmadığı için
            toplamlar para birimine göre ayrı gösterilir:{" "}
            {r.currencies.map((c) => `${fmtMoney(c.total, c.currency)}`).join(" · ")}
          </div>
        </div>
      )}

      <ResponsiveGrid variant="auto" minItemWidth={190} className="gap-3">
        {r.kpis.map((k) => (
          <Kpi
            key={k.key}
            kpi={k}
            masked={masked}
            active={false}
            onClick={() =>
              setDrill(
                k.key === "overdue"
                  ? {
                      title: "Gecikmiş Borç",
                      note: k.method,
                      rows: r.openLiabilities.filter(
                        (x) => (x.daysOverdue ?? 0) > 0
                      ),
                    }
                  : k.key === "open"
                    ? { title: "Açık Borç", note: k.method, rows: r.openLiabilities }
                    : { title: k.label, note: k.method, rows: [] }
              )
            }
          />
        ))}
      </ResponsiveGrid>

      {!r.hasOrders ? (
        <SectionCard title="Satın Alma Analitiği">
          <Empty text={EMPTY} />
        </SectionCard>
      ) : (
        <>
          <SectionCard
            title="Satın Alma Trendi"
            subtitle="Sipariş · Faturalanan · Ödenen"
          >
            <div className="flex items-end gap-2 h-40 min-w-0 overflow-x-auto pb-1">
              {r.trend.map((p) => {
                const max = Math.max(
                  1,
                  ...r.trend.flatMap((x) => [x.ordered, x.invoiced, x.paid])
                );
                const bar = (v: number, cls: string) => (
                  <div
                    className={cn("w-2 rounded-t", cls)}
                    style={{ height: `${Math.max(2, (v / max) * 120)}px` }}
                    title={fmtMoney(v)}
                  />
                );
                return (
                  <div key={p.key} className="flex flex-col items-center gap-1 shrink-0">
                    <div className="flex items-end gap-0.5">
                      {bar(p.ordered, "bg-primary/70")}
                      {bar(p.invoiced, "bg-sky-500/70")}
                      {bar(p.paid, "bg-emerald-500/70")}
                    </div>
                    <span className="ds-caption whitespace-nowrap">{p.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 ds-caption mt-2">
              <span className="flex items-center gap-1">
                <i className="w-2 h-2 rounded-full bg-primary/70 inline-block" /> Sipariş
              </span>
              <span className="flex items-center gap-1">
                <i className="w-2 h-2 rounded-full bg-sky-500/70 inline-block" />{" "}
                Faturalanan
              </span>
              <span className="flex items-center gap-1">
                <i className="w-2 h-2 rounded-full bg-emerald-500/70 inline-block" />{" "}
                Ödenen
              </span>
            </div>
          </SectionCard>

          <ResponsiveGrid variant="section" className="gap-4">
            <SectionCard
              title="Tedarikçi Harcama Dağılımı"
              subtitle={
                r.concentration
                  ? `${r.concentration.supplierCount} tedarikçi · İlk 3 payı ${fmtPct(
                      r.concentration.top3
                    )} (${r.concentration.levelLabel})`
                  : undefined
              }
            >
              {r.suppliers.length === 0 ? (
                <Empty text="Seçili dönemde tedarikçi harcaması bulunmuyor." />
              ) : (
                <div className="space-y-2.5">
                  {r.suppliers.slice(0, 8).map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() =>
                        setDrill({
                          title: s.name,
                          note: `${s.orders} sipariş · Pay ${fmtPct(s.pct, 1)}`,
                          rows: r.openLiabilities.filter(
                            (x) => x.supplier === s.name
                          ),
                        })
                      }
                      className="w-full text-left min-w-0"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-fs-sm text-foreground break-words">
                          {s.name}
                        </span>
                        <span className="text-fs-xs text-foreground/80 shrink-0">
                          {masked ? FINANCIAL_MASK : fmtMoney(s.volume)}
                        </span>
                      </div>
                      <Progress value={s.pct} className="h-1.5 mt-1" />
                      <div className="ds-caption mt-1">
                        Pay {fmtPct(s.pct, 1)} · {s.orders} sipariş · Açık{" "}
                        {masked ? FINANCIAL_MASK : fmtMoney(s.outstanding)}
                        {s.overdue > 0 &&
                          ` · Gecikmiş ${masked ? FINANCIAL_MASK : fmtMoney(s.overdue)}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Ödeme Yaşlandırması"
              subtitle={`Açık ${fmtMoney(r.openTotal)} · Gecikmiş ${fmtMoney(
                r.overdueTotal
              )}`}
            >
              {r.aging.length === 0 || r.openTotal === 0 ? (
                <Empty text="Açık tedarikçi borcu bulunmuyor." />
              ) : (
                <div className="space-y-2">
                  {r.aging.map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => openBucketDrill(b)}
                      className="w-full text-left rounded-lg border border-border bg-background/40 p-2.5 hover:border-primary/40 transition-colors min-w-0"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-fs-sm text-foreground">{b.label}</span>
                        <span className="text-fs-sm text-foreground font-medium shrink-0">
                          {masked ? FINANCIAL_MASK : fmtMoney(b.amount)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/50 mt-1.5 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", toneClass[AGING_TONE[b.key]])}
                          style={{ width: `${b.pct}%` }}
                        />
                      </div>
                      <div className="ds-caption mt-1">
                        {fmtPct(b.pct, 1)} · {b.records} kayıt · {b.suppliers} tedarikçi
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>
          </ResponsiveGrid>

          <ResponsiveGrid variant="section" className="gap-4">
            <SectionCard title="Proje Bazlı Harcama ve Bütçe">
              {r.projects.length === 0 ? (
                <Empty text="Seçili dönemde proje harcaması bulunmuyor." />
              ) : (
                <div className="space-y-2.5">
                  {r.projects.slice(0, 8).map((p) => (
                    <div key={p.name} className="min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-fs-sm text-foreground break-words">
                          {p.name}
                        </span>
                        {p.risk !== "none" && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 text-fs-xs",
                              p.risk === "over"
                                ? "border-red-500/40 text-red-400"
                                : "border-amber-500/40 text-amber-400"
                            )}
                          >
                            {p.risk === "over" ? "Bütçe aşıldı" : "Bütçe eşiğinde"}
                          </Badge>
                        )}
                      </div>
                      <div className="ds-caption mt-0.5">
                        Taahhüt {masked ? FINANCIAL_MASK : fmtMoney(p.commitment)} ·
                        Faturalanan {masked ? FINANCIAL_MASK : fmtMoney(p.invoiced)} ·
                        Ödenen {masked ? FINANCIAL_MASK : fmtMoney(p.paid)}
                      </div>
                      {p.budget === null ? (
                        <div className="ds-caption mt-0.5">
                          Proje bütçesi tanımlı değil — kullanım oranı hesaplanamıyor.
                        </div>
                      ) : (
                        <>
                          <Progress
                            value={Math.min(100, p.usagePct ?? 0)}
                            className="h-1.5 mt-1"
                          />
                          <div className="ds-caption mt-0.5">
                            Bütçe {fmtMoney(p.budget)} · Kullanım{" "}
                            {fmtPct(p.usagePct ?? 0, 1)}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Kategori Analizi">
              {r.categories.length === 0 ? (
                <Empty text="Seçili dönemde kategori harcaması bulunmuyor." />
              ) : (
                <div className="space-y-2.5">
                  {r.categories.slice(0, 8).map((c) => (
                    <div key={c.name} className="min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-fs-sm text-foreground break-words">
                          {c.name}
                        </span>
                        <span className="text-fs-xs text-foreground/80 shrink-0">
                          {masked ? FINANCIAL_MASK : fmtMoney(c.total)}
                        </span>
                      </div>
                      <div className="ds-caption mt-0.5">
                        {c.orders} sipariş
                        {c.topSupplier ? ` · En çok ${c.topSupplier}` : ""}
                        {c.changePct !== null
                          ? ` · Önceki döneme göre ${fmtPct(c.changePct, 1)}`
                          : " · Önceki dönem verisi yok"}
                      </div>
                      {c.unitPrices.length > 0 && (
                        <div className="ds-caption">
                          {c.unitPrices
                            .map(
                              (u) =>
                                `${fmtMoney(u.avgPrice)}/${u.unit} (${u.lines} kalem)`
                            )
                            .join(" · ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </ResponsiveGrid>

          <ResponsiveGrid variant="section" className="gap-4">
            <SectionCard title="RFQ Tasarrufu" subtitle={SAVINGS_METHOD}>
              {!r.rfq.hasData ? (
                <Empty text="Karşılaştırılabilir teklif verisi bulunmuyor." />
              ) : (
                <div className="space-y-1.5 ds-caption">
                  <div className="text-foreground text-fs-lg font-semibold">
                    {masked ? FINANCIAL_MASK : fmtMoney(r.rfq.savings)}
                    {r.rfq.savingsPct !== null && (
                      <span className="ds-caption ms-2">
                        ({fmtPct(r.rfq.savingsPct, 1)})
                      </span>
                    )}
                  </div>
                  <div>
                    {r.rfq.count} RFQ · {r.rfq.comparableRfqs} karşılaştırılabilir
                  </div>
                  <div>
                    Davet {r.rfq.invited} · Yanıt {r.rfq.responded}
                    {r.rfq.responseRate !== null &&
                      ` · Yanıt oranı ${fmtPct(r.rfq.responseRate)}`}
                  </div>
                  <div>
                    Siparişe dönüşen {r.rfq.converted}
                    {r.rfq.conversionRate !== null &&
                      ` (${fmtPct(r.rfq.conversionRate)})`}
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Süreç Süreleri (Talep → Teslimat)">
              {r.cycle.every((s) => s.samples === 0) ? (
                <Empty text="Süre hesaplamak için yeterli zaman damgası bulunmuyor." />
              ) : (
                <div className="space-y-1.5">
                  {r.cycle.map((s) => (
                    <div
                      key={s.key}
                      className="flex items-baseline justify-between gap-2 ds-caption"
                    >
                      <span className="text-foreground text-fs-sm">{s.label}</span>
                      <span className="shrink-0">
                        {s.samples === 0
                          ? "Veri yok"
                          : `Ort. ${s.avgDays} gün · Medyan ${s.medianDays} gün · ${s.samples} kayıt`}
                      </span>
                    </div>
                  ))}
                  {r.cycleBottleneck && (
                    <p className="ds-caption pt-1">
                      En uzun aşama: {r.cycleBottleneck.label} (
                      {r.cycleBottleneck.avgDays} gün)
                    </p>
                  )}
                </div>
              )}
            </SectionCard>
          </ResponsiveGrid>

          <ResponsiveGrid variant="section" className="gap-4">
            <SectionCard title="Teslimat Performansı">
              {!r.delivery.hasData ? (
                <Empty text="Ölçülebilir teslimat kaydı bulunmuyor." />
              ) : (
                <div className="space-y-2 ds-caption">
                  <div className="text-foreground text-fs-lg font-semibold">
                    {r.delivery.onTimeRate !== null
                      ? fmtPct(r.delivery.onTimeRate)
                      : "—"}{" "}
                    <span className="ds-caption">zamanında</span>
                  </div>
                  <div>
                    {r.delivery.measured} ölçülen · {r.delivery.late} geciken
                    {r.delivery.avgDelayDays !== null &&
                      ` · Ort. gecikme ${r.delivery.avgDelayDays} gün`}
                  </div>
                  <div>
                    Kısmi {r.delivery.partial} · Mal kabulü bekleyen{" "}
                    {r.delivery.awaitingReceipt}
                  </div>
                  {(r.delivery.rejectedQty > 0 || r.delivery.damagedQty > 0) && (
                    <div>
                      Red {r.delivery.rejectedQty} · Hasarlı {r.delivery.damagedQty}
                    </div>
                  )}
                  {r.delivery.bySupplier.slice(0, 5).map((s) => (
                    <div key={s.supplier} className="flex justify-between gap-2">
                      <span className="text-foreground break-words">{s.supplier}</span>
                      <span className="shrink-0">
                        {s.onTime}/{s.total} zamanında
                        {s.avgDelay !== null && ` · ${s.avgDelay} gün gecikme`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Üç Yönlü Eşleştirme Riskleri"
              subtitle="Sipariş · Mal kabulü · Tedarikçi faturası"
            >
              {r.invoiceRisks.length === 0 ? (
                <Empty text="Eşleştirme riski tespit edilmedi." />
              ) : (
                <div className="space-y-2">
                  {r.invoiceRisks.map((risk) => (
                    <div
                      key={risk.key}
                      className="rounded-lg border border-border bg-background/40 p-2.5 min-w-0"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-fs-sm text-foreground break-words">
                          {risk.label}
                        </span>
                        <span className="text-fs-xs shrink-0">
                          {risk.count} kayıt ·{" "}
                          {masked ? FINANCIAL_MASK : fmtMoney(risk.amount)}
                        </span>
                      </div>
                      <div className="ds-caption mt-1 flex flex-wrap gap-1.5">
                        {risk.orders.slice(0, 6).map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => onOpenOrder?.(o.id)}
                            className="underline underline-offset-2 hover:text-foreground"
                          >
                            {o.order_no}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </ResponsiveGrid>

          <SectionCard title="Öncelikli Aksiyonlar">
            {r.criticalActions.length === 0 ? (
              <Empty text="Şu an öncelikli bir satın alma riski bulunmuyor." />
            ) : (
              <div className="space-y-2">
                {r.criticalActions.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => runAction(a)}
                    className="w-full text-left rounded-lg border border-border bg-background/40 p-3 hover:border-primary/40 transition-colors flex items-start gap-2 min-w-0"
                  >
                    <AlertTriangle
                      className={cn(
                        "w-4 h-4 mt-0.5 shrink-0",
                        a.severity === "critical"
                          ? "text-red-400"
                          : a.severity === "high"
                            ? "text-orange-400"
                            : "text-amber-400"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-fs-sm text-foreground break-words">
                        {a.title}
                      </span>
                      <span className="block ds-caption break-words">{a.reason}</span>
                      <span className="block ds-caption break-words">{a.impact}</span>
                    </span>
                    <span className="ds-caption shrink-0 flex items-center gap-1">
                      {a.actionLabel} <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}

      <ResponsiveSheet
        open={!!drill}
        onOpenChange={(o) => !o && setDrill(null)}
        title={drill?.title ?? ""}
        description={drill?.note}
      >
        <div className="space-y-2">
          {!drill || drill.rows.length === 0 ? (
            <Empty text="Bu kırılım için listelenecek açık borç kaydı bulunmuyor." />
          ) : (
            drill.rows.map((row) => (
              <div
                key={row.key}
                className="rounded-lg border border-border bg-background/40 p-3 min-w-0"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-fs-sm text-foreground break-words">
                    {row.supplier}
                  </span>
                  <span className="text-fs-sm font-medium shrink-0">
                    {masked ? FINANCIAL_MASK : fmtMoney(row.remaining, row.currency)}
                  </span>
                </div>
                <div className="ds-caption mt-0.5 break-words">
                  {row.orderNo} · {row.project} · {row.installmentLabel}
                  {row.invoiceNo ? ` · Fatura ${row.invoiceNo}` : ""}
                </div>
                <div className="ds-caption">
                  Vade {fmtDay(row.dueDate)}
                  {row.daysOverdue !== null && row.daysOverdue > 0
                    ? ` · ${row.daysOverdue} gün gecikmiş`
                    : ""}
                </div>
                {onOpenOrder && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 mt-2"
                    onClick={() => {
                      setDrill(null);
                      onOpenOrder(row.order.id);
                    }}
                  >
                    Siparişi aç
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </ResponsiveSheet>
    </div>
  );
};

export default ProcurementAnalyticsView;
