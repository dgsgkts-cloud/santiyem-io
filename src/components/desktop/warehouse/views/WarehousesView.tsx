// DEPO — Depolar. No warehouse master table exists yet, so no location, capacity
// or occupancy figure is invented; the module states plainly what is missing.
import { Warehouse } from "lucide-react";
import { SectionCard } from "@/components/ui/responsive";
import type { WarehouseData } from "../useWarehouseData";
import { InsufficientData } from "../warehouseUi";
import { TRUTH_COPY, fmtMoney } from "../inventoryTruth";

export const WarehousesView = ({ data }: { data: WarehouseData }) => {
  if (data.warehouses.length === 0)
    return (
      <div className="space-y-3">
        <InsufficientData
          icon={Warehouse}
          title="Tanımlı depo bulunmuyor."
          hint={`Depo lokasyonu tanımlandığında stok kalemleri depolara göre ayrıştırılır. ${TRUTH_COPY.noCapacity}`}
        />
        <SectionCard title="Ayrıştırılmamış Envanter" subtitle="Depo ataması yapılmamış tüm stok kalemleri">
          <div className="flex items-center justify-between gap-2">
            <span className="ds-body text-foreground/80">{data.stockItems.length} stok kalemi</span>
            <span className="ds-body ds-numeric text-foreground/85">{fmtMoney(data.totalStockValue)}</span>
          </div>
          <p className="ds-caption text-muted-foreground mt-2">
            Kapasite ve doluluk oranı, depo kapasitesi girilmediği için gösterilmiyor.
          </p>
        </SectionCard>
      </div>
    );

  return (
    <SectionCard title="Depolar">
      <div className="space-y-2">
        {data.warehouses.map((w) => (
          <div key={w.id} className="flex items-center justify-between gap-2 p-2 rounded-card border border-border/60 bg-background/40">
            <span className="ds-body text-foreground truncate">{w.name}</span>
            <span className="ds-caption text-muted-foreground shrink-0">{w.location || "Lokasyon tanımsız"}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

export default WarehousesView;
