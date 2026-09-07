import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrencyFull } from "@/lib/formatCurrency";
import type { ProjectFinancials } from "@/lib/finance/profitEngine";
import ProfitInfoLabel from "./ProfitInfoLabel";
import { PROFIT_LABELS, PROFIT_TOOLTIPS, profitStatusSentence } from "./profitLabels";

/**
 * Ana karar alanı: tahmini final kâr, başlangıç beklentisi ve fark.
 * Tüm rakamlar Profit Engine'den gelir; burada hesap yapılmaz.
 */
export default function ProfitHeadline({
  f, hasBudget = true,
}: { f: ProjectFinancials; hasBudget?: boolean }) {
  const erosion = f.profit_erosion;
  const up = erosion < 0;
  const flat = erosion === 0;
  const tone = flat ? "#64748B" : up ? "#22C55E" : "#EF4444";
  const DeltaIcon = flat ? Minus : up ? ArrowUp : ArrowDown;
  const deltaText = formatCurrencyFull(Math.abs(erosion));

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-border/80 bg-card shadow-card p-5 lg:p-7">
        <p className="ds-caption uppercase tracking-wide text-muted-foreground mb-5">
          Proje Kârlılığı
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="sm:col-span-2 min-w-0">
            <ProfitInfoLabel
              label={PROFIT_LABELS.forecastProfit}
              hint={PROFIT_TOOLTIPS.forecastProfit}
              className="text-[13px] text-muted-foreground"
            />
            <p
              className="mt-1 text-[32px] lg:text-[44px] leading-[1.05] font-bold tracking-tight truncate"
              style={{ color: f.forecast_final_profit < 0 ? "#EF4444" : undefined }}
            >
              {formatCurrencyFull(f.forecast_final_profit)}
            </p>
          </div>

          {hasBudget ? (
            <div className="min-w-0 space-y-4 sm:border-l sm:border-border/70 sm:pl-6">
              <div>
                <ProfitInfoLabel
                  label={PROFIT_LABELS.originalProfit}
                  hint={PROFIT_TOOLTIPS.originalProfit}
                  className="text-[12px] text-muted-foreground"
                />
                <p className="text-[17px] font-semibold text-foreground truncate">
                  {formatCurrencyFull(f.original_expected_profit)}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-muted-foreground">{PROFIT_LABELS.erosion}</p>
                <p
                  className="text-[17px] font-semibold flex items-center gap-1.5 truncate"
                  style={{ color: tone }}
                >
                  <DeltaIcon className="w-4 h-4 shrink-0" />
                  {flat ? "Değişim yok" : deltaText}
                </p>
              </div>
            </div>
          ) : (
            <div className="min-w-0 sm:border-l sm:border-border/70 sm:pl-6">
              <p className="text-[12px] text-muted-foreground">{PROFIT_LABELS.originalProfit}</p>
              <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                Başlangıç bütçesi girilmediği için karşılaştırma yapılamıyor.
              </p>
            </div>
          )}
        </div>

        <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground max-w-[70ch]">
          {hasBudget
            ? profitStatusSentence(erosion, deltaText)
            : "Bu rakam bugüne kadarki maliyetler ve bekleyen siparişlere göre hesaplandı; başlangıç bütçesi eklendiğinde kâr kaybını da görebilirsiniz."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {[
          { key: "revenue", label: PROFIT_LABELS.revenue, value: f.forecast_revenue },
          {
            key: "budget",
            label: PROFIT_LABELS.budget,
            value: f.original_budget,
            missing: !hasBudget,
          },
          { key: "spent", label: PROFIT_LABELS.spent, value: f.actual_cost },
          { key: "eac", label: PROFIT_LABELS.eac, value: f.eac },
        ].map((c) => (
          <Card key={c.key} className="border border-border/80 bg-card min-w-0">
            <CardContent className="p-4">
              <ProfitInfoLabel
                label={c.label}
                hint={PROFIT_TOOLTIPS[c.key]}
                className="text-[12px] text-muted-foreground"
              />
              <p className="mt-1.5 text-[19px] font-semibold text-foreground truncate">
                {formatCurrencyFull(c.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
