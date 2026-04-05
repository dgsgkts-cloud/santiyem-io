import { useState, useEffect } from "react";
import {
  FolderOpen, Clock, CheckCircle, AlertTriangle,
  LayoutGrid, List, MoreHorizontal, ChevronRight, Trash2, Plus
} from "lucide-react";
import { Project } from "@/lib/projectsData";
import ProjectDetailPage from "./ProjectDetailPage";
import AddProjectModal from "./AddProjectModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { useProjects, UserProject } from "@/hooks/useProjects";
import { useUser } from "@/contexts/UserContext";

interface DesktopProjectsPageProps {
  initialProjectId?: string | null;
  onProjectIdClear?: () => void;
}

// Convert DB project to Project interface for detail page
const dbToProject = (p: UserProject): Project => ({
  id: p.id,
  name: p.name,
  client: p.client,
  start: p.start_date,
  end: p.end_date,
  progress: p.progress,
  status: p.status,
  statusColor: p.status_color,
  done: 0, ongoing: 0, failed: 0, delayed: 0,
  budget: p.budget,
  location: p.location,
  manager: p.manager,
  description: p.description,
  milestones: [],
  recentActivity: [],
});


const DesktopProjectsPage = ({ initialProjectId, onProjectIdClear }: DesktopProjectsPageProps) => {
  const { user } = useUser();
  const { projects: dbProjects, loading, addProject, deleteProject, updateProjectStatus } = useProjects();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId || null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleBack = () => {
    setSelectedProjectId(null);
    onProjectIdClear?.();
  };

  const handleDeleteProject = (id: string) => {
    deleteProject(id);
  };

  const allProjects: Project[] = dbProjects.map(dbToProject);

  const selectedProject = selectedProjectId ? allProjects.find(p => p.id === selectedProjectId) : null;
  

  if (selectedProject) {
    return (
      <ProjectDetailPage
        project={selectedProject}
        onBack={handleBack}
        isDeletable={true}
        onDelete={(id) => { handleDeleteProject(id); handleBack(); }}
        onStatusChange={isDbProject(selectedProject.id) ? (id, status, color) => updateProjectStatus(id, status, color) : undefined}
      />
    );
  }

  const stats = [
    { label: "Toplam Proje", value: String(allProjects.length), emoji: "📋" },
    { label: "Devam Eden", value: String(allProjects.filter(p => p.status === "Devam Ediyor").length), emoji: "🔄" },
    { label: "Tamamlanan", value: String(allProjects.filter(p => p.status === "Tamamlanıyor" || p.progress >= 100).length), emoji: "✅" },
    { label: "Geciken", value: String(allProjects.filter(p => p.status === "Gecikmiş").length), emoji: "⏰", alert: true },
  ];

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[1200px] mx-auto space-y-4 lg:space-y-5">
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) handleDeleteProject(deleteTarget.id);
        }}
        title="Projeyi Sil"
        itemName={deleteTarget?.name}
        extraWarning="Projeye ait tüm iş kalemleri, hakedişler ve şantiye kayıtları da silinecektir."
      />
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl p-3 lg:p-5 bg-card border border-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base lg:text-lg">{s.emoji}</span>
              <span className="text-[10px] lg:text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</span>
            </div>
            <p className={`text-xl lg:text-[28px] font-bold ${s.alert ? '' : 'text-foreground'}`} style={{ fontFamily: "'Space Grotesk', sans-serif", ...(s.alert ? { color: "#EF4444" } : {}) }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* View toggle + Add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm lg:text-[15px] font-semibold text-foreground">Projeler</h3>
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 rounded-lg text-[12px] font-semibold text-white transition-colors"
              style={{ height: 32, backgroundColor: "#FF6B2B" }}
            >
              <Plus className="w-3.5 h-3.5" /> Proje Ekle
            </button>
          )}
          <div className="flex rounded-lg overflow-hidden">
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
      </div>

      {viewMode === "list" ? (
        <div className="rounded-xl overflow-hidden bg-card border border-border">
          {/* Desktop table */}
          <table className="w-full text-[13px] hidden lg:table">
            <thead>
              <tr className="bg-background">
                {["Proje Adı", "Müşteri", "Başlangıç", "Bitiş", "İlerleme", "Durum", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 font-semibold uppercase tracking-wide" style={{ color: "#64748B", fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allProjects.map((p) => (
                <tr key={p.id} onClick={() => setSelectedProjectId(p.id)} className="hover-row cursor-pointer border-b border-border">
                  <td className="px-5 py-3 font-semibold text-foreground">{p.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{p.client}</td>
                  <td className="px-5 py-3 font-mono text-[12px] text-muted-foreground">{p.start}</td>
                  <td className="px-5 py-3 font-mono text-[12px] text-muted-foreground">{p.end}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ backgroundColor: "#FF6B2B", width: `${p.progress}%` }} />
                      </div>
                      <span className="text-[12px] font-mono text-muted-foreground">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: `${p.statusColor}15`, color: p.statusColor }}>{p.status}</span>
                  </td>
                  <td className="px-5 py-3">
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: p.id, name: p.name }); }} className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:text-red-400 text-muted-foreground">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile/Tablet card list */}
          <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
            {allProjects.map((p) => (
              <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className="rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-all bg-card border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-md" style={{ backgroundColor: `${p.statusColor}15`, color: p.statusColor }}>{p.status}</span>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: p.id, name: p.name }); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="text-[15px] font-semibold mb-1 truncate text-foreground">{p.name}</h4>
                <p className="text-[13px] mb-3 text-muted-foreground">{p.client}</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ backgroundColor: "#FF6B2B", width: `${p.progress}%` }} />
                  </div>
                  <span className="text-[13px] font-mono font-semibold shrink-0 text-foreground">{p.progress}%</span>
                </div>
                <div className="flex items-center justify-between mt-3 text-[12px] text-muted-foreground">
                  <span>{p.start}</span>
                  <span>→</span>
                  <span>{p.end}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {allProjects.map((p) => (
            <div key={p.id} onClick={() => setSelectedProjectId(p.id)}
              className="rounded-xl p-4 lg:p-5 transition-all duration-150 cursor-pointer bg-card border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] lg:text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: `${p.statusColor}15`, color: p.statusColor }}>{p.status}</span>
                <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: p.id, name: p.name }); }} className="text-muted-foreground">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <h4 className="text-[13px] lg:text-[15px] font-semibold mb-1 truncate text-foreground">{p.name}</h4>
              <p className="text-[11px] lg:text-[12px] mb-3 text-muted-foreground">{p.client}</p>
              <div className="flex items-center justify-center mb-3">
                <div className="relative w-14 h-14">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#FF6B2B" strokeWidth="3" strokeDasharray={`${p.progress}, 100`} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold font-mono text-foreground">{p.progress}%</span>
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

      <AddProjectModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(data) => addProject(data)}
      />
    </div>
  );
};

export default DesktopProjectsPage;
