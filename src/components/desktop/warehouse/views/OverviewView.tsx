// Sprint M1.5 — Overview view.
// SPRINT 38D — First screen answers four questions only: stock value, low
// stock, out of stock, and what moved recently. Everything else is demoted.
import {
  Layers, Package, TrendingDown, PackageX, ArrowDownToLine, ArrowUpFromLine,
  ArrowLeftRight, ArrowUpRight, RefreshCcw, PackageMinus,
} from "lucide-react";
import { KpiCard, ResponsiveGrid, SectionCard } from "@/components/ui/responsive";
import { fmtTRY, fmtNum } from "../warehouseConstants";
import type { WarehouseData } from "../useWarehouseData";
import { SmartAlerts, AIInsightsCard, MoveBadge } from "../warehouseUi";

const MOVE_ICON = {
  in: ArrowDownToLine, out: ArrowUpFromLine, transfer: ArrowLeftRight,
  adjust: RefreshCcw, consume: PackageMinus, return: RefreshCcw,
} as const;

export const OverviewView = ({ data }: { data: WarehouseData }) => {
  const totalValue = data.warehouses.reduce((s, w) => s + w.value, 0);
  const totalItems = data.stocks.length;
  const lowCount = data.stocks.filter(s => s.state === "low" || s.state === "critical").length;
  const outCount = data.stocks.filter(s => s.state === "out").length;
  const recent = data.movements.slice(0, 6);

  return (
    <div className="space-y-4">
      {/* 1 — Inventory overview: four compact KPIs, no horizontal scroll */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <KpiCard icon={Layers} label="Stok Değeri" value={fmtTRY(totalValue)} />
        <KpiCard icon={Package} label="Kalem" value={totalItems} />
        <KpiCard icon={TrendingDown} label="Düşük Stok" value={lowCount} />
        <KpiCard icon={PackageX} label="Stok Yok" value={outCount} />
      </div>

      {/* 2 — Recent movements, right on the first screen */}
      <SectionCard title="Son Hareketler" subtitle="Giriş, çıkış ve transferler">
        <div className="divide-y divide-border/60 -mx-1">
          {recent.map(m => {
            const Icon = MOVE_ICON[m.kind];
            const negative = m.kind === "out" || m.kind === "consume";
            return (
              <div key={m.id} className="flex items-center justify-between gap-3 px-1 py-2.5 min-w-0" style={{ minHeight: 56 }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${negative ? "text-rose-300/90" : "text-emerald-300/90"}`} />
                  <div className="min-w-0">
                    <div className="ds-body text-foreground truncate">{m.material}</div>
                    <div className="ds-caption text-muted-foreground truncate">
                      {m.warehouse} · {m.whenDays === 0 ? "Bugün" : `${-m.whenDays}g önce`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-flex"><MoveBadge kind={m.kind} /></span>
                  <span className={`ds-body ds-numeric font-medium ${negative ? "text-rose-300/90" : "text-emerald-300/90"}`}>
                    {negative ? "−" : "+"}{fmtNum(m.qty)} <span className="ds-caption text-muted-foreground">{m.unit}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* 3 — Secondary detail below the fold */}
      <SmartAlerts data={data} />
      <AIInsightsCard />

      <ResponsiveGrid variant="auto" minItemWidth={320} className="gap-4">
        <SectionCard
          title="Aylık Tüketim Trendi"
          subtitle="Son 6 ay · malzeme bazlı"
          action={
            <span className="ds-caption text-emerald-300/90 flex items-center gap-1">
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
                <span className="ds-caption text-muted-foreground">
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
              const color = pct > 85 ? "bg-rose-400/80" : pct > 65 ? "bg-amber-400/80" : "bg-emerald-400/80";
              return (
                <div key={w.id}>
                  <div className="flex justify-between ds-caption mb-1 gap-2">
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
