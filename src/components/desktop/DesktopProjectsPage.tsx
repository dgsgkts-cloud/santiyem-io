import { useState } from "react";
import {
  FolderOpen, Clock, CheckCircle, AlertTriangle,
  LayoutGrid, List, MoreHorizontal, ChevronRight
} from "lucide-react";
import { PROJECTS } from "@/lib/projectsData";
import ProjectDetailPage from "./ProjectDetailPage";

const STATS = [
  { label: "Toplam Proje", value: "12", emoji: "📋" },
  { label: "Devam Eden", value: "8", emoji: "🔄" },
  { label: "Tamamlanan", value: "3", emoji: "✅" },
  { label: "Geciken", value: "1", emoji: "⏰", alert: true },
];

interface DesktopProjectsPageProps {
  initialProjectId?: string | null;
  onProjectIdClear?: () => void;
}

const DesktopProjectsPage = ({ initialProjectId, onProjectIdClear }: DesktopProjectsPageProps) => {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId || null);

  const handleBack = () => {
    setSelectedProjectId(null);
    onProjectIdClear?.();
  };
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[1200px] mx-auto space-y-4 lg:space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl p-3 lg:p-5" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base lg:text-lg">{s.emoji}</span>
              <span className="text-[10px] lg:text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#64748B" }}>{s.label}</span>
            </div>
            <p className="text-xl lg:text-[28px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: s.alert ? "#EF4444" : "#F1F5F9" }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm lg:text-[15px] font-semibold" style={{ color: "#F1F5F9" }}>Projeler</h3>
        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #1E2732" }}>
          <button onClick={() => setViewMode("list")} className="w-8 h-8 flex items-center justify-center transition-colors"
            style={{ backgroundColor: viewMode === "list" ? "#FF6B2B" : "transparent", color: viewMode === "list" ? "white" : "#64748B" }}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("grid")} className="w-8 h-8 flex items-center justify-center transition-colors"
            style={{ backgroundColor: viewMode === "grid" ? "#FF6B2B" : "transparent", color: viewMode === "grid" ? "white" : "#64748B" }}>
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          {/* Desktop table */}
          <table className="w-full text-[13px] hidden lg:table">
            <thead>
              <tr style={{ backgroundColor: "#0F1419" }}>
                {["Proje Adı", "Müşteri", "Başlangıç", "Bitiş", "İlerleme", "Durum"].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 font-semibold uppercase tracking-wide" style={{ color: "#64748B", fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PROJECTS.map((p) => (
                <tr key={p.id} onClick={() => setSelectedProjectId(p.id)} className="transition-colors duration-150 cursor-pointer" style={{ borderBottom: "1px solid #1E2732" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1C242D"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                  <td className="px-5 py-3 font-semibold" style={{ color: "#F1F5F9" }}>{p.name}</td>
                  <td className="px-5 py-3" style={{ color: "#94A3B8" }}>{p.client}</td>
                  <td className="px-5 py-3 font-mono text-[12px]" style={{ color: "#94A3B8" }}>{p.start}</td>
                  <td className="px-5 py-3 font-mono text-[12px]" style={{ color: "#94A3B8" }}>{p.end}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "#1E2732" }}>
                        <div className="h-full rounded-full" style={{ backgroundColor: "#FF6B2B", width: `${p.progress}%` }} />
                      </div>
                      <span className="text-[12px] font-mono" style={{ color: "#94A3B8" }}>{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: `${p.statusColor}15`, color: p.statusColor }}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile/Tablet list */}
          <div className="lg:hidden divide-y" style={{ borderColor: "#1E2732" }}>
            {PROJECTS.map((p) => (
              <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className="px-4 py-3 space-y-2 cursor-pointer active:bg-[#1C242D] transition-colors" style={{ borderColor: "#1E2732" }}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "#F1F5F9" }}>{p.name}</p>
                    <p className="text-[11px]" style={{ color: "#64748B" }}>{p.client}</p>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0 ml-2" style={{ backgroundColor: `${p.statusColor}15`, color: p.statusColor }}>{p.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "#1E2732" }}>
                    <div className="h-full rounded-full" style={{ backgroundColor: "#FF6B2B", width: `${p.progress}%` }} />
                  </div>
                  <span className="text-[11px] font-mono shrink-0" style={{ color: "#94A3B8" }}>{p.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {PROJECTS.map((p) => (
            <div key={p.id} onClick={() => setSelectedProjectId(p.id)}
              className="rounded-xl p-4 lg:p-5 transition-all duration-150 cursor-pointer"
              style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] lg:text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: `${p.statusColor}15`, color: p.statusColor }}>{p.status}</span>
              </div>
              <h4 className="text-[13px] lg:text-[15px] font-semibold mb-1 truncate" style={{ color: "#F1F5F9" }}>{p.name}</h4>
              <p className="text-[11px] lg:text-[12px] mb-3" style={{ color: "#64748B" }}>{p.client}</p>
              <div className="flex items-center justify-center mb-3">
                <div className="relative w-14 h-14">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1E2732" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#FF6B2B" strokeWidth="3" strokeDasharray={`${p.progress}, 100`} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold font-mono" style={{ color: "#F1F5F9" }}>{p.progress}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: "#22C55E" }}>✅ {p.done}</span>
                <span style={{ color: "#F59E0B" }}>🔄 {p.ongoing}</span>
                <span style={{ color: "#EF4444" }}>❌ {p.failed}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DesktopProjectsPage;
