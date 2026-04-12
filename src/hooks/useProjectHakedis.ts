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
  gross_total: number;
  deductions_total: number;
  net_total: number;
  contract_id: string | null;
  approval_status: string;
  approval_token: string | null;
  approval_sent_at: string | null;
  approved_at: string | null;
  client_email: string | null;
  client_note: string | null;
  revision_count: number;
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

  const sendForApproval = async (hakedisId: string, clientEmail: string, projectName: string) => {
    if (!user) return false;
    const h = hakedisler.find(x => x.id === hakedisId);
    if (!h) return false;
    
    // Update hakedis with approval info
    const { error } = await supabase.from("project_hakedis").update({
      approval_status: "onay_bekliyor",
      approval_sent_at: new Date().toISOString(),
      client_email: clientEmail,
      status: "Gönderildi",
      status_color: "#3B82F6",
    }).eq("id", hakedisId);
    if (error) { toast.error("Gönderim hatası"); return false; }

    // Save revision snapshot
    await supabase.from("hakedis_revisions" as any).insert({
      hakedis_id: hakedisId,
      user_id: user.id,
      revision_number: (h.revision_count || 0) + 1,
      snapshot: { amount: h.amount, net: h.net, net_total: h.net_total, gross_total: h.gross_total, deductions_total: h.deductions_total, period: h.period },
      note: "Müşteriye onay için gönderildi",
    } as any);

    // Get the base URL
    const baseUrl = window.location.origin;
    const approvalUrl = `${baseUrl}/hakedis-onay/${h.approval_token}`;

    // Get company profile for sender name
    const { getCompanyProfile } = await import("@/lib/companyProfile");
    const company = getCompanyProfile();
    const senderName = company.companyName || user.email || "Şantiyem";

    // Send email
    const fmt = (n: number) => n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "hakedis-approval-request",
        recipientEmail: clientEmail,
        idempotencyKey: `hakedis-approval-${hakedisId}-${Date.now()}`,
        templateData: {
          projectName,
          period: h.period,
          netAmount: fmt(h.net_total || h.net),
          approvalUrl,
          senderName,
        },
      },
    });

    toast.success("Hakediş onay talebi gönderildi! 📧");
    fetchHakedisler();
    return true;
  };

  const resendForApproval = async (hakedisId: string) => {
    if (!user) return false;
    const h = hakedisler.find(x => x.id === hakedisId);
    if (!h || !h.client_email) return false;

    // Increment revision count and reset approval status
    await supabase.from("project_hakedis").update({
      approval_status: "onay_bekliyor",
      approval_sent_at: new Date().toISOString(),
      approved_at: null,
      client_note: null,
      revision_count: (h.revision_count || 0) + 1,
      status: "Gönderildi",
      status_color: "#3B82F6",
    }).eq("id", hakedisId);

    // Save revision snapshot
    await supabase.from("hakedis_revisions" as any).insert({
      hakedis_id: hakedisId,
      user_id: user.id,
      revision_number: (h.revision_count || 0) + 1,
      snapshot: { amount: h.amount, net: h.net, net_total: h.net_total, gross_total: h.gross_total },
      note: "Revize edilip tekrar gönderildi",
    } as any);

    const baseUrl = window.location.origin;
    const approvalUrl = `${baseUrl}/hakedis-onay/${h.approval_token}`;
    const { getCompanyProfile } = await import("@/lib/companyProfile");
    const company = getCompanyProfile();
    const senderName = company.companyName || "Şantiyem";
    const fmt = (n: number) => n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

    const project = (await supabase.from("projects").select("name").eq("id", h.project_id).maybeSingle()).data;

    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "hakedis-approval-request",
        recipientEmail: h.client_email,
        idempotencyKey: `hakedis-resend-${hakedisId}-${Date.now()}`,
        templateData: {
          projectName: project?.name || "Proje",
          period: h.period,
          netAmount: fmt(h.net_total || h.net),
          approvalUrl,
          senderName,
        },
      },
    });

    toast.success("Hakediş tekrar onaya gönderildi! 📧");
    fetchHakedisler();
    return true;
  };

  return { hakedisler, loading, addHakedis, deleteHakedis, updateHakedisStatus, setExpectedPaymentDate, sendForApproval, resendForApproval, refetch: fetchHakedisler };
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
