import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface CashAccount {
  id: string;
  user_id: string;
  name: string;
  account_type: string;
  balance: number;
  bank_name: string | null;
  iban: string | null;
  account_no: string | null;
  branch: string | null;
  created_at: string;
  updated_at: string;
}

export const useCashAccounts = () => {
  const { user } = useUser();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["cash_accounts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cash_accounts" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CashAccount[];
    },
    enabled: !!user,
  });

  const addAccount = useMutation({
    mutationFn: async (account: Partial<CashAccount>) => {
      const { error } = await supabase.from("cash_accounts" as any).insert({ ...account, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cash_accounts"] }); toast.success("Hesap eklendi"); },
    onError: () => toast.error("Hesap eklenemedi"),
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CashAccount> & { id: string }) => {
      const { error } = await supabase.from("cash_accounts" as any).update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cash_accounts"] }); toast.success("Hesap güncellendi"); },
    onError: () => toast.error("Güncelleme başarısız"),
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cash_accounts" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cash_accounts"] }); toast.success("Hesap silindi"); },
    onError: () => toast.error("Silme başarısız"),
  });

  return { accounts: query.data || [], isLoading: query.isLoading, addAccount, updateAccount, deleteAccount };
};
