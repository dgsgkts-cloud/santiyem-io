// SPRINT 38D — Compact inventory KPI strip.
// Four tiles answer the first-screen questions: value, items, low, out.
// Tiles double as the status filter so there is no second filter row.

import { Layers, Package, TrendingDown, PackageX } from "lucide-react";
import { cn } from "@/lib/utils";

export type StripKey = "all" | "low" | "out";

export interface InventoryStats {
  totalValue: string;
  totalItems: number;
  lowCount: number;
  outCount: number;
}

interface Props {
  stats: InventoryStats;
  active: StripKey;
  onSelect: (key: StripKey) => void;
  className?: string;
}

export const InventoryStatStrip = ({ stats, active, onSelect, className }: Props) => {
  const tiles = [
    {
      key: "value" as const,
      icon: Layers,
      label: "Stok Değeri",
      value: stats.totalValue,
      filter: null as StripKey | null,
      tone: "text-foreground",
    },
    {
      key: "all" as const,
      icon: Package,
      label: "Kalem",
      value: stats.totalItems,
      filter: "all" as StripKey,
      tone: "text-foreground",
    },
    {
      key: "low" as const,
      icon: TrendingDown,
      label: "Düşük Stok",
      value: stats.lowCount,
      filter: "low" as StripKey,
      tone: stats.lowCount > 0 ? "text-amber-300/90" : "text-foreground",
    },
    {
      key: "out" as const,
      icon: PackageX,
      label: "Stok Yok",
      value: stats.outCount,
      filter: "out" as StripKey,
      tone: stats.outCount > 0 ? "text-rose-300/90" : "text-foreground",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-2", className)}>
      {tiles.map(t => {
        const selected = t.filter !== null && active === t.filter;
        const Comp = t.filter ? "button" : "div";
        return (
          <Comp
            key={t.key}
            type={t.filter ? "button" : undefined}
            onClick={t.filter ? () => onSelect(active === t.filter ? "all" : (t.filter as StripKey)) : undefined}
            aria-pressed={t.filter ? selected : undefined}
            className={cn(
              "rounded-card border bg-card text-left w-full px-3 py-2.5 min-w-0 transition-colors duration-200",
              selected ? "border-primary/45 bg-primary/[0.05]" : "border-border/80",
              t.filter && "hover:border-primary/30"
            )}
            style={{ minHeight: 60 }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <t.icon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <span className="ds-label truncate">{t.label}</span>
            </div>
            <div className={cn("ds-numeric font-semibold truncate mt-0.5", t.tone)} style={{ fontSize: 18, lineHeight: "24px" }}>
              {t.value}
            </div>
          </Comp>
        );
      })}
    </div>
  );
};

export default InventoryStatStrip;
