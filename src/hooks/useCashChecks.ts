import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface CashCheck {
  id: string;
  user_id: string;
  check_type: string;
  check_no: string;
  bank_name: string;
  branch: string | null;
  account_no: string | null;
  counterparty: string;
  amount: number;
  due_date: string;
  project_id: string | null;
  status: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useCashChecks = () => {
  const { user } = useUser();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["cash_checks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cash_checks" as any).select("*").order("due_date", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as CashCheck[];
    },
    enabled: !!user,
  });

  const addCheck = useMutation({
    mutationFn: async (check: Partial<CashCheck>) => {
      const { error } = await supabase.from("cash_checks" as any).insert({ ...check, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cash_checks"] }); toast.success("Çek eklendi"); },
    onError: () => toast.error("Çek eklenemedi"),
  });

  const updateCheck = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CashCheck> & { id: string }) => {
      const { error } = await supabase.from("cash_checks" as any).update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cash_checks"] }); toast.success("Çek güncellendi"); },
    onError: () => toast.error("Güncelleme başarısız"),
  });

  const deleteCheck = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cash_checks" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cash_checks"] }); toast.success("Çek silindi"); },
    onError: () => toast.error("Silme başarısız"),
  });

  return { checks: query.data || [], isLoading: query.isLoading, addCheck, updateCheck, deleteCheck };
};
