import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  assigned_to: string | null;
  created_by: string;
  priority: "low" | "normal" | "high" | "urgent";
  due_date: string | null;
  sort_order: number;
  created_at: string;
  assignee_name?: string;
}

export function useTasks(projectId: string) {
  const { user } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (data) {
      // Get assignee names
      const assigneeIds = [...new Set(data.filter(t => t.assigned_to).map(t => t.assigned_to!))];
      let profileMap = new Map<string, string>();
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", assigneeIds);
        profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name || "Bilinmiyor"]) || []);
      }

      setTasks(data.map(t => ({
        ...t,
        status: t.status as Task["status"],
        priority: t.priority as Task["priority"],
        assignee_name: t.assigned_to ? profileMap.get(t.assigned_to) || "Bilinmiyor" : undefined,
      })));
    }
    setLoading(false);
  }, [user, projectId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = useCallback(async (title: string, opts?: {
    description?: string;
    assigned_to?: string | null;
    priority?: Task["priority"];
    due_date?: string | null;
    team_id?: string | null;
  }) => {
    if (!user) return;
    const { error } = await supabase.from("tasks").insert({
      project_id: projectId,
      title,
      description: opts?.description || "",
      assigned_to: opts?.assigned_to || null,
      created_by: user.id,
      priority: opts?.priority || "normal",
      due_date: opts?.due_date || null,
      team_id: opts?.team_id || null,
      sort_order: tasks.length,
    });
    if (error) { toast.error("Görev eklenemedi"); return; }
    toast.success("Görev eklendi");
    fetchTasks();
  }, [user, projectId, tasks.length, fetchTasks]);

  const updateTaskStatus = useCallback(async (id: string, status: Task["status"]) => {
    await supabase.from("tasks").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<Pick<Task, "title" | "description" | "assigned_to" | "priority" | "due_date" | "status">>) => {
    await supabase.from("tasks").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
    fetchTasks();
  }, [fetchTasks]);

  const deleteTask = useCallback(async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    toast.success("Görev silindi");
    fetchTasks();
  }, [fetchTasks]);

  const todoTasks = tasks.filter(t => t.status === "todo");
  const inProgressTasks = tasks.filter(t => t.status === "in_progress");
  const doneTasks = tasks.filter(t => t.status === "done");

  return {
    tasks, todoTasks, inProgressTasks, doneTasks, loading,
    addTask, updateTaskStatus, updateTask, deleteTask, refetch: fetchTasks,
  };
}
