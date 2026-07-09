// Sprint M1.6 — Fuel: monthly bars, per-equipment consumption, ResponsiveTable of entries.
import { useMemo } from "react";
import { ResponsiveGrid, ResponsiveTable, SectionCard, type ResponsiveColumn } from "@/components/ui/responsive";
import { fmtNum, fmtTRY, seed, type FuelEntry } from "../fleetConstants";

export const FuelView = ({ entries }: { entries: FuelEntry[] }) => {
  const byEquipment = useMemo(() => {
    const map = new Map<string, { liters: number; cost: number; name: string }>();
    entries.forEach(f => {
      const prev = map.get(f.equipmentCode) ?? { liters: 0, cost: 0, name: f.equipmentName };
      prev.liters += f.liters;
      prev.cost += f.liters * f.unitPrice;
      map.set(f.equipmentCode, prev);
    });
    return [...map.entries()].sort((a, b) => b[1].cost - a[1].cost).slice(0, 6);
  }, [entries]);

  const maxLiters = Math.max(...byEquipment.map(([_, v]) => v.liters), 1);
  const monthly = Array.from({ length: 6 }, (_, i) => ({
    label: ["Şub", "Mar", "Nis", "May", "Haz", "Tem"][i],
    liters: 3200 + Math.round(seed(i + 3) * 2400),
  }));
  const maxMonth = Math.max(...monthly.map(m => m.liters));

  const columns: ResponsiveColumn<FuelEntry>[] = [
    { key: "when", header: "Tarih", cell: f => <span className="text-fs-xs text-muted-foreground">{f.whenDays}g</span> },
    { key: "equipment", header: "Ekipman", primary: true, cell: f => <span className="text-foreground">{f.equipmentName}</span> },
    { key: "fuel", header: "Yakıt", cell: f => <span className="text-fs-xs">{f.fuelType}</span> },
    { key: "liters", header: "Litre", align: "right", cell: f => <span className="tabular-nums">{f.liters}</span> },
    { key: "unit", header: "Birim ₺", align: "right", cell: f => <span className="tabular-nums text-muted-foreground">₺{f.unitPrice.toFixed(2)}</span> },
    { key: "total", header: "Tutar", align: "right", cell: f => <span className="tabular-nums text-foreground font-medium">{fmtTRY(f.liters * f.unitPrice)}</span> },
    { key: "supplier", header: "Tedarikçi", cell: f => <span className="text-fs-xs text-muted-foreground">{f.supplier}</span> },
  ];

  return (
    <div className="space-y-4 lg:space-y-5">
      <ResponsiveGrid variant="auto" minItemWidth={320} className="gap-4">
        <SectionCard title="Aylık Yakıt (Litre)">
          <div className="flex items-end gap-3 h-40">
            {monthly.map(m => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                <div className="w-full bg-muted rounded-t-md flex items-end h-full">
                  <div
                    className="w-full bg-gradient-to-t from-[#FF6B2B] to-[#FF8A4B] rounded-t-md"
                    style={{ height: `${(m.liters / maxMonth) * 100}%` }}
                  />
                </div>
                <div className="text-fs-xs text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Ekipman Bazında Tüketim" className="lg:col-span-2">
          <div className="space-y-2.5">
            {byEquipment.map(([code, v]) => (
              <div key={code} className="grid grid-cols-[minmax(90px,1fr)_2fr_auto_auto] items-center gap-3">
                <div className="text-fs-xs text-foreground/80 truncate">{v.name}</div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#FF6B2B]/70 to-[#FF6B2B]" style={{ width: `${(v.liters / maxLiters) * 100}%` }} />
                </div>
                <div className="text-fs-xs text-foreground/70 tabular-nums text-right whitespace-nowrap">{fmtNum(Math.round(v.liters))} L</div>
                <div className="text-fs-xs text-muted-foreground tabular-nums text-right whitespace-nowrap">{fmtTRY(v.cost)}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </ResponsiveGrid>

      <SectionCard title="Son Yakıt Kayıtları">
        <ResponsiveTable columns={columns} rows={entries.slice(0, 20)} rowKey={f => f.id} />
      </SectionCard>
    </div>
  );
};

export default FuelView;
