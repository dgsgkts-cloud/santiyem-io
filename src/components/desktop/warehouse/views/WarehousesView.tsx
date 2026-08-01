// DEPO — Depolar. Gerçek depo ana kaydı; kapasite girilmediğinde doluluk oranı
// uydurulmaz, açıkça belirtilir.
import { Warehouse, MapPin, User, Package } from "lucide-react";
import { SectionCard } from "@/components/ui/responsive";
import type { WarehouseData } from "../useWarehouseData";
import { InsufficientData } from "../warehouseUi";
import { TRUTH_COPY, fmtMoney, fmtDate } from "../inventoryTruth";

const TYPE_LABEL: Record<string, string> = {
  central: "Merkez",
  site: "Şantiye",
  container: "Konteyner",
  yard: "Açık Saha",
  transit: "Transit",
};

export const WarehousesView = ({ data }: { data: WarehouseData }) => {
  if (data.warehouses.length === 0)
    return (
      <div className="space-y-3">
        <InsufficientData
          icon={Warehouse}
          title="Tanımlı depo bulunmuyor."
          hint={`İlk mal kabulünde Merkez Depo otomatik oluşturulur. ${TRUTH_COPY.noCapacity}`}
        />
        <SectionCard title="Ayrıştırılmamış Envanter" subtitle="Depo ataması yapılmamış tüm stok kalemleri">
          <div className="flex items-center justify-between gap-2">
            <span className="ds-body text-foreground/80">{data.stockItems.length} stok kalemi</span>
            <span className="ds-body ds-numeric text-foreground/85">{fmtMoney(data.totalStockValue)}</span>
          </div>
        </SectionCard>
      </div>
    );

  return (
    <SectionCard title="Depolar" subtitle={`${data.warehouses.length} tanımlı depo`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {data.warehouses.map((w) => (
          <div
            key={w.id}
            className="p-3 rounded-card border border-border/60 bg-background/40 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="ds-body text-foreground truncate">{w.name}</p>
                <p className="ds-caption text-muted-foreground">
                  {w.code} · {TYPE_LABEL[w.type] ?? w.type}
                  {!w.isActive && " · Kullanım dışı"}
                </p>
              </div>
              <span className="ds-body ds-numeric text-foreground/85 shrink-0">{fmtMoney(w.stockValue)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ds-caption text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Package className="w-3.5 h-3.5 shrink-0" />
                {w.itemCount} kalem
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {w.location || "Lokasyon tanımsız"}
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="w-3.5 h-3.5 shrink-0" />
                {w.manager || "Sorumlu tanımsız"}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 ds-caption text-muted-foreground">
              <span>
                {w.capacityValue !== null
                  ? `Kapasite: ${w.capacityValue.toLocaleString("tr-TR")} ${w.capacityUnit ?? ""}`
                  : TRUTH_COPY.noCapacity}
              </span>
              <span>
                {w.lastMovementDate ? `Son hareket: ${fmtDate(w.lastMovementDate)}` : TRUTH_COPY.noMovements}
              </span>
            </div>

            {w.valueUnknownCount > 0 && (
              <p className="ds-caption text-amber-300/85">
                {w.valueUnknownCount} kalemin maliyet esası yok; değeri toplama dahil edilmedi.
              </p>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

export default WarehousesView;
