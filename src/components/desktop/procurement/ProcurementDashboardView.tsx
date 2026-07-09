// Sprint M1.4 — Dashboard: KPI ribbon + AI insights + trend + category split.
import { ArrowUpRight } from "lucide-react";
import { ResponsiveGrid, SectionCard } from "@/components/ui/responsive";
import { CATS, fmtTRY } from "./procurementConstants";
import type { ProcurementData } from "./useProcurementDemoData";
import { AIInsightsCard } from "./AIInsightsCard";
import { ProcurementKpiRibbon } from "./ProcurementKpiRibbon";

interface Props {
  data: ProcurementData;
}

export const ProcurementDashboardView = ({ data }: Props) => {
  const totalSpend = data.orders.reduce((s, o) => s + o.amount, 0);
  const trend = [65, 82, 58, 91, 76, 100];
  const months = ["Şub", "Mar", "Nis", "May", "Haz", "Tem"];
  const cats = [28, 22, 15, 12, 10, 8];

  return (
    <div className="space-y-4 lg:space-y-5">
      <ProcurementKpiRibbon data={data} />

      <AIInsightsCard />

      <ResponsiveGrid variant="auto" minItemWidth={320} className="gap-4">
        <SectionCard
          title="Aylık Satın Alma Trendi"
          subtitle={`Son 6 ay · toplam ${fmtTRY(totalSpend)}`}
          action={
            <span className="text-fs-xs text-emerald-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> +18% YoY
            </span>
          }
          className="lg:col-span-2"
        >
          <div className="flex items-end gap-3 h-40">
            {trend.map((h, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-2 min-w-0"
              >
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-[#FF6B2B]/50 to-[#FF6B2B]/10 border border-[#FF6B2B]/30 transition-all hover:from-[#FF6B2B]/70"
                  style={{ height: `${h}%` }}
                />
                <span className="text-fs-xs text-muted-foreground">
                  {months[i]}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Kategori Dağılımı">
          <div className="space-y-2.5">
            {CATS.slice(0, 6).map((c, i) => {
              const pct = cats[i];
              return (
                <div key={c}>
                  <div className="flex justify-between text-fs-xs mb-1">
                    <span className="text-foreground/80">{c}</span>
                    <span className="text-muted-foreground">%{pct}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-full bg-[#FF6B2B]/70 rounded-full"
                      style={{ width: `${pct * 3}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </ResponsiveGrid>
    </div>
  );
};

export default ProcurementDashboardView;
