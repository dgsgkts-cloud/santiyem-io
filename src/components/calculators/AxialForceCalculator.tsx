import { useState, useMemo } from "react";
import { Info, FileText, RotateCcw } from "lucide-react";
import { ALL_PROFILES, MATERIALS, SteelProfile, SteelMaterial, getProfilesBySeriesGroup } from "@/lib/steelProfiles";

const Tip = ({ text }: { text: string }) => (
  <span className="group relative ml-1 cursor-help">
    <Info className="w-3.5 h-3.5 inline" style={{ color: "#64748B" }} />
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 w-56 text-[10px] p-2 rounded-lg"
      style={{ backgroundColor: "#1E2732", color: "#94A3B8", border: "1px solid #2A3441" }}>{text}</span>
  </span>
);

const inputCls = "w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF6B2B]/40 bg-[#0A0E13] border border-[#1E2732] text-[#F1F5F9]";
const fmt = (v: number, d = 2) => v.toFixed(d);

type Tab = "plate" | "profile" | "pipe" | "box";

const E = 200000; // MPa

interface ProfileInputs {
  profile: SteelProfile | null;
  mat: SteelMaterial;
  Lx: number; Ly: number; // cm
  Tt: number; Tc: number; // kN
  connL: number; U: number; Al: number; // cm², connection
}

interface PlateInputs {
  bPlate: number; tPlate: number; // cm
  mat: SteelMaterial;
  Lx: number; Ly: number;
  Tt: number; Tc: number;
  connL: number; U: number; Al: number;
}

interface CalcResults {
  // Tension
  phiPn_gross: number; phiPn_net: number; tensionCap: number; PMMt: number;
  // Compression
  lambdaX: number; lambdaY: number;
  narinX_ok: boolean; narinY_ok: boolean;
  Fe: number; Fcr: number; phiPn_comp: number; PMMc: number;
  passT: boolean; passC: boolean;
}

function computeAxial(A: number, ix: number, iy: number, mat: SteelMaterial, Lx: number, Ly: number, Tt: number, Tc: number, U: number, Al: number): CalcResults {
  const Fy = mat.Fy; const Fu = mat.Fu;

  // TENSION
  const phiPn_gross = 0.9 * Fy * A / 10; // kN (A in cm², Fy in MPa=N/mm²→ /10 for kN)
  const An = A - Al;
  const Ae = U * An;
  const phiPn_net = 0.75 * Fu * Ae / 10; // kN
  const tensionCap = Math.min(phiPn_gross, phiPn_net);
  const PMMt = Tt > 0 ? (Tt / tensionCap) * 100 : 0;

  // COMPRESSION
  const lambdaX = Lx / ix;
  const lambdaY = Ly / iy;
  const narinX_ok = lambdaX <= 200;
  const narinY_ok = lambdaY <= 200;
  const lambdaMax = Math.max(lambdaX, lambdaY);

  const Fe = (Math.PI * Math.PI * E) / (lambdaMax * lambdaMax);
  const limit = 4.71 * Math.sqrt(E / Fy);

  let Fcr: number;
  if (lambdaMax <= limit) {
    Fcr = Math.pow(0.658, Fy / Fe) * Fy;
  } else {
    Fcr = 0.877 * Fe;
  }

  const phiPn_comp = 0.9 * Fcr * A / 10; // kN
  const PMMc = Tc > 0 ? (Tc / phiPn_comp) * 100 : 0;

  return {
    phiPn_gross, phiPn_net, tensionCap, PMMt,
    lambdaX, lambdaY, narinX_ok, narinY_ok,
    Fe, Fcr, phiPn_comp, PMMc,
    passT: PMMt <= 100, passC: PMMc <= 100,
  };
}

