// Sprint M1.5 — Stock detail sheet (ResponsiveSheet — right on desktop, bottom on mobile).
// SPRINT 38D — Grouped for less scrolling: stock status → quick actions →
// recent movements → supplier & purchase history.
import { Boxes, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Truck } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/responsive";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtNum, fmtTRY, STATE_META, type Stock } from "./warehouseConstants";
import type { WarehouseData } from "./useWarehouseData";
import { MoveBadge } from "./warehouseUi";

interface Props {
  stock: Stock | null;
  onClose: () => void;
  data: WarehouseData;
}

export const StockSheet = ({ stock, onClose, data }: Props) => {
  const history = stock ? data.movements.filter(m => m.material === stock.name).slice(0, 5) : [];
  const meta = stock ? STATE_META[stock.state] : null;
  const available = stock ? stock.current - stock.reserved : 0;

  const ask = (text: string) =>
    window.dispatchEvent(new CustomEvent("canvas-followup", { detail: { text } }));

  return (
    <ResponsiveSheet
      open={!!stock}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title={stock?.name}
      description={stock ? `${stock.category} · ${stock.warehouse}` : undefined}
      size="md"
    >
      {stock && meta && (
        <div className="space-y-4">
          {/* 1 — Current stock */}
          <div className="rounded-card border border-border/80 bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="ds-label">Mevcut Stok</div>
                <div className="ds-numeric font-semibold text-foreground mt-0.5" style={{ fontSize: 28, lineHeight: "34px" }}>
                  {fmtNum(stock.current)} <span className="ds-body text-muted-foreground">{stock.unit}</span>
                </div>
              </div>
              <span className={cn("ds-caption px-2 py-1 rounded-full border shrink-0", meta.color)}>{meta.label}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/60">
              <div>
                <div className="ds-label">Rezerve</div>
                <div className="ds-body ds-numeric text-foreground/80">{fmtNum(stock.reserved)}</div>
              </div>
              <div>
                <div className="ds-label">Müsait</div>
                <div className={cn("ds-body ds-numeric", available <= 0 ? "text-rose-300/90" : "text-emerald-300/90")}>{fmtNum(available)}</div>
              </div>
              <div>
                <div className="ds-label">Min.</div>
                <div className="ds-body ds-numeric text-foreground/80">{fmtNum(stock.min)}</div>
              </div>
            </div>
          </div>

          {/* 2 — Quick actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={() => ask(`${stock.name} için mal kabul kaydı oluştur.`)}>
              <ArrowDownToLine className="w-4 h-4 mr-1.5" /> Giriş
            </Button>
            <Button variant="outline" onClick={() => ask(`${stock.name} için malzeme çıkışı kaydı oluştur.`)}>
              <ArrowUpFromLine className="w-4 h-4 mr-1.5" /> Çıkış
            </Button>
            <Button variant="outline" onClick={() => ask(`${stock.name} için depolar arası transfer başlat.`)}>
              <ArrowLeftRight className="w-4 h-4 mr-1.5" /> Transfer
            </Button>
          </div>

          {/* 3 — Recent movements */}
          <section>
            <h4 className="ds-label mb-2">Son Hareketler</h4>
            {history.length === 0 ? (
              <p className="ds-caption text-muted-foreground">Bu kalem için hareket kaydı yok.</p>
            ) : (
              <div className="rounded-card border border-border/80 bg-card divide-y divide-border/60">
                {history.map(m => (
                  <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <MoveBadge kind={m.kind} />
                      <span className="ds-caption text-foreground/70 truncate">{m.actor}</span>
                    </div>
                    <span className="ds-caption text-muted-foreground ds-numeric shrink-0">{fmtNum(m.qty)} {m.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 4 — Supplier & purchase history */}
          <section>
            <h4 className="ds-label mb-2">Tedarikçi & Alım</h4>
            <div className="rounded-card border border-border/80 bg-card p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="flex items-center gap-2 ds-caption text-muted-foreground min-w-0">
                  <Truck className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{stock.supplier}</span>
                </span>
                <span className="ds-body ds-numeric text-foreground/80 shrink-0">{fmtTRY(stock.avgCost)}/{stock.unit}</span>
              </div>
              <div className="flex items-center justify-between ds-caption text-muted-foreground">
                <span>Son alım</span>
                <span>{-stock.lastPurchase}g önce</span>
              </div>
              <div>
                <div className="ds-caption text-muted-foreground mb-1.5">Fiyat geçmişi</div>
                <div className="flex items-end gap-1.5 h-14">
                  {[70, 85, 78, 92, 88, 100].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-[#FF6B2B]/35 border border-[#FF6B2B]/25" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="flex items-center gap-2 ds-caption text-muted-foreground">
            <Boxes className="w-3.5 h-3.5" /> Depo: {stock.warehouse}
          </div>
        </div>
      )}
    </ResponsiveSheet>
  );
};

export default StockSheet;
