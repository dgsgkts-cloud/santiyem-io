import { Calendar, AlertTriangle, Trash2, Check, Play, Undo2 } from "lucide-react";
import { Task } from "@/hooks/useTasks";
import { STATUS_COLS, PRIORITY_LABELS, isOverdue, initials } from "./useTaskBoardState";

interface TaskCardProps {
  task: Task;
  col: (typeof STATUS_COLS)[number];
  onDragStart: () => void;
  onDelete: () => void;
  onMove: (s: Task["status"]) => void;
  onOpen: () => void;
}

/**
 * SPRINT 38F — compact task card.
 * Hierarchy: name → priority → assignee → due date → quick actions.
 * Placeholder counters and the fake progress bar are gone; height ~72px.
 */
export const TaskCard = ({ task, col, onDragStart, onDelete, onMove, onOpen }: TaskCardProps) => {
  const pri = PRIORITY_LABELS[task.priority];
  const overdue = isOverdue(task);
  const nextStatus: Task["status"] | null =
    task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : null;
  const NextIcon = task.status === "todo" ? Play : Check;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className="relative rounded-card px-3 py-2.5 cursor-pointer group bg-card border border-border/80 hover:border-primary/40 transition-colors"
    >
      {/* priority rail — colour without an extra chip row */}
      <span
        className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full"
        style={{ backgroundColor: pri.color, opacity: 0.85 }}
        aria-hidden
      />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-2">
          <p className="ds-body font-medium text-foreground line-clamp-2 leading-snug">{task.title}</p>
          <span className="ds-caption font-medium shrink-0" style={{ color: pri.color }}>
            {pri.label}
          </span>
        </div>

        <div className="flex items-center gap-2.5 mt-1.5 min-h-[20px]">
          {task.assignee_name ? (
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-semibold text-foreground shrink-0">
                {initials(task.assignee_name)}
              </span>
              <span className="ds-caption text-muted-foreground truncate max-w-[110px]">{task.assignee_name}</span>
            </span>
          ) : (
            <span className="ds-caption text-muted-foreground/70">Atanmamış</span>
          )}
          {task.due_date && (
            <span className={`ds-caption flex items-center gap-1 shrink-0 ${overdue ? "text-rose-400" : "text-muted-foreground"}`}>
              <Calendar className="w-3 h-3" />
              {new Date(task.due_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
              {overdue && <AlertTriangle className="w-3 h-3" />}
            </span>
          )}

          {/* quick actions: one tap to advance, one to undo/delete */}
          <span className="ml-auto flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {nextStatus && (
              <button
                onClick={() => onMove(nextStatus)}
                aria-label={task.status === "todo" ? "Başlat" : "Tamamla"}
                title={task.status === "todo" ? "Başlat" : "Tamamla"}
                className="w-9 h-9 sm:w-7 sm:h-7 rounded-control flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <NextIcon className="w-3.5 h-3.5" />
              </button>
            )}
            {task.status === "done" && (
              <button
                onClick={() => onMove("todo")}
                aria-label="Geri al"
                title="Geri al"
                className="w-9 h-9 sm:w-7 sm:h-7 rounded-control flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onDelete}
              aria-label="Sil"
              title="Sil"
              className="w-9 h-9 sm:w-7 sm:h-7 rounded-control flex items-center justify-center text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100 hover:text-destructive transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
