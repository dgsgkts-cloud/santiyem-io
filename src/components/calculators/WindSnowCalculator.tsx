import { useState } from "react";

const WIND_ZONES: Record<string, { q: number; label: string }> = {
  "1": { q: 0.40, label: "1. Bölge (iç kısımlar)" },
  "2": { q: 0.60, label: "2. Bölge (kıyı yakını)" },
  "3": { q: 0.80, label: "3. Bölge (kıyı şeridi)" },
  "4": { q: 1.00, label: "4. Bölge (açık deniz kıyısı)" },
};

const TERRAIN_CATEGORIES: Record<string, { alpha: number; zmin: number; label: string }> = {
  "I": { alpha: 0.10, zmin: 1, label: "I - Deniz, göl, düz arazi" },
  "II": { alpha: 0.15, zmin: 2, label: "II - Tarım arazisi, seyrek yapı" },
  "III": { alpha: 0.20, zmin: 5, label: "III - Banliyö, orman" },
  "IV": { alpha: 0.25, zmin: 10, label: "IV - Kent merkezi" },
};

const SNOW_ZONES: Record<string, { s0: number; label: string }> = {
  "1": { s0: 0.50, label: "1. Bölge (güney sahil)" },
  "2": { s0: 0.75, label: "2. Bölge (Ege, Marmara)" },
  "3": { s0: 1.00, label: "3. Bölge (İç Anadolu)" },
  "4": { s0: 1.50, label: "4. Bölge (Doğu Anadolu)" },
  "5": { s0: 2.00, label: "5. Bölge (Yüksek rakım)" },
};

export default function WindSnowCalculator() {
  const [tab, setTab] = useState<"wind" | "snow">("wind");
  const [calculated, setCalculated] = useState(false);

  // Wind
  const [windZone, setWindZone] = useState("2");
  const [terrain, setTerrain] = useState("III");
  const [height, setHeight] = useState(15);
  const [buildingWidth, setBuildingWidth] = useState(20);
  const [buildingDepth, setBuildingDepth] = useState(12);

  // Snow
  const [snowZone, setSnowZone] = useState("3");
  const [altitude, setAltitude] = useState(900);
  const [roofAngle, setRoofAngle] = useState(20);
  const [roofAreaSn, setRoofAreaSn] = useState(200);

  const calcWind = () => {
    const q0 = WIND_ZONES[windZone].q; // kN/m²
    const { alpha, zmin } = TERRAIN_CATEGORIES[terrain];
    const Ce = height <= zmin ? 1.0 : Math.pow(height / 10, 2 * alpha);
    const qz = q0 * Ce;
    const Cp_windward = 0.8;
    const Cp_leeward = -0.5;
    const totalPressure = qz * (Cp_windward - Cp_leeward);
    const totalForce = totalPressure * buildingWidth * height;
    return { q0, Ce: Ce.toFixed(2), qz: qz.toFixed(3), totalPressure: totalPressure.toFixed(3), totalForce: totalForce.toFixed(1) };
  };

  const calcSnow = () => {
    const s0 = SNOW_ZONES[snowZone].s0;
    const altFactor = 1 + (altitude > 1000 ? (altitude - 1000) * 0.001 : 0);
    const sk = s0 * altFactor;
    const mu = roofAngle <= 30 ? 0.8 : roofAngle <= 60 ? 0.8 * (60 - roofAngle) / 30 : 0;
    const Ce = 1.0; // normal
    const Ct = 1.0;
    const s = mu * Ce * Ct * sk;
    const totalLoad = s * roofAreaSn;
    return { sk: sk.toFixed(2), mu: mu.toFixed(2), s: s.toFixed(3), totalLoad: totalLoad.toFixed(1) };
  };

  return (
    <div className="space-y-4">
      <div className="flex rounded-lg border border-border overflow-hidden">
        <button onClick={() => { setTab("wind"); setCalculated(false); }} className={`flex-1 px-3 py-1.5 text-xs font-medium ${tab === "wind" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
          Rüzgar Yükü
        </button>
        <button onClick={() => { setTab("snow"); setCalculated(false); }} className={`flex-1 px-3 py-1.5 text-xs font-medium ${tab === "snow" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
          Kar Yükü
        </button>
      </div>

      {tab === "wind" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Rüzgar Bölgesi</label>
            <select value={windZone} onChange={(e) => setWindZone(e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {Object.entries(WIND_ZONES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Arazi Kategorisi</label>
            <select value={terrain} onChange={(e) => setTerrain(e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {Object.entries(TERRAIN_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Bina Yüksekliği (m)</label>
            <input type="number" value={height} onChange={(e) => setHeight(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Bina Genişliği (m)</label>
            <input type="number" value={buildingWidth} onChange={(e) => setBuildingWidth(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>
      )}

      {tab === "snow" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Kar Bölgesi</label>
            <select value={snowZone} onChange={(e) => setSnowZone(e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {Object.entries(SNOW_ZONES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Rakım (m)</label>
            <input type="number" value={altitude} onChange={(e) => setAltitude(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Çatı Eğimi (°)</label>
            <input type="number" value={roofAngle} onChange={(e) => setRoofAngle(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Çatı Alanı (m²)</label>
            <input type="number" value={roofAreaSn} onChange={(e) => setRoofAreaSn(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>
      )}

      <button onClick={() => setCalculated(true)} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
        Hesapla
      </button>

      {calculated && tab === "wind" && (() => {
        const r = calcWind();
        return (
          <div className="glass-card rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold">Rüzgar Yükü Sonuçları</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Referans Basınç (q₀)</span><span className="font-medium">{r.q0} kN/m²</span>
              <span className="text-muted-foreground">Poz Katsayısı (Ce)</span><span className="font-medium">{r.Ce}</span>
              <span className="text-muted-foreground">Hız Basıncı (qz)</span><span className="font-medium">{r.qz} kN/m²</span>
              <span className="text-muted-foreground">Net Basınç</span><span className="font-semibold text-primary">{r.totalPressure} kN/m²</span>
              <span className="text-muted-foreground">Toplam Rüzgar Kuvveti</span><span className="font-semibold text-primary">{r.totalForce} kN</span>
            </div>
          </div>
        );
      })()}

      {calculated && tab === "snow" && (() => {
        const r = calcSnow();
        return (
          <div className="glass-card rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold">Kar Yükü Sonuçları</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Zemin Kar Yükü (sk)</span><span className="font-medium">{r.sk} kN/m²</span>
              <span className="text-muted-foreground">Şekil Katsayısı (μ)</span><span className="font-medium">{r.mu}</span>
              <span className="text-muted-foreground">Çatı Kar Yükü (s)</span><span className="font-semibold text-primary">{r.s} kN/m²</span>
              <span className="text-muted-foreground">Toplam Kar Yükü</span><span className="font-semibold text-primary">{r.totalLoad} kN</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
