import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface ContractItem {
  id: string;
  contract_id: string;
  user_id: string;
  poz_no: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ContractItemInsert = Omit<ContractItem, "id" | "created_at" | "updated_at">;

const UNITS = ["m³", "m²", "m", "adet", "ton", "kg", "ls"] as const;
export { UNITS };

export function useContractItems(contractId: string | undefined) {
  const { user } = useUser();
  const [items, setItems] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!contractId || !user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("contract_items")
      .select("*")
      .eq("contract_id", contractId)
      .order("sort_order", { ascending: true });
    if (error) {
      console.error("contract_items fetch error:", error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }, [contractId, user]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const addItem = async (item: Partial<ContractItemInsert>) => {
    if (!contractId || !user) return;
    const total = (item.quantity || 0) * (item.unit_price || 0);
    const { error } = await (supabase as any).from("contract_items").insert({
      contract_id: contractId,
      user_id: user.id,
      poz_no: item.poz_no || "",
      description: item.description || "",
      unit: item.unit || "adet",
      quantity: item.quantity || 0,
      unit_price: item.unit_price || 0,
      total_price: total,
      sort_order: items.length,
    });
    if (error) { toast.error("Kalem eklenemedi"); console.error(error); }
    else { toast.success("İş kalemi eklendi"); await fetchItems(); }
  };

  const updateItem = async (id: string, updates: Partial<ContractItem>) => {
    if (updates.quantity !== undefined || updates.unit_price !== undefined) {
      const existing = items.find(i => i.id === id);
      const qty = updates.quantity ?? existing?.quantity ?? 0;
      const price = updates.unit_price ?? existing?.unit_price ?? 0;
      updates.total_price = qty * price;
    }
    const { error } = await (supabase as any).from("contract_items").update(updates).eq("id", id);
    if (error) { toast.error("Güncelleme başarısız"); console.error(error); }
    else { await fetchItems(); }
  };

  const deleteItem = async (id: string) => {
    const { error } = await (supabase as any).from("contract_items").delete().eq("id", id);
    if (error) { toast.error("Silinemedi"); console.error(error); }
    else { toast.success("Kalem silindi"); await fetchItems(); }
  };

  const bulkInsert = async (rows: Partial<ContractItemInsert>[]) => {
    if (!contractId || !user) return;
    const records = rows.map((r, i) => ({
      contract_id: contractId,
      user_id: user.id,
      poz_no: r.poz_no || "",
      description: r.description || "",
      unit: r.unit || "adet",
      quantity: r.quantity || 0,
      unit_price: r.unit_price || 0,
      total_price: (r.quantity || 0) * (r.unit_price || 0),
      sort_order: items.length + i,
    }));
    const { error } = await (supabase as any).from("contract_items").insert(records);
    if (error) { toast.error("Toplu ekleme başarısız"); console.error(error); }
    else { toast.success(`${records.length} kalem eklendi`); await fetchItems(); }
  };

  const grandTotal = items.reduce((s, i) => s + Number(i.total_price || 0), 0);

  return { items, loading, addItem, updateItem, deleteItem, bulkInsert, grandTotal, refetch: fetchItems };
}
