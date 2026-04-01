import { useState, useMemo } from "react";
import { Info, FileText, Table2, RotateCcw, MessageSquare } from "lucide-react";

const SOIL_PRESETS = [
  { label: "Bitkisel toprak", value: 17 },
  { label: "Kum ve çakıl (doğal nemde)", value: 18 },
  { label: "Kum ve çakıl (doygun)", value: 20 },
  { label: "Kaya parçaları (yuvarlak/köşeli)", value: 19 },
  { label: "Taş dolgu (ocak malzemesi)", value: 18 },
  { label: "Kil ve silt (doygun)", value: 21 },
];

type SoilType = "cohesionless" | "soft_cohesive" | "stiff_cohesive";

interface Inputs {
  Hb: number;
  Hw: number;
  gamma: number;
  gammaD: number;
  gammaW: number;
  q: number;
  Sds: number;
  soilType: SoilType;
}

const DEFAULT: Inputs = {
  Hb: 12, Hw: 5, gamma: 18, gammaD: 25, gammaW: 9.81,
  q: 10, Sds: 0.484, soilType: "cohesionless",
};

interface Results {
  hasWater: boolean;
  Hs_ust: number;
  Hs_alt: number;
  Hd: number;
  Hd_sag: number;
  Hsw: number;
  Hdw_taban: number;
  hdwTable: { z: number; hdw: number }[];
  combinations: { id: number; label: string; value: number }[];
  maxCombIdx: number;
}

function compute(inp: Inputs): Results {
  const { Hb, Hw, gamma, gammaD, gammaW, q, Sds } = inp;
  const hasWater = Hw > 0;

  // Static earth pressure
  let Hs_ust = q;
  let Hs_alt: number;
  if (hasWater) {
    Hs_alt = gamma * (Hb - Hw) + (gammaD - gammaW) * Hw + q;
  } else {
    Hs_alt = gamma * Hb + q;
  }

  // Seismic additional earth pressure
  let Hd = 0;
  let Hd_sag = 0;
  if (hasWater) {
    Hd = 0.4 * Sds * (gamma * Hb + q);
    Hd_sag = 0.4 * Sds * ((gammaD - gammaW) * Hw + q);
  }

  // Static groundwater pressure
  const Hsw = hasWater ? gammaW * Hw : 0;

  // Seismic additional groundwater pressure
  const hdwTable: { z: number; hdw: number }[] = [];
  let Hdw_taban = 0;
  if (hasWater) {
    for (let z = 0; z <= Hw; z++) {
      const val = (7 / 8) * 0.4 * Sds * gammaW * Math.sqrt(Hw * z);
      hdwTable.push({ z, hdw: Math.round(val * 1000) / 1000 });
    }
    Hdw_taban = hdwTable[hdwTable.length - 1]?.hdw ?? 0;
  }

  // Load combinations
  const Hs_max = Hs_alt; // worst case at bottom
  const combLabels = [
    "1.4G + 1.6Q + 1.6Hs",
    "0.9G' + Hd + Ex - 0.3Ey",
    "0.9G' + Hd + Ex + 0.3Ey",
    "0.9G' + Hd - Ex - 0.3Ey",
    "0.9G' + Hd - Ex + 0.3Ey",
    "0.9G' + Hd + Ey - 0.3Ex",
    "0.9G' + Hd + Ey + 0.3Ex",
    "0.9G' + Hd - Ey - 0.3Ex",
    "0.9G' + Hd - Ey + 0.3Ex",
    "G' + Q' + Hd + Ex - 0.3Ey",
    "G' + Q' + Hd + Ex + 0.3Ey",
    "G' + Q' + Hd - Ex - 0.3Ey",
    "G' + Q' + Hd - Ex + 0.3Ey",
    "G' + Q' + Hd + Ey - 0.3Ex",
    "G' + Q' + Hd + Ey + 0.3Ex",
    "G' + Q' + Hd - Ey - 0.3Ex",
    "G' + Q' + Hd - Ey + 0.3Ex",
  ];

  const combValues = [
    1.4 * Hs_max + 1.6 * q + 1.6 * Hs_max,
    0.9 * Hs_max + Hd + Hs_max - 0.3 * Hs_max,
    0.9 * Hs_max + Hd + Hs_max + 0.3 * Hs_max,
    0.9 * Hs_max + Hd - Hs_max - 0.3 * Hs_max,
    0.9 * Hs_max + Hd - Hs_max + 0.3 * Hs_max,
    0.9 * Hs_max + Hd + Hs_max - 0.3 * Hs_max,
    0.9 * Hs_max + Hd + Hs_max + 0.3 * Hs_max,
    0.9 * Hs_max + Hd - Hs_max - 0.3 * Hs_max,
    0.9 * Hs_max + Hd - Hs_max + 0.3 * Hs_max,
    Hs_max + q + Hd + Hs_max - 0.3 * Hs_max,
    Hs_max + q + Hd + Hs_max + 0.3 * Hs_max,
    Hs_max + q + Hd - Hs_max - 0.3 * Hs_max,
    Hs_max + q + Hd - Hs_max + 0.3 * Hs_max,
    Hs_max + q + Hd + Hs_max - 0.3 * Hs_max,
    Hs_max + q + Hd + Hs_max + 0.3 * Hs_max,
    Hs_max + q + Hd - Hs_max - 0.3 * Hs_max,
    Hs_max + q + Hd - Hs_max + 0.3 * Hs_max,
  ];

  const combinations = combLabels.map((label, i) => ({
    id: i + 1,
    label,
    value: Math.round(combValues[i] * 100) / 100,
  }));

  let maxCombIdx = 0;
  let maxVal = -Infinity;
  combinations.forEach((c, i) => {
    if (c.value > maxVal) { maxVal = c.value; maxCombIdx = i; }
  });

  return {
    hasWater, Hs_ust: Math.round(Hs_ust * 1000) / 1000,
    Hs_alt: Math.round(Hs_alt * 1000) / 1000,
    Hd: Math.round(Hd * 1000) / 1000,
    Hd_sag: Math.round(Hd_sag * 1000) / 1000,
    Hsw: Math.round(Hsw * 1000) / 1000,
    Hdw_taban: Math.round(Hdw_taban * 1000) / 1000,
    hdwTable, combinations, maxCombIdx,
  };
}

