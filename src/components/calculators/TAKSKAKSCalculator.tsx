import { useState } from "react";

export default function TAKSKAKSCalculator() {
  const [parcelArea, setParcelArea] = useState(500);
  const [taks, setTaks] = useState(0.40);
  const [kaks, setKaks] = useState(2.07);
  const [hmax, setHmax] = useState(24.5);
  const [floorHeight, setFloorHeight] = useState(3.0);
  const [calculated, setCalculated] = useState(false);

  const tabanAlani = parcelArea * taks;
  const toplamInsaat = parcelArea * kaks;
  const maxKat = Math.floor(hmax / floorHeight);
  const katBasinaAlan = toplamInsaat / maxKat;
  const katTAKS = katBasinaAlan / parcelArea;
  const kalanAlan = parcelArea - tabanAlani;
  const yesilOran = (kalanAlan / parcelArea) * 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Parsel Alanı (m²)</label>
          <input type="number" value={parcelArea} onChange={(e) => setParcelArea(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">TAKS</label>
          <input type="number" step="0.01" value={taks} onChange={(e) => setTaks(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">KAKS (Emsal)</label>
          <input type="number" step="0.01" value={kaks} onChange={(e) => setKaks(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Hmaks (m)</label>
          <input type="number" step="0.5" value={hmax} onChange={(e) => setHmax(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground">Kat Yüksekliği (m)</label>
          <input type="number" step="0.1" value={floorHeight} onChange={(e) => setFloorHeight(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
      </div>

      <button onClick={() => setCalculated(true)} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
        Hesapla
      </button>

      {calculated && (
        <div className="glass-card rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-semibold">İmar Hesap Sonuçları</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Max. Taban Alanı</span>
            <span className="font-semibold text-primary">{tabanAlani.toFixed(1)} m²</span>
            <span className="text-muted-foreground">Toplam İnşaat Alanı</span>
            <span className="font-semibold text-primary">{toplamInsaat.toFixed(1)} m²</span>
            <span className="text-muted-foreground">Max. Kat Adedi</span>
            <span className="font-semibold">{maxKat} kat</span>
            <span className="text-muted-foreground">Kat Başına Alan</span>
            <span className="font-medium">{katBasinaAlan.toFixed(1)} m²</span>
            <span className="text-muted-foreground">Fiili Kat TAKS</span>
            <span className={`font-medium ${katTAKS <= taks ? "text-emerald-600" : "text-destructive"}`}>
              {katTAKS.toFixed(3)} {katTAKS <= taks ? "✓" : "⚠️ TAKS aşımı!"}
            </span>
            <span className="text-muted-foreground">Bahçe/Yeşil Alan</span>
            <span className="font-medium">{kalanAlan.toFixed(1)} m² (%{yesilOran.toFixed(0)})</span>
          </div>
          <div className="mt-3 p-2 rounded bg-secondary/50 text-xs text-muted-foreground">
            💡 {maxKat} katta eşit dağılımla her kata {katBasinaAlan.toFixed(0)} m² inşaat alanı düşer. 
            Bodrum katlar genelde KAKS'a dahil edilmez (imar planına bağlı).
          </div>
        </div>
      )}
    </div>
  );
}
