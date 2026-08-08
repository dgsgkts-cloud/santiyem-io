// GÖREV MERKEZİ — şirket geneli görev görünümü (/gorevler).
// Proje detayındaki Görev Panosu aynen korunur; burada proje seçmeden tüm
// görevler mevcut `tasks` verisi üzerinden listelenir.
import { useMemo, useState } from "react";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  FolderKanban,
  User,
  Calendar,
} from "lucide-react";
import { OpsStatStrip, OpsEmpty } from "@/components/operations/opsUi";
import { useAllTasks, type CompanyTask } from "@/hooks/useAllTasks";
import { useUser } from "@/contexts/UserContext";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { TaskDrawer } from "@/components/desktop/task-board/TaskDrawer";
import { STATUS_COLS, PRIORITY_LABELS } from "@/components/desktop/task-board/useTaskBoardState";

type FilterKey =
  | "all"
  | "mine"
  | "delegated"
  | "today"
  | "week"
  | "overdue"
  | "done";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "mine", label: "Bana Atanan" },
  { key: "delegated", label: "Ekibime Atadıklarım" },
  { key: "today", label: "Bugün" },
  { key: "week", label: "Bu Hafta" },
  { key: "overdue", label: "Geciken" },
  { key: "done", label: "Tamamlanan" },
];

const startOfToday = () => new Date(new Date().toDateString());
const endOfWeek = () => {
  const d = startOfToday();
  d.setDate(d.getDate() + 7);
  return d;
};

const TasksCenterPage = () => {
  const { user } = useUser();
  const { tasks, loading, summary, updateTaskStatus, deleteTask } = useAllTasks();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [drawerTask, setDrawerTask] = useState<CompanyTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const rows = useMemo(() => {
    const today = startOfToday();
    const week = endOfWeek();
    return tasks.filter((t) => {
      if (query && !`${t.title} ${t.project_name || ""}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      const due = t.due_date ? new Date(t.due_date) : null;
      switch (filter) {
        case "mine":
          return t.assigned_to === user?.id && t.status !== "done";
        case "delegated":
          return t.created_by === user?.id && !!t.assigned_to && t.assigned_to !== user?.id;
        case "today":
          return (
            t.status !== "done" && !!due && due.toDateString() === new Date().toDateString()
          );
        case "week":
          return t.status !== "done" && !!due && due >= today && due <= week;
        case "overdue":
          return t.status !== "done" && !!due && due < today;
        case "done":
          return t.status === "done";
        default:
          return true;
      }
    });
  }, [tasks, filter, query, user]);

  const openProject = (projectId: string) => {
    window.dispatchEvent(new CustomEvent("open-project", { detail: projectId }));
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteTask(deleteTarget.id);
        }}
        title="Görevi Sil"
        itemName={deleteTarget?.name}
      />

      <header className="space-y-1">
        <h1 className="text-fs-lg font-semibold text-foreground">Görevler / İşler</h1>
        <p className="text-fs-xs text-muted-foreground">
          Tüm projelerdeki görevler tek yerde. Proje adına tıklayarak ilgili projeye
          geçebilirsiniz.
        </p>
      </header>

      <OpsStatStrip
        columns={4}
        stats={[
          { label: "Açık", value: summary.open, icon: CheckSquare, tone: "neutral" },
          { label: "Bugün", value: summary.today, icon: Clock, tone: "attention", onClick: () => setFilter("today"), active: filter === "today" },
          { label: "Geciken", value: summary.overdue, icon: AlertTriangle, tone: "overdue", onClick: () => setFilter("overdue"), active: filter === "overdue" },
          { label: "Tamamlanan", value: summary.done, icon: CheckCircle2, tone: "info", onClick: () => setFilter("done"), active: filter === "done" },
        ]}
      />

      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Görev veya proje ara..."
            className="w-full h-10 pl-9 pr-3 rounded-control bg-card border border-border text-fs-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[#FF6B2B]/50"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 h-9 px-3 rounded-control text-fs-xs font-medium border transition-colors ${
                filter === f.key
                  ? "border-[#FF6B2B] text-[#FF6B2B] bg-[#FF6B2B]/10"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-fs-xs text-muted-foreground">Yükleniyor...</p>
      ) : rows.length === 0 ? (
        <OpsEmpty
          icon="✅"
          title="Görev bulunamadı"
          description="Bu filtreye uyan görev yok. Görevler proje detayındaki Görev Panosu'ndan oluşturulur."
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card/40">
          {rows.map((t) => {
            const col = STATUS_COLS.find((c) => c.key === t.status)!;
            const pri = PRIORITY_LABELS[t.priority] || PRIORITY_LABELS.normal;
            const overdue =
              t.status !== "done" && !!t.due_date && new Date(t.due_date) < startOfToday();
            return (
              <div
                key={t.id}
                onClick={() => setDrawerTask(t)}
                className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 px-3 md:px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-fs-sm font-medium text-foreground truncate">{t.title}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {t.project_name && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openProject(t.project_id);
                        }}
                        className="flex items-center gap-1 text-fs-xs text-[#FF6B2B] hover:underline"
                      >
                        <FolderKanban className="w-3 h-3" />
                        {t.project_name}
                      </button>
                    )}
                    <span className="flex items-center gap-1 text-fs-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      {t.assignee_name || "Atanmamış"}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-fs-xs ${
                        overdue ? "text-[#EF4444] font-medium" : "text-muted-foreground"
                      }`}
                    >
                      <Calendar className="w-3 h-3" />
                      {t.due_date ? new Date(t.due_date).toLocaleDateString("tr-TR") : "—"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${pri.color}15`, color: pri.color }}
                  >
                    {pri.label}
                  </span>
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${col.color}15`, color: col.color }}
                  >
                    {col.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskDrawer
        task={drawerTask}
        onClose={() => setDrawerTask(null)}
        onUpdateStatus={(id, s) => {
          updateTaskStatus(id, s);
          setDrawerTask((prev) => (prev && prev.id === id ? { ...prev, status: s } : prev));
        }}
        onDelete={(t) => {
          setDeleteTarget({ id: t.id, name: t.title });
          setDrawerTask(null);
        }}
        setDrawerTask={(t) => setDrawerTask(t as CompanyTask | null)}
      />
    </div>
  );
};

export default TasksCenterPage;
