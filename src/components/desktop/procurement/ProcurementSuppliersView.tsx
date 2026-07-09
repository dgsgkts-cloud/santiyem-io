// Sprint M1.4 — Suppliers scorecard grid.
import { cn } from "@/lib/utils";
import { ResponsiveGrid } from "@/components/ui/responsive";
import { fmtTRY, type Supplier } from "./procurementConstants";
import type { ProcurementData } from "./useProcurementDemoData";

interface Props {
  data: ProcurementData;
  onOpen: (s: Supplier) => void;
}

export const ProcurementSuppliersView = ({ data, onOpen }: Props) => (
  <ResponsiveGrid variant="auto" minItemWidth={260} className="gap-3">
    {data.suppliers.map((s) => {
      const scoreColor =
        s.score >= 85
          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
          : s.score >= 70
          ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
          : "text-red-400 bg-red-500/10 border-red-500/30";
      return (
        <button
          key={s.id}
          onClick={() => onOpen(s)}
          className="text-left rounded-xl border border-border bg-card hover:border-border/80 hover:bg-muted/30 transition-colors p-4"
        >
          <div className="flex items-start justify-between mb-3 gap-2">
            <div className="min-w-0">
              <div className="text-foreground font-semibold truncate">
                {s.name}
              </div>
              <div className="text-fs-xs text-muted-foreground mt-0.5 truncate">
                {s.category} · {s.orders} sipariş
              </div>
            </div>
            <div
              className={cn(
                "w-11 h-11 rounded-full border-2 flex items-center justify-center font-bold shrink-0",
                scoreColor
              )}
            >
              {s.score}
            </div>
          </div>
          <div className="space-y-1.5 mt-3">
            {(
              [
                ["Teslimat", s.delivery],
                ["Kalite", s.quality],
                ["Fiyat", s.price],
                ["Yanıt", s.response],
                ["Ödeme", s.payment],
              ] as const
            ).map(([label, v]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-fs-xs text-muted-foreground w-14 shrink-0">
                  {label}
                </span>
                <div className="flex-1 h-1 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      v >= 85
                        ? "bg-emerald-400"
                        : v >= 70
                        ? "bg-amber-400"
                        : "bg-red-400"
                    )}
                    style={{ width: `${v}%` }}
                  />
                </div>
                <span className="text-fs-xs text-foreground/80 w-6 text-right shrink-0">
                  {v}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-fs-xs">
            <span className="text-muted-foreground">Toplam Ciro</span>
            <span className="text-foreground font-medium">
              {fmtTRY(s.totalSpend)}
            </span>
          </div>
        </button>
      );
    })}
  </ResponsiveGrid>
);

export default ProcurementSuppliersView;
