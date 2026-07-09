// Sprint M1.5 — Warehouses view: adaptive card grid.
import { Warehouse, User, MapPin } from "lucide-react";
import { ResponsiveGrid, SectionCard } from "@/components/ui/responsive";
import { fmtNum, fmtTRY } from "../warehouseConstants";
import type { WarehouseData } from "../useWarehouseData";

export const WarehousesView = ({ data }: { data: WarehouseData }) => (
  <ResponsiveGrid variant="auto" minItemWidth={280} className="gap-3">
    {data.warehouses.map(w => {
      const pct = Math.round((w.occupied / w.capacity) * 100);
      const color = pct > 85 ? "text-red-400" : pct > 65 ? "text-amber-400" : "text-emerald-400";
      const bar = pct > 85 ? "bg-red-400" : pct > 65 ? "bg-amber-400" : "bg-emerald-400";
      return (
        <SectionCard key={w.id}>
          <div className="flex items-start justify-between mb-3 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[#FF6B2B]/15 border border-[#FF6B2B]/25 flex items-center justify-center shrink-0">
                <Warehouse className="w-4 h-4 text-[#FF6B2B]" />
              </div>
              <div className="min-w-0">
                <div className="text-foreground font-semibold text-fs-sm truncate">{w.name}</div>
                <div className="text-fs-xs text-muted-foreground truncate">{w.type}</div>
              </div>
            </div>
            <span className={`text-fs-lg font-semibold tabular-nums shrink-0 ${color}`}>%{pct}</span>
          </div>
          <div className="space-y-1.5 text-fs-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate"><User className="w-3 h-3 shrink-0" /> {w.manager}</div>
            <div className="flex items-center gap-1.5 truncate"><MapPin className="w-3 h-3 shrink-0" /> {w.location}</div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/60 text-center">
            <div>
              <div className="text-fs-xs text-muted-foreground uppercase">Kapasite</div>
              <div className="text-fs-sm text-foreground tabular-nums">{fmtNum(w.capacity)}</div>
            </div>
            <div>
              <div className="text-fs-xs text-muted-foreground uppercase">Ürün</div>
              <div className="text-fs-sm text-foreground tabular-nums">{w.items}</div>
            </div>
            <div>
              <div className="text-fs-xs text-muted-foreground uppercase">Değer</div>
              <div className="text-fs-sm text-foreground tabular-nums">{fmtTRY(w.value)}</div>
            </div>
          </div>
        </SectionCard>
      );
    })}
  </ResponsiveGrid>
);

export default WarehousesView;
