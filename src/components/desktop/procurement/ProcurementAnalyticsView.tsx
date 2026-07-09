// Sprint M1.4 — Procurement analytics: supplier share + payment aging.
import { ResponsiveGrid, SectionCard } from "@/components/ui/responsive";
import { fmtTRY } from "./procurementConstants";
import type { ProcurementData } from "./useProcurementDemoData";

interface Props {
  data: ProcurementData;
}

const AGING = [
  { label: "0-30g", value: 45, color: "bg-emerald-500/40" },
  { label: "31-60g", value: 28, color: "bg-amber-500/40" },
  { label: "61-90g", value: 18, color: "bg-orange-500/40" },
  { label: "90g+", value: 9, color: "bg-red-500/40" },
];

export const ProcurementAnalyticsView = ({ data }: Props) => {
  const max = data.suppliers.reduce((m, x) => Math.max(m, x.totalSpend), 1);
  const top = [...data.suppliers]
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 6);

  return (
    <ResponsiveGrid variant="section" className="gap-4">
      <SectionCard title="Tedarikçi Ciro Payı">
        <div className="space-y-2">
          {top.map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <span className="text-fs-xs text-foreground/80 w-32 truncate shrink-0">
                {s.name}
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted/50 min-w-0">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FF6B2B]/70 to-[#FF6B2B]/30"
                  style={{ width: `${(s.totalSpend / max) * 100}%` }}
                />
              </div>
              <span className="text-fs-xs text-foreground/80 w-20 text-right shrink-0">
                {fmtTRY(s.totalSpend)}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Ödeme Yaşlandırması">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AGING.map((b) => (
            <div
              key={b.label}
              className="rounded-lg border border-border bg-background/40 p-3"
            >
              <div className={`w-full h-16 rounded ${b.color} mb-2`} />
              <div className="text-foreground font-semibold text-fs-sm">
                %{b.value}
              </div>
              <div className="text-muted-foreground text-fs-xs">{b.label}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </ResponsiveGrid>
  );
};

export default ProcurementAnalyticsView;
