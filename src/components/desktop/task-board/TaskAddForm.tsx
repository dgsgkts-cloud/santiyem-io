import { useState } from "react";
import { Task } from "@/hooks/useTasks";

interface Props {
  members: { user_id: string; profile?: { full_name: string | null } }[];
  onAdd: (title: string, opts: {
    assigned_to: string | null;
    priority: Task["priority"];
    due_date: string | null;
  }) => void;
  onClose: () => void;
}

export const TaskAddForm = ({ members, onAdd, onClose }: Props) => {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("normal");
  const [due, setDue] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), {
      assigned_to: assignee || null,
      priority,
      due_date: due || null,
    });
    setTitle("");
    setAssignee("");
    setPriority("normal");
    setDue("");
    onClose();
  };

  const selCls =
    "rounded-lg px-2 py-1.5 text-fs-xs outline-none text-muted-foreground border border-border bg-card";

  return (
    <div className="rounded-lg p-3 space-y-2 bg-background border border-border">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Görev başlığı"
        className="w-full rounded-lg px-3 py-2 text-fs-sm outline-none border border-border bg-card"
      />
      <div className="flex flex-wrap gap-2">
        {members.length > 0 && (
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={selCls}>
            <option value="">Atanmamış</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.profile?.full_name || "Bilinmiyor"}
              </option>
            ))}
          </select>
        )}
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Task["priority"])}
          className={selCls}
        >
          <option value="low">Düşük</option>
          <option value="normal">Normal</option>
          <option value="high">Yüksek</option>
          <option value="urgent">Acil</option>
        </select>
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className={selCls}
        />
        <button
          onClick={submit}
          className="px-4 py-1.5 rounded-lg text-fs-xs font-semibold text-white"
          style={{ backgroundColor: "#22C55E" }}
        >
          Ekle
        </button>
      </div>
    </div>
  );
};

export default TaskAddForm;
