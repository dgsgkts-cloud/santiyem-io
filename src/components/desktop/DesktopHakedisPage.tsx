import { useState } from "react";
import { FolderOpen, Receipt, CheckCircle, Clock, FileDown, ChevronRight } from "lucide-react";

const STATS = [
  { label: "Aktif Proje", value: "4", emoji: "📁" },
  { label: "Bu Ay Hakediş", value: "3", emoji: "🧾" },
  { label: "Tahsil Edilen", value: "₺320K", emoji: "✅" },
  { label: "Bekleyen", value: "₺165K", emoji: "⏳" },
];

const PROJECTS = [
  { name: "Villa Projesi - Çeşme", client: "Mehmet Bey", progress: 75, lastStatus: "Onaylandı" },
  { name: "AVM İnşaatı - Ankara", client: "Yıldız İnşaat", progress: 42, lastStatus: "Bekliyor" },
  { name: "Konut Projesi - İstanbul", client: "Atlas Yapı", progress: 91, lastStatus: "Onaylandı" },
  { name: "Fabrika - Kocaeli", client: "Endüstri A.Ş.", progress: 28, lastStatus: "Hazırlanıyor" },
];

const HAKEDIS_DATA = [
  { no: 1, period: "Ocak 2026", amount: "₺85.000", kdv: "₺15.300", net: "₺100.300", status: "Onaylandı", statusColor: "#22C55E" },
  { no: 2, period: "Şubat 2026", amount: "₺92.000", kdv: "₺16.560", net: "₺108.560", status: "Onaylandı", statusColor: "#22C55E" },
  { no: 3, period: "Mart 2026", amount: "₺78.500", kdv: "₺14.130", net: "₺92.630", status: "Bekliyor", statusColor: "#F59E0B" },
];

const DesktopHakedisPage = () => {
  const [selectedProject, setSelectedProject] = useState(0);

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl p-5" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{s.emoji}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#64748B" }}>{s.label}</span>
            </div>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 28, color: "#F1F5F9" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Master-detail */}
      <div className="grid grid-cols-[1fr_2fr] gap-5">
        {/* Left - project list */}
        <div className="rounded-xl" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <div className="p-4" style={{ borderBottom: "1px solid #1E2732" }}>
            <h3 className="text-[14px] font-semibold" style={{ color: "#F1F5F9" }}>Projeler</h3>
          </div>
          <div className="p-2">
            {PROJECTS.map((p, i) => (
              <button
                key={i}
                onClick={() => setSelectedProject(i)}
                className="w-full text-left p-3 rounded-lg transition-colors duration-150 mb-1"
                style={{
                  backgroundColor: selectedProject === i ? "rgba(255,107,43,0.08)" : "transparent",
                  borderLeft: selectedProject === i ? "2px solid #FF6B2B" : "2px solid transparent",
                }}
                onMouseEnter={(e) => { if (selectedProject !== i) e.currentTarget.style.backgroundColor = "#1C242D"; }}
                onMouseLeave={(e) => { if (selectedProject !== i) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <p className="text-[13px] font-semibold" style={{ color: selectedProject === i ? "#FF6B2B" : "#F1F5F9" }}>{p.name}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>{p.client}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: "#1E2732" }}>
                    <div className="h-full rounded-full" style={{ backgroundColor: "#FF6B2B", width: `${p.progress}%` }} />
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: "#64748B" }}>{p.progress}%</span>
                </div>
                <span className="text-[10px] mt-1 inline-block" style={{ color: "#64748B" }}>Son: {p.lastStatus}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right - detail */}
        <div className="rounded-xl" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid #1E2732" }}>
            <div>
              <h3 className="text-[15px] font-semibold" style={{ color: "#F1F5F9" }}>{PROJECTS[selectedProject].name}</h3>
              <p className="text-[12px]" style={{ color: "#64748B" }}>{PROJECTS[selectedProject].client}</p>
            </div>
            <button
              className="flex items-center gap-1.5 px-3 rounded-lg text-[12px] font-semibold text-white transition-colors"
              style={{ height: 32, backgroundColor: "#FF6B2B" }}
            >
              + Yeni Hakediş
            </button>
          </div>

          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ backgroundColor: "#0F1419" }}>
                {["No", "Dönem", "Tutar", "KDV", "Net", "Durum", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold uppercase tracking-wide" style={{ color: "#64748B", fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HAKEDIS_DATA.map((h, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1E2732" }}
                  className="transition-colors duration-150"
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1C242D"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <td className="px-4 py-3 font-mono" style={{ color: "#F1F5F9" }}>{h.no}</td>
                  <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{h.period}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: "#F1F5F9" }}>{h.amount}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: "#94A3B8" }}>{h.kdv}</td>
                  <td className="px-4 py-3 font-mono font-semibold" style={{ color: "#F1F5F9" }}>{h.net}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: `${h.statusColor}15`, color: h.statusColor }}>
                      {h.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button className="w-7 h-7 rounded flex items-center justify-center" style={{ color: "#64748B" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#FF6B2B"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; }}
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DesktopHakedisPage;
