// SPRINT 38D — Dense material row (~64px) for the inventory list.
// Hierarchy: Name → Current quantity → Location → Status → Quick actions.
// Supplier / codes / cost are deliberately lighter, secondary text.

import { ArrowDownLeft, ArrowUpRight, History, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { STOCK_STATUS_META, getStockFill, type StockStatus } from "./materialStatus";

export interface MaterialRowData {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  min_stock: number;
  status: StockStatus;
  /** Warehouse / project the stock sits in. */
  location?: string;
  /** Lighter, secondary line (supplier, last purchase, cost…). */
  secondary?: string;
}

interface Props {
  item: MaterialRowData;
  fmt: (n: number) => string;
  onOpen: (id: string) => void;
  onEntry: (id: string) => void;
  onExit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

export const MaterialRow = ({ item, fmt, onOpen, onEntry, onExit, onDelete }: Props) => {
  const meta = STOCK_STATUS_META[item.status];
  const fill = getStockFill(item.currentStock, item.min_stock);

  const action = (
    label: string,
    Icon: typeof ArrowDownLeft,
    handler: () => void,
    tone?: string
  ) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={e => { e.stopPropagation(); handler(); }}
      className={cn(
        "w-9 h-9 rounded-control flex items-center justify-center shrink-0 transition-colors",
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        tone
      )}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item.id)}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(item.id); } }}
      className="group flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer min-w-0"
      style={{ minHeight: 64 }}
    >
      <span className={cn("w-2 h-2 rounded-full shrink-0", meta.dot)} aria-hidden />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="ds-body font-medium text-foreground truncate">{item.name}</span>
          <span className={cn("ds-caption px-1.5 py-0.5 rounded-full border shrink-0", meta.pill)}>
            {meta.label}
          </span>
        </div>
        <div className="ds-caption text-muted-foreground truncate mt-0.5">
          {[item.location, item.secondary].filter(Boolean).join(" · ") || "—"}
        </div>
        <div className="h-1 rounded-full bg-muted/70 overflow-hidden mt-1.5 max-w-[220px]">
          <div className={cn("h-full rounded-full", meta.dot)} style={{ width: `${fill}%` }} />
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className={cn("ds-body font-semibold ds-numeric", meta.text)}>
          {fmt(item.currentStock)}
        </div>
        <div className="ds-caption text-muted-foreground">{item.unit}</div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {action("Malzeme girişi", ArrowDownLeft, () => onEntry(item.id), "hover:text-emerald-300")}
        {action("Malzeme çıkışı", ArrowUpRight, () => onExit(item.id), "hover:text-rose-300")}
        {action("Hareket geçmişi", History, () => onOpen(item.id))}
        <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity max-lg:opacity-100">
          {action("Sil", Trash2, () => onDelete(item.id, item.name), "hover:text-destructive")}
        </div>
      </div>
    </div>
  );
};

export default MaterialRow;
