// DEPO — CEO Modu: management summary strictly from canonical inventory.
import { Layers, TrendingDown, ShieldAlert } from "lucide-react";
import { KpiCard, ResponsiveGrid, SectionCard } from "@/components/ui/responsive";
import type { WarehouseData } from "../useWarehouseData";
import { AIInsightsCard, InsufficientData, StatePill } from "../warehouseUi";
import { TRUTH_COPY, fmtMoney, fmtQty, issueLabel, type InventoryItem } from "../inventoryTruth";

interface Props {
  data: WarehouseData;
  onCreateRequest?: (item: InventoryItem) => void;
}

export const CEOView = ({ data, onCreateRequest }: Props) => {
  const critical = data.stockItems.filter((s) => s.status === "critical" || s.status === "out");
  const topValue = [...data.stockItems]
    .filter((s) => s.stockValue !== null && s.stockValue > 0)
    .sort((a, b) => (b.stockValue ?? 0) - (a.stockValue ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <ResponsiveGrid variant="auto" minItemWidth={240} className="gap-3">
        <KpiCard
          icon={Layers}
          label="Envanter Değeri"
          value={fmtMoney(data.totalStockValue)}
          hint={
            data.valueUnknownCount > 0
              ? `${data.valueUnknownCount} kalemde maliyet esası yok`
              : "Ağırlıklı ortalama maliyet"
          }
        />
        <KpiCard
          icon={TrendingDown}
          label="Kritik Stok Kalemleri"
          value={critical.length}
          hint={critical.length > 0 ? "Tedarik aksiyonu gerekiyor" : "Kritik kalem yok"}
        />
        <KpiCard
          icon={ShieldAlert}
          label="Aylık Tüketim Maliyeti"
          value={data.monthlyConsumptionKnown ? fmtMoney(data.monthlyConsumptionCost) : "—"}
          hint={data.monthlyConsumptionKnown ? "Son 30 gün" : TRUTH_COPY.noAnalytics}
        />
      </ResponsiveGrid>

      <AIInsightsCard data={data} onCreateRequest={onCreateRequest} />

      <SectionCard title="En Yüksek Stok Değeri" subtitle="Bağlanan sermayeye göre ilk 5 kalem">
        {topValue.length === 0 ? (
          <InsufficientData title="Stok değeri hesaplanabilir kalem bulunmuyor." />
        ) : (
          <div className="space-y-2">
            {topValue.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 p-2 rounded-card bg-background/40 border border-border/60 min-w-0"
              >
                <div className="min-w-0">
                  <div className="ds-body text-foreground truncate">{s.name}</div>
                  <div className="ds-caption text-muted-foreground truncate">
                    {fmtQty(s.onHand)} {s.rawUnit} · ort. {fmtMoney(s.avgCost)}/{s.rawUnit}
                  </div>
                </div>
                <span className="ds-body ds-numeric text-foreground/85 shrink-0">{fmtMoney(s.stockValue)}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Kritik Kalemler" subtitle="Minimum seviyenin altındaki ve tükenen stoklar">
        {critical.length === 0 ? (
          <InsufficientData title="Kritik seviyede kalem bulunmuyor." />
        ) : (
          <div className="space-y-2">
            {critical.slice(0, 6).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 p-2 rounded-card bg-background/40 border border-border/60 min-w-0"
              >
                <div className="min-w-0">
                  <div className="ds-body text-foreground truncate">{s.name}</div>
                  <div className="ds-caption text-muted-foreground">
                    {fmtQty(s.available)} {s.rawUnit} kullanılabilir · min.{" "}
                    {s.minStock > 0 ? `${fmtQty(s.minStock)} ${s.rawUnit}` : "tanımsız"}
                  </div>
                </div>
                <StatePill status={s.status} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Veri Doğrulama Listesi" subtitle="Yönetim raporunu etkileyen kayıt sorunları">
        {data.dataQuality.length === 0 ? (
          <InsufficientData title="Veri kalitesi sorunu bulunmuyor." />
        ) : (
          <div className="space-y-2">
            {data.dataQuality.slice(0, 8).map((i, idx) => (
              <div key={`${i.itemId}-${i.kind}-${idx}`} className="flex items-start justify-between gap-2 min-w-0">
                <span className="ds-caption text-foreground/75 truncate">{i.itemName}</span>
                <span className="ds-caption text-muted-foreground shrink-0">{issueLabel(i.kind)}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default CEOView;
