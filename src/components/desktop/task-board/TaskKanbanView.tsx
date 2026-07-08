import { Task } from "@/hooks/useTasks";
import { PAGE_SIZE, STATUS_COLS } from "./useTaskBoardState";
import { TaskCard } from "./TaskCard";

interface Props {
  grouped: Record<Task["status"], Task[]>;
  visibleCount: Record<string, number>;
  bumpVisible: (key: string) => void;
  setDraggedTask: (id: string | null) => void;
  draggedTask: string | null;
  updateTaskStatus: (id: string, s: Task["status"]) => void;
  setDeleteTarget: (t: { id: string; name: string } | null) => void;
  setDrawerTask: (t: Task | null) => void;
}

export const TaskKanbanView = (p: Props) => {
  const handleDrop = (status: Task["status"]) => {
    if (p.draggedTask) {
      p.updateTaskStatus(p.draggedTask, status);
      p.setDraggedTask(null);
    }
  };

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-3 gap-3"
      style={{ height: 680 }}
    >
      {STATUS_COLS.map((col) => {
        const items = p.grouped[col.key];
        const shown = items.slice(0, p.visibleCount[col.key] ?? PAGE_SIZE);
        return (
          <div
            key={col.key}
            className="rounded-xl flex flex-col min-h-0"
            style={{ backgroundColor: col.bg, border: `1px solid ${col.color}20` }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.key)}
          >
            <div
              className="flex items-center gap-2 p-3 border-b sticky top-0 z-10 rounded-t-xl"
              style={{
                borderColor: `${col.color}20`,
                backgroundColor: col.bg,
                backdropFilter: "blur(4px)",
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="text-fs-xs font-semibold" style={{ color: col.color }}>
                {col.label}
              </span>
              <span
                className="text-[10px] font-mono ml-auto px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${col.color}15`, color: col.color }}
              >
                {items.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              {shown.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  col={col}
                  onDragStart={() => p.setDraggedTask(task.id)}
                  onDelete={() => p.setDeleteTarget({ id: task.id, name: task.title })}
                  onMove={(s) => p.updateTaskStatus(task.id, s)}
                  onOpen={() => p.setDrawerTask(task)}
                />
              ))}
              {items.length === 0 && (
                <p className="text-center text-fs-xs text-muted-foreground py-6">Görev yok</p>
              )}
              {items.length > shown.length && (
                <button
                  onClick={() => p.bumpVisible(col.key)}
                  className="w-full text-fs-xs font-medium text-muted-foreground hover:text-foreground py-1.5 rounded-md border border-dashed border-border"
                >
                  Daha Fazla ({items.length - shown.length})
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TaskKanbanView;
