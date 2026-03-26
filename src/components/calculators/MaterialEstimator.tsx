import { useState } from "react";

export default function MaterialEstimator() {
  const [buildingType, setBuildingType] = useState("konut");
  const [totalArea, setTotalArea] = useState(1000);
  const [floors, setFloors] = useState(5);
  const [floorArea, setFloorArea] = useState(200);
  const [calculated, setCalculated] = useState(false);

  // Approximate unit rates per m² gross area
  const rates: Record<string, { beton: number; demir: number; kalip: number; label: string }> = {
    konut: { beton: 0.35, demir: 28, kalip: 3.5, label: "Konut (normal)" },
    ticari: { beton: 0.40, demir: 35, kalip: 4.0, label: "Ticari bina" },
    endüstriyel: { beton: 0.30, demir: 25, kalip: 3.0, label: "Endüstriyel yapı" },
    yüksek: { beton: 0.45, demir: 45, kalip: 4.5, label: "Yüksek bina (>10 kat)" },
  };

  const r = rates[buildingType];
  const area = totalArea || floorArea * floors;
  const betonM3 = area * r.beton;
  const demirTon = (area * r.demir) / 1000;
  const kalipM2 = area * r.kalip;
  const demirKgPerM3 = (demirTon * 1000) / betonM3;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground">Yapı Tipi</label>
          <select value={buildingType} onChange={(e) => setBuildingType(e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm">
            {Object.entries(rates).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Toplam İnşaat Alanı (m²)</label>
          <input type="number" value={totalArea} onChange={(e) => setTotalArea(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Kat Adedi</label>
          <input type="number" value={floors} onChange={(e) => setFloors(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
      </div>

      <button onClick={() => setCalculated(true)} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
        Tahmin Et
      </button>

      {calculated && (
        <div className="glass-card rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-semibold">Malzeme Tahmini ({r.label})</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Beton Miktarı</span>
            <span className="font-semibold text-primary">{betonM3.toFixed(0)} m³</span>
            <span className="text-muted-foreground">Demir Miktarı</span>
            <span className="font-semibold text-primary">{demirTon.toFixed(1)} ton</span>
            <span className="text-muted-foreground">Kalıp Alanı</span>
            <span className="font-semibold text-primary">{kalipM2.toFixed(0)} m²</span>
          </div>
          <div className="border-t border-border pt-2 mt-2 grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Demir/Beton</span>
            <span className="font-medium">{demirKgPerM3.toFixed(1)} kg/m³</span>
            <span className="text-muted-foreground">Beton/m²</span>
            <span className="font-medium">{r.beton.toFixed(2)} m³/m²</span>
            <span className="text-muted-foreground">Demir/m²</span>
            <span className="font-medium">{r.demir} kg/m²</span>
          </div>
          <div className="mt-3 p-2 rounded bg-secondary/50 text-xs text-muted-foreground">
            💡 Bu değerler ampirik ortalamalardır. Gerçek miktarlar statik projeye göre %15-25 değişebilir.
            Yüksek deprem bölgelerinde demir miktarı artabilir.
          </div>
        </div>
      )}
    </div>
  );
}
