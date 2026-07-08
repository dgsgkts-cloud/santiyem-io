import { useMemo, useState } from "react";
import { useTasks, Task } from "@/hooks/useTasks";
import { useTeam } from "@/hooks/useTeam";
import { useUser } from "@/contexts/UserContext";

export const STATUS_COLS = [
  { key: "todo" as const, label: "Yapılacak", color: "#64748B", bg: "rgba(100,116,139,0.08)" },
  { key: "in_progress" as const, label: "Devam Ediyor", color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  { key: "done" as const, label: "Tamamlandı", color: "#22C55E", bg: "rgba(34,197,94,0.08)" },
];

export const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "Düşük", color: "#64748B" },
  normal: { label: "Normal", color: "#3B82F6" },
  high: { label: "Yüksek", color: "#F59E0B" },
  urgent: { label: "Acil", color: "#EF4444" },
};

export const PAGE_SIZE = 10;

export const isToday = (d?: string | null) => {
  if (!d) return false;
  const x = new Date(d),
    n = new Date();
  return (
    x.getFullYear() === n.getFullYear() &&
    x.getMonth() === n.getMonth() &&
    x.getDate() === n.getDate()
  );
};

export const isOverdue = (t: Task) =>
  t.status !== "done" && !!t.due_date && new Date(t.due_date) < new Date(new Date().toDateString());

export const initials = (name?: string) =>
  (name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export type ViewKey = "kanban" | "list" | "calendar" | "timeline";

export function useTaskBoardState(projectId: string) {
  const { user } = useUser();
  const tasksApi = useTasks(projectId);
  const teamApi = useTeam();

  const [view, setView] = useState<ViewKey>("kanban");
  const [collapsed, setCollapsed] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [query, setQuery] = useState("");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fPriority, setFPriority] = useState<string>("all");
  const [fAssignee, setFAssignee] = useState<string>("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyToday, setOnlyToday] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [visibleCount, setVisibleCount] = useState<Record<string, number>>({
    todo: PAGE_SIZE,
    in_progress: PAGE_SIZE,
    done: PAGE_SIZE,
  });
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [drawerTask, setDrawerTask] = useState<Task | null>(null);

  const filtered = useMemo(() => {
    return tasksApi.tasks.filter((t) => {
      if (query && !t.title.toLowerCase().includes(query.toLowerCase())) return false;
      if (fStatus !== "all" && t.status !== fStatus) return false;
      if (fPriority !== "all" && t.priority !== fPriority) return false;
      if (fAssignee !== "all" && t.assigned_to !== fAssignee) return false;
      if (onlyMine && user && t.assigned_to !== user.id) return false;
      if (onlyToday && !isToday(t.due_date)) return false;
      if (onlyOverdue && !isOverdue(t)) return false;
      return true;
    });
  }, [tasksApi.tasks, query, fStatus, fPriority, fAssignee, onlyMine, onlyToday, onlyOverdue, user]);

  const grouped = {
    todo: filtered.filter((t) => t.status === "todo"),
    in_progress: filtered.filter((t) => t.status === "in_progress"),
    done: filtered.filter((t) => t.status === "done"),
  };

  const summary = useMemo(() => {
    const tasks = tasksApi.tasks;
    const total = tasks.length;
    const dueToday = tasks.filter((t) => isToday(t.due_date) && t.status !== "done").length;
    const overdue = tasks.filter(isOverdue).length;
    const high = tasks.filter(
      (t) => (t.priority === "high" || t.priority === "urgent") && t.status !== "done",
    ).length;
    const unassigned = tasks.filter((t) => !t.assigned_to && t.status !== "done").length;
    return { total, dueToday, overdue, high, unassigned };
  }, [tasksApi.tasks]);

  const insights = useMemo(() => {
    const out: string[] = [];
    if (summary.overdue > 0) out.push(`${summary.overdue} görev son teslim tarihini geçti.`);
    if (summary.dueToday > 0) out.push(`Bugün tamamlanması gereken ${summary.dueToday} görev var.`);
    if (summary.high > 0) out.push(`${summary.high} yüksek öncelikli görev bekliyor.`);
    if (summary.unassigned > 0) out.push(`${summary.unassigned} görev henüz atanmamış.`);
    if (out.length === 0 && summary.total > 0) out.push("Görevler planlandığı gibi ilerliyor.");
    return out.slice(0, 4);
  }, [summary]);

  const filtersActive =
    !!query ||
    fStatus !== "all" ||
    fPriority !== "all" ||
    fAssignee !== "all" ||
    onlyMine ||
    onlyToday ||
    onlyOverdue;

  const clearFilters = () => {
    setQuery("");
    setFStatus("all");
    setFPriority("all");
    setFAssignee("all");
    setOnlyMine(false);
    setOnlyToday(false);
    setOnlyOverdue(false);
  };

  const bumpVisible = (key: string) =>
    setVisibleCount((v) => ({ ...v, [key]: v[key] + PAGE_SIZE }));

  return {
    user,
    ...tasksApi,
    ...teamApi,
    view,
    setView,
    collapsed,
    setCollapsed,
    showAddForm,
    setShowAddForm,
    query,
    setQuery,
    fStatus,
    setFStatus,
    fPriority,
    setFPriority,
    fAssignee,
    setFAssignee,
    onlyMine,
    setOnlyMine,
    onlyToday,
    setOnlyToday,
    onlyOverdue,
    setOnlyOverdue,
    visibleCount,
    bumpVisible,
    draggedTask,
    setDraggedTask,
    deleteTarget,
    setDeleteTarget,
    drawerTask,
    setDrawerTask,
    filtered,
    grouped,
    summary,
    insights,
    filtersActive,
    clearFilters,
  };
}
