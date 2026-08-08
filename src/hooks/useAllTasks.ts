// Şirket geneli görev merkezi için veri katmanı.
// Yeni tablo YOK — mevcut `tasks` tablosu ve RLS'i kullanılır; proje adı ve
// sorumlu kişi adı mevcut `projects` / `profiles` kayıtlarından zenginleştirilir.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import type { Task } from "./useTasks";

export interface CompanyTask extends Task {
  project_name?: string;
}

export function useAllTasks() {
  const { user } = useUser();
  const [tasks, setTasks] = useState<CompanyTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (error || !data) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const projectIds = [...new Set(data.map((t) => t.project_id).filter(Boolean))];
    const assigneeIds = [...new Set(data.filter((t) => t.assigned_to).map((t) => t.assigned_to!))];

    const [projectsRes, profilesRes] = await Promise.all([
      projectIds.length
        ? supabase.from("projects").select("id, name").in("id", projectIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      assigneeIds.length
        ? supabase.from("profiles").select("user_id, full_name").in("user_id", assigneeIds)
        : Promise.resolve({ data: [] as { user_id: string; full_name: string | null }[] }),
    ]);

    const projectMap = new Map((projectsRes.data || []).map((p: any) => [p.id, p.name]));
    const profileMap = new Map(
      (profilesRes.data || []).map((p: any) => [p.user_id, p.full_name || "Bilinmiyor"]),
    );

    setTasks(
      data.map((t: any) => ({
        ...t,
        status: t.status as Task["status"],
        priority: t.priority as Task["priority"],
        assignee_name: t.assigned_to ? profileMap.get(t.assigned_to) || "Bilinmiyor" : undefined,
        project_name: projectMap.get(t.project_id) || undefined,
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const updateTaskStatus = useCallback(async (id: string, status: Task["status"]) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    const { error } = await supabase
      .from("tasks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Görev durumu güncellenemedi");
      fetchTasks();
    }
  }, [fetchTasks]);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      toast.error("Görev silinemedi");
      return;
    }
    toast.success("Görev silindi");
    fetchTasks();
  }, [fetchTasks]);

  const summary = useMemo(() => {
    const now = new Date();
    const today = new Date(now.toDateString());
    const isSameDay = (d?: string | null) =>
      !!d && new Date(d).toDateString() === now.toDateString();
    return {
      open: tasks.filter((t) => t.status !== "done").length,
      today: tasks.filter((t) => t.status !== "done" && isSameDay(t.due_date)).length,
      overdue: tasks.filter(
        (t) => t.status !== "done" && !!t.due_date && new Date(t.due_date) < today,
      ).length,
      done: tasks.filter((t) => t.status === "done").length,
    };
  }, [tasks]);

  return { tasks, loading, summary, refetch: fetchTasks, updateTaskStatus, deleteTask };
}
