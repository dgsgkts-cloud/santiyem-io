import { useState } from "react";

interface BridgeItem {
  name: string;
  psi: number; // W/mK linear thermal transmittance
  length: number; // m
}

const DEFAULT_BRIDGES: { name: string; psi: number; desc: string }[] = [
  { name: "Balkon konsol bağlantısı", psi: 0.90, desc: "En kritik ısı köprüsü" },
  { name: "Pencere-duvar bileşimi", psi: 0.10, desc: "Kasa çevresi" },
  { name: "Duvar-döşeme birleşimi", psi: 0.15, desc: "Kat arası bileşim" },
  { name: "Duvar köşe birleşimi", psi: 0.05, desc: "İç/dış köşe" },
  { name: "Çatı-duvar birleşimi", psi: 0.20, desc: "Parapet/saçak" },
  { name: "Temel-duvar birleşimi", psi: 0.30, desc: "Zemin kat" },
];

export default function ThermalBridgeCalculator() {
  const [bridges, setBridges] = useState<BridgeItem[]>(
    DEFAULT_BRIDGES.map((b) => ({ name: b.name, psi: b.psi, length: 0 }))
  );
  const [wallArea, setWallArea] = useState(200);
  const [wallU, setWallU] = useState(0.50);
  const [calculated, setCalculated] = useState(false);

  const updateBridge = (index: number, field: "psi" | "length", value: number) => {
    setBridges((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  };

  const totalPsiL = bridges.reduce((sum, b) => sum + b.psi * b.length, 0);
  const wallHeatLoss = wallU * wallArea;
  const bridgeHeatLoss = totalPsiL;
  const totalHeatLoss = wallHeatLoss + bridgeHeatLoss;
  const bridgeRatio = totalHeatLoss > 0 ? (bridgeHeatLoss / totalHeatLoss) * 100 : 0;
  const effectiveU = totalHeatLoss / wallArea;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Duvar Alanı (m²)</label>
          <input type="number" value={wallArea} onChange={(e) => setWallArea(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Duvar U Değeri (W/m²K)</label>
          <input type="number" step="0.01" value={wallU} onChange={(e) => setWallU(+e.target.value)} className="w-full mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="text-xs font-medium text-muted-foreground">Isı Köprüsü Detayları (Ψ: W/mK, Uzunluk: m)</div>
      <div className="space-y-2 max-h-52 overflow-y-auto">
        {bridges.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-40 shrink-0 truncate" title={b.name}>{b.name}</span>
            <input type="number" step="0.01" value={b.psi} onChange={(e) => updateBridge(i, "psi", +e.target.value)}
              className="w-20 rounded border border-input bg-background px-2 py-1 text-xs" placeholder="Ψ" />
            <input type="number" value={b.length} onChange={(e) => updateBridge(i, "length", +e.target.value)}
              className="w-20 rounded border border-input bg-background px-2 py-1 text-xs" placeholder="m" />
            <span className="text-[10px] text-muted-foreground w-16 text-right">{(b.psi * b.length).toFixed(2)} W/K</span>
          </div>
        ))}
      </div>

      <button onClick={() => setCalculated(true)} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
        Hesapla
      </button>

      {calculated && (
        <div className="glass-card rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-semibold">Isı Köprüsü Analizi</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Duvar Isı Kaybı</span>
            <span className="font-medium">{wallHeatLoss.toFixed(1)} W/K</span>
            <span className="text-muted-foreground">Isı Köprüsü Kaybı</span>
            <span className="font-semibold text-destructive">{bridgeHeatLoss.toFixed(1)} W/K</span>
            <span className="text-muted-foreground">Toplam Isı Kaybı</span>
            <span className="font-semibold text-primary">{totalHeatLoss.toFixed(1)} W/K</span>
            <span className="text-muted-foreground">Isı Köprüsü Oranı</span>
            <span className={`font-semibold ${bridgeRatio > 20 ? "text-destructive" : bridgeRatio > 10 ? "text-orange-500" : "text-emerald-600"}`}>
              %{bridgeRatio.toFixed(1)} {bridgeRatio > 20 ? "⚠️ Yüksek!" : bridgeRatio > 10 ? "⚠️ Dikkat" : "✓ Normal"}
            </span>
            <span className="text-muted-foreground">Efektif U Değeri</span>
            <span className="font-semibold">{effectiveU.toFixed(3)} W/m²K</span>
          </div>
          {bridgeRatio > 15 && (
            <div className="mt-3 p-2 rounded bg-destructive/10 text-xs text-destructive">
              💡 Isı köprüsü oranı yüksek. Balkon bağlantılarında ısı kesici (thermal break) kullanımı ve pencere kasalarında yalıtım iyileştirmesi önerilir.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
