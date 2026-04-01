import { useState, useMemo } from "react";
import { Info, FileText, RotateCcw } from "lucide-react";
import { IPE_PROFILES, HEA_PROFILES, HEB_PROFILES, MATERIALS, SteelProfile, SteelMaterial, getProfilesBySeriesGroup } from "@/lib/steelProfiles";

const Tip = ({ text }: { text: string }) => (
  <span className="group relative ml-1 cursor-help">
    <Info className="w-3.5 h-3.5 inline" style={{ color: "#64748B" }} />
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 w-56 text-[10px] p-2 rounded-lg"
      style={{ backgroundColor: "#1E2732", color: "#94A3B8", border: "1px solid #2A3441" }}>{text}</span>
  </span>
);

const inputCls = "w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF6B2B]/40 bg-[#0A0E13] border border-[#1E2732] text-[#F1F5F9]";

type Ductility = "high" | "limited";

function getLimits(mat: SteelMaterial, ductility: Ductility, Ca: number) {
  const eps = Math.sqrt(235 / mat.Fy);
  // h/tw limits (flanged I/H sections, TBDY 2018 Table 9.3)
  let htw_limit: number;
  if (ductility === "high") {
    htw_limit = Ca <= 0.125
      ? 2.45 * eps * (1 - 0.93 * Ca) * (235 / mat.Fy * 3600 / (mat.Fy * 15.3)) // simplified
      : 58.39 * eps; // approximate for S275
    htw_limit = ductility === "high" ? 58.39 * eps : 72.0 * eps;
  } else {
    htw_limit = 72.0 * eps;
  }
  // b/t limits
  const bt_limit = ductility === "high" ? 8.09 * eps : 9.0 * eps;
  return { htw_limit: Math.round(htw_limit * 100) / 100, bt_limit: Math.round(bt_limit * 100) / 100 };
}

function checkProfile(p: SteelProfile, htw_limit: number, bt_limit: number) {
  const htw = (p.h - 2 * p.tf) / p.tw;
  const bt = p.b / (2 * p.tf);
  return {
    htw: Math.round(htw * 100) / 100,
    bt: Math.round(bt * 100) / 100,
    htw_ok: htw <= htw_limit,
    bt_ok: bt <= bt_limit,
    overall: htw <= htw_limit && bt <= bt_limit,
  };
}