const fmt = (v: number) => v.toFixed(2);

const Tip = ({ text }: { text: string }) => (
  <span className="group relative ml-1 cursor-help">
    <Info className="w-3.5 h-3.5 inline" style={{ color: "#64748B" }} />
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 w-56 text-[10px] p-2 rounded-lg"
      style={{ backgroundColor: "#1E2732", color: "#94A3B8", border: "1px solid #2A3441" }}>
      {text}
    </span>
  </span>
);

const ZeminBasinciCalculator = () => {
  const [inp, setInp] = useState<Inputs>(DEFAULT);
  const [results, setResults] = useState<Results | null>(null);

  const set = <K extends keyof Inputs>(k: K, v: Inputs[K]) =>
    setInp(prev => ({ ...prev, [k]: v }));

  const handleCalc = () => setResults(compute(inp));
  const handleReset = () => { setInp(DEFAULT); setResults(null); };

  const inputCls = "w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF6B2B]/40"
    + " bg-[#0A0E13] border border-[#1E2732] text-[#F1F5F9]";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-[15px] font-semibold" style={{ color: "#F1F5F9" }}>
          Zemin ve Yeraltı Suyu Basıncı Hesabı
        </h3>
        <p className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>
          Bodrum perdesi zemin ve depremli basınç hesabı (TBDY 2018)
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: "#4B5563" }}>
          Kaynak: TBDY 2018 + Prof. Dr. Zekai Celep, Betonarme Yapılar
        </p>
      </div>

      {/* Inputs — 2-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Hb */}
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>
            Hb — Bodrum perdesi yüksekliği (m)
            <Tip text="Bodrum katının taban döşemesinden zemin seviyesine kadar olan toplam yükseklik" />
          </label>
          <input type="number" className={inputCls} value={inp.Hb} min={1} max={50}
            onChange={e => set("Hb", +e.target.value)} />
        </div>

        {/* Hw */}
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>
            Hw — Yeraltı suyu yüksekliği (m)
            <Tip text="Yeraltı suyu tablasının taban döşemesinden olan yüksekliği. Yeraltı suyu yoksa 0 girin." />
          </label>
          <input type="number" className={inputCls} value={inp.Hw} min={0} max={inp.Hb}
            onChange={e => set("Hw", +e.target.value)} />
        </div>

        {/* γ */}
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>
            γ — Tabii birim hacim ağırlığı (kN/m³)
            <Tip text="Zeminin tabii (doğal) birim hacim ağırlığı" />
          </label>
          <input type="number" className={inputCls} value={inp.gamma} min={14} max={25}
            onChange={e => set("gamma", +e.target.value)} />
          <select className="w-full mt-1.5 rounded-lg px-3 py-1.5 text-[11px] bg-[#0A0E13] border border-[#1E2732] text-[#94A3B8] outline-none"
            value="" onChange={e => { if (e.target.value) set("gamma", +e.target.value); }}>
            <option value="">Zemin türünden seç...</option>
            {SOIL_PRESETS.map(s => (
              <option key={s.label} value={s.value}>{s.label} — {s.value} kN/m³</option>
            ))}
          </select>
        </div>

        {/* γd */}
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>
            γd — Doygun birim hacim ağırlığı (kN/m³)
            <Tip text="Yeraltı suyu seviyesi altındaki zeminin doygun birim hacim ağırlığı" />
          </label>
          <input type="number" className={inputCls} value={inp.gammaD} min={18} max={30}
            onChange={e => set("gammaD", +e.target.value)} />
        </div>

        {/* γw */}
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>
            γw — Suyun birim hacim ağırlığı (kN/m³)
            <Tip text="Suyun birim hacim ağırlığı — standart değer 9.81 kN/m³" />
          </label>
          <input type="number" className={inputCls} value={inp.gammaW} readOnly
            style={{ opacity: 0.6, cursor: "not-allowed" }} />
        </div>

        {/* q */}
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>
            q — Sürşarj Yükü (kN/m²)
            <Tip text="Zemin yüzeyindeki ek yük (üst yapı yükü, araç yükü vb.)" />
          </label>
          <input type="number" className={inputCls} value={inp.q} min={0} max={500}
            onChange={e => set("q", +e.target.value)} />
        </div>

        {/* Sds */}
        <div>
          <label className="text-[12px] font-medium" style={{ color: "#94A3B8" }}>
            Sds — Kısa periyot tasarım spektral ivme katsayısı
            <Tip text="TBDY 2018'e göre bölgeye ait Sds değeri. AFAD Deprem Tehlike Haritasından alınır." />
          </label>
          <input type="number" className={inputCls} value={inp.Sds} min={0} max={4} step={0.001}
            onChange={e => set("Sds", +e.target.value)} />
          <p className="text-[10px] mt-1" style={{ color: "#4B5563" }}>İskenderun bölgesi için yaklaşık: 0.484</p>
        </div>

        {/* Soil Type */}
        <div>
          <label className="text-[12px] font-medium block mb-2" style={{ color: "#94A3B8" }}>
            Zemin Türü
          </label>
          {([
            ["cohesionless", "Kohezyonsuz zemin (kum, çakıl)"],
            ["soft_cohesive", "Yumuşak – orta katı kohezyonlu zemin"],
            ["stiff_cohesive", "Katı – sert kohezyonlu zemin"],
          ] as [SoilType, string][]).map(([val, lbl]) => (
            <label key={val} className="flex items-center gap-2 mb-1.5 cursor-pointer text-[12px]"
              style={{ color: inp.soilType === val ? "#F1F5F9" : "#94A3B8" }}>
              <input type="radio" name="soilType" checked={inp.soilType === val}
                onChange={() => set("soilType", val)}
                className="accent-[#FF6B2B]" />
              {lbl}
            </label>
          ))}
        </div>
      </div>

      {/* Calculate button */}
      <button onClick={handleCalc}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
        style={{ backgroundColor: "#FF6B2B", color: "#fff" }}>
        Hesapla
      </button>

      {/* Results */}
      {results && (
        <div className="space-y-6 animate-fade-in">
          {/* Water status */}
          <div className="text-[12px] font-medium px-3 py-2 rounded-lg" style={{
            backgroundColor: results.hasWater ? "rgba(59,130,246,0.1)" : "rgba(100,116,139,0.1)",
            color: results.hasWater ? "#60A5FA" : "#94A3B8",
            border: `1px solid ${results.hasWater ? "rgba(59,130,246,0.2)" : "#1E2732"}`,
          }}>
            {results.hasWater ? `💧 Yeraltı suyu VAR — Hw = ${inp.Hw} m` : "🏜️ Yeraltı suyu YOK"}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Hs */}
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: "#60A5FA" }}>Hs — Statik Zemin</p>
              <p className="text-[11px]" style={{ color: "#94A3B8" }}>Üst: <span className="font-bold text-[#F1F5F9]">{fmt(results.Hs_ust)}</span> kN/m²</p>
              <p className="text-[11px]" style={{ color: "#94A3B8" }}>Alt: <span className="font-bold text-[#F1F5F9]">{fmt(results.Hs_alt)}</span> kN/m²</p>
              <p className="text-[9px] mt-1" style={{ color: "#64748B" }}>Trapez yük olarak uygula</p>
            </div>

            {/* Hd */}
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(255,107,43,0.08)", border: "1px solid rgba(255,107,43,0.2)" }}>
              <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: "#FF6B2B" }}>Hd — Depremli Ek</p>
              <p className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{fmt(results.Hd)}</p>
              <p className="text-[10px]" style={{ color: "#94A3B8" }}>kN/m²</p>
              <p className="text-[9px] mt-1" style={{ color: "#64748B" }}>Düzgün yayılı yük olarak uygula</p>
            </div>

            {/* Hsw */}
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)" }}>
              <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: "#93C5FD" }}>Hsw — Statik YAS</p>
              <p className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{fmt(results.Hsw)}</p>
              <p className="text-[10px]" style={{ color: "#94A3B8" }}>kN/m² (taban)</p>
              <p className="text-[9px] mt-1" style={{ color: "#64748B" }}>Trapez yük (üstte 0, altta Hsw)</p>
            </div>

            {/* Hdw */}
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.15)" }}>
              <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: "#FB923C" }}>Hdw — Depremli YAS</p>
              <p className="text-lg font-bold" style={{ color: "#F1F5F9" }}>{fmt(results.Hdw_taban)}</p>
              <p className="text-[10px]" style={{ color: "#94A3B8" }}>kN/m² (taban)</p>
              <p className="text-[9px] mt-1" style={{ color: "#64748B" }}>Parabolik dağılım — tabloya bakınız</p>
            </div>
          </div>

          {/* Combinations table */}
          <div>
            <h4 className="text-[13px] font-semibold mb-2" style={{ color: "#F1F5F9" }}>
              TBDY 2018 Yük Kombinasyonları
            </h4>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1E2732" }}>
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ backgroundColor: "#0F1419" }}>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: "#64748B" }}>#</th>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: "#64748B" }}>Kombinasyon</th>
                    <th className="px-3 py-2 text-right font-medium" style={{ color: "#64748B" }}>Zemin Basıncı (kN/m²)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.combinations.map((c, i) => {
                    const isMax = i === results.maxCombIdx;
                    return (
                      <tr key={c.id}
                        className="transition-colors"
                        style={{
                          backgroundColor: isMax ? "rgba(255,107,43,0.08)" : i % 2 === 0 ? "#161C23" : "#0F1419",
                        }}
                        onMouseEnter={e => { if (!isMax) e.currentTarget.style.backgroundColor = "#1C242D"; }}
                        onMouseLeave={e => { if (!isMax) e.currentTarget.style.backgroundColor = i % 2 === 0 ? "#161C23" : "#0F1419"; }}
                      >
                        <td className="px-3 py-2" style={{ color: isMax ? "#FF6B2B" : "#64748B" }}>{c.id}</td>
                        <td className="px-3 py-2" style={{ color: isMax ? "#FF6B2B" : "#F1F5F9", fontWeight: isMax ? 700 : 400 }}>{c.label}</td>
                        <td className="px-3 py-2 text-right font-mono" style={{ color: isMax ? "#FF6B2B" : "#F1F5F9", fontWeight: isMax ? 700 : 400 }}>
                          {fmt(c.value)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hdw distribution table */}
          {results.hasWater && results.hdwTable.length > 0 && (
            <div>
              <h4 className="text-[13px] font-semibold mb-1" style={{ color: "#F1F5F9" }}>
                Depremli Ek Yeraltı Suyu Basıncı Dağılımı
              </h4>
              <p className="text-[10px] mb-2" style={{ color: "#64748B" }}>
                Hdw(z) = (7/8) × 0.4 × Sds × γw × √(Hw × z)
              </p>
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1E2732" }}>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr style={{ backgroundColor: "#0F1419" }}>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: "#64748B" }}>Derinlik z (m)</th>
                      <th className="px-3 py-2 text-right font-medium" style={{ color: "#64748B" }}>Hdw(z) (kN/m²)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.hdwTable.map((row, i) => (
                      <tr key={row.z} style={{ backgroundColor: i % 2 === 0 ? "#161C23" : "#0F1419" }}
                        className="hover:bg-[#1C242D] transition-colors">
                        <td className="px-3 py-1.5 font-mono" style={{ color: "#F1F5F9" }}>{row.z}</td>
                        <td className="px-3 py-1.5 text-right font-mono" style={{ color: "#F1F5F9" }}>{row.hdw.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
            <p className="text-[11px]" style={{ color: "#94A3B8" }}>
              📌 Zemin basınçları düzgün yayılı yük, yeraltı suyu basınçları trapez yük olarak uygulanacaktır.
            </p>
            <p className="text-[11px]" style={{ color: "#94A3B8" }}>
              📌 Depremli ek yeraltı suyu basıncı parabolik dağılım gösterir.
            </p>
            <p className="text-[11px]" style={{ color: "#F59E0B" }}>
              ⚠️ Bu hesaplama TBDY 2018 Bölüm 9 esaslarına göre hazırlanmıştır. Proje bazlı uygulamalarda yetkili mühendis onayı alınız.
            </p>
            <p className="text-[11px]" style={{ color: "#64748B" }}>
              📖 Kaynak: Türkiye Bina Deprem Yönetmeliği 2018 + Prof. Dr. Zekai Celep, Betonarme Yapılar
            </p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button onClick={() => {/* PDF export placeholder */ }}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{ backgroundColor: "#161C23", color: "#F1F5F9", border: "1px solid #1E2732" }}>
              <FileText className="w-3.5 h-3.5" /> PDF İndir
            </button>
            <button onClick={() => {/* Excel export placeholder */ }}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{ backgroundColor: "#161C23", color: "#F1F5F9", border: "1px solid #1E2732" }}>
              <Table2 className="w-3.5 h-3.5" /> Excel İndir
            </button>
            <button onClick={handleReset}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{ backgroundColor: "#161C23", color: "#F1F5F9", border: "1px solid #1E2732" }}>
              <RotateCcw className="w-3.5 h-3.5" /> Yeni Hesaplama
            </button>
            <button onClick={() => {/* AI chat placeholder */ }}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{ backgroundColor: "rgba(255,107,43,0.1)", color: "#FF6B2B", border: "1px solid rgba(255,107,43,0.2)" }}>
              <MessageSquare className="w-3.5 h-3.5" /> AI'ya Sor
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZeminBasinciCalculator;
