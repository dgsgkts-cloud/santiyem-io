// Sprint M1.5 — CEO Mode view (responsive across every device).
import { ArrowUpRight } from "lucide-react";
import { KpiCard, ResponsiveGrid, SectionCard } from "@/components/ui/responsive";
import { fmtTRY } from "../warehouseConstants";
import type { WarehouseData } from "../useWarehouseData";
import { AIInsightsCard } from "../warehouseUi";

export const CEOView = ({ data }: { data: WarehouseData }) => {
  const totalValue = data.warehouses.reduce((s, w) => s + w.value, 0);
  const critical = data.stocks.filter(s => s.state === "critical" || s.state === "out").length;
  return (
    <div className="space-y-4">
      <ResponsiveGrid variant="auto" minItemWidth={240} className="gap-3">
        <KpiCard
          label="Envanter Değeri"
          value={fmtTRY(totalValue)}
          hint={<span className="flex items-center gap-1 text-emerald-400"><ArrowUpRight className="w-3 h-3" /> +6% önceki aya göre</span>}
        />
        <KpiCard
          label="Kritik Stok Kalemleri"
          value={<span className="text-red-400">{critical}</span>}
          hint="Bu hafta içinde sipariş şart"
        />
        <KpiCard
          label="Aylık Tüketim"
          value={fmtTRY(1_240_000)}
          hint="4 aktif şantiye"
        />
      </ResponsiveGrid>

      <AIInsightsCard />

      <SectionCard title="Depo Sağlığı">
        <div className="space-y-2">
          {data.warehouses.map(w => {
            const pct = Math.round((w.occupied / w.capacity) * 100);
            const health = pct > 90 ? "Riskli" : pct > 70 ? "Yoğun" : "Sağlıklı";
            const color = pct > 90 ? "text-red-400" : pct > 70 ? "text-amber-400" : "text-emerald-400";
            return (
              <div key={w.id} className="flex items-center justify-between p-2 rounded-lg bg-background/40 border border-border/60 gap-2">
                <div className="min-w-0">
                  <div className="text-foreground text-fs-sm truncate">{w.name}</div>
                  <div className="text-fs-xs text-muted-foreground truncate">{w.manager} · %{pct} dolu</div>
                </div>
                <span className={`text-fs-xs font-medium shrink-0 ${color}`}>{health}</span>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
};

export default CEOView;
