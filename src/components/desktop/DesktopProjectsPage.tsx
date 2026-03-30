import { useState } from "react";
import {
  FolderOpen, Clock, CheckCircle, AlertTriangle,
  Plus, LayoutGrid, List, MoreHorizontal, ChevronRight
} from "lucide-react";

const STATS = [
  { label: "Toplam Proje", value: "12", icon: FolderOpen, emoji: "📋" },
  { label: "Devam Eden", value: "8", icon: Clock, emoji: "🔄" },
  { label: "Tamamlanan", value: "3", icon: CheckCircle, emoji: "✅" },
  { label: "Geciken", value: "1", icon: AlertTriangle, emoji: "⏰", alert: true },
];

const PROJECTS = [
  { name: "Villa Projesi - Çeşme", client: "Mehmet Bey", start: "15.01.2026", end: "15.06.2026", progress: 75, status: "Devam Ediyor", statusColor: "#22C55E", done: 18, ongoing: 6, failed: 0 },
  { name: "AVM İnşaatı - Ankara", client: "Yıldız İnşaat", start: "01.03.2026", end: "01.12.2026", progress: 42, status: "Gecikmiş", statusColor: "#EF4444", done: 8, ongoing: 12, failed: 2 },
  { name: "Konut Projesi - İstanbul", client: "Atlas Yapı", start: "10.11.2025", end: "10.04.2026", progress: 91, status: "Tamamlanıyor", statusColor: "#F59E0B", done: 22, ongoing: 2, failed: 0 },
  { name: "Fabrika - Kocaeli", client: "Endüstri A.Ş.", start: "01.02.2026", end: "01.08.2026", progress: 28, status: "Devam Ediyor", statusColor: "#22C55E", done: 5, ongoing: 10, failed: 1 },
];

const DesktopProjectsPage = () => {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

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
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 28, color: s.alert ? "#EF4444" : "#F1F5F9" }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* View toggle + actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold" style={{ color: "#F1F5F9" }}>Projeler</h3>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #1E2732" }}>
            <button
              onClick={() => setViewMode("list")}
              className="w-8 h-8 flex items-center justify-center transition-colors"
              style={{ backgroundColor: viewMode === "list" ? "#FF6B2B" : "transparent", color: viewMode === "list" ? "white" : "#64748B" }}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className="w-8 h-8 flex items-center justify-center transition-colors"
              style={{ backgroundColor: viewMode === "grid" ? "#FF6B2B" : "transparent", color: viewMode === "grid" ? "white" : "#64748B" }}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ backgroundColor: "#0F1419" }}>
                {["Proje Adı", "Müşteri", "Başlangıç", "Bitiş", "İlerleme", "Durum", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 font-semibold uppercase tracking-wide" style={{ color: "#64748B", fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PROJECTS.map((p, i) => (
                <tr key={i} className="transition-colors duration-150 cursor-pointer" style={{ borderBottom: "1px solid #1E2732" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1C242D"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
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
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: `${p.statusColor}15`, color: p.statusColor }}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <MoreHorizontal className="w-4 h-4" style={{ color: "#64748B" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {PROJECTS.map((p, i) => (
            <div
              key={i}
              className="rounded-xl p-5 transition-all duration-150 cursor-pointer"
              style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2A3441"; e.currentTarget.style.backgroundColor = "#1C242D"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1E2732"; e.currentTarget.style.backgroundColor = "#161C23"; }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: `${p.statusColor}15`, color: p.statusColor }}>
                  {p.status}
                </span>
                <MoreHorizontal className="w-4 h-4" style={{ color: "#64748B" }} />
              </div>
              <h4 className="text-[15px] font-semibold mb-1" style={{ color: "#F1F5F9" }}>{p.name}</h4>
              <p className="text-[12px] mb-4" style={{ color: "#64748B" }}>{p.client}</p>

              {/* Circular progress */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-16 h-16">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1E2732" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#FF6B2B" strokeWidth="3" strokeDasharray={`${p.progress}, 100`} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold font-mono" style={{ color: "#F1F5F9" }}>{p.progress}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[12px]">
                <span style={{ color: "#22C55E" }}>✅ {p.done}</span>
                <span style={{ color: "#F59E0B" }}>🔄 {p.ongoing}</span>
                <span style={{ color: "#EF4444" }}>❌ {p.failed}</span>
              </div>

              <button className="flex items-center gap-0.5 text-[12px] font-medium mt-3" style={{ color: "#FF6B2B" }}>
                Git <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DesktopProjectsPage;
