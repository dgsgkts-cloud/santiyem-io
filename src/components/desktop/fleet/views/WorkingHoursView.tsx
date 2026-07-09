// Sprint M1.6 — Working hours: utilization + idle analysis.
import { ResponsiveGrid, SectionCard } from "@/components/ui/responsive";
import type { Equipment } from "../fleetConstants";
import type { FleetData } from "../useFleetData";

export const WorkingHoursView = ({ data }: { data: FleetData }) => {
  const { equipment } = data;
  const top = [...equipment].sort((a: Equipment, b: Equipment) => b.utilization - a.utilization).slice(0, 10);

  return (
    <ResponsiveGrid variant="auto" minItemWidth={320} className="gap-4">
      <SectionCard title="Ekipman Kullanım Oranı (Aylık)">
        <div className="space-y-2.5">
          {top.map(e => (
            <div key={e.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="min-w-0">
                <div className="text-fs-xs text-foreground/80 truncate">{e.name}</div>
                <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                  <div
                    className={`h-full ${e.utilization >= 70 ? "bg-emerald-500" : e.utilization >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${e.utilization}%` }}
                  />
                </div>
              </div>
              <div className="text-fs-xs text-foreground/70 tabular-nums w-12 text-right">%{e.utilization}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Rölanti / Boşta Kalma Analizi">
        <div className="space-y-3">
          {equipment.slice(0, 8).map(e => {
            const idlePct = Math.min(100, e.idleDays * 8);
            return (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                <div className="flex-1 min-w-0">
                  <div className="text-fs-sm text-foreground truncate">{e.name}</div>
                  <div className="text-fs-xs text-muted-foreground truncate">{e.project}</div>
                </div>
                <div className="text-fs-xs text-muted-foreground tabular-nums whitespace-nowrap">{e.idleDays}g boşta</div>
                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
                  <div className={`h-full ${idlePct > 50 ? "bg-red-500" : idlePct > 20 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${idlePct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </ResponsiveGrid>
  );
};

export default WorkingHoursView;
