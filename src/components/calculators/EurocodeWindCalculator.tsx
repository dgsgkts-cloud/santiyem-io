import { useState } from "react";
import { Info, FileText, RotateCcw } from "lucide-react";

const Tip = ({ text }: { text: string }) => (
  <span className="group relative ml-1 cursor-help">
    <Info className="w-3.5 h-3.5 inline" style={{ color: "#64748B" }} />
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 w-56 text-[10px] p-2 rounded-lg"
      style={{ backgroundColor: "#1E2732", color: "#94A3B8", border: "1px solid #2A3441" }}>{text}</span>
  </span>
);

const inputCls = "w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF6B2B]/40 bg-[#0A0E13] border border-[#1E2732] text-[#F1F5F9]";
const fmt = (v: number, d = 3) => v.toFixed(d);

const TERRAIN_CATS = [
  { label: "0 — Açık deniz kıyısı", z0: 0.003, zmin: 1 },
  { label: "I — Göl/düz yatay alan", z0: 0.01, zmin: 1 },
  { label: "II — Az bitki örtülü alan (Çelik Yön. Referans)", z0: 0.05, zmin: 2 },
  { label: "III — Kasaba/orman", z0: 0.3, zmin: 5 },
  { label: "IV — Yoğun yapılaşma", z0: 1.0, zmin: 10 },
];

interface Inputs {
  Vb0: number; cdir: number; cseason: number;
  H: number; bw: number; d: number; hp: number;
  terrainIdx: number;
}

interface Results {
  vb: number; qb: number;
  kr: number; cr: number; vm: number; lv: number; qp: number;
  e1: number; e2: number;
  wallZones: { zone: string; cpe10: number; cpe1: number; we10: number; we1: number }[];
  roofZones: { zone: string; cpe10: number; we: number }[];
}

function compute(inp: Inputs): Results {
  const { Vb0, cdir, cseason, H, bw, d, hp, terrainIdx } = inp;
  const tc = TERRAIN_CATS[terrainIdx];
  const co = 1; const k1 = 1; const rho = 1.25;

  const vb = cdir * cseason * Vb0;
  const qb = 0.5 * rho * vb * vb / 1000;

  const kr = 0.19 * Math.pow(tc.z0 / 0.05, 0.07);
  const z = Math.max(H, tc.zmin);
  const cr = kr * Math.log(z / tc.z0);
  const vm = cr * co * vb;
  const lv = k1 / (co * Math.log(z / tc.z0));
  let qp = (1 + 7 * lv) * 0.5 * rho * vm * vm / 1000;
  qp = Math.max(qp, 0.5); // Çelik Yönetmelik min

  // e values for each face
  const e1 = Math.min(bw, 2 * H);
  const e2 = Math.min(d, 2 * H);

  // Wall pressure zones (simplified for D face - windward)
  const wallZones = [
    { zone: "A (kenar)", cpe10: -1.2, cpe1: -1.4, we10: -1.2 * qp, we1: -1.4 * qp },
    { zone: "B (orta)", cpe10: -0.8, cpe1: -1.1, we10: -0.8 * qp, we1: -1.1 * qp },
    { zone: "C (merkez)", cpe10: -0.5, cpe1: -0.5, we10: -0.5 * qp, we1: -0.5 * qp },
    { zone: "D (rüzgar)", cpe10: 0.8, cpe1: 1.0, we10: 0.8 * qp, we1: 1.0 * qp },
    { zone: "E (korunan)", cpe10: -0.5, cpe1: -0.5, we10: -0.5 * qp, we1: -0.5 * qp },
  ];

  // Flat roof zones based on hp/h
  const hpRatio = hp / H;
  const cpeF = hpRatio > 0.1 ? -1.4 : -1.8;
  const cpeG = hpRatio > 0.1 ? -0.9 : -1.2;
  const cpeH = -0.7;
  const cpeI_neg = -0.2;
  const cpeI_pos = 0.2;

  const roofZones = [
    { zone: "F (köşe)", cpe10: cpeF, we: cpeF * qp },
    { zone: "G (kenar)", cpe10: cpeG, we: cpeG * qp },
    { zone: "H (merkez)", cpe10: cpeH, we: cpeH * qp },
    { zone: "I (emme)", cpe10: cpeI_neg, we: cpeI_neg * qp },
    { zone: "I (basınç)", cpe10: cpeI_pos, we: cpeI_pos * qp },
  ];

  return { vb, qb, kr, cr, vm, lv, qp, e1, e2, wallZones, roofZones };
}

