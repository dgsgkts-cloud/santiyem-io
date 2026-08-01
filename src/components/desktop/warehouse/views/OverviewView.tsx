// DEPO — Genel Bakış: compact operational summary from canonical records only.
import {
  Layers, TrendingDown, PackageX, ShieldAlert, ArrowDownToLine, ArrowUpFromLine,
} from "lucide-react";
import { KpiCard, SectionCard } from "@/components/ui/responsive";
import type { WarehouseData } from "../useWarehouseData";
import { SmartAlerts, AIInsightsCard, MoveBadge, NEGATIVE_KINDS, InsufficientData } from "../warehouseUi";
import { TRUTH_COPY, fmtMoney, fmtQty, fmtDate, type InventoryItem } from "../inventoryTruth";

interface Props {
  data: WarehouseData;
  onCreateRequest?: (item: InventoryItem) => void;
}

export const OverviewView = ({ data, onCreateRequest }: Props) => {
  const critical = data.stockItems.filter((s) => s.status === "critical").length;
  const out = data.stockItems.filter((s) => s.status === "out").length;
  const low = data.stockItems.filter((s) => s.status === "low").length;
  const needsReview = data.dataQuality.filter((i) => i.severity === "high").length;
  const recent = data.movements.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Primary KPIs — every figure traced to posted movements */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <KpiCard
          icon={Layers}
          label="Toplam Stok Değeri"
          value={fmtMoney(data.totalStockValue)}
          hint={
            data.valueUnknownCount > 0
              ? `${data.valueUnknownCount} kalemde maliyet esası yok`
              : "Ağırlıklı ortalama maliyet"
          }
        />
        <KpiCard
          icon={TrendingDown}
          label="Kritik Stok"
          value={critical}
          hint={low > 0 ? `${low} kalem düşük seviyede` : "Minimum seviyenin altı"}
        />
        <KpiCard icon={PackageX} label="Stok Yok" value={out} />
        <KpiCard
          icon={ShieldAlert}
          label="Veri Doğrulaması"
          value={needsReview}
          hint={needsReview > 0 ? TRUTH_COPY.needsValidation : "Sorun bulunmuyor"}
        />
      </div>

      {/* Aylık Tüketim Maliyeti — money, so labelled as cost */}
      <SectionCard title="Aylık Tüketim Maliyeti" subtitle="Son 30 gün · çıkış × ağırlıklı ortalama maliyet">
        {data.monthlyConsumptionKnown ? (
          <p className="ds-numeric font-semibold text-foreground" style={{ fontSize: 26, lineHeight: "32px" }}>
            {fmtMoney(data.monthlyConsumptionCost)}
          </p>
        ) : (
          <InsufficientData
            title={TRUTH_COPY.noAnalytics}
            hint="Birim fiyatlı giriş ve çıkış kaydı girildiğinde tüketim maliyeti hesaplanır."
          />
        )}
      </SectionCard>

      {/* Son Hareketler — max 5, real posted movements */}
      <SectionCard title="Son Hareketler" subtitle="Kayıtlı mal kabulü ve malzeme çıkışları">
        {recent.length === 0 ? (
          <InsufficientData title={TRUTH_COPY.noMovements} />
        ) : (
          <div className="divide-y divide-border/60 -mx-1">
            {recent.map((m) => {
              const negative = NEGATIVE_KINDS.includes(m.kind);
              const Icon = negative ? ArrowUpFromLine : ArrowDownToLine;
              return (
                <div key={m.id} className="flex items-center justify-between gap-3 px-1 py-2.5 min-w-0" style={{ minHeight: 56 }}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${negative ? "text-rose-300/90" : "text-emerald-300/90"}`} />
                    <div className="min-w-0">
                      <div className="ds-body text-foreground truncate">{m.material}</div>
                      <div className="ds-caption text-muted-foreground truncate">
                        {fmtDate(m.date)} · {m.reason}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline-flex"><MoveBadge kind={m.kind} /></span>
                    <span className={`ds-body ds-numeric font-medium ${negative ? "text-rose-300/90" : "text-emerald-300/90"}`}>
                      {negative ? "−" : "+"}{fmtQty(m.qty)}{" "}
                      <span className="ds-caption text-muted-foreground">{m.unit}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SmartAlerts data={data} />
      <AIInsightsCard data={data} onCreateRequest={onCreateRequest} />
    </div>
  );
};

export default OverviewView;
