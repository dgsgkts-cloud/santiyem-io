import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface HakedisItem {
  id: string;
  hakedis_id: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sort_order: number;
}

export function useHakedisItems(hakedisId: string | null) {
  const { user } = useUser();
  const [items, setItems] = useState<HakedisItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = async () => {
    if (!user || !hakedisId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("hakedis_items")
      .select("*")
      .eq("hakedis_id", hakedisId)
      .order("sort_order", { ascending: true });
    if (!error && data) setItems(data as HakedisItem[]);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [user, hakedisId]);

  const addItem = async (item: { description: string; unit: string; quantity: number; unit_price: number }) => {
    if (!user || !hakedisId) return;
    const total_price = Math.round(item.quantity * item.unit_price * 100) / 100;
    const { error } = await supabase.from("hakedis_items").insert({
      hakedis_id: hakedisId,
      user_id: user.id,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price,
      sort_order: items.length,
    });
    if (error) { toast.error("İş kalemi eklenemedi"); return; }
    toast.success("İş kalemi eklendi");
    fetchItems();
  };

  const updateItem = async (id: string, updates: Partial<Pick<HakedisItem, "description" | "unit" | "quantity" | "unit_price">>) => {
    if (!user) return;
    const existing = items.find(i => i.id === id);
    if (!existing) return;
    const quantity = updates.quantity ?? existing.quantity;
    const unit_price = updates.unit_price ?? existing.unit_price;
    const total_price = Math.round(quantity * unit_price * 100) / 100;
    const { error } = await supabase.from("hakedis_items").update({ ...updates, total_price }).eq("id", id);
    if (error) { toast.error("Güncellenemedi"); return; }
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("hakedis_items").delete().eq("id", id);
    if (error) { toast.error("Silinemedi"); return; }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const reorderItems = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setItems(reordered);
    const updates = reordered.map((item, i) =>
      supabase.from("hakedis_items").update({ sort_order: i }).eq("id", item.id)
    );
    await Promise.all(updates);
  };

  return { items, loading, addItem, updateItem, deleteItem, reorderItems, refetch: fetchItems };
}
