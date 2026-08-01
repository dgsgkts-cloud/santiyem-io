// DEPO — Analitik: only metrics with real posted movements behind them.
import { ResponsiveGrid, SectionCard } from "@/components/ui/responsive";
import type { WarehouseData } from "../useWarehouseData";
import { InsufficientData } from "../warehouseUi";
import { TRUTH_COPY, fmtQty, fmtMoney, fmtDate } from "../inventoryTruth";

export const AnalyticsView = ({ data }: { data: WarehouseData }) => {
  // Turnover proxy from real records: issue movement count and last activity.
  const ranked = [...data.stockItems]
    .filter((s) => s.exitCount > 0)
    .sort((a, b) => b.exitCount - a.exitCount);
  const fast = ranked.slice(0, 6);
  const maxExits = fast[0]?.exitCount ?? 0;

  // Idle stock: has balance but no issue movement recorded.
  const idle = data.stockItems.filter((s) => s.onHand > 0 && s.exitCount === 0).slice(0, 6);

  const valued = [...data.stockItems]
    .filter((s) => s.stockValue !== null && s.stockValue > 0)
    .sort((a, b) => (b.stockValue ?? 0) - (a.stockValue ?? 0))
    .slice(0, 6);
  const maxValue = valued[0]?.stockValue ?? 0;

  return (
    <ResponsiveGrid variant="auto" minItemWidth={320} className="gap-4">
      <SectionCard title="En Çok Hareket Gören Malzemeler" subtitle="Kayıtlı çıkış hareketi sayısına göre">
        {fast.length === 0 ? (
          <InsufficientData title={TRUTH_COPY.noAnalytics} />
        ) : (
          <div className="space-y-2">
            {fast.map((s) => (
              <div key={s.id} className="flex items-center gap-3 min-w-0">
                <span className="ds-caption text-foreground/70 w-28 sm:w-40 truncate">{s.name}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500/70 to-emerald-500/30"
                    style={{ width: `${maxExits ? Math.max(6, (s.exitCount / maxExits) * 100) : 0}%` }}
                  />
                </div>
                <span className="ds-caption text-muted-foreground w-16 text-right ds-numeric shrink-0">
                  {s.exitCount} çıkış
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Hareketsiz Stok" subtitle="Bakiyesi olup çıkış kaydı bulunmayan kalemler">
        {idle.length === 0 ? (
          <InsufficientData title="Hareketsiz stok kalemi bulunmuyor." />
        ) : (
          <div className="space-y-2">
            {idle.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 min-w-0">
                <span className="ds-caption text-foreground/70 truncate">{s.name}</span>
                <span className="ds-caption text-muted-foreground shrink-0 ds-numeric">
                  {fmtQty(s.onHand)} {s.rawUnit} · son hareket {fmtDate(s.lastMovementAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Stok Değeri Dağılımı" subtitle="Ağırlıklı ortalama maliyetli kalemler">
        {valued.length === 0 ? (
          <InsufficientData
            title="Stok değeri hesaplanamıyor."
            hint="Birim fiyatlı mal kabulü girildiğinde stok değeri oluşur."
          />
        ) : (
          <div className="space-y-3">
            {valued.map((s) => (
              <div key={s.id}>
                <div className="flex justify-between ds-caption mb-1 gap-2">
                  <span className="text-foreground/70 truncate">{s.name}</span>
                  <span className="text-muted-foreground ds-numeric shrink-0">{fmtMoney(s.stockValue)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FF6B2B]/70 to-[#FF6B2B]/30"
                    style={{ width: `${maxValue ? Math.max(4, ((s.stockValue ?? 0) / maxValue) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Sipariş → Teslimat" subtitle="Satın alma modülünden">
        <InsufficientData
          title="Bu dönem için sipariş veya teslimat kaydı bulunmuyor."
          hint="Satın alma siparişi oluşturulduğunda tedarik akışı burada özetlenir."
        />
      </SectionCard>
    </ResponsiveGrid>
  );
};

export default AnalyticsView;
