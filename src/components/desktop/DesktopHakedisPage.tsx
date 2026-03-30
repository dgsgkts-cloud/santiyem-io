import { useState } from "react";
import { FileDown, FileSpreadsheet, Plus, Trash2, ChevronDown, X } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useProjectHakedis } from "@/hooks/useProjectHakedis";
import { exportHakedisPDF, exportHakedisExcel } from "@/lib/hakedisExport";

const STATUS_OPTIONS = [
  { label: "Bekliyor", color: "#F59E0B" },
  { label: "Onaylandı", color: "#22C55E" },
  { label: "Reddedildi", color: "#EF4444" },
  { label: "Hazırlanıyor", color: "#3B82F6" },
  { label: "Ödendi", color: "#10B981" },
];

const DesktopHakedisPage = () => {
  const { projects, loading: projectsLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const activeProjectId = selectedProjectId || (projects.length > 0 ? projects[0].id : "");
  const { hakedisler, loading, addHakedis, deleteHakedis, updateHakedisStatus } = useProjectHakedis(activeProjectId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formPeriod, setFormPeriod] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formKdvRate, setFormKdvRate] = useState("20");
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);

  const selectedProject = projects.find(p => p.id === activeProjectId);

  const handleAdd = () => {
    if (!formPeriod || !formAmount) return;
    addHakedis(formPeriod, parseFloat(formAmount), parseFloat(formKdvRate) / 100);
    setFormPeriod("");
    setFormAmount("");
    setShowAddForm(false);
  };

  const totalAmount = hakedisler.reduce((s, h) => s + h.amount, 0);
  const totalNet = hakedisler.reduce((s, h) => s + h.net, 0);
  const approvedNet = hakedisler.filter(h => h.status === "Onaylandı" || h.status === "Ödendi").reduce((s, h) => s + h.net, 0);
  const pendingNet = hakedisler.filter(h => h.status === "Bekliyor").reduce((s, h) => s + h.net, 0);

  const fmt = (n: number) => n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

  const STATS = [
    { label: "Toplam Proje", value: String(projects.length), emoji: "📁" },
    { label: "Toplam Hakediş", value: String(hakedisler.length), emoji: "🧾" },
    { label: "Tahsil Edilen", value: fmt(approvedNet), emoji: "✅" },
    { label: "Bekleyen", value: fmt(pendingNet), emoji: "⏳" },
  ];

  if (projectsLoading) return <div className="p-6 text-center" style={{ color: "#94A3B8" }}>Yükleniyor...</div>;

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-[1200px] mx-auto space-y-4 md:space-y-5">
      {/* Top bar with add button */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base md:text-lg font-bold" style={{ color: "#F1F5F9" }}>Hakediş Yönetimi</h2>
        <div className="flex items-center gap-2">
          {hakedisler.length > 0 && (
            <>
              <button
                onClick={() => exportHakedisPDF(hakedisler, selectedProject?.name || "Proje")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors"
                style={{ backgroundColor: "#1E2732", color: "#F1F5F9" }}
              >
                <FileDown className="w-3.5 h-3.5" /> PDF
              </button>
              <button
                onClick={() => exportHakedisExcel(hakedisler, selectedProject?.name || "Proje")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors"
                style={{ backgroundColor: "#1E2732", color: "#F1F5F9" }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
              </button>
            </>
          )}
          <button
            onClick={() => { if (projects.length === 0) return; setShowAddForm(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-white transition-colors"
            style={{ backgroundColor: projects.length > 0 ? "#FF6B2B" : "#64748B" }}
          >
            <Plus className="w-3.5 h-3.5" /> Yeni Hakediş Hazırla
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl p-3 md:p-5" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <div className="flex items-center gap-2 mb-1 md:mb-2">
              <span className="text-base md:text-lg">{s.emoji}</span>
              <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#64748B" }}>{s.label}</span>
            </div>
            <p className="text-lg md:text-2xl font-bold truncate" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#F1F5F9" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <p style={{ color: "#64748B" }}>Henüz proje eklenmedi. Önce Proje Yönetimi'nden proje ekleyin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 md:gap-5">
          {/* Left - project list */}
          <div className="rounded-xl" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <div className="p-3 md:p-4" style={{ borderBottom: "1px solid #1E2732" }}>
              <h3 className="text-[13px] md:text-[14px] font-semibold" style={{ color: "#F1F5F9" }}>Projeler</h3>
            </div>
            <div className="p-2 max-h-[300px] md:max-h-none overflow-y-auto">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className="w-full text-left p-3 rounded-lg transition-colors duration-150 mb-1"
                  style={{
                    backgroundColor: activeProjectId === p.id ? "rgba(255,107,43,0.08)" : "transparent",
                    borderLeft: activeProjectId === p.id ? "2px solid #FF6B2B" : "2px solid transparent",
                  }}
                >
                  <p className="text-[12px] md:text-[13px] font-semibold truncate" style={{ color: activeProjectId === p.id ? "#FF6B2B" : "#F1F5F9" }}>{p.name}</p>
                  <p className="text-[10px] md:text-[11px] mt-0.5 truncate" style={{ color: "#64748B" }}>{p.client}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: "#1E2732" }}>
                      <div className="h-full rounded-full" style={{ backgroundColor: "#FF6B2B", width: `${p.progress}%` }} />
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: "#64748B" }}>{p.progress}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right - detail */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-4 gap-2" style={{ borderBottom: "1px solid #1E2732" }}>
              <div className="min-w-0">
                <h3 className="text-[14px] md:text-[15px] font-semibold truncate" style={{ color: "#F1F5F9" }}>{selectedProject?.name}</h3>
                <p className="text-[11px] md:text-[12px] truncate" style={{ color: "#64748B" }}>{selectedProject?.client}</p>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 px-3 rounded-lg text-[11px] md:text-[12px] font-semibold text-white transition-colors shrink-0"
                style={{ height: 32, backgroundColor: "#FF6B2B" }}
              >
                <Plus className="w-3 h-3" /> Yeni Hakediş
              </button>
            </div>

            {loading ? (
              <div className="p-6 text-center" style={{ color: "#64748B" }}>Yükleniyor...</div>
            ) : hakedisler.length === 0 ? (
              <div className="p-6 text-center" style={{ color: "#64748B" }}>Bu projeye ait hakediş yok.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] md:text-[13px]">
                  <thead>
                    <tr style={{ backgroundColor: "#0F1419" }}>
                      {["No", "Dönem", "Tutar", "KDV", "Net", "Durum", ""].map((h) => (
                        <th key={h} className="text-left px-3 md:px-4 py-2 md:py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: "#64748B", fontSize: 10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hakedisler.map((h, i) => (
                      <tr key={h.id} style={{ borderBottom: "1px solid #1E2732" }}>
                        <td className="px-3 md:px-4 py-2 md:py-3 font-mono" style={{ color: "#F1F5F9" }}>{i + 1}</td>
                        <td className="px-3 md:px-4 py-2 md:py-3 whitespace-nowrap" style={{ color: "#94A3B8" }}>{h.period}</td>
                        <td className="px-3 md:px-4 py-2 md:py-3 font-mono whitespace-nowrap" style={{ color: "#F1F5F9" }}>{fmt(h.amount)}</td>
                        <td className="px-3 md:px-4 py-2 md:py-3 font-mono whitespace-nowrap" style={{ color: "#94A3B8" }}>{fmt(h.kdv)}</td>
                        <td className="px-3 md:px-4 py-2 md:py-3 font-mono font-semibold whitespace-nowrap" style={{ color: "#F1F5F9" }}>{fmt(h.net)}</td>
                        <td className="px-3 md:px-4 py-2 md:py-3 relative">
                          <button
                            onClick={() => setStatusMenuId(statusMenuId === h.id ? null : h.id)}
                            className="text-[10px] md:text-[11px] font-medium px-2 py-0.5 rounded-md cursor-pointer flex items-center gap-1"
                            style={{ backgroundColor: `${h.status_color}15`, color: h.status_color }}
                          >
                            {h.status}
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          {statusMenuId === h.id && (
                            <div className="absolute z-50 top-full left-0 mt-1 rounded-lg py-1 shadow-xl min-w-[140px]" style={{ backgroundColor: "#1C242D", border: "1px solid #2D3748" }}>
                              {STATUS_OPTIONS.map(opt => (
                                <button
                                  key={opt.label}
                                  onClick={() => { updateHakedisStatus(h.id, opt.label, opt.color); setStatusMenuId(null); }}
                                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/5 flex items-center gap-2"
                                  style={{ color: opt.color }}
                                >
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 md:px-4 py-2 md:py-3">
                          <button onClick={() => { if (confirm("Bu hakediş silinsin mi?")) deleteHakedis(h.id); }}
                            className="w-7 h-7 rounded flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Total row */}
            {hakedisler.length > 0 && (
              <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 text-[11px] md:text-[12px] font-semibold" style={{ borderTop: "1px solid #1E2732", backgroundColor: "#0F1419" }}>
                <span style={{ color: "#64748B" }}>Toplam</span>
                <span style={{ color: "#F1F5F9" }}>{fmt(totalNet)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add form modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowAddForm(false)}>
          <div className="rounded-xl p-5 w-full max-w-md space-y-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold" style={{ color: "#F1F5F9" }}>Yeni Hakediş Ekle</h3>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            {projects.length > 1 && (
              <div>
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: "#94A3B8" }}>Proje</label>
                <select
                  value={activeProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                  style={{ backgroundColor: "#0F1419", color: "#F1F5F9", border: "1px solid #1E2732" }}
                >
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-[11px] font-semibold mb-1 block" style={{ color: "#94A3B8" }}>Dönem</label>
              <input
                value={formPeriod}
                onChange={e => setFormPeriod(e.target.value)}
                placeholder="ör: Ocak 2026"
                className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                style={{ backgroundColor: "#0F1419", color: "#F1F5F9", border: "1px solid #1E2732" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: "#94A3B8" }}>Tutar (₺)</label>
                <input
                  type="number"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  placeholder="85000"
                  className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                  style={{ backgroundColor: "#0F1419", color: "#F1F5F9", border: "1px solid #1E2732" }}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: "#94A3B8" }}>KDV Oranı (%)</label>
                <input
                  type="number"
                  value={formKdvRate}
                  onChange={e => setFormKdvRate(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
                  style={{ backgroundColor: "#0F1419", color: "#F1F5F9", border: "1px solid #1E2732" }}
                />
              </div>
            </div>
            <button
              onClick={handleAdd}
              disabled={!formPeriod || !formAmount}
              className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-white transition-colors disabled:opacity-40"
              style={{ backgroundColor: "#FF6B2B" }}
            >
              Hakediş Ekle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopHakedisPage;
