import { Task } from "@/hooks/useTasks";
import { ResponsiveSheet } from "@/components/ui/responsive";
import {
  Calendar,
  Flag,
  User,
  CheckSquare,
  Paperclip,
  MessageSquare,
  Clock,
  Trash2,
} from "lucide-react";
import { STATUS_COLS, PRIORITY_LABELS } from "./useTaskBoardState";

interface Props {
  task: Task | null;
  onClose: () => void;
  onUpdateStatus: (id: string, s: Task["status"]) => void;
  onDelete: (t: Task) => void;
  setDrawerTask: (t: Task | null) => void;
}

export const TaskDrawer = ({ task, onClose, onUpdateStatus, onDelete, setDrawerTask }: Props) => {
  if (!task) {
    return <ResponsiveSheet open={false} onOpenChange={onClose}>{null}</ResponsiveSheet>;
  }
  const col = STATUS_COLS.find((c) => c.key === task.status)!;
  const pri = PRIORITY_LABELS[task.priority];

  return (
    <ResponsiveSheet
      open={!!task}
      onOpenChange={(v) => !v && onClose()}
      title={task.title}
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-fs-xs font-medium px-2 py-1 rounded-md"
            style={{ backgroundColor: `${col.color}15`, color: col.color }}
          >
            {col.label}
          </span>
          <span
            className="text-fs-xs font-medium px-2 py-1 rounded-md"
            style={{ backgroundColor: `${pri.color}15`, color: pri.color }}
          >
            <Flag className="w-3 h-3 inline mr-1" />
            {pri.label}
          </span>
        </div>
        <section>
          <div className="text-fs-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Açıklama
          </div>
          <p className="text-fs-sm text-foreground/90 whitespace-pre-wrap">
            {task.description || <span className="text-muted-foreground">Açıklama eklenmemiş.</span>}
          </p>
        </section>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-fs-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Atanan
            </div>
            <div className="text-fs-sm text-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              {task.assignee_name || "Atanmamış"}
            </div>
          </div>
          <div>
            <div className="text-fs-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Bitiş
            </div>
            <div className="text-fs-sm text-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              {task.due_date ? new Date(task.due_date).toLocaleDateString("tr-TR") : "—"}
            </div>
          </div>
        </div>
        <section>
          <div className="text-fs-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Durumu Değiştir
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_COLS.map((s) => (
              <button
                key={s.key}
                onClick={() => {
                  onUpdateStatus(task.id, s.key);
                  setDrawerTask({ ...task, status: s.key });
                }}
                className={`px-2.5 py-1 rounded-md text-fs-xs font-medium border ${
                  task.status === s.key ? "opacity-60" : ""
                }`}
                style={{
                  backgroundColor: `${s.color}10`,
                  color: s.color,
                  borderColor: `${s.color}30`,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>
        {[
          { title: "Kontrol Listesi", empty: "Henüz kontrol maddesi yok.", Icon: CheckSquare },
          { title: "Ekler", empty: "Ek dosya yok.", Icon: Paperclip },
          { title: "Yorumlar", empty: "Henüz yorum yok.", Icon: MessageSquare },
          {
            title: "Geçmiş",
            empty: `Oluşturuldu: ${new Date(task.created_at).toLocaleString("tr-TR")}`,
            Icon: Clock,
          },
        ].map((s) => (
          <section key={s.title}>
            <div className="text-fs-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
              <s.Icon className="w-3 h-3" />
              {s.title}
            </div>
            <p className="text-fs-xs text-muted-foreground">{s.empty}</p>
          </section>
        ))}
        <div className="pt-2 border-t border-border flex justify-end">
          <button
            onClick={() => onDelete(task)}
            className="flex items-center gap-1.5 text-fs-xs font-medium text-red-500 hover:bg-red-500/10 px-2 py-1 rounded-md"
          >
            <Trash2 className="w-3 h-3" /> Görevi Sil
          </button>
        </div>
      </div>
    </ResponsiveSheet>
  );
};

export default TaskDrawer;
