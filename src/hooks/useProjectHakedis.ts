import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface ProjectHakedis {
  id: string;
  project_id: string;
  period: string;
  amount: number;
  kdv: number;
  net: number;
  status: string;
  status_color: string;
  created_at: string;
  payment_date: string | null;
  expected_payment_date: string | null;
  reminder_days_before: number | null;
}

export function useProjectHakedis(projectId: string) {
  const { user } = useUser();
  const [hakedisler, setHakedisler] = useState<ProjectHakedis[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHakedisler = async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("project_hakedis")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    if (!error && data) setHakedisler(data as ProjectHakedis[]);
    setLoading(false);
  };

  useEffect(() => { fetchHakedisler(); }, [user, projectId]);

  const addHakedis = async (period: string, amount: number, kdvRate = 0.20) => {
    if (!user) return;
    const kdv = Math.round(amount * kdvRate * 100) / 100;
    const net = amount + kdv;
    const { error } = await supabase.from("project_hakedis").insert({
      user_id: user.id,
      project_id: projectId,
      period,
      amount,
      kdv,
      net,
      status: "Bekliyor",
      status_color: "#F59E0B",
    });
    if (error) { toast.error("Hakediş eklenemedi"); return; }
    toast.success("Hakediş eklendi");
    fetchHakedisler();
  };

  const deleteHakedis = async (id: string) => {
    const { error } = await supabase.from("project_hakedis").delete().eq("id", id);
    if (error) { toast.error("Silinemedi"); return; }
    setHakedisler(prev => prev.filter(h => h.id !== id));
    toast.success("🗑️ Hakediş silindi");
  };

  const updateHakedisStatus = async (id: string, status: string, statusColor: string, paymentDate?: string) => {
    const update: Record<string, unknown> = { status, status_color: statusColor };
    if (paymentDate) update.payment_date = paymentDate;
    if (status === "Ödendi" && !paymentDate) update.payment_date = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("project_hakedis").update(update).eq("id", id);
    if (error) { toast.error("Durum güncellenemedi"); return; }
    setHakedisler(prev => prev.map(h => h.id === id ? { ...h, status, status_color: statusColor, payment_date: (update.payment_date as string) || h.payment_date } : h));
    toast.success("Hakediş durumu güncellendi");
  };

  const setExpectedPaymentDate = async (id: string, date: string, reminderDays: number) => {
    const { error } = await supabase.from("project_hakedis").update({
      expected_payment_date: date,
      reminder_days_before: reminderDays,
    }).eq("id", id);
    if (error) { toast.error("Ödeme tarihi kaydedilemedi"); return; }
    setHakedisler(prev => prev.map(h => h.id === id ? { ...h, expected_payment_date: date, reminder_days_before: reminderDays } : h));
    toast.success("Ödeme hatırlatıcısı kuruldu 🔔");
  };

  return { hakedisler, loading, addHakedis, deleteHakedis, updateHakedisStatus, setExpectedPaymentDate, refetch: fetchHakedisler };
}

// Hook to fetch all hakedis across all projects
export function useAllHakedis() {
  const { user } = useUser();
  const [allHakedisler, setAllHakedisler] = useState<ProjectHakedis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from("project_hakedis")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setAllHakedisler(data as ProjectHakedis[]);
        setLoading(false);
      });
  }, [user]);

  return { allHakedisler, loading };
}
