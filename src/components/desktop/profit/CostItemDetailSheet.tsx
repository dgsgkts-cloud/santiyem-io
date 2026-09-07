import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatCurrencyFull } from "@/lib/formatCurrency";
import type { CostCodeFinancials } from "@/lib/finance/profitEngine";
import ProfitInfoLabel from "./ProfitInfoLabel";
import { PROFIT_LABELS, PROFIT_TOOLTIPS } from "./profitLabels";

/** Tek bir iş kaleminin sade detay paneli. */
export default function CostItemDetailSheet({
  item, onClose,
}: { item: CostCodeFinancials | null; onClose: () => void }) {
  const rows = item
    ? [
        { key: "budget", label: PROFIT_LABELS.budget, value: formatCurrencyFull(item.original_budget) },
        { key: "spent", label: PROFIT_LABELS.spent, value: formatCurrencyFull(item.actual_cost) },
        { key: "committed", label: PROFIT_LABELS.committed, value: formatCurrencyFull(item.remaining_committed) },
        { key: "etc", label: PROFIT_LABELS.etc, value: formatCurrencyFull(item.etc) },
        { key: "eac", label: PROFIT_LABELS.eac, value: formatCurrencyFull(item.eac) },
      ]
    : [];

  const over = (item?.budget_variance ?? 0) < 0;

  return (
    <Sheet open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-[420px] overflow-y-auto">
        {item && (
          <>
            <SheetHeader>
              <SheetTitle className="text-left">
                {item.name || item.code}
                {!item.is_uncoded && item.code && (
                  <span className="ml-2 text-[12px] font-normal text-muted-foreground">{item.code}</span>
                )}
              </SheetTitle>
            </SheetHeader>

            <div className="mt-6 divide-y divide-border/70">
              {rows.map((r) => (
                <div key={r.key} className="flex items-center justify-between gap-4 py-3">
                  <ProfitInfoLabel
                    label={r.label}
                    hint={PROFIT_TOOLTIPS[r.key]}
                    className="text-[13px] text-muted-foreground"
                  />
                  <span className="text-[14px] font-semibold text-foreground">{r.value}</span>
                </div>
              ))}

              <div className="flex items-center justify-between gap-4 py-3">
                <ProfitInfoLabel
                  label={PROFIT_LABELS.variance}
                  hint={PROFIT_TOOLTIPS.variance}
                  className="text-[13px] text-muted-foreground"
                />
                <span
                  className="text-[14px] font-semibold"
                  style={{ color: over ? "#EF4444" : "#22C55E" }}
                >
                  {over ? "+" : "-"}
                  {formatCurrencyFull(Math.abs(item.budget_variance))}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-[13px] text-muted-foreground">{PROFIT_LABELS.progress}</span>
                <span className="text-[14px] font-semibold text-foreground">
                  {item.has_progress ? `%${Math.round(item.progress_percent)}` : "İlerleme verisi henüz bulunmuyor"}
                </span>
              </div>
            </div>

            {item.is_uncoded && (
              <p className="mt-5 text-[12px] leading-relaxed text-muted-foreground">
                Bu giderleri bir iş kalemine bağlarsanız maliyet analiziniz daha detaylı hale gelir.
              </p>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
