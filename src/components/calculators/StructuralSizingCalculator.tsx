import { useState } from "react";

type ElementType = "kolon" | "kiriş" | "döşeme";

export default function StructuralSizingCalculator() {
  const [element, setElement] = useState<ElementType>("kolon");
  const [calculated, setCalculated] = useState(false);

  // Kolon
  const [floors, setFloors] = useState(5);
  const [spanX, setSpanX] = useState(5);
  const [spanY, setSpanY] = useState(5);
  const [dts, setDts] = useState("1");

  // Kiriş
  const [beamSpan, setBeamSpan] = useState(6);
  const [beamLoad, setBeamLoad] = useState("normal");

  // Döşeme
  const [slabSpan, setSlabSpan] = useState(5);
  const [slabType, setSlabType] = useState("kirişli");

  const getColumnSize = () => {
    const tributaryArea = spanX * spanY;
    const axialLoad = tributaryArea * floors * 15; // kN approx
    const fck = 30; // C30
    const minDim = dts === "1" || dts === "2" ? 300 : 250;
    const reqArea = (axialLoad * 1000) / (0.4 * fck); // mm²
    const side = Math.max(minDim, Math.ceil(Math.sqrt(reqArea) / 50) * 50);
    const rhoMin = 0.01;
    const donatı = Math.ceil(rhoMin * side * side / 100) * 100; // mm² approx
    const etriye = dts === "1" || dts === "2" ? Math.min(Math.floor(side / 3), 150) : Math.min(Math.floor(side / 3), 200);
    return { side, axialLoad: Math.round(axialLoad), donatı, etriye, minDim };
  };

  const getBeamSize = () => {
    const L = beamSpan * 1000; // mm
    const hMin = Math.ceil((L / (beamLoad === "ağır" ? 10 : 12)) / 50) * 50;
    const h = Math.max(hMin, 400);
    const b = Math.max(250, Math.ceil((h / 2.5) / 50) * 50);
    const etryeAralık = Math.min(Math.floor(h / 4), 150);
    return { h, b, etryeAralık };
  };

  const getSlabThickness = () => {
    const L = slabSpan * 1000;
    let ratio: number;
    if (slabType === "kirişli") ratio = 30;
    else if (slabType === "kirişsiz") ratio = 25;
    else ratio = 20; // nervürlü
    const t = Math.max(Math.ceil((L / ratio) / 10) * 10, slabType === "kirişsiz" ? 200 : 120);
    return { t };
  };

  return (
    <div className="space-y-4">
      <div className="flex rounded-lg border border-border overflow-hidden">
        {(["kolon", "kiriş", "döşeme"] as ElementType[]).map((e) => (
          <button
            key={e}
            onClick={() => { setElement(e); setCalculated(false); }}
            className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors capitalize ${element === e ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
          >
            {e.charAt(0).toUpperCase() + e.slice(1)}
          </button>
        ))}
      </div>

      {element === "kolon" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Kat Sayısı</label>
            <input type="number" value={floors} onChange={(e) => setFloors(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">DTS</label>
            <select value={dts} onChange={(e) => setDts(e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="1">DTS=1,1a</option>
              <option value="2">DTS=2,2a</option>
              <option value="3">DTS=3,3a</option>
              <option value="4">DTS=4,4a</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Açıklık X (m)</label>
            <input type="number" step="0.5" value={spanX} onChange={(e) => setSpanX(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Açıklık Y (m)</label>
            <input type="number" step="0.5" value={spanY} onChange={(e) => setSpanY(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>
      )}

      {element === "kiriş" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Açıklık (m)</label>
            <input type="number" step="0.5" value={beamSpan} onChange={(e) => setBeamSpan(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Yükleme Durumu</label>
            <select value={beamLoad} onChange={(e) => setBeamLoad(e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="hafif">Hafif (konut)</option>
              <option value="normal">Normal</option>
              <option value="ağır">Ağır (depo/ticari)</option>
            </select>
          </div>
        </div>
      )}

      {element === "döşeme" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Açıklık (m)</label>
            <input type="number" step="0.5" value={slabSpan} onChange={(e) => setSlabSpan(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Döşeme Tipi</label>
            <select value={slabType} onChange={(e) => setSlabType(e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="kirişli">Kirişli plak</option>
              <option value="kirişsiz">Kirişsiz (mantar) plak</option>
              <option value="nervürlü">Nervürlü (asmolen)</option>
            </select>
          </div>
        </div>
      )}

      <button onClick={() => setCalculated(true)} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
        Boyutlandır
      </button>

      {calculated && element === "kolon" && (() => {
        const r = getColumnSize();
        return (
          <div className="glass-card rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold">Ön Boyutlandırma Sonucu</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Tahmini N</span><span className="font-medium">{r.axialLoad} kN</span>
              <span className="text-muted-foreground">Min. Kesit (TBDY)</span><span className="font-medium">{r.minDim}×{r.minDim} mm</span>
              <span className="text-muted-foreground">Önerilen Kesit</span><span className="font-semibold text-primary">{r.side}×{r.side} mm</span>
              <span className="text-muted-foreground">Etriye Aralığı (sarılma)</span><span className="font-medium">≤{r.etriye} mm</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">⚠️ Ön boyutlandırmadır, detaylı statik hesap gereklidir.</p>
          </div>
        );
      })()}

      {calculated && element === "kiriş" && (() => {
        const r = getBeamSize();
        return (
          <div className="glass-card rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold">Ön Boyutlandırma Sonucu</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Kiriş Yüksekliği</span><span className="font-semibold text-primary">{r.h} mm</span>
              <span className="text-muted-foreground">Kiriş Genişliği</span><span className="font-semibold text-primary">{r.b} mm</span>
              <span className="text-muted-foreground">Min. Genişlik (TBDY)</span><span className="font-medium">250 mm</span>
              <span className="text-muted-foreground">Etriye Aralığı (mesnet)</span><span className="font-medium">≤{r.etryeAralık} mm</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">⚠️ Ön boyutlandırmadır, detaylı statik hesap gereklidir.</p>
          </div>
        );
      })()}

      {calculated && element === "döşeme" && (() => {
        const r = getSlabThickness();
        return (
          <div className="glass-card rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold">Ön Boyutlandırma Sonucu</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Döşeme Kalınlığı</span><span className="font-semibold text-primary">{r.t} mm</span>
              <span className="text-muted-foreground">Döşeme Tipi</span><span className="font-medium capitalize">{slabType}</span>
              <span className="text-muted-foreground">Açıklık/Kalınlık</span><span className="font-medium">{(slabSpan * 1000 / r.t).toFixed(1)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">⚠️ Ön boyutlandırmadır, detaylı statik hesap gereklidir.</p>
          </div>
        );
      })()}
    </div>
  );
}
