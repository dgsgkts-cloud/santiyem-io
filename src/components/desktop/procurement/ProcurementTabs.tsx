// Sprint M1.4 — Sub-tab bar. Horizontal-scroll on small viewports.
import {
  BarChart3,
  ClipboardList,
  Send,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ProcurementSubTab =
  | "dashboard"
  | "requests"
  | "rfq"
  | "orders"
  | "deliveries"
  | "suppliers"
  | "analytics";

export const SUB_TABS: {
  id: ProcurementSubTab;
  label: string;
  icon: any;
}[] = [
  { id: "dashboard", label: "Analitik Panosu", icon: BarChart3 },
  { id: "requests", label: "Talepler", icon: ClipboardList },
  { id: "rfq", label: "Teklifler (RFQ)", icon: Send },
  { id: "orders", label: "Siparişler", icon: ShoppingCart },
  { id: "deliveries", label: "Teslimatlar", icon: Truck },
  { id: "suppliers", label: "Tedarikçiler", icon: Users },
  { id: "analytics", label: "Analitik", icon: TrendingUp },
];

/**
 * RFQ kullanıcı arayüzünden gizlendi (route, veri ve kod korunuyor; sadece
 * sekme çubuğunda görünmüyor). Deep link ?sekme=teklifler hâlâ çalışır.
 */
const HIDDEN_SUB_TABS = new Set<ProcurementSubTab>(["rfq"]);


interface Props {
  tab: ProcurementSubTab;
  onChange: (t: ProcurementSubTab) => void;
}

export const ProcurementTabs = ({ tab, onChange }: Props) => (
  <div className="flex items-center gap-1 mb-4 border-b border-border overflow-x-auto no-scrollbar">
    {SUB_TABS.map((s) => (
      <button
        key={s.id}
        onClick={() => onChange(s.id)}
        className={cn(
          "min-h-[40px] px-3 py-2 text-fs-xs flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap",
          tab === s.id
            ? "border-[#FF6B2B] text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground/80"
        )}
      >
        <s.icon className="w-3.5 h-3.5" /> {s.label}
      </button>
    ))}
  </div>
);

export default ProcurementTabs;
