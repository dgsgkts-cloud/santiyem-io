// Sprint M1.6 — Fleet tab strip. Horizontal scroll on small screens.
import { BarChart3, Cog, Truck, Wrench, Fuel, Users, Timer, Activity } from "lucide-react";
import type { FleetTab } from "./fleetConstants";

const TABS: { id: FleetTab; label: string; icon: any }[] = [
  { id: "overview", label: "Genel Bakış", icon: BarChart3 },
  { id: "equipment", label: "Ekipmanlar", icon: Cog },
  { id: "vehicles", label: "Araçlar", icon: Truck },
  { id: "maintenance", label: "Bakım", icon: Wrench },
  { id: "fuel", label: "Yakıt", icon: Fuel },
  { id: "operators", label: "Operatörler", icon: Users },
  { id: "hours", label: "Çalışma Saatleri", icon: Timer },
  { id: "analytics", label: "Analitik", icon: Activity },
];

export const FleetTabs = ({ active, onChange }: { active: FleetTab; onChange: (t: FleetTab) => void }) => (
  <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1">
    {TABS.map(t => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        className={`flex items-center gap-2 px-3 h-10 min-h-[44px] rounded-lg text-fs-xs whitespace-nowrap transition-colors ${
          active === t.id
            ? "bg-muted text-foreground border border-border"
            : "text-muted-foreground hover:text-foreground/85 hover:bg-muted/50 border border-transparent"
        }`}
      >
        <t.icon className="w-3.5 h-3.5" />
        {t.label}
      </button>
    ))}
  </div>
);
