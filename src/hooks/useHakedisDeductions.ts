import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface HakedisDeduction {
  id: string;
  hakedis_id: string;
  user_id: string;
  deduction_type: string;
  label: string;
  rate: number;
  amount: number;
  sort_order: number;
  created_at: string;
}

export function useHakedisDeductions(hakedisId: string | null) {
  const { user } = useUser();
  const [deductions, setDeductions] = useState<HakedisDeduction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDeductions = useCallback(async () => {
    if (!hakedisId || !user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("hakedis_deductions")
      .select("*")
      .eq("hakedis_id", hakedisId)
      .order("sort_order", { ascending: true });
    if (!error && data) setDeductions(data);
    setLoading(false);
  }, [hakedisId, user]);

  useEffect(() => { fetchDeductions(); }, [fetchDeductions]);

  const addDeduction = async (d: Partial<HakedisDeduction>) => {
    if (!hakedisId || !user) return;
    const { error } = await (supabase as any).from("hakedis_deductions").insert({
      hakedis_id: hakedisId,
      user_id: user.id,
      deduction_type: d.deduction_type || "diger",
      label: d.label || "",
      rate: d.rate || 0,
      amount: d.amount || 0,
      sort_order: deductions.length,
    });
    if (error) { toast.error("Kesinti eklenemedi"); console.error(error); }
    else { await fetchDeductions(); }
  };

  const deleteDeduction = async (id: string) => {
    const { error } = await (supabase as any).from("hakedis_deductions").delete().eq("id", id);
    if (error) { toast.error("Silinemedi"); }
    else { setDeductions(prev => prev.filter(d => d.id !== id)); }
  };

  const totalDeductions = deductions.reduce((s, d) => s + Number(d.amount || 0), 0);

  return { deductions, loading, addDeduction, deleteDeduction, totalDeductions, refetch: fetchDeductions };
}
