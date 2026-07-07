import { useState, type ReactNode } from "react";
import {
  FolderOpen, Clock, CheckCircle2, AlertTriangle,
  LayoutGrid, List, Trash2, Plus, Sparkles, X,
} from "lucide-react";
import { Project } from "@/lib/projectsData";
import ProjectDetailPage from "./ProjectDetailPage";
import AddProjectModal from "./AddProjectModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { useProjects, UserProject } from "@/hooks/useProjects";
import EmptyState from "./EmptyState";
import { useUser } from "@/contexts/UserContext";
import PullToRefresh from "@/components/PullToRefresh";
import { useLiveFilter } from "@/hooks/useLiveFilter";
import { useWorkspaceHighlight } from "@/hooks/useWorkspaceHighlight";
import {
  PageShell,
  SectionCard,
  ResponsiveGrid,
  ResponsiveTable,
  KpiCard,
  type ResponsiveColumn,
} from "@/components/ui/responsive";

/**
 * SPRINT M1.3 — Projects list migrated to the Responsive Design System.
 *
 * • PageShell for layout / spacing / safe-area
 * • ResponsiveGrid + KpiCard for stats
 * • SectionCard as the container
 * • ResponsiveTable (desktop table ↔ mobile card list) for the list view
 * • Design tokens only (spacing scale + text-fs-* typography)
 *
 * Business logic, data flow, drawers and detail page behaviour are preserved.
 */

