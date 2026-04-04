import { useState } from "react";
import { useTasks, Task } from "@/hooks/useTasks";
import { useTeam } from "@/hooks/useTeam";
import { useUser } from "@/contexts/UserContext";
import { Plus, X, Trash2, User, Calendar, Flag, ChevronRight, GripVertical } from "lucide-react";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

const STATUS_COLS = [
  { key: "todo" as const, label: "Yapılacak", color: "#64748B", bg: "rgba(100,116,139,0.08)" },
  { key: "in_progress" as const, label: "Devam Ediyor", color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  { key: "done" as const, label: "Tamamlandı", color: "#22C55E", bg: "rgba(34,197,94,0.08)" },
];

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "Düşük", color: "#64748B" },
  normal: { label: "Normal", color: "#3B82F6" },
  high: { label: "Yüksek", color: "#F59E0B" },
  urgent: { label: "Acil", color: "#EF4444" },
};

interface TaskBoardProps {
  projectId: string;
}

const TaskBoard = ({ projectId }: TaskBoardProps) => {
  const { user } = useUser();
  const { tasks, todoTasks, inProgressTasks, doneTasks, loading, addTask, updateTaskStatus, updateTask, deleteTask } = useTasks(projectId);
  const { members, team } = useTeam();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("normal");
  const [newDueDate, setNewDueDate] = useState("");
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addTask(newTitle.trim(), {
      assigned_to: newAssignee || null,
      priority: newPriority,
      due_date: newDueDate || null,
      team_id: team?.id || null,
    });
    setNewTitle("");
    setNewAssignee("");
    setNewPriority("normal");
    setNewDueDate("");
    setShowAddForm(false);
  };

  const handleDrop = (status: Task["status"]) => {
    if (draggedTask) {
      updateTaskStatus(draggedTask, status);
      setDraggedTask(null);
    }
  };

  const tasksByStatus = { todo: todoTasks, in_progress: inProgressTasks, done: doneTasks };

  if (loading) return <p className="text-[12px]" style={{ color: "#64748B" }}>Yükleniyor...</p>;

  return (
    <div className="space-y-4">
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteTask(deleteTarget.id);
        }}
        title="Görevi Sil"
        itemName={deleteTarget?.name}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>Görevlendirme</h3>
        {user && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 rounded-lg text-[12px] font-semibold text-white"
            style={{ height: 30, backgroundColor: showAddForm ? "#EF4444" : "#FF6B2B" }}
          >
            {showAddForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showAddForm ? "İptal" : "Yeni Görev"}
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Görev başlığı"
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
            style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#F1F5F9" }}
          />
          <div className="flex flex-wrap gap-2">
            {members.length > 0 && (
              <select
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                className="rounded-lg px-2 py-1.5 text-[12px] outline-none"
                style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#94A3B8" }}
              >
                <option value="">Atanmamış</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profile?.full_name || "Bilinmiyor"}
                  </option>
                ))}
              </select>
            )}
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Task["priority"])}
              className="rounded-lg px-2 py-1.5 text-[12px] outline-none"
              style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#94A3B8" }}
            >
              <option value="low">Düşük</option>
              <option value="normal">Normal</option>
              <option value="high">Yüksek</option>
              <option value="urgent">Acil</option>
            </select>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="rounded-lg px-2 py-1.5 text-[12px] outline-none"
              style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#94A3B8" }}
            />
            <button onClick={handleAdd} className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-white" style={{ backgroundColor: "#22C55E" }}>
              Ekle
            </button>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {STATUS_COLS.map((col) => (
          <div
            key={col.key}
            className="rounded-xl p-3 min-h-[200px]"
            style={{ backgroundColor: col.bg, border: `1px solid ${col.color}20` }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.key)}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="text-[12px] font-semibold" style={{ color: col.color }}>{col.label}</span>
              <span className="text-[10px] font-mono ml-auto px-1.5 py-0.5 rounded" style={{ backgroundColor: `${col.color}15`, color: col.color }}>
                {tasksByStatus[col.key].length}
              </span>
            </div>
            <div className="space-y-2">
              {tasksByStatus[col.key].map((task) => {
                const pri = PRIORITY_LABELS[task.priority];
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => setDraggedTask(task.id)}
                    className="rounded-lg p-3 cursor-grab active:cursor-grabbing group"
                    style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-30 group-hover:opacity-60" style={{ color: "#64748B" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium mb-1" style={{ color: "#F1F5F9" }}>{task.title}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: `${pri.color}15`, color: pri.color }}>
                            <Flag className="w-2.5 h-2.5 inline mr-0.5" />{pri.label}
                          </span>
                          {task.assignee_name && (
                            <span className="text-[9px] flex items-center gap-0.5" style={{ color: "#64748B" }}>
                              <User className="w-2.5 h-2.5" />{task.assignee_name}
                            </span>
                          )}
                          {task.due_date && (
                            <span className="text-[9px] flex items-center gap-0.5" style={{ color: "#64748B" }}>
                              <Calendar className="w-2.5 h-2.5" />
                              {new Date(task.due_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setDeleteTarget({ id: task.id, name: task.title })}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                        style={{ color: "#EF4444" }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {/* Quick status change buttons */}
                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {STATUS_COLS.filter(s => s.key !== col.key).map((s) => (
                        <button
                          key={s.key}
                          onClick={() => updateTaskStatus(task.id, s.key)}
                          className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-medium transition-colors"
                          style={{ backgroundColor: `${s.color}10`, color: s.color, border: `1px solid ${s.color}30` }}
                        >
                          <ChevronRight className="w-2.5 h-2.5" />{s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {tasks.length === 0 && !showAddForm && (
        <div className="text-center py-8">
          <p className="text-[12px]" style={{ color: "#64748B" }}>Henüz görev eklenmemiş. "Yeni Görev" ile başlayın.</p>
        </div>
      )}
    </div>
  );
};

export default TaskBoard;
