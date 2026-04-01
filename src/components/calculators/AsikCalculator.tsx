import { useState } from "react";
import { Info, FileText, RotateCcw } from "lucide-react";
import { ALL_PROFILES, MATERIALS, SteelProfile, SteelMaterial, getProfilesBySeriesGroup } from "@/lib/steelProfiles";

const Tip = ({ text }: { text: string }) => (
  <span className="group relative ml-1 cursor-help">
    <Info className="w-3.5 h-3.5 inline" style={{ color: "#64748B" }} />
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 w-56 text-[10px] p-2 rounded-lg"
      style={{ backgroundColor: "#1E2732", color: "#94A3B8", border: "1px solid #2A3441" }}>{text}</span>
  </span>
);

const fmt = (v: number, d = 2) => v.toFixed(d);
const inputCls = "w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF6B2B]/40 bg-[#0A0E13] border border-[#1E2732] text-[#F1F5F9]";

interface Inputs {
  profile: SteelProfile | null;
  mat: SteelMaterial;
  L: number; s: number; a0: number; n: number;
  P1: number; P2: number;
}

interface Results {
  G_total: number; Gx: number; Gy: number;
  Mx: number; My: number;
  combos: { label: string; Mx: number; My: number; PMM: number }[];
  PMM: number; pass: boolean;
}

function compute(inp: Inputs): Results | null {
  const { profile, mat, L, s, a0, n, P1, P2 } = inp;
  if (!profile) return null;

  const G_total = P1 + P2 * s;
  const rad = (a0 * Math.PI) / 180;
  const Gx = G_total * Math.cos(rad);
  const Gy = G_total * Math.sin(rad);

  let Mx: number, My: number;
  Mx = (Gx * L * L) / 8;
  if (n === 0) My = (Gy * L * L) / 8;
  else if (n === 1) My = (Gy * L * L) / 32;
  else My = (Gy * (L / 3) ** 2) / 8;

  // kgf·m → kN·m
  const Mx_kNm = (Mx * 9.81) / 1000;
  const My_kNm = (My * 9.81) / 1000;

  const factors = [
    { label: "1.4G", f: 1.4 },
    { label: "1.2G + 1.6Q", f: 1.6 },
    { label: "1.2G + 1.6S", f: 1.6 },
    { label: "1.2G + 1.6S + Q", f: 1.7 },
  ];

  const Fy = mat.Fy; // MPa = N/mm² → kN/cm² = Fy/10
  const Fy_kNcm2 = Fy / 10;
  const Wplx = profile.Wplx; // cm³
  const Wply = profile.Wply; // cm³
  const Mplx = Fy_kNcm2 * Wplx / 100; // kN·m
  const Mply = Fy_kNcm2 * Wply / 100; // kN·m

  const combos = factors.map(f => {
    const mx = Mx_kNm * f.f;
    const my = My_kNm * f.f;
    const pmm = (mx / Mplx + my / Mply) * 100;
    return { label: f.label, Mx: mx, My: my, PMM: pmm };
  });

  const maxPMM = Math.max(...combos.map(c => c.PMM));
  return {
    G_total, Gx, Gy, Mx: Mx_kNm, My: My_kNm,
    combos, PMM: maxPMM, pass: maxPMM <= 100,
  };
}

