import { useState } from "react";
import { Zap } from "lucide-react";

const CLIMATE_ZONES: Record<string, { hdd: number; label: string }> = {
  "1": { hdd: 800, label: "1. Bölge (Antalya, Mersin)" },
  "2": { hdd: 1500, label: "2. Bölge (İstanbul, İzmir)" },
  "3": { hdd: 2400, label: "3. Bölge (Ankara, Bursa)" },
  "4": { hdd: 3400, label: "4. Bölge (Erzurum, Kars)" },
};

const U_LIMITS: Record<string, { wall: number; roof: number; floor: number; window: number }> = {
  "1": { wall: 0.70, roof: 0.45, floor: 0.70, window: 2.40 },
  "2": { wall: 0.60, roof: 0.40, floor: 0.60, window: 2.40 },
  "3": { wall: 0.50, roof: 0.30, floor: 0.45, window: 2.40 },
  "4": { wall: 0.40, roof: 0.25, floor: 0.40, window: 2.40 },
};

export default function EKBCalculator() {
  const [zone, setZone] = useState("2");
  const [area, setArea] = useState(150);
  const [wallU, setWallU] = useState(0.5);
  const [roofU, setRoofU] = useState(0.35);
  const [floorU, setFloorU] = useState(0.5);
  const [windowU, setWindowU] = useState(2.0);
  const [wallArea, setWallArea] = useState(200);
  const [roofArea, setRoofArea] = useState(150);
  const [floorArea, setFloorArea] = useState(150);
  const [windowArea, setWindowArea] = useState(30);
  const [calculated, setCalculated] = useState(false);

  const limits = U_LIMITS[zone];
  const climate = CLIMATE_ZONES[zone];

  const heatLoss =
    wallU * wallArea + roofU * roofArea + floorU * floorArea + windowU * windowArea;
  const annualEnergy = (heatLoss * climate.hdd * 24) / 1000; // kWh
  const energyPerM2 = annualEnergy / area;

  const getEnergyClass = (val: number): { label: string; color: string } => {
    if (val <= 50) return { label: "A", color: "text-emerald-600" };
    if (val <= 100) return { label: "B", color: "text-green-600" };
    if (val <= 150) return { label: "C", color: "text-yellow-600" };
    if (val <= 200) return { label: "D", color: "text-orange-500" };
    if (val <= 250) return { label: "E", color: "text-orange-600" };
    if (val <= 350) return { label: "F", color: "text-red-500" };
    return { label: "G", color: "text-red-700" };
  };

  const wallOk = wallU <= limits.wall;
  const roofOk = roofU <= limits.roof;
  const floorOk = floorU <= limits.floor;
  const windowOk = windowU <= limits.window;

  const energyClass = getEnergyClass(energyPerM2);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">İklim Bölgesi</label>
          <select value={zone} onChange={(e) => setZone(e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm">
            {Object.entries(CLIMATE_ZONES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Kullanım Alanı (m²)</label>
          <input type="number" value={area} onChange={(e) => setArea(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="text-xs font-medium text-muted-foreground">U Değerleri (W/m²K) & Alanlar (m²)</div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Duvar U", val: wallU, set: setWallU, ok: wallOk, limit: limits.wall, areaVal: wallArea, setArea: setWallArea },
          { label: "Çatı U", val: roofU, set: setRoofU, ok: roofOk, limit: limits.roof, areaVal: roofArea, setArea: setRoofArea },
          { label: "Döşeme U", val: floorU, set: setFloorU, ok: floorOk, limit: limits.floor, areaVal: floorArea, setArea: setFloorArea },
          { label: "Pencere U", val: windowU, set: setWindowU, ok: windowOk, limit: limits.window, areaVal: windowArea, setArea: setWindowArea },
        ].map((item) => (
          <div key={item.label} className="space-y-1">
            <label className="text-xs text-muted-foreground flex items-center justify-between">
              {item.label}
              <span className={`text-[10px] ${item.ok ? "text-emerald-600" : "text-destructive"}`}>
                Limit: {item.limit}
              </span>
            </label>
            <div className="flex gap-2">
              <input type="number" step="0.01" value={item.val} onChange={(e) => item.set(+e.target.value)} className={`w-1/2 rounded-lg border px-3 py-1.5 text-sm ${item.ok ? "border-input" : "border-destructive"} bg-background`} />
              <input type="number" value={item.areaVal} onChange={(e) => item.setArea(+e.target.value)} placeholder="m²" className="w-1/2 rounded-lg border border-input bg-background px-3 py-1.5 text-sm" />
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setCalculated(true)} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
        Hesapla
      </button>

      {calculated && (
        <div className="glass-card rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Toplam Isı Kaybı</span>
            <span className="text-sm font-semibold">{heatLoss.toFixed(1)} W/K</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Yıllık Enerji İhtiyacı</span>
            <span className="text-sm font-semibold">{annualEnergy.toFixed(0)} kWh/yıl</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Birim Enerji</span>
            <span className="text-sm font-semibold">{energyPerM2.toFixed(1)} kWh/m²·yıl</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-medium">Enerji Sınıfı</span>
            <span className={`text-2xl font-bold ${energyClass.color}`}>{energyClass.label}</span>
          </div>
          {(!wallOk || !roofOk || !floorOk || !windowOk) && (
            <p className="text-xs text-destructive">⚠️ Bazı U değerleri TS 825 limitlerini aşıyor!</p>
          )}
        </div>
      )}
    </div>
  );
}
