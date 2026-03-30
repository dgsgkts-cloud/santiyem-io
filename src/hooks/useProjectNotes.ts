import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export interface ProjectNote {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export function useProjectNotes(projectId: string) {
  const { user } = useUser();
  const [notes, setNotes] = useState<ProjectNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("project_notes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setNotes((data as ProjectNote[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchNotes(); }, [user, projectId]);

  const addNote = async (content: string) => {
    if (!user || !content.trim()) return;
    const { data } = await supabase
      .from("project_notes")
      .insert({ project_id: projectId, user_id: user.id, content: content.trim() })
      .select()
      .single();
    if (data) setNotes(prev => [data as ProjectNote, ...prev]);
  };

  const deleteNote = async (noteId: string) => {
    await supabase.from("project_notes").delete().eq("id", noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  return { notes, loading, addNote, deleteNote };
}
