// Satın Alma → CEO Modu — summarized view of the SAME analytics result the
// Analitik tab drills into. No separate calculation, no demo values: both read
// one buildAnalytics() output under identical company/project/date filters.
import { AlertTriangle, ChevronRight, TrendingUp } from "lucide-react";
import { ResponsiveGrid, SectionCard } from "@/components/ui/responsive";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ANALYTICS_PERMISSION_MESSAGE,
  FINANCIAL_MASK,
  fmtMoney,
  fmtPct,
  rangeLabel,
} from "./analytics/analyticsModel";
import type { ProcurementAnalytics } from "./analytics/useProcurementAnalytics";

interface Props {
  analytics: ProcurementAnalytics;
  onDrillDown: () => void;
  onOpenDeliveries: () => void;
}

const Empty = ({ text }: { text: string }) => (
  <p className="ds-caption py-6 text-center">{text}</p>
);

export const ProcurementCEOView = ({
  analytics,
  onDrillDown,
  onOpenDeliveries,
}: Props) => {
  const { result: r, canView, canViewFinancials } = analytics;

  if (!canView) {
    return (
      <SectionCard title="CEO Modu">
        <Empty text={ANALYTICS_PERMISSION_MESSAGE} />
      </SectionCard>
    );
  }

  const masked = !canViewFinancials;
  const money = (n: number) => (masked ? FINANCIAL_MASK : fmtMoney(n));
  const topSupplier = [...r.suppliers].sort(
    (a, b) => b.outstanding - a.outstanding
  )[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="ds-caption">
          {rangeLabel(r.range)} · Analitik ile aynı kayıtlar
        </p>
        <button
          type="button"
          onClick={onDrillDown}
          className="ds-caption flex items-center gap-1 hover:text-foreground"
        >
          Detaylı analitiğe git <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <ResponsiveGrid variant="auto" minItemWidth={220} className="gap-3">
        {r.kpis.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={onDrillDown}
            title={k.method}
            className={cn(
              "rounded-2xl border p-4 text-left min-w-0 transition-colors hover:border-primary/50",
              k.key === "overdue" && k.value > 0
                ? "border-red-500/25 bg-red-500/5"
                : "border-border bg-card"
            )}
          >
            <div className="ds-caption mb-1 truncate">{k.label}</div>
            <div className="text-foreground text-fs-xl font-semibold truncate">
              {money(k.value)}
            </div>
            <div className="ds-caption mt-1 truncate">
              {k.comparable && k.changePct !== null
                ? `${fmtPct(k.changePct, 1)} önceki dönem`
                : k.scope}
            </div>
          </button>
        ))}
      </ResponsiveGrid>

      <ResponsiveGrid variant="section" className="gap-4">
        <SectionCard
          title="En Büyük Tedarikçi Bakiyesi"
          subtitle="Tedarikçi cari hesabı ile aynı açık borç kayıtları"
        >
          {!topSupplier || topSupplier.outstanding === 0 ? (
            <Empty text="Açık tedarikçi bakiyesi bulunmuyor." />
          ) : (
            <div className="space-y-1">
              <div className="text-foreground text-fs-lg font-semibold break-words">
                {topSupplier.name}
              </div>
              <div className="ds-caption">
                Açık {money(topSupplier.outstanding)}
                {topSupplier.overdue > 0 &&
                  ` · Gecikmiş ${money(topSupplier.overdue)}`}
              </div>
              <div className="ds-caption">
                Dönem harcaması {money(topSupplier.volume)} · {topSupplier.orders}{" "}
                sipariş · Pay {fmtPct(topSupplier.pct, 1)}
              </div>
              {r.concentration && (
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-1 text-fs-xs",
                    r.concentration.level === "high"
                      ? "border-red-500/40 text-red-400"
                      : r.concentration.level === "medium"
                        ? "border-amber-500/40 text-amber-400"
                        : "border-emerald-500/40 text-emerald-400"
                  )}
                >
                  Tedarikçi yoğunlaşması: {r.concentration.levelLabel}
                </Badge>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Bütçe Riski" subtitle="Gerçek proje bütçeleri ile">
          {r.projects.filter((p) => p.budget !== null).length === 0 ? (
            <Empty text="Projelerde tanımlı bütçe bulunmadığı için risk hesaplanamıyor." />
          ) : (
            <div className="space-y-2">
              {r.projects
                .filter((p) => p.budget !== null)
                .slice(0, 5)
                .map((p) => (
                  <div key={p.name} className="min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-fs-sm text-foreground break-words">
                        {p.name}
                      </span>
                      <span className="ds-caption shrink-0">
                        {fmtPct(p.usagePct ?? 0, 1)} kullanım
                      </span>
                    </div>
                    <div className="ds-caption">
                      Taahhüt {money(p.commitment)} · Bütçe {fmtMoney(p.budget ?? 0)}
                      {p.risk === "over"
                        ? " · Bütçe aşıldı"
                        : p.risk === "watch"
                          ? " · Eşikte"
                          : ""}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </SectionCard>
      </ResponsiveGrid>

      <SectionCard
        title="Geciken Teslimatlar"
        subtitle="Gerçek teslimat kayıtları"
        action={
          <button
            type="button"
            onClick={onOpenDeliveries}
            className="ds-caption hover:text-foreground flex items-center gap-1"
          >
            Teslimatlar <ChevronRight className="w-3.5 h-3.5" />
          </button>
        }
      >
        {!r.delivery.hasData ? (
          <Empty text="Ölçülebilir teslimat kaydı bulunmuyor." />
        ) : r.delivery.late === 0 ? (
          <Empty text="Seçili dönemde geciken teslimat bulunmuyor." />
        ) : (
          <div className="space-y-1.5">
            <div className="ds-caption">
              {r.delivery.late} geciken · Zamanında{" "}
              {r.delivery.onTimeRate !== null ? fmtPct(r.delivery.onTimeRate) : "—"}
              {r.delivery.avgDelayDays !== null &&
                ` · Ort. ${r.delivery.avgDelayDays} gün`}
            </div>
            {r.delivery.bySupplier
              .filter((s) => s.late > 0)
              .slice(0, 5)
              .map((s) => (
                <button
                  key={s.supplier}
                  type="button"
                  onClick={onOpenDeliveries}
                  className="w-full text-left flex items-baseline justify-between gap-2 ds-caption hover:text-foreground"
                >
                  <span className="text-foreground break-words">{s.supplier}</span>
                  <span className="shrink-0">
                    {s.late}/{s.total} geciken
                    {s.avgDelay !== null && ` · ${s.avgDelay} gün`}
                  </span>
                </button>
              ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Yönetim Aksiyonları">
        {r.criticalActions.length === 0 ? (
          <Empty text="Şu an öncelikli bir satın alma riski bulunmuyor." />
        ) : (
          <div className="space-y-2">
            {r.criticalActions.slice(0, 5).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={onDrillDown}
                className="w-full text-left rounded-lg border border-border bg-background/40 p-3 flex items-start gap-2 hover:border-primary/40 transition-colors min-w-0"
              >
                {a.severity === "medium" ? (
                  <TrendingUp className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
                ) : (
                  <AlertTriangle
                    className={cn(
                      "w-4 h-4 mt-0.5 shrink-0",
                      a.severity === "critical" ? "text-red-400" : "text-orange-400"
                    )}
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-fs-sm text-foreground break-words">
                    {a.title}
                  </span>
                  <span className="block ds-caption break-words">{a.reason}</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-1" />
              </button>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default ProcurementCEOView;
