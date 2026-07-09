// Sprint M1.6 — Maintenance kanban-lite grouped by kind.
import { Wrench, Timer, DollarSign, Plus } from "lucide-react";
import { ResponsiveGrid, SectionCard } from "@/components/ui/responsive";
import { fmtTRY, type Maintenance } from "../fleetConstants";

const GROUPS: { key: Maintenance["kind"]; label: string; tone: string }[] = [
  { key: "urgent", label: "Acil", tone: "text-red-400 border-red-500/30 bg-red-500/10" },
  { key: "overdue", label: "Gecikmiş", tone: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  { key: "scheduled", label: "Planlanmış", tone: "text-sky-400 border-sky-500/30 bg-sky-500/10" },
  { key: "completed", label: "Tamamlanan", tone: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
];

export const MaintenanceView = ({ items }: { items: Maintenance[] }) => (
  <ResponsiveGrid variant="auto" minItemWidth={280} className="gap-3">
    {GROUPS.map(g => {
      const list = items.filter(i => i.kind === g.key);
      return (
        <SectionCard
          key={g.key}
          title={
            <span className="flex items-center gap-2">
              <span className={`text-fs-xs px-2 py-0.5 rounded-full border ${g.tone}`}>{g.label}</span>
              <span className="text-fs-xs text-muted-foreground">{list.length}</span>
            </span>
          }
          action={<button className="text-muted-foreground hover:text-foreground/80"><Plus className="w-3.5 h-3.5" /></button>}
        >
          <div className="space-y-2">
            {list.map(m => (
              <div key={m.id} className="rounded-lg bg-muted/40 border border-border/60 p-3 hover:bg-muted/70 transition-colors">
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <div className="text-fs-sm text-foreground truncate">{m.title}</div>
                  <div className="text-fs-xs text-muted-foreground tabular-nums whitespace-nowrap">{m.whenDays > 0 ? `+${m.whenDays}g` : `${m.whenDays}g`}</div>
                </div>
                <div className="text-fs-xs text-muted-foreground truncate">{m.equipmentName}</div>
                <div className="flex items-center flex-wrap gap-3 mt-2 text-fs-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Wrench className="w-3 h-3" /> {m.mechanic}</span>
                  <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {m.hours}s</span>
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {fmtTRY(m.cost)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.parts.slice(0, 3).map(p => (
                    <span key={p} className="text-fs-xs px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">{p}</span>
                  ))}
                </div>
              </div>
            ))}
            {list.length === 0 && <div className="text-center text-fs-xs text-muted-foreground py-8">Kayıt yok</div>}
          </div>
        </SectionCard>
      );
    })}
  </ResponsiveGrid>
);

export default MaintenanceView;
