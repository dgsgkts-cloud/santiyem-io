// Sprint M1.6 — Analytics: costs + downtime + lifetime + performance dist.
import { Fuel, Wrench, AlertTriangle } from "lucide-react";
import { KpiCard, ResponsiveGrid, SectionCard } from "@/components/ui/responsive";
import { fmtTRY } from "../fleetConstants";
import type { FleetData } from "../useFleetData";

export const AnalyticsView = ({ data }: { data: FleetData }) => {
  const { equipment, fuel, maintenance } = data;
  const downtime = equipment.filter(e => e.status === "in-maintenance" || e.status === "broken");
  const totalFuelCost = fuel.reduce((s, f) => s + f.liters * f.unitPrice, 0);
  const totalMaintCost = maintenance.reduce((s, m) => s + m.cost, 0);
  const lifetime = equipment.slice(0, 6).map(e => ({
    name: e.name,
    total: e.purchasePrice + totalMaintCost / equipment.length + (e.engineHours * 12),
  }));
  const maxLifetime = Math.max(...lifetime.map(l => l.total));

  return (
    <div className="space-y-4 lg:space-y-5">
      <ResponsiveGrid variant="auto" minItemWidth={220} className="gap-3">
        <KpiCard icon={Fuel} label="Toplam Yakıt Maliyeti" value={fmtTRY(totalFuelCost)} hint="Son 30 gün" trend={{ value: "+12%", positive: false }} />
        <KpiCard icon={Wrench} label="Toplam Bakım Maliyeti" value={fmtTRY(totalMaintCost)} hint="Son 30 gün" trend={{ value: "-4%", positive: true }} />
        <KpiCard icon={AlertTriangle} label="Downtime" value={`${downtime.length} ekipman`} hint="Bakım + arıza" />
      </ResponsiveGrid>

      <ResponsiveGrid variant="auto" minItemWidth={320} className="gap-4">
        <SectionCard title="Lifetime Maliyet — İlk 6 Ekipman" className="lg:col-span-2">
          <div className="space-y-2.5">
            {lifetime.map(l => (
              <div key={l.name} className="grid grid-cols-[minmax(120px,1fr)_2fr_auto] items-center gap-3">
                <div className="text-fs-xs text-foreground/80 truncate">{l.name}</div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-sky-500/70 to-sky-400" style={{ width: `${(l.total / maxLifetime) * 100}%` }} />
                </div>
                <div className="text-fs-xs text-foreground/70 tabular-nums text-right whitespace-nowrap">{fmtTRY(l.total)}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Operatör Performans Dağılımı">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-fs-lg font-semibold text-emerald-400">72%</div>
              <div className="text-fs-xs text-muted-foreground mt-1">Yüksek</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="text-fs-lg font-semibold text-amber-400">21%</div>
              <div className="text-fs-xs text-muted-foreground mt-1">Orta</div>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="text-fs-lg font-semibold text-red-400">7%</div>
              <div className="text-fs-xs text-muted-foreground mt-1">Düşük</div>
            </div>
          </div>
        </SectionCard>
      </ResponsiveGrid>
    </div>
  );
};

export default AnalyticsView;
