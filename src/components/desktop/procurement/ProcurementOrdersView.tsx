// Sprint M1.4 — Orders grid: responsive card list with view / PDF / deliver actions.
import { Building2, Calendar, CheckCircle2, Download, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsiveGrid } from "@/components/ui/responsive";
import { daysFromNow, fmtTRY, type Order } from "./procurementConstants";
import type { ProcurementData } from "./useProcurementDemoData";
import { StatusPill } from "./procurementUi";

interface Props {
  data: ProcurementData;
  onOpen: (o: Order) => void;
}

export const ProcurementOrdersView = ({ data, onOpen }: Props) => (
  <ResponsiveGrid variant="auto" minItemWidth={280} className="gap-3">
    {data.orders.map((o) => (
      <div
        key={o.id}
        className="rounded-xl border border-border bg-card hover:border-border/80 hover:bg-muted/30 transition-colors p-4"
      >
        <div className="flex items-start justify-between mb-3 gap-2">
          <button onClick={() => onOpen(o)} className="text-left min-w-0 flex-1">
            <div className="text-fs-xs font-mono text-muted-foreground truncate">
              {o.no}
            </div>
            <div className="text-foreground text-fs-sm font-semibold mt-0.5 truncate">
              {o.supplier}
            </div>
            <div className="text-fs-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 min-w-0">
              <Building2 className="w-3 h-3 shrink-0" />{" "}
              <span className="truncate">{o.project}</span>
            </div>
          </button>
          <div className="text-right shrink-0">
            <div className="text-foreground text-fs-sm font-semibold">
              {fmtTRY(o.amount)}
            </div>
            <span
              className={cn(
                "text-fs-xs",
                o.paid ? "text-emerald-400" : "text-amber-400"
              )}
            >
              {o.paid ? "Ödendi" : "Bekliyor"}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between py-2 border-y border-border gap-2">
          <StatusPill status={o.delivery} />
          <span
            className={cn(
              "text-fs-xs whitespace-nowrap",
              o.eta < 0 ? "text-red-400" : "text-muted-foreground"
            )}
          >
            <Calendar className="w-3 h-3 inline mr-1" />
            ETA {o.eta < 0 ? `${-o.eta}g gecikme` : daysFromNow(o.eta)}
          </span>
        </div>
        <div className="flex gap-1 mt-3">
          <button
            onClick={() => onOpen(o)}
            className="flex-1 min-h-[32px] px-2 py-1.5 text-fs-xs rounded-md bg-muted/50 text-foreground/80 hover:bg-muted border border-border flex items-center justify-center gap-1"
          >
            <Eye className="w-3 h-3" /> Görüntüle
          </button>
          <button className="flex-1 min-h-[32px] px-2 py-1.5 text-fs-xs rounded-md bg-muted/50 text-foreground/80 hover:bg-muted border border-border flex items-center justify-center gap-1">
            <Download className="w-3 h-3" /> PDF
          </button>
          <button className="flex-1 min-h-[32px] px-2 py-1.5 text-fs-xs rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Teslim
          </button>
        </div>
      </div>
    ))}
  </ResponsiveGrid>
);

export default ProcurementOrdersView;
