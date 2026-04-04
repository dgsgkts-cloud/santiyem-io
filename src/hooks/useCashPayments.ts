import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface CashPayment {
  id: string;
  user_id: string;
  payment_date: string;
  recipient: string;
  category: string;
  project_id: string | null;
  amount: number;
  payment_type: string;
  status: string;
  description: string | null;
  account_id: string | null;
  check_no: string | null;
  check_bank: string | null;
  check_due_date: string | null;
  iban: string | null;
  bank_name: string | null;
  invoice_url: string | null;
  is_recurring: boolean;
  recurring_interval: string | null;
  created_at: string;
  updated_at: string;
}

export const useCashPayments = () => {
  const { user } = useUser();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["cash_payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cash_payments" as any).select("*").order("payment_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CashPayment[];
    },
    enabled: !!user,
  });

  const addPayment = useMutation({
    mutationFn: async (payment: Partial<CashPayment>) => {
      const { error } = await supabase.from("cash_payments" as any).insert({ ...payment, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cash_payments"] }); toast.success("Ödeme eklendi"); },
    onError: () => toast.error("Ödeme eklenemedi"),
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CashPayment> & { id: string }) => {
      const { error } = await supabase.from("cash_payments" as any).update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cash_payments"] }); toast.success("Ödeme güncellendi"); },
    onError: () => toast.error("Güncelleme başarısız"),
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cash_payments" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cash_payments"] }); toast.success("Ödeme silindi"); },
    onError: () => toast.error("Silme başarısız"),
  });

  return { payments: query.data || [], isLoading: query.isLoading, addPayment, updatePayment, deletePayment };
};
