import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface Contract {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  counterparty: string;
  amount: number;
  start_date: string | null;
  end_date: string | null;
  contract_type: string;
  notes: string;
  ai_analysis: any | null;
  payment_schedule: any[];
  file_url: string | null;
  file_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ContractInput {
  name: string;
  project_id?: string;
  counterparty: string;
  amount: number;
  start_date?: string;
  end_date?: string;
  contract_type: string;
  notes?: string;
  file_url?: string;
  file_name?: string;
  ai_analysis?: any;
  payment_schedule?: any[];
}

export function useContracts() {
  const { user } = useUser();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContracts = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("contracts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { console.error(error); toast.error("Sözleşmeler yüklenemedi."); }
    else setContracts(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const addContract = async (input: ContractInput) => {
    if (!user) return null;
    const payload: Record<string, any> = { ...input, user_id: user.id };
    // Remove empty strings for nullable columns
    for (const key of ["project_id", "start_date", "end_date", "file_url", "file_name", "notes"]) {
      if (payload[key] === "") payload[key] = null;
    }
    const { data, error } = await (supabase as any)
      .from("contracts")
      .insert(payload)
      .select()
      .single();
    if (error) { toast.error("Sözleşme eklenemedi."); return null; }
    toast.success("Sözleşme eklendi.");
    await fetchContracts();
    return data;
  };

  const updateContract = async (id: string, updates: Partial<ContractInput>) => {
    const { error } = await (supabase as any)
      .from("contracts")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error("Sözleşme güncellenemedi."); return false; }
    toast.success("Sözleşme güncellendi.");
    await fetchContracts();
    return true;
  };

  const deleteContract = async (id: string) => {
    const { error } = await (supabase as any)
      .from("contracts")
      .delete()
      .eq("id", id);
    if (error) { toast.error("Sözleşme silinemedi."); return false; }
    toast.success("Sözleşme silindi.");
    await fetchContracts();
    return true;
  };

  // Compute stats
  const now = new Date();
  const stats = {
    total: contracts.length,
    active: contracts.filter(c => {
      if (!c.end_date) return true;
      return new Date(c.end_date) >= now;
    }).length,
    expiringSoon: contracts.filter(c => {
      if (!c.end_date) return false;
      const end = new Date(c.end_date);
      const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff > 0 && diff <= 30;
    }).length,
    expired: contracts.filter(c => {
      if (!c.end_date) return false;
      return new Date(c.end_date) < now;
    }).length,
  };

  return { contracts, loading, stats, addContract, updateContract, deleteContract, refetch: fetchContracts };
}
