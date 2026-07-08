import {
  Calendar,
  Flag,
  ChevronRight,
  GripVertical,
  AlertTriangle,
  Paperclip,
  MessageSquare,
  CheckSquare,
  Trash2,
} from "lucide-react";
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

export const TaskCard = ({ task, col, onDragStart, onDelete, onMove, onOpen }: TaskCardProps) => {
  const pri = PRIORITY_LABELS[task.priority];
  const overdue = isOverdue(task);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className="rounded-lg p-3 cursor-pointer group bg-card border border-border hover:border-[#FF6B2B]/40 transition-colors"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-30 group-hover:opacity-60 text-muted-foreground cursor-grab" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-fs-xs font-medium text-foreground line-clamp-2">{task.title}</p>
            <span
              className="text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0"
              style={{ backgroundColor: `${pri.color}15`, color: pri.color }}
            >
              <Flag className="w-2.5 h-2.5 inline mr-0.5" />
              {pri.label}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {task.assignee_name && (
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-semibold text-foreground">
                  {initials(task.assignee_name)}
                </div>
                <span className="text-fs-xs text-muted-foreground truncate max-w-[80px]">
                  {task.assignee_name}
                </span>
              </div>
            )}
            {task.due_date && (
              <span
                className={`text-fs-xs flex items-center gap-0.5 ${
                  overdue ? "text-red-500" : "text-muted-foreground"
                }`}
              >
                <Calendar className="w-2.5 h-2.5" />
                {new Date(task.due_date).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "short",
                })}
                {overdue && <AlertTriangle className="w-2.5 h-2.5 ml-0.5" />}
              </span>
            )}
            <span className="text-fs-xs flex items-center gap-0.5 text-muted-foreground opacity-60">
              <Paperclip className="w-2.5 h-2.5" />0
            </span>
            <span className="text-fs-xs flex items-center gap-0.5 text-muted-foreground opacity-60">
              <MessageSquare className="w-2.5 h-2.5" />0
            </span>
            <span className="text-fs-xs flex items-center gap-0.5 text-muted-foreground opacity-60">
              <CheckSquare className="w-2.5 h-2.5" />0/0
            </span>
          </div>
          <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${task.status === "done" ? 100 : task.status === "in_progress" ? 50 : 0}%`,
                backgroundColor: col.color,
              }}
            />
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity text-red-500"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <div
        className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        {STATUS_COLS.filter((s) => s.key !== col.key).map((s) => (
          <button
            key={s.key}
            onClick={() => onMove(s.key)}
            className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-medium"
            style={{
              backgroundColor: `${s.color}10`,
              color: s.color,
              border: `1px solid ${s.color}30`,
            }}
          >
            <ChevronRight className="w-2.5 h-2.5" />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TaskCard;
