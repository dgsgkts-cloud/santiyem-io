import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { STOCK_STATUS_META, getStockFill, type StockStatus } from "@/components/materials/materialStatus";

export interface MobileStockCardItem {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  min_stock: number;
  status: StockStatus;
  location?: string;
  lastMovement?: string;
}

/**
 * SPRINT 41B — compact mobile stock card. Quantity is the dominant element,
 * name wraps to two lines, secondary actions live in the overflow menu.
 */
export function MobileStockCard({
  item, fmt, onOpen, onMenu,
}: {
  item: MobileStockCardItem;
  fmt: (n: number) => string;
  onOpen: () => void;
  onMenu: () => void;
}) {
  const meta = STOCK_STATUS_META[item.status];
  return (
    <div className="rounded-[16px] border border-border/70 bg-card p-[15px]">
      <div className="flex items-start gap-2">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className="block text-[15.5px] font-medium text-foreground leading-snug line-clamp-2">
            {item.name}
          </span>
        </button>
        <span className={cn("text-[11.5px] px-2 py-1 rounded-full border shrink-0", meta.pill)}>
          {meta.label}
        </span>
        <button
          type="button"
          onClick={onMenu}
          aria-label={`${item.name} işlemleri`}
          className="w-11 h-11 -mt-2 -mr-2 shrink-0 rounded-[12px] flex items-center justify-center text-muted-foreground active:bg-muted"
        >
          <MoreVertical className="w-[18px] h-[18px]" />
        </button>
      </div>

      <button type="button" onClick={onOpen} className="w-full text-left mt-2">
        <div className="flex items-baseline gap-1.5">
          <span className={cn("text-[26px] font-semibold leading-none tabular-nums", meta.text)}>
            {fmt(item.currentStock)}
          </span>
          <span className="text-[13px] text-muted-foreground">{item.unit}</span>
        </div>

        <div className="mt-2.5 h-1.5 rounded-full bg-muted/60 overflow-hidden">
          <div
            className={cn("h-full rounded-full", meta.dot)}
            style={{ width: `${getStockFill(item.currentStock, item.min_stock)}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 text-[12.5px] text-muted-foreground">
          <span className="truncate">{item.location || "—"}</span>
          <span className="shrink-0">{item.lastMovement || "Hareket yok"}</span>
        </div>
      </button>
    </div>
  );
}

export default MobileStockCard;
