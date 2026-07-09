// Sprint M1.5 — Overview view: KPIs, alerts, AI insights, trend + occupancy.
import {
  Package, Layers, AlertTriangle, ArrowDownToLine, ArrowUpFromLine,
  ArrowLeftRight, Wrench, ClipboardCheck, ArrowUpRight,
} from "lucide-react";
import { KpiCard, ResponsiveGrid, SectionCard } from "@/components/ui/responsive";
import { fmtTRY } from "../warehouseConstants";
import type { WarehouseData } from "../useWarehouseData";
import { SmartAlerts, AIInsightsCard } from "../warehouseUi";

export const OverviewView = ({ data }: { data: WarehouseData }) => {
  const totalValue = data.warehouses.reduce((s, w) => s + w.value, 0);
  const totalItems = data.stocks.length;
  const criticalCount = data.stocks.filter(s => s.state === "critical" || s.state === "out").length;
  const todayIn = data.movements.filter(m => m.whenDays === 0 && m.kind === "in").length + 6;
  const todayOut = data.movements.filter(m => m.whenDays === 0 && m.kind === "out").length + 4;

  return (
    <div className="space-y-4 lg:space-y-5">
      <ResponsiveGrid variant="auto" minItemWidth={170} className="gap-3">
        <KpiCard icon={Package} label="Toplam Malzeme" value={totalItems} trend={{ value: "+3", positive: true }} />
        <KpiCard icon={Layers} label="Stok Değeri" value={fmtTRY(totalValue)} trend={{ value: "+6%", positive: true }} />
        <KpiCard icon={AlertTriangle} label="Kritik Stok" value={criticalCount} trend={{ value: "+2", positive: false }} />
        <KpiCard icon={ArrowDownToLine} label="Bugün Giriş" value={todayIn} />
        <KpiCard icon={ArrowUpFromLine} label="Bugün Çıkış" value={todayOut} />
        <KpiCard icon={ArrowLeftRight} label="Transferler" value={data.transfers.length} />
        <KpiCard icon={Wrench} label="Bekleyen Zimmet" value={data.assignments.filter(a => !a.returned).length} />
        <KpiCard icon={ClipboardCheck} label="Sayım Farkı" value="₺32K" trend={{ value: "-5%", positive: true }} />
      </ResponsiveGrid>

      <SmartAlerts data={data} />
      <AIInsightsCard />

      <ResponsiveGrid variant="auto" minItemWidth={320} className="gap-4">
        <SectionCard
          title="Aylık Tüketim Trendi"
          subtitle="Son 6 ay · malzeme bazlı"
          action={
            <span className="text-fs-xs text-emerald-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> +12%
            </span>
          }
          className="lg:col-span-2"
        >
          <div className="flex items-end gap-3 h-40">
            {[52, 71, 63, 88, 74, 96].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-[#FF6B2B]/50 to-[#FF6B2B]/10 border border-[#FF6B2B]/30 transition-all hover:from-[#FF6B2B]/70"
                  style={{ height: `${h}%` }}
                />
                <span className="text-fs-xs text-muted-foreground">
                  {["Şub", "Mar", "Nis", "May", "Haz", "Tem"][i]}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Depo Doluluk">
          <div className="space-y-3">
            {data.warehouses.map(w => {
              const pct = Math.round((w.occupied / w.capacity) * 100);
              const color = pct > 85 ? "bg-red-400" : pct > 65 ? "bg-amber-400" : "bg-emerald-400";
              return (
                <div key={w.id}>
                  <div className="flex justify-between text-fs-xs mb-1 gap-2">
                    <span className="text-foreground/80 truncate">{w.name}</span>
                    <span className="text-muted-foreground">%{pct}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
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

export default OverviewView;