const HCard = ({
  id,
  children,
  ...rest
}: { id: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) => {
  const on = useWorkspaceHighlight("project", id);
  return (
    <div {...rest} className={`${rest.className ?? ""} ${on ? "ws-highlight" : ""}`}>
      {children}
    </div>
  );
};

interface DesktopProjectsPageProps {
  initialProjectId?: string | null;
  onProjectIdClear?: () => void;
}

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
  const {
    projects: dbProjects,
    addProject,
    deleteProject,
    updateProject,
    updateProjectStatus,
    refetch,
  } = useProjects();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId || null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleBack = () => {
    setSelectedProjectId(null);
    onProjectIdClear?.();
  };

  const handleDeleteProject = (id: string) => deleteProject(id);

  const rawProjects: Project[] = dbProjects.map(dbToProject);
  const liveFilter = useLiveFilter("project");
  const allProjects: Project[] = liveFilter.active
    ? rawProjects.filter((p) => liveFilter.ids.has(p.id))
    : rawProjects;

  const selectedProject = selectedProjectId ? rawProjects.find((p) => p.id === selectedProjectId) : null;

  if (selectedProject) {
    return (
      <ProjectDetailPage
        project={selectedProject}
        onBack={handleBack}
        isDeletable={true}
        onDelete={(id) => { handleDeleteProject(id); handleBack(); }}
        onStatusChange={(id, status, color) => updateProjectStatus(id, status, color)}
        onUpdate={(id, data) => updateProject(id, data)}
      />
    );
  }

  const total = allProjects.length;
  const active = allProjects.filter((p) => p.status === "Devam Ediyor").length;
  const completed = allProjects.filter((p) => p.status === "Tamamlanıyor" || p.progress >= 100).length;
  const delayed = allProjects.filter((p) => p.status === "Gecikmiş").length;

  const columns: ResponsiveColumn<Project>[] = [
    {
      key: "name",
      header: "Proje Adı",
      primary: true,
      cell: (p) => <span className="font-semibold text-foreground">{p.name}</span>,
    },
    {
      key: "client",
      header: "Müşteri",
      cell: (p) => <span className="text-muted-foreground">{p.client}</span>,
    },
    {
      key: "start",
      header: "Başlangıç",
      cell: (p) => <span className="font-mono text-fs-xs text-muted-foreground">{p.start}</span>,
    },
    {
      key: "end",
      header: "Bitiş",
      cell: (p) => <span className="font-mono text-fs-xs text-muted-foreground">{p.end}</span>,
    },
    {
      key: "progress",
      header: "İlerleme",
      cell: (p) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-1.5 rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ backgroundColor: "hsl(var(--primary))", width: `${p.progress}%` }}
            />
          </div>
          <span className="text-fs-xs font-mono text-muted-foreground shrink-0">{p.progress}%</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Durum",
      cell: (p) => (
        <span
          className="text-fs-xs font-medium px-2 py-0.5 rounded-md"
          style={{ backgroundColor: `${p.statusColor}15`, color: p.statusColor }}
        >
          {p.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (p) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: p.id, name: p.name }); }}
          className="min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Projeyi sil"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const kpiAccent = "hsl(var(--primary))";

  const headerActions = (
    <div className="flex items-center gap-3">
      {user && (
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-lg text-fs-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Proje Ekle
        </button>
      )}
      <div className="flex rounded-lg overflow-hidden border border-border">
        <button
          onClick={() => setViewMode("list")}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
          style={{
            backgroundColor: viewMode === "list" ? "hsl(var(--primary))" : "transparent",
            color: viewMode === "list" ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
          }}
          aria-label="Liste görünümü"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode("grid")}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
          style={{
            backgroundColor: viewMode === "grid" ? "hsl(var(--primary))" : "transparent",
            color: viewMode === "grid" ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
          }}
          aria-label="Kart görünümü"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <PageShell
      title="Projeler"
      subtitle={liveFilter.active ? liveFilter.label ?? "AI filtresi aktif" : undefined}
      actions={headerActions}
      maxWidth={1200}
    >
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

      <div className="flex flex-col gap-4 lg:gap-6">
        {/* KPI stats */}
        <ResponsiveGrid variant="kpi">
          <KpiCard label="Toplam Proje" value={total} icon={FolderOpen} accent={kpiAccent} />
          <KpiCard label="Devam Eden" value={active} icon={Clock} accent="#3B82F6" />
          <KpiCard label="Tamamlanan" value={completed} icon={CheckCircle2} accent="#22C55E" />
          <KpiCard label="Geciken" value={delayed} icon={AlertTriangle} accent="#EF4444" />
        </ResponsiveGrid>

        {liveFilter.active && (
          <button
            onClick={liveFilter.clear}
            className="self-start inline-flex items-center gap-1 text-fs-xs px-3 min-h-[32px] rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors animate-fade-in"
            aria-label="AI filtresini temizle"
          >
            <Sparkles className="w-3 h-3" />
            {liveFilter.label ?? "AI filtresi"}
            <X className="w-3 h-3" />
          </button>
        )}

        <PullToRefresh onRefresh={refetch}>
          {allProjects.length === 0 ? (
            <EmptyState
              icon="🏗️"
              title="Henüz proje yok"
              description="İlk projenizi ekleyerek şantiye takibine başlayın."
              buttonText="+ Yeni Proje Ekle"
              onButtonClick={() => setShowAddModal(true)}
            />
          ) : viewMode === "list" ? (
            <SectionCard padded={false}>
              <div className="p-3 lg:p-4">
                <ResponsiveTable<Project>
                  columns={columns}
                  rows={allProjects}
                  rowKey={(p) => p.id}
                  onRowClick={(p) => setSelectedProjectId(p.id)}
                />
              </div>
            </SectionCard>
          ) : (
            <ResponsiveGrid variant="auto" minItemWidth={260}>
              {allProjects.map((p) => (
                <HCard
                  key={p.id}
                  id={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className="card-refined p-4 lg:p-5 cursor-pointer hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-fs-xs font-medium px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: `${p.statusColor}15`, color: p.statusColor }}
                    >
                      {p.status}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: p.id, name: p.name }); }}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive"
                      aria-label="Projeyi sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-fs-md font-semibold mb-1 truncate text-foreground">{p.name}</h4>
                  <p className="text-fs-xs mb-3 text-muted-foreground truncate">{p.client}</p>
                  <div className="flex items-center justify-center mb-3">
                    <div className="relative w-14 h-14">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="hsl(var(--muted))"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="3"
                          strokeDasharray={`${p.progress}, 100`}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-fs-xs font-bold font-mono text-foreground">
                        {p.progress}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-fs-xs">
                    <span style={{ color: "#22C55E" }}>✅ {p.done}</span>
                    <span style={{ color: "#F59E0B" }}>🔄 {p.ongoing}</span>
                    <span style={{ color: "#EF4444" }}>❌ {p.failed}</span>
                  </div>
                </HCard>
              ))}
            </ResponsiveGrid>
          )}
        </PullToRefresh>
      </div>

      <AddProjectModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(data) => addProject(data)}
      />
    </PageShell>
  );
};

export default DesktopProjectsPage;
