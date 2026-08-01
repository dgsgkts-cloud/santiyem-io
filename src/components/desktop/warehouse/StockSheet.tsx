// DEPO — stock detail sheet. Every figure comes from the canonical inventory
// item; unavailable evidence renders an explicit truthful state, never a guess.
import { Boxes, ArrowDownToLine, ArrowUpFromLine, Truck, ShieldAlert } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/responsive";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WarehouseData } from "./useWarehouseData";
import { MoveBadge, StatePill, ConfidencePill, InsufficientData, NEGATIVE_KINDS } from "./warehouseUi";
import {
  TRUTH_COPY, FORECAST_REASON, fmtQty, fmtMoney, fmtDate, type InventoryItem,
} from "./inventoryTruth";

interface Props {
  stock: InventoryItem | null;
  onClose: () => void;
  data: WarehouseData;
}

export const StockSheet = ({ stock, onClose, data }: Props) => {
  const history = stock ? data.movements.filter((m) => m.material === stock.name).slice(0, 6) : [];
  const forecast = stock ? data.forecastFor(stock) : null;

  const ask = (text: string) =>
    window.dispatchEvent(new CustomEvent("canvas-followup", { detail: { text } }));

  return (
    <ResponsiveSheet
      open={!!stock}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title={stock?.name}
      description={stock ? `Birim: ${stock.rawUnit || "tanımsız"}` : undefined}
      size="md"
    >
      {stock && (
        <div className="space-y-4">
          {/* 1 — canonical balance */}
          <div className="rounded-card border border-border/80 bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="ds-label">Mevcut Stok</div>
                <div className="ds-numeric font-semibold text-foreground mt-0.5" style={{ fontSize: 28, lineHeight: "34px" }}>
                  {stock.stockable ? (
                    <>{fmtQty(stock.onHand)} <span className="ds-body text-muted-foreground">{stock.rawUnit}</span></>
                  ) : (
                    <span className="ds-body text-muted-foreground">Depo bakiyesi tutulmaz</span>
                  )}
                </div>
              </div>
              <StatePill status={stock.status} />
            </div>

            {stock.stockable && (
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/60">
                <div>
                  <div className="ds-label">Rezerve</div>
                  <div className="ds-body ds-numeric text-foreground/80">{fmtQty(stock.reserved)}</div>
                </div>
                <div>
                  <div className="ds-label">Kullanılabilir</div>
                  <div className={cn("ds-body ds-numeric", stock.available <= 0 ? "text-rose-300/90" : "text-emerald-300/90")}>
                    {fmtQty(stock.available)}
                  </div>
                </div>
                <div>
                  <div className="ds-label">Min.</div>
                  <div className="ds-body ds-numeric text-foreground/80">
                    {stock.minStock > 0 ? fmtQty(stock.minStock) : "—"}
                  </div>
                </div>
              </div>
            )}

            <p className="ds-caption text-muted-foreground mt-3">
              {stock.stockable
                ? "Hesaplama: mal kabulü − malzeme çıkışı (kayıtlı hareketler)."
                : "Bu malzeme doğrudan teslim edilir; tüketim döküm programı ve teslimat kayıtlarından izlenir."}
            </p>
          </div>

          {/* 2 — unit integrity warning */}
          {!stock.unitVerdict.ok && (
            <InsufficientData
              icon={ShieldAlert}
              title={TRUTH_COPY.needsValidation}
              hint={
                stock.unitVerdict.reason === "unknown_unit"
                  ? `"${stock.rawUnit || "boş"}" birimi tanımlı değil. Geçerli birimler: ${stock.unitVerdict.allowed?.join(", ") ?? "—"}`
                  : `"${stock.rawUnit}" bu malzeme sınıfı için geçersiz. Geçerli birimler: ${stock.unitVerdict.allowed?.join(", ") ?? "—"}`
              }
            />
          )}

          {/* 3 — actions with correct terminology */}
          {stock.stockable && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-[48px]" onClick={() => ask(`${stock.name} için mal kabulü kaydı oluştur.`)}>
                <ArrowDownToLine className="w-4 h-4 mr-1.5" /> Mal Kabulü
              </Button>
              <Button variant="outline" className="min-h-[48px]" onClick={() => ask(`${stock.name} için malzeme çıkışı kaydı oluştur.`)}>
                <ArrowUpFromLine className="w-4 h-4 mr-1.5" /> Malzeme Çıkışı
              </Button>
            </div>
          )}

          {/* 4 — forecast, gated on real evidence */}
          <section>
            <h4 className="ds-label mb-2">Tükenme Tahmini</h4>
            {forecast === null || forecast.eligible === false ? (
              <InsufficientData
                title={TRUTH_COPY.noForecast}
                hint={forecast === null ? TRUTH_COPY.noForecastHint : FORECAST_REASON[forecast.reason]}
              />
            ) : (

              <div className="rounded-card border border-border/80 bg-card p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="ds-body text-foreground">
                    Yaklaşık {forecast.daysToMinimum} gün içinde minimum seviyenin altına düşebilir.
                  </span>
                  <ConfidencePill confidence={forecast.confidence} />
                </div>
                <dl className="mt-2 space-y-1">
                  {forecast.evidence.map((e) => (
                    <div key={e.label} className="flex justify-between gap-2 ds-caption">
                      <dt className="text-muted-foreground truncate">{e.label}</dt>
                      <dd className="text-foreground/80 shrink-0">{e.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="ds-caption text-muted-foreground mt-2">
                  Veri dönemi: son {forecast.windowDays} gün
                </p>
              </div>
            )}
          </section>

          {/* 5 — real movement history */}
          <section>
            <h4 className="ds-label mb-2">Son Hareketler</h4>
            {history.length === 0 ? (
              <InsufficientData title={TRUTH_COPY.noMovements} />
            ) : (
              <div className="rounded-card border border-border/80 bg-card divide-y divide-border/60">
                {history.map((m) => {
                  const negative = NEGATIVE_KINDS.includes(m.kind);
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-2.5 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <MoveBadge kind={m.kind} />
                        <span className="ds-caption text-muted-foreground truncate">{fmtDate(m.date)}</span>
                      </div>
                      <span className={cn("ds-caption ds-numeric shrink-0", negative ? "text-rose-300/90" : "text-emerald-300/90")}>
                        {negative ? "−" : "+"}{fmtQty(m.qty)} {m.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 6 — cost basis & suppliers from entry records */}
          <section>
            <h4 className="ds-label mb-2">Maliyet & Tedarikçi</h4>
            <div className="rounded-card border border-border/80 bg-card p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 ds-caption">
                <span className="text-muted-foreground">Ağırlıklı ortalama maliyet</span>
                <span className="text-foreground/85 ds-numeric">
                  {stock.avgCost === null ? "Maliyet esası bulunmuyor" : `${fmtMoney(stock.avgCost)}/${stock.rawUnit}`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 ds-caption">
                <span className="text-muted-foreground">Stok değeri</span>
                <span className="text-foreground/85 ds-numeric">
                  {stock.stockValue === null ? "—" : fmtMoney(stock.stockValue)}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 ds-caption min-w-0">
                <span className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                  <Truck className="w-3.5 h-3.5" /> Tedarikçiler
                </span>
                <span className="text-foreground/80 text-right min-w-0 truncate">
                  {stock.suppliers.length ? stock.suppliers.join(", ") : "Kayıt bulunmuyor"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 ds-caption">
                <span className="text-muted-foreground">Kayıtlı hareket</span>
                <span className="text-foreground/80">
                  {stock.entryCount} giriş · {stock.exitCount} çıkış
                </span>
              </div>
            </div>
          </section>

          <div className="flex items-center gap-2 ds-caption text-muted-foreground">
            <Boxes className="w-3.5 h-3.5" /> Depo lokasyonu henüz tanımlanmadı
          </div>
        </div>
      )}
    </ResponsiveSheet>
  );
};

export default StockSheet;
