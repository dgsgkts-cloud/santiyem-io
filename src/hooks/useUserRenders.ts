import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export interface SavedRender {
  id: string;
  prompt: string;
  result_image_url: string | null;
  result_text: string | null;
  created_at: string;
}

export function useUserRenders() {
  const { user } = useUser();
  const [renders, setRenders] = useState<SavedRender[]>([]);

  const loadRenders = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_renders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setRenders(data as SavedRender[]);
  }, [user]);

  useEffect(() => { loadRenders(); }, [loadRenders]);

  const saveRender = useCallback(async (prompt: string, result_image_url: string | null, result_text: string | null) => {
    if (!user) return;
    await supabase.from("user_renders").insert({
      user_id: user.id,
      prompt,
      result_image_url,
      result_text,
    });
    loadRenders();
  }, [user, loadRenders]);

  return { renders, saveRender, loadRenders };
}
