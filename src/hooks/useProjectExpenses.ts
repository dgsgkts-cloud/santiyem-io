import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export interface ProjectExpense {
  id: string;
  project_id: string;
  user_id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  has_invoice: boolean;
  invoice_no: string | null;
  invoice_url: string | null;
  note: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export const useProjectExpenses = (projectId?: string) => {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["project_expenses", projectId],
    queryFn: async () => {
      let query = supabase.from("project_expenses" as any).select("*").order("expense_date", { ascending: false });
      if (projectId) query = query.eq("project_id", projectId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ProjectExpense[];
    },
    enabled: !!user,
  });

  const addExpense = useMutation({
    mutationFn: async (expense: Omit<ProjectExpense, "id" | "created_at" | "updated_at">) => {
      const { error } = await supabase.from("project_expenses" as any).insert(expense as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project_expenses"] }),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_expenses" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project_expenses"] }),
  });

  return { expenses, isLoading, addExpense, deleteExpense };
};
