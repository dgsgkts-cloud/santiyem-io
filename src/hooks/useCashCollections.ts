import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface CashCollection {
  id: string;
  user_id: string;
  collection_date: string;
  sender: string;
  collection_type: string;
  project_id: string | null;
  amount: number;
  payment_type: string;
  status: string;
  description: string | null;
  account_id: string | null;
  check_no: string | null;
  check_bank: string | null;
  check_due_date: string | null;
  hakedis_id: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export const useCashCollections = () => {
  const { user } = useUser();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["cash_collections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("cash_collections" as any).select("*").order("collection_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CashCollection[];
    },
    enabled: !!user,
  });

  const addCollection = useMutation({
    mutationFn: async (collection: Partial<CashCollection>) => {
      const { error } = await supabase.from("cash_collections" as any).insert({ ...collection, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cash_collections"] }); toast.success("Tahsilat eklendi"); },
    onError: () => toast.error("Tahsilat eklenemedi"),
  });

  const updateCollection = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CashCollection> & { id: string }) => {
      const { error } = await supabase.from("cash_collections" as any).update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cash_collections"] }); toast.success("Tahsilat güncellendi"); },
    onError: () => toast.error("Güncelleme başarısız"),
  });

  const deleteCollection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cash_collections" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cash_collections"] }); toast.success("Tahsilat silindi"); },
    onError: () => toast.error("Silme başarısız"),
  });

  return { collections: query.data || [], isLoading: query.isLoading, addCollection, updateCollection, deleteCollection };
};
