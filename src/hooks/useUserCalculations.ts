import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export interface SavedCalculation {
  id: string;
  calc_type: string;
  calc_title: string;
  input_data: Record<string, any>;
  result_data: Record<string, any>;
  created_at: string;
}

export function useUserCalculations() {
  const { user } = useUser();
  const [calculations, setCalculations] = useState<SavedCalculation[]>([]);

  const loadCalculations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_calculations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setCalculations(data as SavedCalculation[]);
  }, [user]);

  useEffect(() => { loadCalculations(); }, [loadCalculations]);

  const saveCalculation = useCallback(async (calc_type: string, calc_title: string, input_data: Record<string, any>, result_data: Record<string, any>) => {
    if (!user) return;
    await supabase.from("user_calculations").insert({
      user_id: user.id,
      calc_type,
      calc_title,
      input_data,
      result_data,
    });
    loadCalculations();
  }, [user, loadCalculations]);

  return { calculations, saveCalculation, loadCalculations };
}