const DY2019Calculator = () => {
  const [mat, setMat] = useState(MATERIALS[1]); // S275 default
  const [ductility, setDuctility] = useState<Ductility>("high");
  const [Ca, setCa] = useState(0.125);
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [computed, setComputed] = useState(false);

  const limits = useMemo(() => getLimits(mat, ductility, Ca), [mat, ductility, Ca]);

  const allIPE = useMemo(() =>
    IPE_PROFILES.map(p => ({ ...p, check: checkProfile(p, limits.htw_limit, limits.bt_limit) })),
    [limits]
  );

  const selectedCheck = useMemo(() => {
    if (!selectedProfile) return null;
    const p = [...IPE_PROFILES, ...HEA_PROFILES, ...HEB_PROFILES].find(pr => pr.name === selectedProfile);
    if (!p) return null;
    return { profile: p, ...checkProfile(p, limits.htw_limit, limits.bt_limit) };
  }, [selectedProfile, limits]);

  const groups = getProfilesBySeriesGroup();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] font-semibold" style={{ color: "#F1F5F9" }}>Çelik Profil Süneklik Sınıfı Kontrolü (DY-2019)</h3>
        <p className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>TBDY 2018 / DY-2019 kapsamında profil uygunluk ve sınıf kontrolü</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>Malzeme</label>
          <select className={inputCls} value={mat.name} onChange={e => setMat(MATERIALS.find(m => m.name === e.target.value) || MATERIALS[1])}>
            {MATERIALS.map(m => <option key={m.name} value={m.name}>{m.name} (Fy={m.Fy} MPa)</option>)}
          </select>
        </div>
        <div>
          <label className="text-[12px] font-medium block mb-2" style={{ color: "#94A3B8" }}>Süneklik Düzeyi</label>
          {(["high", "limited"] as Ductility[]).map(d => (
            <label key={d} className="flex items-center gap-2 mb-1.5 cursor-pointer text-[12px]"
              style={{ color: ductility === d ? "#F1F5F9" : "#94A3B8" }}>
              <input type="radio" checked={ductility === d} onChange={() => setDuctility(d)} className="accent-[#FF6B2B]" />
              {d === "high" ? "Yüksek Süneklik" : "Sınırlı Süneklik"}
            </label>
          ))}
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>
            Ca — Eksenel yük oranı <Tip text="Nd/(φ×Ag×Fy) oranı" />
          </label>
          <input type="number" className={inputCls} value={Ca} min={0} max={1} step={0.01} onChange={e => setCa(+e.target.value)} />
        </div>
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>Profil Seçimi</label>
          <select className={inputCls} value={selectedProfile} onChange={e => setSelectedProfile(e.target.value)}>
            <option value="">Profil seçin...</option>
            {groups.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.profiles.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <button onClick={() => setComputed(true)} className="w-full py-3 rounded-xl text-sm font-semibold"
        style={{ backgroundColor: "#FF6B2B", color: "#fff" }}>Kontrol Et</button>

      {computed && (
        <div className="space-y-5 animate-fade-in">
          {/* Limits info */}
          <div className="rounded-lg p-3 grid grid-cols-2 gap-3" style={{ backgroundColor: "#0A0E13", border: "1px solid #1E2732" }}>
            <div>
              <p className="text-[10px]" style={{ color: "#64748B" }}>h/tw sınırı ({ductility === "high" ? "Yüksek" : "Sınırlı"})</p>
              <p className="text-sm font-bold font-mono" style={{ color: "#F1F5F9" }}>{limits.htw_limit}</p>
            </div>
            <div>
              <p className="text-[10px]" style={{ color: "#64748B" }}>b/t sınırı ({ductility === "high" ? "Yüksek" : "Sınırlı"})</p>
              <p className="text-sm font-bold font-mono" style={{ color: "#F1F5F9" }}>{limits.bt_limit}</p>
            </div>
          </div>

          {/* Selected profile result */}
          {selectedCheck && (
            <div className="rounded-xl p-4" style={{ backgroundColor: selectedCheck.overall ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${selectedCheck.overall ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
              <p className="text-sm font-semibold mb-2" style={{ color: "#F1F5F9" }}>{selectedCheck.profile.name} Kontrol Sonucu</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px]" style={{ color: "#64748B" }}>h/tw</p>
                  <p className="text-sm font-mono" style={{ color: "#F1F5F9" }}>
                    {selectedCheck.htw} / {limits.htw_limit} → {selectedCheck.htw_ok ? <span style={{ color: "#22C55E" }}>✅ UYGUN</span> : <span style={{ color: "#EF4444" }}>❌ UYGUN DEĞİL</span>}
                  </p>
                </div>
                <div>
                  <p className="text-[10px]" style={{ color: "#64748B" }}>b/t</p>
                  <p className="text-sm font-mono" style={{ color: "#F1F5F9" }}>
                    {selectedCheck.bt} / {limits.bt_limit} → {selectedCheck.bt_ok ? <span style={{ color: "#22C55E" }}>✅ UYGUN</span> : <span style={{ color: "#EF4444" }}>❌ UYGUN DEĞİL</span>}
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold mt-3" style={{ color: selectedCheck.overall ? "#22C55E" : "#EF4444" }}>
                {ductility === "high" ? "Yüksek" : "Sınırlı"} Süneklik Sınıfı için {selectedCheck.overall ? "UYGUN ✅" : "UYGUN DEĞİL ❌"}
              </p>
            </div>
          )}

          {/* Full IPE table */}
          <div>
            <p className="text-[12px] font-semibold mb-2" style={{ color: "#94A3B8" }}>IPE Serisi — Tüm Profiller</p>
            <div className="rounded-xl overflow-auto" style={{ border: "1px solid #1E2732", maxHeight: "400px" }}>
              <table className="w-full text-[11px]">
                <thead className="sticky top-0"><tr style={{ backgroundColor: "#0F1419" }}>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "#64748B" }}>Profil</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "#64748B" }}>h/tw</th>
                  <th className="px-3 py-2 text-center font-medium" style={{ color: "#64748B" }}>h/tw</th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "#64748B" }}>b/t</th>
                  <th className="px-3 py-2 text-center font-medium" style={{ color: "#64748B" }}>b/t</th>
                  <th className="px-3 py-2 text-center font-medium" style={{ color: "#64748B" }}>Sonuç</th>
                </tr></thead>
                <tbody>
                  {allIPE.map((p, i) => (
                    <tr key={p.name} style={{ backgroundColor: p.check.overall ? (i % 2 === 0 ? "rgba(34,197,94,0.04)" : "rgba(34,197,94,0.02)") : (i % 2 === 0 ? "rgba(239,68,68,0.04)" : "rgba(239,68,68,0.02)") }}>
                      <td className="px-3 py-1.5 font-medium" style={{ color: p.check.overall ? "#F1F5F9" : "#EF4444" }}>{p.name}</td>
                      <td className="px-3 py-1.5 text-right font-mono" style={{ color: "#F1F5F9" }}>{p.check.htw}</td>
                      <td className="px-3 py-1.5 text-center">{p.check.htw_ok ? <span style={{ color: "#22C55E" }}>✅</span> : <span style={{ color: "#EF4444" }}>❌</span>}</td>
                      <td className="px-3 py-1.5 text-right font-mono" style={{ color: "#F1F5F9" }}>{p.check.bt}</td>
                      <td className="px-3 py-1.5 text-center">{p.check.bt_ok ? <span style={{ color: "#22C55E" }}>✅</span> : <span style={{ color: "#EF4444" }}>❌</span>}</td>
                      <td className="px-3 py-1.5 text-center font-semibold" style={{ color: p.check.overall ? "#22C55E" : "#EF4444" }}>{p.check.overall ? "UYGUN" : "UYGUN DEĞİL"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl p-3" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
            <p className="text-[11px]" style={{ color: "#F59E0B" }}>⚠️ Bu hesaplama TBDY 2018 / DY-2019 esaslarına göre hazırlanmıştır. Proje kontrolü için yetkili mühendis onayı alınız.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium" style={{ backgroundColor: "#161C23", color: "#F1F5F9", border: "1px solid #1E2732" }}>
              <FileText className="w-3.5 h-3.5" /> PDF İndir
            </button>
            <button onClick={() => setComputed(false)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium" style={{ backgroundColor: "#161C23", color: "#F1F5F9", border: "1px solid #1E2732" }}>
              <RotateCcw className="w-3.5 h-3.5" /> Yeni Hesaplama
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DY2019Calculator;