const AxialForceCalculator = () => {
  const [tab, setTab] = useState<Tab>("profile");
  // Profile tab state
  const [profile, setProfile] = useState<SteelProfile | null>(null);
  const [mat, setMat] = useState(MATERIALS[0]);
  const [Lx, setLx] = useState(600);
  const [Ly, setLy] = useState(370);
  const [Tt, setTt] = useState(240);
  const [Tc, setTc] = useState(1760);
  const [U, setU] = useState(1);
  const [Al, setAl] = useState(0);
  // Plate tab state
  const [bPlate, setBPlate] = useState(20);
  const [tPlate, setTPlate] = useState(2);
  // Pipe
  const [Dpipe, setDpipe] = useState(114.3);
  const [tpipe, setTpipe] = useState(6.3);
  // Box
  const [bBox, setBBox] = useState(100);
  const [hBox, setHBox] = useState(100);
  const [tBox, setTBox] = useState(6);

  const [results, setResults] = useState<CalcResults | null>(null);

  const groups = getProfilesBySeriesGroup();

  const handleCalc = () => {
    let A: number, ix_val: number, iy_val: number;
    if (tab === "profile" && profile) {
      A = profile.A; ix_val = profile.ix; iy_val = profile.iy;
    } else if (tab === "plate") {
      A = bPlate * tPlate;
      ix_val = tPlate / Math.sqrt(12);
      iy_val = bPlate / Math.sqrt(12);
    } else if (tab === "pipe") {
      const Do = Dpipe / 10; const ti = tpipe / 10; // cm
      const Di = Do - 2 * ti;
      A = Math.PI / 4 * (Do * Do - Di * Di);
      const I = Math.PI / 64 * (Math.pow(Do, 4) - Math.pow(Di, 4));
      ix_val = Math.sqrt(I / A);
      iy_val = ix_val;
    } else if (tab === "box") {
      const bCm = bBox / 10; const hCm = hBox / 10; const tCm = tBox / 10;
      A = bCm * hCm - (bCm - 2 * tCm) * (hCm - 2 * tCm);
      const Ix = (bCm * Math.pow(hCm, 3) - (bCm - 2 * tCm) * Math.pow(hCm - 2 * tCm, 3)) / 12;
      const Iy = (hCm * Math.pow(bCm, 3) - (hCm - 2 * tCm) * Math.pow(bCm - 2 * tCm, 3)) / 12;
      ix_val = Math.sqrt(Ix / A);
      iy_val = Math.sqrt(Iy / A);
    } else return;

    setResults(computeAxial(A, ix_val, iy_val, mat, Lx, Ly, Tt, Tc, U, Al));
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "plate", label: "Plaka" },
    { id: "profile", label: "Hadde Profil" },
    { id: "pipe", label: "Boru Profil" },
    { id: "box", label: "Kutu Profil" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-semibold" style={{ color: "#F1F5F9" }}>Eksenel Basınç ve Çekme Kuvveti Kontrolü</h3>
        <p className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>TBDY 2018 / AISC 360-16 kapsamında çekme ve basınç kapasitesi kontrolü</p>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "#0A0E13" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setResults(null); }}
            className="flex-1 py-2 rounded-md text-[12px] font-medium transition-all"
            style={{
              backgroundColor: tab === t.id ? "#FF6B2B" : "transparent",
              color: tab === t.id ? "#fff" : "#94A3B8",
            }}>{t.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tab-specific inputs */}
        {tab === "profile" && (
          <>
            <div className="sm:col-span-2">
              <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>Profil Seçimi</label>
              <select className={inputCls} value={profile?.name || ""} onChange={e => setProfile(ALL_PROFILES.find(p => p.name === e.target.value) || null)}>
                <option value="">Profil seçin...</option>
                {groups.map(g => (
                  <optgroup key={g.label} label={g.label}>
                    {g.profiles.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            {profile && (
              <div className="sm:col-span-2 rounded-lg p-3 grid grid-cols-4 gap-2 text-[10px]" style={{ backgroundColor: "#0A0E13", border: "1px solid #1E2732" }}>
                {[["A", profile.A, "cm²"], ["G", profile.G, "kg/m"], ["Ix", profile.Ix, "cm⁴"], ["Iy", profile.Iy, "cm⁴"],
                  ["ix", profile.ix, "cm"], ["iy", profile.iy, "cm"], ["Wx", profile.Wplx, "cm³"], ["Wy", profile.Wply, "cm³"]
                ].map(([k, v, u]) => (
                  <div key={k as string}><span style={{ color: "#64748B" }}>{k as string}: </span><span className="font-mono" style={{ color: "#F1F5F9" }}>{v as number} {u as string}</span></div>
                ))}
              </div>
            )}
          </>
        )}
        {tab === "plate" && (
          <>
            <div>
              <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>b — Genişlik (cm)</label>
              <input type="number" className={inputCls} value={bPlate} min={1} onChange={e => setBPlate(+e.target.value)} />
            </div>
            <div>
              <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>t — Kalınlık (cm)</label>
              <input type="number" className={inputCls} value={tPlate} min={0.1} step={0.1} onChange={e => setTPlate(+e.target.value)} />
            </div>
          </>
        )}
        {tab === "pipe" && (
          <>
            <div>
              <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>D — Dış çap (mm)</label>
              <input type="number" className={inputCls} value={Dpipe} min={10} onChange={e => setDpipe(+e.target.value)} />
            </div>
            <div>
              <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>t — Et kalınlığı (mm)</label>
              <input type="number" className={inputCls} value={tpipe} min={1} step={0.1} onChange={e => setTpipe(+e.target.value)} />
            </div>
          </>
        )}
        {tab === "box" && (
          <>
            <div>
              <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>b — Genişlik (mm)</label>
              <input type="number" className={inputCls} value={bBox} min={10} onChange={e => setBBox(+e.target.value)} />
            </div>
            <div>
              <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>h — Yükseklik (mm)</label>
              <input type="number" className={inputCls} value={hBox} min={10} onChange={e => setHBox(+e.target.value)} />
            </div>
            <div>
              <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>t — Et kalınlığı (mm)</label>
              <input type="number" className={inputCls} value={tBox} min={1} step={0.5} onChange={e => setTBox(+e.target.value)} />
            </div>
          </>
        )}

        {/* Common inputs */}
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>Malzeme</label>
          <select className={inputCls} value={mat.name} onChange={e => setMat(MATERIALS.find(m => m.name === e.target.value) || MATERIALS[0])}>
            {MATERIALS.map(m => <option key={m.name} value={m.name}>{m.name} (Fy={m.Fy}, Fu={m.Fu} MPa)</option>)}
          </select>
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>LX — Güçlü eksen burkulma boyu (cm)</label>
          <input type="number" className={inputCls} value={Lx} min={1} onChange={e => setLx(+e.target.value)} />
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>LY — Zayıf eksen burkulma boyu (cm)</label>
          <input type="number" className={inputCls} value={Ly} min={1} onChange={e => setLy(+e.target.value)} />
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>Tt — Çekme kuvveti (kN)</label>
          <input type="number" className={inputCls} value={Tt} min={0} onChange={e => setTt(+e.target.value)} />
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>Tc — Basınç kuvveti (kN)</label>
          <input type="number" className={inputCls} value={Tc} min={0} onChange={e => setTc(+e.target.value)} />
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>
            U — Kesme gecikmesi katsayısı <Tip text="Tam bağlantı için 1.0, kaynaklı birleşim için profil tipine göre değişir" />
          </label>
          <input type="number" className={inputCls} value={U} min={0} max={1} step={0.01} onChange={e => setU(+e.target.value)} />
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>
            Al — Kayıp alan (cm²) <Tip text="Cıvatalı bağlantıda delik kayıp alanı. Kaynaklı ise 0." />
          </label>
          <input type="number" className={inputCls} value={Al} min={0} step={0.1} onChange={e => setAl(+e.target.value)} />
        </div>
      </div>

      <button onClick={handleCalc}
        disabled={tab === "profile" && !profile}
        className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
        style={{ backgroundColor: "#FF6B2B", color: "#fff" }}>Hesapla</button>

      {results && (
        <div className="space-y-5 animate-fade-in">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "#60A5FA" }}>Çekme Kapasitesi</p>
              <p className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{fmt(results.tensionCap)}</p>
              <p className="text-[10px]" style={{ color: "#94A3B8" }}>kN</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(255,107,43,0.08)", border: "1px solid rgba(255,107,43,0.2)" }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: "#FF6B2B" }}>Basınç Kapasitesi</p>
              <p className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{fmt(results.phiPn_comp)}</p>
              <p className="text-[10px]" style={{ color: "#94A3B8" }}>kN</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: results.passT ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${results.passT ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: results.passT ? "#22C55E" : "#EF4444" }}>PMM,t</p>
              <p className="text-lg font-bold" style={{ color: "#F1F5F9" }}>%{fmt(results.PMMt, 1)}</p>
              <p className="text-[10px]" style={{ color: "#94A3B8" }}>Çekme oranı</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: results.passC ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${results.passC ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
              <p className="text-[10px] font-semibold uppercase" style={{ color: results.passC ? "#22C55E" : "#EF4444" }}>PMM,c</p>
              <p className="text-lg font-bold" style={{ color: "#F1F5F9" }}>%{fmt(results.PMMc, 1)}</p>
              <p className="text-[10px]" style={{ color: "#94A3B8" }}>Basınç oranı</p>
            </div>
          </div>

          {/* Detail table */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1E2732" }}>
            <table className="w-full text-[11px]">
              <thead><tr style={{ backgroundColor: "#0F1419" }}>
                <th className="px-3 py-2 text-left font-medium" style={{ color: "#64748B" }}>Kontrol</th>
                <th className="px-3 py-2 text-right font-medium" style={{ color: "#64748B" }}>Değer</th>
                <th className="px-3 py-2 text-right font-medium" style={{ color: "#64748B" }}>Sınır</th>
                <th className="px-3 py-2 text-center font-medium" style={{ color: "#64748B" }}>Sonuç</th>
              </tr></thead>
              <tbody>
                {[
                  { label: "LX/iX narinlik", val: fmt(results.lambdaX, 1), limit: "200", ok: results.narinX_ok },
                  { label: "LY/iY narinlik", val: fmt(results.lambdaY, 1), limit: "200", ok: results.narinY_ok },
                  { label: "Brüt kesit akması", val: `${fmt(results.phiPn_gross)} kN`, limit: "—", ok: true },
                  { label: "Net kesit kopması", val: `${fmt(results.phiPn_net)} kN`, limit: "—", ok: true },
                  { label: "Burkulma kapasitesi", val: `${fmt(results.phiPn_comp)} kN`, limit: "—", ok: true },
                  { label: "PMM,t", val: `%${fmt(results.PMMt, 1)}`, limit: "100%", ok: results.passT },
                  { label: "PMM,c", val: `%${fmt(results.PMMc, 1)}`, limit: "100%", ok: results.passC },
                ].map((row, i) => (
                  <tr key={row.label} style={{ backgroundColor: i % 2 === 0 ? "#161C23" : "#0F1419" }}>
                    <td className="px-3 py-2" style={{ color: "#F1F5F9" }}>{row.label}</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: "#F1F5F9" }}>{row.val}</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: "#64748B" }}>{row.limit}</td>
                    <td className="px-3 py-2 text-center" style={{ color: row.ok ? "#22C55E" : "#EF4444" }}>{row.ok ? "✅" : "❌"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl p-3" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
            <p className="text-[11px]" style={{ color: "#F59E0B" }}>⚠️ Bu hesaplama TBDY 2018 ve AISC 360-16 esaslarına göredir. Proje kontrolü için yetkili mühendis onayı alınız.</p>
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

export default AxialForceCalculator;
