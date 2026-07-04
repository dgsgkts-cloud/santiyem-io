import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MemoryType =
  | "company" | "project" | "personnel" | "supplier" | "decision" | "preference" | "other";

export interface CompanyMemory {
  id: string;
  type: MemoryType;
  title: string | null;
  content: string;
  metadata: Record<string, unknown>;
  source: string;
  confidence: number;
  pinned: boolean;
  updated_at: string;
  created_at?: string;
  similarity?: number;
}

async function call(action: string, body: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("company-memory", {
    body: { action, ...body },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

export function useCompanyMemory() {
  const [memories, setMemories] = useState<CompanyMemory[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call("list");
      setMemories((data?.memories ?? []) as CompanyMemory[]);
    } catch (e) {
      console.error("[memory] list failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const upsert = useCallback(async (payload: Partial<CompanyMemory> & { content: string }) => {
    try {
      const data = await call("upsert", payload as any);
      toast.success("Hafızaya kaydedildi");
      await refresh();
      return data?.memory as CompanyMemory;
    } catch (e) {
      toast.error("Kaydedilemedi");
      throw e;
    }
  }, [refresh]);

  const update = useCallback(async (id: string, patch: Partial<CompanyMemory>) => {
    try {
      const data = await call("update", { id, ...patch });
      toast.success("Güncellendi");
      await refresh();
      return data?.memory as CompanyMemory;
    } catch (e) {
      toast.error("Güncellenemedi");
      throw e;
    }
  }, [refresh]);

  const pin = useCallback(async (id: string, pinned: boolean) => {
    await call("pin", { id, pinned });
    await refresh();
  }, [refresh]);

  const forget = useCallback(async (id: string) => {
    try {
      await call("delete", { id });
      toast.success("Unutuldu");
      await refresh();
    } catch (e) {
      toast.error("Silinemedi");
    }
  }, [refresh]);

  const search = useCallback(async (query: string, type?: MemoryType) => {
    const data = await call("search", { query, type });
    return (data?.memories ?? []) as CompanyMemory[];
  }, []);

  return { memories, loading, refresh, upsert, update, pin, forget, search };
}
