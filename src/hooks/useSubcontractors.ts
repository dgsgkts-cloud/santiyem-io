import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface Subcontractor {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  specialty: string | null;
  project_id: string | null;
  contract_amount: number;
  payment_schedule: any[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubcontractorPayment {
  id: string;
  user_id: string;
  subcontractor_id: string;
  amount: number;
  payment_date: string;
  planned_date: string | null;
  description: string | null;
  receipt_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export const useSubcontractors = () => {
  const { user } = useUser();
  const qc = useQueryClient();

  const { data: subcontractors = [], isLoading } = useQuery({
    queryKey: ["subcontractors", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("subcontractors" as any).select("*").order("name");
      if (error) throw error;
      return (data || []) as unknown as Subcontractor[];
    },
    enabled: !!user,
  });

  const addSubcontractor = useMutation({
    mutationFn: async (sub: Partial<Subcontractor>) => {
      const { error } = await supabase.from("subcontractors" as any).insert({ ...sub, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subcontractors"] }); toast.success("Taşeron eklendi"); },
    onError: () => toast.error("Taşeron eklenemedi"),
  });

  const updateSubcontractor = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Subcontractor> & { id: string }) => {
      const { error } = await supabase.from("subcontractors" as any).update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subcontractors"] }); toast.success("Taşeron güncellendi"); },
    onError: () => toast.error("Güncelleme başarısız"),
  });

  const deleteSubcontractor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subcontractors" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subcontractors"] }); toast.success("Taşeron silindi"); },
    onError: () => toast.error("Silme başarısız"),
  });

  return { subcontractors, isLoading, addSubcontractor, updateSubcontractor, deleteSubcontractor };
};

export const useSubcontractorPayments = (subcontractorId?: string) => {
  const { user } = useUser();
  const qc = useQueryClient();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["subcontractor_payments", subcontractorId],
    queryFn: async () => {
      let query = supabase.from("subcontractor_payments" as any).select("*").order("payment_date", { ascending: false });
      if (subcontractorId) query = query.eq("subcontractor_id", subcontractorId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as SubcontractorPayment[];
    },
    enabled: !!user,
  });

  const addPayment = useMutation({
    mutationFn: async (payment: Partial<SubcontractorPayment>) => {
      const { error } = await supabase.from("subcontractor_payments" as any).insert({ ...payment, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subcontractor_payments"] }); toast.success("Ödeme kaydedildi"); },
    onError: () => toast.error("Ödeme eklenemedi"),
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subcontractor_payments" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subcontractor_payments"] }); toast.success("Ödeme silindi"); },
    onError: () => toast.error("Silme başarısız"),
  });

  return { payments, isLoading, addPayment, deletePayment };
};
