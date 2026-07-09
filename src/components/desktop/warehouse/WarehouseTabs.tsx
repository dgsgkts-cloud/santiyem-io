// Sprint M1.5 — Warehouse sub-tab navigation (scrollable on mobile).
import type { LucideIcon } from "lucide-react";
import {
  BarChart3, Package, Warehouse, RefreshCcw, ArrowLeftRight,
  Wrench, ClipboardCheck, TrendingUp,
} from "lucide-react";
import type { SubTab } from "./warehouseConstants";

const SUB_TABS: { id: SubTab; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Genel Bakış", icon: BarChart3 },
  { id: "stocks", label: "Stoklar", icon: Package },
  { id: "warehouses", label: "Depolar", icon: Warehouse },
  { id: "movements", label: "Malzeme Hareketleri", icon: RefreshCcw },
  { id: "transfers", label: "Transferler", icon: ArrowLeftRight },
  { id: "assignments", label: "Zimmet", icon: Wrench },
  { id: "counts", label: "Sayımlar", icon: ClipboardCheck },
  { id: "analytics", label: "Analitik", icon: TrendingUp },
];

interface Props {
  active: SubTab;
  onChange: (t: SubTab) => void;
}

export const WarehouseTabs = ({ active, onChange }: Props) => (
  <div className="flex items-center gap-1 border-b border-border overflow-x-auto no-scrollbar">
    {SUB_TABS.map(s => {
      const Icon = s.icon;
      const on = active === s.id;
      return (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={`px-3 h-11 min-h-[44px] text-fs-xs flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors duration-[220ms] ${
            on ? "border-[#FF6B2B] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground/80"
          }`}
        >
          <Icon className="w-3.5 h-3.5" /> {s.label}
        </button>
      );
    })}
  </div>
);

export default WarehouseTabs;
