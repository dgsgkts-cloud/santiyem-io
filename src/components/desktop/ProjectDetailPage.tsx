import { ArrowLeft, MapPin, User, Calendar, DollarSign, CheckCircle2, Clock, XCircle, ChevronRight } from "lucide-react";
import { Project } from "@/lib/projectsData";

interface ProjectDetailPageProps {
  project: Project;
  onBack: () => void;
}

const ProjectDetailPage = ({ project: p, onBack }: ProjectDetailPageProps) => {
  const completedMilestones = p.milestones.filter(m => m.completed).length;

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[1200px] mx-auto space-y-4 lg:space-y-5">
      {/* Back + Header */}
      <div>
        <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] mb-3 transition-colors" style={{ color: "#64748B" }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Projelere Dön
        </button>
        <div className="rounded-xl p-4 lg:p-5" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", borderLeft: "3px solid " + p.statusColor }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base lg:text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#F1F5F9" }}>{p.name}</h2>
                <span className="text-[10px] lg:text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: `${p.statusColor}15`, color: p.statusColor }}>{p.status}</span>
              </div>
              <p className="text-[12px] lg:text-[13px]" style={{ color: "#64748B" }}>{p.description}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="relative w-14 h-14 lg:w-16 lg:h-16">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1E2732" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#FF6B2B" strokeWidth="3" strokeDasharray={`${p.progress}, 100`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold font-mono" style={{ color: "#F1F5F9" }}>{p.progress}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: MapPin, label: "Lokasyon", value: p.location },
          { icon: User, label: "Müşteri", value: p.client },
          { icon: DollarSign, label: "Bütçe", value: p.budget },
          { icon: Calendar, label: "Süre", value: `${p.start} → ${p.end}` },
        ].map((info, i) => {
          const Icon = info.icon;
          return (
            <div key={i} className="rounded-xl p-3 lg:p-4" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "#FF6B2B" }} />
                <span className="text-[10px] lg:text-[11px] font-semibold uppercase" style={{ color: "#64748B" }}>{info.label}</span>
              </div>
              <p className="text-[12px] lg:text-[13px] font-medium truncate" style={{ color: "#F1F5F9" }}>{info.value}</p>
            </div>
          );
        })}
      </div>

      {/* Task summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: CheckCircle2, label: "Tamamlanan", value: p.done, color: "#22C55E" },
          { icon: Clock, label: "Devam Eden", value: p.ongoing, color: "#F59E0B" },
          { icon: XCircle, label: "Başarısız", value: p.failed, color: "#EF4444" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="rounded-xl p-3 lg:p-4 text-center" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
              <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: s.color }} />
              <p className="text-lg lg:text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: s.color }}>{s.value}</p>
              <p className="text-[10px] lg:text-[11px]" style={{ color: "#64748B" }}>{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Two columns: milestones + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        {/* Milestones */}
        <div className="rounded-xl p-4 lg:p-5" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm lg:text-[15px] font-semibold" style={{ color: "#F1F5F9" }}>Kilometre Taşları</h3>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(255,107,43,0.1)", color: "#FF6B2B" }}>
              {completedMilestones}/{p.milestones.length}
            </span>
          </div>
          <div className="space-y-3">
            {p.milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${m.completed ? "" : ""}`}
                  style={{ backgroundColor: m.completed ? "#22C55E" : "#1E2732", border: m.completed ? "none" : "2px solid #334155" }}>
                  {m.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] lg:text-[13px] font-medium ${m.completed ? "line-through" : ""}`} style={{ color: m.completed ? "#64748B" : "#F1F5F9" }}>{m.title}</p>
                </div>
                <span className="text-[10px] lg:text-[11px] font-mono shrink-0" style={{ color: "#64748B" }}>{m.date}</span>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="mt-4 pt-3" style={{ borderTop: "1px solid #1E2732" }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px]" style={{ color: "#64748B" }}>İlerleme</span>
              <span className="text-[11px] font-mono font-medium" style={{ color: "#FF6B2B" }}>{p.progress}%</span>
            </div>
            <div className="h-2 rounded-full" style={{ backgroundColor: "#1E2732" }}>
              <div className="h-full rounded-full transition-all" style={{ backgroundColor: "#FF6B2B", width: `${p.progress}%` }} />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl p-4 lg:p-5" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          <h3 className="text-sm lg:text-[15px] font-semibold mb-4" style={{ color: "#F1F5F9" }}>Son Aktiviteler</h3>
          <div className="space-y-3">
            {p.recentActivity.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                <span className="text-[12px] lg:text-[13px] flex-1 min-w-0" style={{ color: "#94A3B8" }}>{a.text}</span>
                <span className="text-[10px] lg:text-[11px] shrink-0" style={{ color: "#64748B" }}>{a.time}</span>
              </div>
            ))}
          </div>

          {/* Project manager */}
          <div className="mt-4 pt-3" style={{ borderTop: "1px solid #1E2732" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: "#334155" }}>Proje Sorumlusu</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,107,43,0.15)" }}>
                <User className="w-4 h-4" style={{ color: "#FF6B2B" }} />
              </div>
              <div>
                <p className="text-[12px] lg:text-[13px] font-medium" style={{ color: "#F1F5F9" }}>{p.manager}</p>
                <p className="text-[10px]" style={{ color: "#64748B" }}>Şantiye Şefi</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