const EurocodeWindCalculator = () => {
  const [inp, setInp] = useState<Inputs>({
    Vb0: 28, cdir: 1, cseason: 1,
    H: 13, bw: 16, d: 32, hp: 1.2,
    terrainIdx: 2,
  });
  const [results, setResults] = useState<Results | null>(null);

  const set = <K extends keyof Inputs>(k: K, v: Inputs[K]) => setInp(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-semibold" style={{ color: "#F1F5F9" }}>Eurocode Rüzgar Yükü Hesabı (TS EN 1991-1-4)</h3>
        <p className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>Dikdörtgen yapılar için rüzgar basıncı ve katsayı hesabı</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>
            Vb,0 — Temel rüzgar hızı (m/s) <Tip text="Çelik Yönetmelik 2016 md.5.3: min 28 m/s (100 km/sa)" />
          </label>
          <input type="number" className={inputCls} value={inp.Vb0} min={10} max={60} onChange={e => set("Vb0", +e.target.value)} />
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>Arazi Kategorisi</label>
          <select className={inputCls} value={inp.terrainIdx} onChange={e => set("terrainIdx", +e.target.value)}>
            {TERRAIN_CATS.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>H — Yapı yüksekliği (m)</label>
          <input type="number" className={inputCls} value={inp.H} min={1} max={200} onChange={e => set("H", +e.target.value)} />
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>b — Cephe genişliği (m)</label>
          <input type="number" className={inputCls} value={inp.bw} min={1} max={500} onChange={e => set("bw", +e.target.value)} />
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>d — Cephe derinliği (m)</label>
          <input type="number" className={inputCls} value={inp.d} min={1} max={500} onChange={e => set("d", +e.target.value)} />
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>
            hp — Parapet yüksekliği (m) <Tip text="Çatı kenarındaki parapet duvarı yüksekliği" />
          </label>
          <input type="number" className={inputCls} value={inp.hp} min={0} max={5} step={0.1} onChange={e => set("hp", +e.target.value)} />
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>cdir — Doğrultu katsayısı</label>
          <input type="number" className={inputCls} value={inp.cdir} readOnly style={{ opacity: 0.6, cursor: "not-allowed" }} />
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>cseason — Mevsim katsayısı</label>
          <input type="number" className={inputCls} value={inp.cseason} readOnly style={{ opacity: 0.6, cursor: "not-allowed" }} />
        </div>
      </div>

      <button onClick={() => setResults(compute(inp))} className="w-full py-3 rounded-xl text-sm font-semibold"
        style={{ backgroundColor: "#FF6B2B", color: "#fff" }}>Hesapla</button>

      {results && (
        <div className="space-y-5 animate-fade-in">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "#60A5FA" }}>Temel Hız</p>
              <p className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{fmt(results.vb, 1)}</p>
              <p className="text-[10px]" style={{ color: "#94A3B8" }}>m/s</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(255,107,43,0.08)", border: "1px solid rgba(255,107,43,0.2)" }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "#FF6B2B" }}>Tepe Basıncı qp(z)</p>
              <p className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{fmt(results.qp)}</p>
              <p className="text-[10px]" style={{ color: "#94A3B8" }}>kN/m² {results.qp === 0.5 ? "(min)" : ""}</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "#60A5FA" }}>Ortalama Hız</p>
              <p className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{fmt(results.vm, 1)}</p>
              <p className="text-[10px]" style={{ color: "#94A3B8" }}>m/s</p>
            </div>
          </div>

          {/* Intermediate calcs */}
          <div className="rounded-lg p-3 grid grid-cols-4 gap-2 text-[10px]" style={{ backgroundColor: "#0A0E13", border: "1px solid #1E2732" }}>
            {[
              ["qb", results.qb, "kN/m²"], ["kr", results.kr, ""], ["cr(z)", results.cr, ""], ["Iv(z)", results.lv, ""],
              ["e₁", results.e1, "m"], ["e₂", results.e2, "m"],
            ].map(([k, v, u]) => (
              <div key={k as string}>
                <span style={{ color: "#64748B" }}>{k as string}: </span>
                <span className="font-mono font-medium" style={{ color: "#F1F5F9" }}>{fmt(v as number)} {u as string}</span>
              </div>
            ))}
          </div>

          {/* Wall zones table */}
          <div>
            <p className="text-[12px] font-semibold mb-2" style={{ color: "#94A3B8" }}>Duvar Bölgeleri — Basınç Katsayıları</p>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1E2732" }}>
              <table className="w-full text-[11px]">
                <thead><tr style={{ backgroundColor: "#0F1419" }}>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "#64748B" }}>Bölge</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "#64748B" }}>Cpe,10</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "#64748B" }}>Cpe,1</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "#64748B" }}>we,10 (kN/m²)</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "#64748B" }}>we,1 (kN/m²)</th>
                </tr></thead>
                <tbody>
                  {results.wallZones.map((z, i) => (
                    <tr key={z.zone} style={{ backgroundColor: i % 2 === 0 ? "#161C23" : "#0F1419" }}>
                      <td className="px-3 py-1.5" style={{ color: "#F1F5F9" }}>{z.zone}</td>
                      <td className="px-3 py-1.5 text-right font-mono" style={{ color: "#F1F5F9" }}>{z.cpe10}</td>
                      <td className="px-3 py-1.5 text-right font-mono" style={{ color: "#F1F5F9" }}>{z.cpe1}</td>
                      <td className="px-3 py-1.5 text-right font-mono" style={{ color: z.we10 > 0 ? "#FF6B2B" : "#60A5FA" }}>{fmt(z.we10)}</td>
                      <td className="px-3 py-1.5 text-right font-mono" style={{ color: z.we1 > 0 ? "#FF6B2B" : "#60A5FA" }}>{fmt(z.we1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Roof zones */}
          <div>
            <p className="text-[12px] font-semibold mb-2" style={{ color: "#94A3B8" }}>Çatı Bölgeleri — Düz Çatı (hp/h = {fmt(inp.hp / inp.H)})</p>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1E2732" }}>
              <table className="w-full text-[11px]">
                <thead><tr style={{ backgroundColor: "#0F1419" }}>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "#64748B" }}>Bölge</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "#64748B" }}>Cpe,10</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "#64748B" }}>we (kN/m²)</th>
                </tr></thead>
                <tbody>
                  {results.roofZones.map((z, i) => (
                    <tr key={z.zone} style={{ backgroundColor: i % 2 === 0 ? "#161C23" : "#0F1419" }}>
                      <td className="px-3 py-1.5" style={{ color: "#F1F5F9" }}>{z.zone}</td>
                      <td className="px-3 py-1.5 text-right font-mono" style={{ color: "#F1F5F9" }}>{z.cpe10}</td>
                      <td className="px-3 py-1.5 text-right font-mono" style={{ color: z.we > 0 ? "#FF6B2B" : "#60A5FA" }}>{fmt(z.we)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl p-3" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
            <p className="text-[11px]" style={{ color: "#F59E0B" }}>⚠️ Bu hesap TS EN 1991-1-4 esaslarına göre hazırlanmıştır. Çelik Yönetmelik 2016 gereği qp min 0.5 kN/m²'dir.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium" style={{ backgroundColor: "#161C23", color: "#F1F5F9", border: "1px solid #1E2732" }}>
              <FileText className="w-3.5 h-3.5" /> PDF İndir
            </button>
            <button onClick={() => setResults(null)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium" style={{ backgroundColor: "#161C23", color: "#F1F5F9", border: "1px solid #1E2732" }}>
              <RotateCcw className="w-3.5 h-3.5" /> Yeni Hesaplama
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EurocodeWindCalculator;
