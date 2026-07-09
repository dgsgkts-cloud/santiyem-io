// Sprint M1.5 — Stock detail sheet (ResponsiveSheet — right on desktop, bottom on mobile).
import { Boxes } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/responsive";
import { fmtNum, fmtTRY, type Stock } from "./warehouseConstants";
import type { WarehouseData } from "./useWarehouseData";
import { MoveBadge } from "./warehouseUi";

interface Props {
  stock: Stock | null;
  onClose: () => void;
  data: WarehouseData;
}

export const StockSheet = ({ stock, onClose, data }: Props) => {
  const history = stock ? data.movements.filter(m => m.material === stock.name).slice(0, 5) : [];

  return (
    <ResponsiveSheet
      open={!!stock}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title={stock?.name}
      description={stock ? `${stock.category} · ${stock.warehouse}` : undefined}
      size="md"
    >
      {stock && (
        <div className="space-y-4">
          <div className="aspect-video rounded-xl bg-muted border border-border flex items-center justify-center">
            <Boxes className="w-16 h-16 text-muted-foreground/40" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-card border border-border p-3">
              <div className="text-fs-xs text-muted-foreground uppercase">Mevcut</div>
              <div className="text-foreground font-semibold text-fs-sm tabular-nums">{fmtNum(stock.current)} {stock.unit}</div>
            </div>
            <div className="rounded-lg bg-card border border-border p-3">
              <div className="text-fs-xs text-muted-foreground uppercase">Ort. Maliyet</div>
              <div className="text-foreground font-semibold text-fs-sm tabular-nums">{fmtTRY(stock.avgCost)}</div>
            </div>
            <div className="rounded-lg bg-card border border-border p-3">
              <div className="text-fs-xs text-muted-foreground uppercase">Tedarikçi</div>
              <div className="text-foreground/80 text-fs-xs truncate">{stock.supplier}</div>
            </div>
            <div className="rounded-lg bg-card border border-border p-3">
              <div className="text-fs-xs text-muted-foreground uppercase">Son Alım</div>
              <div className="text-foreground/80 text-fs-xs">{-stock.lastPurchase}g önce</div>
            </div>
          </div>

          <div>
            <div className="text-muted-foreground text-fs-xs font-medium mb-2">Fiyat Geçmişi</div>
            <div className="flex items-end gap-1.5 h-16">
              {[70, 85, 78, 92, 88, 100].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-[#FF6B2B]/40 border border-[#FF6B2B]/30" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground text-fs-xs font-medium mb-2">Son Hareketler</div>
            <div className="space-y-1.5">
              {history.length === 0 ? (
                <div className="text-fs-xs text-muted-foreground text-center py-3">Kayıt yok</div>
              ) : history.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-md bg-card border border-border gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MoveBadge kind={m.kind} />
                    <span className="text-fs-xs text-foreground/70 truncate">{m.actor}</span>
                  </div>
                  <span className="text-fs-xs text-muted-foreground tabular-nums shrink-0">{fmtNum(m.qty)} {m.unit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ResponsiveSheet>
  );
};

export default StockSheet;
