// Sprint M1.5 — Analytics: adaptive 2-col responsive analytics blocks.
import { ResponsiveGrid, SectionCard } from "@/components/ui/responsive";
import { fmtTRY } from "../warehouseConstants";
import type { WarehouseData } from "../useWarehouseData";

export const AnalyticsView = ({ data }: { data: WarehouseData }) => (
  <ResponsiveGrid variant="auto" minItemWidth={320} className="gap-4">
    <SectionCard title="Hızlı Dönen Malzemeler">
      <div className="space-y-2">
        {data.stocks.slice(0, 6).map((s, i) => {
          const val = 90 - i * 12;
          return (
            <div key={s.id} className="flex items-center gap-3">
              <span className="text-fs-xs text-foreground/70 w-32 sm:w-40 truncate">{s.name}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500/70 to-emerald-500/30" style={{ width: `${val}%` }} />
              </div>
              <span className="text-fs-xs text-muted-foreground w-10 text-right tabular-nums">{val}%</span>
            </div>
          );
        })}
      </div>
    </SectionCard>

    <SectionCard title="Yavaş & Ölü Stok">
      <div className="space-y-2">
        {data.stocks.slice(6, 12).map((s, i) => {
          const dead = i > 3;
          return (
            <div key={s.id} className="flex items-center gap-3">
              <span className="text-fs-xs text-foreground/70 w-32 sm:w-40 truncate">{s.name}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${dead ? "bg-red-500/50" : "bg-amber-500/50"}`} style={{ width: `${20 + i * 8}%` }} />
              </div>
              <span className={`text-fs-xs w-16 text-right ${dead ? "text-red-400" : "text-amber-400"}`}>
                {dead ? "Dead stock" : "Yavaş"}
              </span>
            </div>
          );
        })}
      </div>
    </SectionCard>

    <SectionCard title="Depo Karşılaştırma">
      <div className="space-y-3">
        {data.warehouses.map(w => (
          <div key={w.id}>
            <div className="flex justify-between text-fs-xs mb-1 gap-2">
              <span className="text-foreground/70 truncate">{w.name}</span>
              <span className="text-muted-foreground tabular-nums">{fmtTRY(w.value)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#FF6B2B]/70 to-[#FF6B2B]/30"
                   style={{ width: `${(w.value / 5_000_000) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>

    <SectionCard title="Sipariş → Teslimat (Satın Alma)" subtitle="Satın alma modülünden görsel senkronizasyon">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Bekliyor", value: 6, color: "bg-amber-500/40" },
          { label: "Kısmi", value: 3, color: "bg-blue-500/40" },
          { label: "Alındı", value: 12, color: "bg-emerald-500/40" },
          { label: "Teslim", value: 9, color: "bg-cyan-500/40" },
        ].map(b => (
          <div key={b.label} className="rounded-lg border border-border bg-background/40 p-3">
            <div className={`w-full h-14 rounded ${b.color} mb-2`} />
            <div className="text-foreground font-semibold text-fs-sm tabular-nums">{b.value}</div>
            <div className="text-muted-foreground text-fs-xs">{b.label}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  </ResponsiveGrid>
);

export default AnalyticsView;
