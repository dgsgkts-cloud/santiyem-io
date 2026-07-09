// Sprint M1.6 — Equipment / Vehicles grid (filterable), ResponsiveGrid cards.
import { useState } from "react";
import { Search, Cog, Truck, QrCode, Building2, Users, Clock, Activity } from "lucide-react";
import { ResponsiveGrid } from "@/components/ui/responsive";
import { STATUS_META, fmtNum, type EqStatus, type Equipment } from "../fleetConstants";
import { HealthDot, StatusPill } from "../fleetUi";

interface Props {
  items: Equipment[];
  onOpen: (e: Equipment) => void;
  isVehicles?: boolean;
}

export const EquipmentView = ({ items, onOpen, isVehicles }: Props) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EqStatus | "all">("all");

  const filtered = items.filter(e => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (![e.name, e.code, e.type, e.operator, e.project].some(v => v.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/80 backdrop-blur-sm">
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 h-11 rounded-lg bg-card border border-border">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isVehicles ? "Araç ara..." : "Ekipman ara..."}
              className="bg-transparent outline-none text-fs-sm text-foreground placeholder:text-muted-foreground flex-1"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-card border border-border p-0.5 overflow-x-auto">
            {(["all", "healthy", "maintenance-soon", "in-maintenance", "broken"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 h-9 min-h-[44px] sm:min-h-0 text-fs-xs rounded-md whitespace-nowrap transition-colors ${
                  statusFilter === s ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground/80"
                }`}
              >
                {s === "all" ? "Tümü" : STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ResponsiveGrid variant="auto" minItemWidth={280} className="gap-3">
        {filtered.map(e => (
          <button
            key={e.id}
            onClick={() => onOpen(e)}
            className="text-left rounded-xl border border-border bg-card hover:border-[#FF6B2B]/30 hover:bg-muted/40 transition-colors overflow-hidden group"
          >
            <div className="aspect-[16/8] bg-gradient-to-br from-muted/60 to-muted/20 border-b border-border flex items-center justify-center relative">
              {isVehicles ? <Truck className="w-12 h-12 text-muted-foreground/50" /> : <Cog className="w-12 h-12 text-muted-foreground/50" />}
              <div className="absolute top-2 right-2"><StatusPill s={e.status} /></div>
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/60 border border-border">
                <QrCode className="w-3 h-3 text-muted-foreground" />
                <span className="text-fs-xs text-foreground/70 font-mono">{e.code}</span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <div className="text-fs-sm font-semibold text-foreground group-hover:text-[#FF6B2B] transition-colors">{e.name}</div>
                <div className="text-fs-xs text-muted-foreground mt-0.5 truncate">{e.type} · S/N {e.serial}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-fs-xs">
                <div className="flex items-center gap-1.5 text-foreground/70 truncate"><Building2 className="w-3 h-3 shrink-0" /> {e.project}</div>
                <div className="flex items-center gap-1.5 text-foreground/70 truncate"><Users className="w-3 h-3 shrink-0" /> {e.operator.split(" ")[0]}</div>
                <div className="flex items-center gap-1.5 text-foreground/70"><Clock className="w-3 h-3 shrink-0" /> {fmtNum(e.engineHours)} sa</div>
                <div className="flex items-center gap-1.5 text-foreground/70"><Activity className="w-3 h-3 shrink-0" /> %{e.utilization} kullanım</div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="text-fs-xs text-muted-foreground">Sağlık</span>
                <HealthDot score={e.health} />
              </div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-fs-sm text-muted-foreground py-12 border border-dashed border-border rounded-xl">
            Filtreye uygun {isVehicles ? "araç" : "ekipman"} bulunamadı.
          </div>
        )}
      </ResponsiveGrid>
    </div>
  );
};

export default EquipmentView;
