import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  milestone_date: string;
  completed: boolean;
  sort_order: number;
}

export function useProjectMilestones(projectId: string, defaultMilestones?: { title: string; date: string; completed: boolean }[]) {
  const { user } = useUser();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchMilestones = async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("project_milestones")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });

    if (!error && data) {
      if (data.length === 0 && defaultMilestones && !initialized) {
        // Seed defaults on first load
        setInitialized(true);
        const inserts = defaultMilestones.map((m, i) => ({
          user_id: user.id,
          project_id: projectId,
          title: m.title,
          milestone_date: m.date,
          completed: m.completed,
          sort_order: i,
        }));
        const { data: seeded, error: seedErr } = await supabase
          .from("project_milestones")
          .insert(inserts)
          .select();
        if (!seedErr && seeded) setMilestones(seeded as Milestone[]);
      } else {
        setMilestones(data as Milestone[]);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchMilestones(); }, [user, projectId]);

  const toggleCompleted = async (id: string) => {
    const m = milestones.find(x => x.id === id);
    if (!m) return;
    const newVal = !m.completed;
    setMilestones(prev => prev.map(x => x.id === id ? { ...x, completed: newVal } : x));
    await supabase.from("project_milestones").update({ completed: newVal }).eq("id", id);
  };

  const addMilestone = async (title: string, date: string) => {
    if (!user) return;
    const maxOrder = milestones.length > 0 ? Math.max(...milestones.map(m => m.sort_order)) + 1 : 0;
    const { error } = await supabase.from("project_milestones").insert({
      user_id: user.id,
      project_id: projectId,
      title,
      milestone_date: date,
      sort_order: maxOrder,
    });
    if (error) { toast.error("Eklenemedi"); return; }
    toast.success("Kilometre taşı eklendi");
    fetchMilestones();
  };

  const deleteMilestone = async (id: string) => {
    const { error } = await supabase.from("project_milestones").delete().eq("id", id);
    if (error) { toast.error("Silinemedi"); return; }
    setMilestones(prev => prev.filter(m => m.id !== id));
  };

  const progress = milestones.length > 0
    ? Math.round((milestones.filter(m => m.completed).length / milestones.length) * 100)
    : 0;

  return { milestones, loading, progress, toggleCompleted, addMilestone, deleteMilestone, refetch: fetchMilestones };
}
