// Sprint M1.4 — CEO Mode summary view.
import { ArrowUpRight } from "lucide-react";
import { ResponsiveGrid, SectionCard } from "@/components/ui/responsive";
import { fmtTRY } from "./procurementConstants";
import type { ProcurementData } from "./useProcurementDemoData";
import { daysFromNow } from "./procurementConstants";
import { AIInsightsCard } from "./AIInsightsCard";

interface Props {
  data: ProcurementData;
}

export const ProcurementCEOView = ({ data }: Props) => {
  const total = data.orders.reduce((s, o) => s + o.amount, 0);
  const largest = [...data.suppliers].sort((a, b) => b.totalSpend - a.totalSpend)[0];
  const upcoming = data.orders
    .filter((o) => o.delivery !== "Teslim Edildi")
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <ResponsiveGrid variant="auto" minItemWidth={240} className="gap-3">
        <div className="rounded-2xl border border-[#FF6B2B]/25 bg-gradient-to-br from-[#FF6B2B]/10 to-card p-5">
          <div className="text-muted-foreground text-fs-xs mb-1">
            Toplam Satın Alma (Bu Ay)
          </div>
          <div className="text-foreground text-fs-2xl font-semibold">
            {fmtTRY(total)}
          </div>
          <div className="text-emerald-400 text-fs-xs mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +18% önceki aya göre
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-muted-foreground text-fs-xs mb-1">
            En Büyük Tedarikçi
          </div>
          <div className="text-foreground text-fs-lg font-semibold truncate">
            {largest?.name}
          </div>
          <div className="text-muted-foreground text-fs-xs mt-1">
            {fmtTRY(largest?.totalSpend || 0)} · Puan {largest?.score}
          </div>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <div className="text-muted-foreground text-fs-xs mb-1">Bütçe Riski</div>
          <div className="text-red-400 text-fs-lg font-semibold">Orta</div>
          <div className="text-muted-foreground text-fs-xs mt-1">
            2 proje bütçe eşiğinde
          </div>
        </div>
      </ResponsiveGrid>

      <AIInsightsCard />

      <SectionCard title="Yaklaşan Teslimatlar">
        <div className="space-y-2">
          {upcoming.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between p-2 rounded-lg bg-background/40 border border-border gap-2"
            >
              <div className="min-w-0">
                <div className="text-foreground text-fs-sm truncate">
                  {o.supplier} · {o.category}
                </div>
                <div className="text-fs-xs text-muted-foreground truncate">
                  {o.project}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-foreground text-fs-sm font-medium">
                  {fmtTRY(o.amount)}
                </div>
                <div className="text-fs-xs text-muted-foreground">
                  ETA {daysFromNow(o.eta)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

export default ProcurementCEOView;
