import { useMemo, useState } from "react";
import { Plus, Search, X, Sparkles } from "lucide-react";
import { Project } from "@/lib/projectsData";
import ProjectDetailPage from "./ProjectDetailPage";
import AddProjectModal from "./AddProjectModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { useProjects, UserProject } from "@/hooks/useProjects";
import EmptyState from "./EmptyState";
import { useUser } from "@/contexts/UserContext";
import PullToRefresh from "@/components/PullToRefresh";
import { useLiveFilter } from "@/hooks/useLiveFilter";
import ProjectStatStrip, { type ProjectStatKey } from "./projects/ProjectStatStrip";
import ProjectListCard from "./projects/ProjectListCard";

/**
 * SPRINT 38A — Projects module premium UX pass.
 *
 * • Compact stat strip that doubles as the status filter (tabs + chips merged)
 * • Search is the only other control — no stacked filter rows
 * • Project list starts high on the screen and is the visual focus
 * • Compact cards: name → status → progress → metrics → quick actions
 *
 * Business logic, data flow, and the detail page contract are unchanged.
 */

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

const goToTab = (tab: string, projectId: string) => {
  window.dispatchEvent(new CustomEvent("navigate-tab", { detail: { tab, projectId } }));
};

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

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId || null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatKey>("all");

  const handleBack = () => {
    setSelectedProjectId(null);
    onProjectIdClear?.();
  };

  const handleDeleteProject = (id: string) => deleteProject(id);

  const rawProjects: Project[] = useMemo(() => dbProjects.map(dbToProject), [dbProjects]);
  const liveFilter = useLiveFilter("project");
  const allProjects: Project[] = liveFilter.active
    ? rawProjects.filter((p) => liveFilter.ids.has(p.id))
    : rawProjects;

  const selectedProject = selectedProjectId ? rawProjects.find((p) => p.id === selectedProjectId) : null;

  const total = allProjects.length;
  const active = allProjects.filter((p) => p.status === "Devam Ediyor").length;
  const completed = allProjects.filter((p) => p.status === "Tamamlanıyor" || p.progress >= 100).length;
  const delayed = allProjects.filter((p) => p.status === "Gecikmiş").length;

  const visibleProjects = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return allProjects.filter((p) => {
      const matchesStatus =
        statusFilter === "all" ? true
        : statusFilter === "active" ? p.status === "Devam Ediyor"
        : statusFilter === "completed" ? (p.status === "Tamamlanıyor" || p.progress >= 100)
        : p.status === "Gecikmiş";
      if (!matchesStatus) return false;
      if (!q) return true;
      return [p.name, p.client, p.location, p.manager]
        .filter(Boolean)
        .some((v) => String(v).toLocaleLowerCase("tr").includes(q));
    });
  }, [allProjects, statusFilter, query]);

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

  const filtersDirty = statusFilter !== "all" || query.trim().length > 0;

  return (
    <div
      className="w-full no-overflow-x safe-area-bottom"
      style={{
        paddingLeft: "max(env(safe-area-inset-left, 0px), 20px)",
        paddingRight: "max(env(safe-area-inset-right, 0px), 20px)",
        paddingTop: "16px",
        paddingBottom: "24px",
      }}
    >
      <div className="mx-auto w-full" style={{ maxWidth: 1200 }}>
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

        {/* Header — title + single primary action */}
        <header className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h1 className="ds-heading text-foreground truncate">Projeler</h1>
            {liveFilter.active && (
              <p className="ds-caption text-muted-foreground mt-0.5 truncate">
                {liveFilter.label ?? "AI filtresi aktif"}
              </p>
            )}
          </div>
          {user && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-button ds-body font-semibold text-primary-foreground bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Proje Ekle</span>
            </button>
          )}
        </header>

        {/* Compact stats — also the status filter */}
        <ProjectStatStrip
          activeKey={statusFilter}
          onSelect={setStatusFilter}
          items={[
            { key: "all", label: "Toplam", value: total, color: "hsl(var(--primary))" },
            { key: "active", label: "Devam Eden", value: active, color: "#3B82F6" },
            { key: "completed", label: "Tamamlanan", value: completed, color: "#22C55E" },
            { key: "delayed", label: "Geciken", value: delayed, color: "#EF4444" },
          ]}
        />

        {/* Search — the only additional control */}
        <div className="relative mt-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Proje, müşteri veya lokasyon ara"
            aria-label="Projelerde ara"
            className="w-full h-11 pl-9 pr-9 rounded-button bg-card border border-border/70 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/50 transition-colors"
            style={{ fontSize: 16 }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Aramayı temizle"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {liveFilter.active && (
          <button
            onClick={liveFilter.clear}
            className="mt-3 inline-flex items-center gap-1 ds-caption px-3 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors animate-fade-in"
            aria-label="AI filtresini temizle"
          >
            <Sparkles className="w-3 h-3" />
            {liveFilter.label ?? "AI filtresi"}
            <X className="w-3 h-3" />
          </button>
        )}

        {/* Project list — the primary focus */}
        <div className="mt-4">
          <PullToRefresh onRefresh={refetch}>
            {allProjects.length === 0 ? (
              <EmptyState
                icon="🏗️"
                title="Henüz proje yok"
                description="İlk projenizi ekleyerek şantiye takibine başlayın."
                buttonText="+ Yeni Proje Ekle"
                onButtonClick={() => setShowAddModal(true)}
              />
            ) : visibleProjects.length === 0 ? (
              <div className="rounded-card border border-border/70 bg-card px-5 py-10 text-center">
                <p className="ds-title text-foreground">Eşleşen proje yok</p>
                <p className="ds-caption text-muted-foreground mt-1">
                  Arama veya durum filtresini değiştirmeyi deneyin.
                </p>
                {filtersDirty && (
                  <button
                    onClick={() => { setQuery(""); setStatusFilter("all"); }}
                    className="mt-4 inline-flex items-center gap-1.5 px-3.5 h-9 rounded-button ds-body font-medium border border-border text-foreground hover:border-primary/40 transition-colors"
                  >
                    Filtreleri temizle
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {visibleProjects.map((p) => (
                  <ProjectListCard
                    key={p.id}
                    project={p}
                    canManage={!!user}
                    onOpen={() => setSelectedProjectId(p.id)}
                    onDelete={() => setDeleteTarget({ id: p.id, name: p.name })}
                    onHakedis={() => goToTab("hakedis", p.id)}
                    onPayment={() => goToTab("payments-kasa", p.id)}
                  />
                ))}
              </div>
            )}
          </PullToRefresh>
        </div>

        <AddProjectModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={(data) => addProject(data)}
        />
      </div>
    </div>
  );
};

export default DesktopProjectsPage;
