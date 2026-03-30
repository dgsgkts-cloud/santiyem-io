import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface UserProject {
  id: string;
  name: string;
  client: string;
  location: string;
  manager: string;
  site_responsible: string;
  description: string;
  budget: string;
  start_date: string;
  end_date: string;
  status: string;
  status_color: string;
  progress: number;
  created_at: string;
}

export function useProjects() {
  const { user } = useUser();
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setProjects(data as UserProject[]);
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, [user]);

  const addProject = async (p: Omit<UserProject, "id" | "created_at" | "progress" | "status" | "status_color">) => {
    if (!user) return null;
    const { data, error } = await supabase.from("projects").insert({
      user_id: user.id,
      name: p.name,
      client: p.client,
      location: p.location,
      manager: p.manager,
      site_responsible: p.site_responsible,
      description: p.description,
      budget: p.budget,
      start_date: p.start_date,
      end_date: p.end_date,
    }).select().single();
    if (error) { toast.error("Proje eklenemedi"); return null; }
    toast.success("Proje eklendi");
    fetchProjects();
    return data;
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { toast.error("Proje silinemedi"); return; }
    setProjects(prev => prev.filter(p => p.id !== id));
    toast.success("Proje silindi");
  };

  const updateProjectStatus = async (id: string, status: string, statusColor: string) => {
    const { error } = await supabase.from("projects").update({ status, status_color: statusColor }).eq("id", id);
    if (error) { toast.error("Durum güncellenemedi"); return; }
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status, status_color: statusColor } : p));
    toast.success("Proje durumu güncellendi");
  };

  return { projects, loading, addProject, deleteProject, updateProjectStatus, refetch: fetchProjects };
}
