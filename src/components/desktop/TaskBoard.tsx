import {
  Plus,
  X,
  Sparkles,
  LayoutGrid,
  List,
  CalendarDays,
  GanttChart,
  Clock,
  AlertTriangle,
  Flag,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { KpiCard, ResponsiveGrid } from "@/components/ui/responsive";
import { STATUS_COLS, useTaskBoardState, type ViewKey } from "./task-board/useTaskBoardState";
import { TaskBoardFilters } from "./task-board/TaskBoardFilters";
import { TaskKanbanView } from "./task-board/TaskKanbanView";
import { TaskListView } from "./task-board/TaskListView";
import { TaskAddForm } from "./task-board/TaskAddForm";
import { TaskDrawer } from "./task-board/TaskDrawer";

interface TaskBoardProps {
  projectId: string;
}

const VIEWS: { key: ViewKey; label: string; Icon: typeof LayoutGrid }[] = [
  { key: "kanban", label: "Kanban", Icon: LayoutGrid },
  { key: "list", label: "Liste", Icon: List },
  { key: "calendar", label: "Takvim", Icon: CalendarDays },
  { key: "timeline", label: "Timeline", Icon: GanttChart },
];

const TaskBoard = ({ projectId }: TaskBoardProps) => {
  const s = useTaskBoardState(projectId);

  if (s.loading)
    return <p className="text-fs-xs text-muted-foreground">Yükleniyor...</p>;

  const viewSwitcher = (
    <div className="flex items-center rounded-lg border border-border p-0.5 bg-background">
      {VIEWS.map((v) => (
        <button
          key={v.key}
          onClick={() => s.setView(v.key)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-fs-xs font-medium transition-colors ${
            s.view === v.key
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <v.Icon className="w-3 h-3" /> {v.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <DeleteConfirmModal
        open={!!s.deleteTarget}
        onClose={() => s.setDeleteTarget(null)}
        onConfirm={async () => {
          if (s.deleteTarget) await s.deleteTask(s.deleteTarget.id);
        }}
        title="Görevi Sil"
        itemName={s.deleteTarget?.name}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-fs-sm font-semibold text-foreground">Görev Yönetimi</h3>
          {s.collapsed && (
            <div className="flex items-center gap-2 ml-2">
              {STATUS_COLS.map((c) => (
                <span
                  key={c.key}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${c.color}15`, color: c.color }}
                >
                  {c.label} ({s.grouped[c.key].length})
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!s.collapsed && s.user && (
            <button
              onClick={() => s.setShowAddForm(!s.showAddForm)}
              className="flex items-center gap-1.5 px-3 rounded-lg text-fs-xs font-semibold text-white"
              style={{ height: 30, backgroundColor: s.showAddForm ? "#EF4444" : "#FF6B2B" }}
            >
              {s.showAddForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {s.showAddForm ? "İptal" : "Yeni Görev"}
            </button>
          )}
          <button
            onClick={() => s.setCollapsed(!s.collapsed)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-fs-xs font-medium text-muted-foreground hover:bg-muted/40 border border-border"
          >
            {s.collapsed ? (
              <>
                <ChevronDown className="w-3 h-3" /> Genişlet
              </>
            ) : (
              <>
                <ChevronUp className="w-3 h-3" /> Daralt
              </>
            )}
          </button>
        </div>
      </div>

      {!s.collapsed && (
        <>
          <ResponsiveGrid variant="kpi">
            <KpiCard label="Toplam Görev" value={s.summary.total} icon={LayoutGrid} accent="#3B82F6" />
            <KpiCard label="Bugün Bitecek" value={s.summary.dueToday} icon={Clock} accent="#F59E0B" />
            <KpiCard label="Geciken" value={s.summary.overdue} icon={AlertTriangle} accent="#EF4444" />
            <KpiCard label="Yüksek Öncelik" value={s.summary.high} icon={Flag} accent="#F97316" />
            <KpiCard label="Atanmamış" value={s.summary.unassigned} icon={Users} accent="#64748B" />
          </ResponsiveGrid>

          {s.insights.length > 0 && (
            <div
              className="rounded-xl border border-[#FF6B2B]/20 p-3"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,107,43,0.07), rgba(255,143,90,0.02))",
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FF6B2B]" strokeWidth={2.2} />
                <span className="text-fs-xs font-semibold text-[#FF6B2B] uppercase tracking-wide">
                  AI Görev Analizi
                </span>
              </div>
              <ul className="space-y-0.5">
                {s.insights.map((t, i) => (
                  <li key={i} className="text-fs-sm leading-snug text-foreground/90">
                    • {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <TaskBoardFilters
            query={s.query}
            setQuery={s.setQuery}
            fStatus={s.fStatus}
            setFStatus={s.setFStatus}
            fPriority={s.fPriority}
            setFPriority={s.setFPriority}
            fAssignee={s.fAssignee}
            setFAssignee={s.setFAssignee}
            onlyMine={s.onlyMine}
            setOnlyMine={s.setOnlyMine}
            onlyToday={s.onlyToday}
            setOnlyToday={s.setOnlyToday}
            onlyOverdue={s.onlyOverdue}
            setOnlyOverdue={s.setOnlyOverdue}
            filtersActive={s.filtersActive}
            clearFilters={s.clearFilters}
            members={s.members}
            rightSlot={viewSwitcher}
          />

          {s.showAddForm && (
            <TaskAddForm
              members={s.members}
              onClose={() => s.setShowAddForm(false)}
              onAdd={(title, opts) =>
                s.addTask(title, { ...opts, team_id: s.team?.id || null })
              }
            />
          )}

          {s.view === "kanban" && (
            <TaskKanbanView
              grouped={s.grouped}
              visibleCount={s.visibleCount}
              bumpVisible={s.bumpVisible}
              setDraggedTask={s.setDraggedTask}
              draggedTask={s.draggedTask}
              updateTaskStatus={s.updateTaskStatus}
              setDeleteTarget={s.setDeleteTarget}
              setDrawerTask={s.setDrawerTask}
            />
          )}

          {s.view === "list" && (
            <TaskListView rows={s.filtered} onOpen={(t) => s.setDrawerTask(t)} />
          )}

          {(s.view === "calendar" || s.view === "timeline") && (
            <div
              className="rounded-xl border border-border bg-card/40 flex items-center justify-center"
              style={{ height: 400 }}
            >
              <div className="text-center">
                <p className="text-fs-sm font-medium text-foreground">
                  {s.view === "calendar" ? "Takvim" : "Timeline"} görünümü
                </p>
                <p className="text-fs-xs text-muted-foreground mt-1">Yakında</p>
              </div>
            </div>
          )}

          {s.tasks.length === 0 && !s.showAddForm && (
            <div className="text-center py-6">
              <p className="text-fs-xs text-muted-foreground">
                Henüz görev eklenmemiş. "Yeni Görev" ile başlayın.
              </p>
            </div>
          )}
        </>
      )}

      <TaskDrawer
        task={s.drawerTask}
        onClose={() => s.setDrawerTask(null)}
        onUpdateStatus={s.updateTaskStatus}
        onDelete={(t) => {
          s.setDeleteTarget({ id: t.id, name: t.title });
          s.setDrawerTask(null);
        }}
        setDrawerTask={s.setDrawerTask}
      />
    </div>
  );
};

export default TaskBoard;
