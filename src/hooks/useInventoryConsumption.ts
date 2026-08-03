// DEPO — tek kanonik tüketim kaynağı.
//
// public.inventory_consumption görünümü yalnızca gerçek operasyonel kullanımı
// (project_issue / consumption) döner. Transfer, sayım düzeltmesi, zimmet,
// iade, hurda ve ters kayıtlar görünümün dışındadır.
//
// AI tahmini, aylık tüketim trendi, stok-gün hesabı, analitik, CEO Mode ve
// Voice AI bu hook'u kullanır — hiçbir bileşen tüketimi kendi başına hesaplamaz.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import type { ConsumptionEvent } from "@/lib/inventory/consumption";

const db = supabase as any;

export const useInventoryConsumption = (projectId?: string) => {
  const { user } = useUser();

  const { data, isLoading, error } = useQuery({
    queryKey: ["inventory_consumption", projectId ?? null],
    queryFn: async (): Promise<ConsumptionEvent[]> => {
      let q = db
        .from("inventory_consumption")
        .select("*")
        .order("movement_date", { ascending: false })
        .limit(4000);
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ConsumptionEvent[];
    },
    enabled: !!user,
  });

  return { consumption: data ?? [], isLoading, error };
};
