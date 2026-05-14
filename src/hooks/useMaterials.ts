import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export interface Material {
  id: string;
  user_id: string;
  project_id: string;
  name: string;
  unit: string;
  min_stock: number;
  created_at: string;
  updated_at: string;
}

export interface MaterialEntry {
  id: string;
  user_id: string;
  material_id: string;
  entry_date: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  supplier: string;
  waybill_no: string | null;
  waybill_photo_url: string | null;
  note: string | null;
  created_at: string;
  source_type?: string | null;
  source_id?: string | null;
}

export interface MaterialExit {
  id: string;
  user_id: string;
  material_id: string;
  exit_date: string;
  quantity: number;
  contract_item_id: string | null;
  location: string | null;
  note: string | null;
  created_at: string;
  source_type?: string | null;
  source_id?: string | null;
}

export interface MaterialNorm {
  id: string;
  user_id: string;
  contract_item_id: string;
  material_id: string;
  norm_quantity: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

export const useMaterials = (projectId?: string) => {
  const { user } = useUser();
  const qc = useQueryClient();

  const { data: materials = [], isLoading: materialsLoading } = useQuery({
    queryKey: ["materials", projectId],
    queryFn: async () => {
      let q = supabase.from("materials" as any).select("*").order("name");
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as Material[];
    },
    enabled: !!user,
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["material_entries", projectId],
    queryFn: async () => {
      if (!materials.length) return [];
      const ids = materials.map(m => m.id);
      const { data, error } = await supabase
        .from("material_entries" as any)
        .select("*")
        .in("material_id", ids)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MaterialEntry[];
    },
    enabled: !!user && materials.length > 0,
  });

  const { data: exits = [], isLoading: exitsLoading } = useQuery({
    queryKey: ["material_exits", projectId],
    queryFn: async () => {
      if (!materials.length) return [];
      const ids = materials.map(m => m.id);
      const { data, error } = await supabase
        .from("material_exits" as any)
        .select("*")
        .in("material_id", ids)
        .order("exit_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MaterialExit[];
    },
    enabled: !!user && materials.length > 0,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["materials"] });
    qc.invalidateQueries({ queryKey: ["material_entries"] });
    qc.invalidateQueries({ queryKey: ["material_exits"] });
  };

  const addMaterial = useMutation({
    mutationFn: async (m: { project_id: string; name: string; unit: string; min_stock: number }) => {
      const { error } = await supabase.from("materials" as any).insert({ ...m, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const updateMaterial = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; unit?: string; min_stock?: number }) => {
      const { error } = await supabase.from("materials" as any).update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("materials" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const addEntry = useMutation({
    mutationFn: async (e: Omit<MaterialEntry, "id" | "created_at" | "user_id">) => {
      const { error } = await supabase.from("material_entries" as any).insert({ ...e, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("material_entries" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const addExit = useMutation({
    mutationFn: async (e: Omit<MaterialExit, "id" | "created_at" | "user_id">) => {
      const { error } = await supabase.from("material_exits" as any).insert({ ...e, user_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const deleteExit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("material_exits" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  // Computed stock per material
  const stockMap = materials.map(m => {
    const totalIn = entries.filter(e => e.material_id === m.id).reduce((s, e) => s + Number(e.quantity), 0);
    const totalOut = exits.filter(e => e.material_id === m.id).reduce((s, e) => s + Number(e.quantity), 0);
    const currentStock = totalIn - totalOut;
    const totalCost = entries.filter(e => e.material_id === m.id).reduce((s, e) => s + Number(e.total_amount), 0);
    return { ...m, totalIn, totalOut, currentStock, totalCost, belowMin: currentStock < m.min_stock && m.min_stock > 0 };
  });

  // Supplier summary
  const supplierSummary = entries.reduce((acc, e) => {
    const key = e.supplier || "Belirtilmemiş";
    if (!acc[key]) acc[key] = { supplier: key, totalAmount: 0, count: 0 };
    acc[key].totalAmount += Number(e.total_amount);
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, { supplier: string; totalAmount: number; count: number }>);

  return {
    materials, entries, exits, stockMap,
    supplierSummary: Object.values(supplierSummary).sort((a, b) => b.totalAmount - a.totalAmount),
    isLoading: materialsLoading || entriesLoading || exitsLoading,
    addMaterial, updateMaterial, deleteMaterial,
    addEntry, deleteEntry,
    addExit, deleteExit,
  };
};