const AsikCalculator = () => {
  const [profile, setProfile] = useState<SteelProfile | null>(null);
  const [mat, setMat] = useState(MATERIALS[0]);
  const [L, setL] = useState(6);
  const [s, setS] = useState(1.2);
  const [a0, setA0] = useState(5.4);
  const [n, setN] = useState(2);
  const [P1, setP1] = useState(6.0);
  const [P2, setP2] = useState(30);
  const [results, setResults] = useState<Results | null>(null);

  const handleProfileChange = (name: string) => {
    const p = ALL_PROFILES.find(pr => pr.name === name) || null;
    setProfile(p);
    if (p) setP1(p.G);
  };

  const handleCalc = () => {
    setResults(compute({ profile, mat, L, s, a0, n, P1, P2 }));
  };

  const groups = getProfilesBySeriesGroup();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-semibold" style={{ color: "#F1F5F9" }}>Çatı Aşığı Kontrolü (TBDY 2018)</h3>
        <p className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>Çift eksenli eğilme altında çelik aşık profil kontrolü</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Profile */}
        <div className="sm:col-span-2">
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>Profil Seçimi</label>
          <select className={inputCls} value={profile?.name || ""} onChange={e => handleProfileChange(e.target.value)}>
            <option value="">Profil seçin...</option>
            {groups.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.profiles.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Profile props */}
        {profile && (
          <div className="sm:col-span-2 rounded-lg p-3 grid grid-cols-4 gap-2 text-[10px]" style={{ backgroundColor: "#0A0E13", border: "1px solid #1E2732" }}>
            {[
              ["A", profile.A, "cm²"], ["G", profile.G, "kg/m"], ["h", profile.h, "mm"], ["b", profile.b, "mm"],
              ["tw", profile.tw, "mm"], ["tf", profile.tf, "mm"], ["Ix", profile.Ix, "cm⁴"], ["Iy", profile.Iy, "cm⁴"],
              ["Wpl,x", profile.Wplx, "cm³"], ["Wpl,y", profile.Wply, "cm³"], ["ix", profile.ix, "cm"], ["iy", profile.iy, "cm"],
            ].map(([k, v, u]) => (
              <div key={k as string}>
                <span style={{ color: "#64748B" }}>{k as string}: </span>
                <span className="font-mono font-medium" style={{ color: "#F1F5F9" }}>{v as number} {u as string}</span>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>L — Profil uzunluğu (m)</label>
          <input type="number" className={inputCls} value={L} min={1} max={20} onChange={e => setL(+e.target.value)} />
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>s — Aşık sıklığı (m)</label>
          <input type="number" className={inputCls} value={s} min={0.5} max={5} step={0.1} onChange={e => setS(+e.target.value)} />
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>a0 — Çatı eğimi (°)</label>
          <input type="number" className={inputCls} value={a0} min={0} max={45} step={0.1} onChange={e => setA0(+e.target.value)} />
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>
            n — Gergi adedi <Tip text="Çatı düzleminde aşıklar arasındaki gergi çubuk sayısı" />
          </label>
          <input type="number" className={inputCls} value={n} min={0} max={5} onChange={e => setN(+e.target.value)} />
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>P1 — Aşık ağırlığı (kg/m)</label>
          <input type="number" className={inputCls} value={P1} min={0} step={0.1} onChange={e => setP1(+e.target.value)} />
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>P2 — Kaplama ağırlığı (kg/m²)</label>
          <input type="number" className={inputCls} value={P2} min={0} max={200} onChange={e => setP2(+e.target.value)} />
        </div>

        {/* Material */}
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>Malzeme</label>
          <select className={inputCls} value={mat.name} onChange={e => setMat(MATERIALS.find(m => m.name === e.target.value) || MATERIALS[0])}>
            {MATERIALS.map(m => <option key={m.name} value={m.name}>{m.name} (Fy={m.Fy}, Fu={m.Fu} MPa)</option>)}
          </select>
        </div>
      </div>

      <button onClick={handleCalc} disabled={!profile}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
        style={{ backgroundColor: "#FF6B2B", color: "#fff" }}>Hesapla</button>

      {results && (
        <div className="space-y-5 animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "#60A5FA" }}>Mx</p>
              <p className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{fmt(results.Mx)}</p>
              <p className="text-[10px]" style={{ color: "#94A3B8" }}>kN·m</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "#60A5FA" }}>My</p>
              <p className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{fmt(results.My)}</p>
              <p className="text-[10px]" style={{ color: "#94A3B8" }}>kN·m</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: results.pass ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${results.pass ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: results.pass ? "#22C55E" : "#EF4444" }}>PMM</p>
              <p className="text-lg font-bold" style={{ color: "#F1F5F9" }}>%{fmt(results.PMM, 1)}</p>
              <p className="text-[10px]" style={{ color: "#94A3B8" }}>Kapasite oranı</p>
            </div>
            <div className="rounded-xl p-3 flex flex-col items-center justify-center" style={{ backgroundColor: results.pass ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${results.pass ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
              <p className="text-2xl">{results.pass ? "✅" : "❌"}</p>
              <p className="text-[11px] font-semibold" style={{ color: results.pass ? "#22C55E" : "#EF4444" }}>{results.pass ? "YETERLİ" : "YETERSİZ"}</p>
            </div>
          </div>

          {/* Combos table */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1E2732" }}>
            <table className="w-full text-[11px]">
              <thead><tr style={{ backgroundColor: "#0F1419" }}>
                <th className="px-3 py-2 text-left font-medium" style={{ color: "#64748B" }}>Kombinasyon</th>
                <th className="px-3 py-2 text-right font-medium" style={{ color: "#64748B" }}>Mx (kN·m)</th>
                <th className="px-3 py-2 text-right font-medium" style={{ color: "#64748B" }}>My (kN·m)</th>
                <th className="px-3 py-2 text-right font-medium" style={{ color: "#64748B" }}>PMM (%)</th>
              </tr></thead>
              <tbody>
                {results.combos.map((c, i) => {
                  const isMax = c.PMM === results.PMM;
                  return (
                    <tr key={i} style={{ backgroundColor: isMax ? "rgba(239,68,68,0.08)" : i % 2 === 0 ? "#161C23" : "#0F1419" }}>
                      <td className="px-3 py-2" style={{ color: isMax ? "#EF4444" : "#F1F5F9", fontWeight: isMax ? 700 : 400 }}>{c.label}</td>
                      <td className="px-3 py-2 text-right font-mono" style={{ color: "#F1F5F9" }}>{fmt(c.Mx)}</td>
                      <td className="px-3 py-2 text-right font-mono" style={{ color: "#F1F5F9" }}>{fmt(c.My)}</td>
                      <td className="px-3 py-2 text-right font-mono" style={{ color: isMax ? "#EF4444" : "#F1F5F9", fontWeight: isMax ? 700 : 400 }}>{fmt(c.PMM, 1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl p-3" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
            <p className="text-[11px]" style={{ color: "#F59E0B" }}>⚠️ Bu hesaplama referans amaçlıdır, proje kontrolü için yetkili mühendis onayı alınız.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium" style={{ backgroundColor: "#161C23", color: "#F1F5F9", border: "1px solid #1E2732" }}>
              <FileText className="w-3.5 h-3.5" /> PDF İndir
            </button>
            <button onClick={() => { setResults(null); }} className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium" style={{ backgroundColor: "#161C23", color: "#F1F5F9", border: "1px solid #1E2732" }}>
              <RotateCcw className="w-3.5 h-3.5" /> Yeni Hesaplama
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AsikCalculator;
