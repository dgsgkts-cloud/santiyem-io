// Sprint M1.4 — Deliveries list with 5-stage tracker.
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionCard } from "@/components/ui/responsive";
import { DELIV_STAGES, daysFromNow } from "./procurementConstants";
import type { ProcurementData } from "./useProcurementDemoData";

interface Props {
  data: ProcurementData;
}

export const ProcurementDeliveriesView = ({ data }: Props) => (
  <div className="space-y-3">
    {data.orders.slice(0, 8).map((o) => {
      const stageIdx = DELIV_STAGES.indexOf(o.delivery);
      const delayed = o.eta < 0 && stageIdx < 4;
      return (
        <SectionCard key={o.id}>
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="text-foreground font-semibold text-fs-sm truncate">
                {o.supplier} · {o.category}
              </div>
              <div className="text-fs-xs text-muted-foreground font-mono truncate">
                {o.no} · {o.project}
              </div>
            </div>
            <span
              className={cn(
                "text-fs-xs px-2 py-0.5 rounded-full border whitespace-nowrap",
                delayed
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              )}
            >
              {delayed ? "Gecikti" : `ETA ${daysFromNow(o.eta)}`}
            </span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {DELIV_STAGES.map((s, i) => (
              <div
                key={s}
                className="flex-1 min-w-[64px] flex flex-col items-center gap-1.5"
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center border shrink-0",
                    i < stageIdx
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      : i === stageIdx
                      ? delayed
                        ? "bg-red-500/20 border-red-500/40 text-red-400"
                        : "bg-[#FF6B2B]/20 border-[#FF6B2B]/40 text-[#FF6B2B] animate-pulse"
                      : "bg-muted/40 border-border text-muted-foreground"
                  )}
                >
                  {i < stageIdx ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Circle className="w-2 h-2 fill-current" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-fs-xs text-center",
                    i <= stageIdx
                      ? "text-foreground/80"
                      : "text-muted-foreground"
                  )}
                >
                  {s}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      );
    })}
  </div>
);

export default ProcurementDeliveriesView;
