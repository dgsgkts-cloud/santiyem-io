import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";

export interface SignatureRequest {
  id: string;
  contract_id: string;
  user_id: string;
  recipient_name: string;
  recipient_email: string;
  cc_emails: string[];
  message: string;
  deadline: string | null;
  token: string;
  status: string;
  sent_at: string;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignedUpload {
  id: string;
  signature_request_id: string;
  signer_name: string;
  signer_title: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  ip_address: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  contract_id: string;
  action: string;
  description: string;
  actor_name: string | null;
  actor_email: string | null;
  metadata: any;
  created_at: string;
}

export function useContractSignatures(contractId: string) {
  const { user } = useUser();
  const [requests, setRequests] = useState<SignatureRequest[]>([]);
  const [uploads, setUploads] = useState<SignedUpload[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user || !contractId) { setLoading(false); return; }
    setLoading(true);

    const [reqRes, actRes] = await Promise.all([
      (supabase as any).from("contract_signature_requests")
        .select("*").eq("contract_id", contractId).order("created_at", { ascending: false }),
      (supabase as any).from("contract_activity_log")
        .select("*").eq("contract_id", contractId).order("created_at", { ascending: false }),
    ]);

    const reqs: SignatureRequest[] = reqRes.data || [];
    setRequests(reqs);
    setActivities(actRes.data || []);

    // Fetch uploads for all requests
    if (reqs.length > 0) {
      const ids = reqs.map(r => r.id);
      const { data: uploadData } = await (supabase as any)
        .from("contract_signed_uploads")
        .select("*")
        .in("signature_request_id", ids)
        .order("created_at", { ascending: false });
      setUploads(uploadData || []);
    } else {
      setUploads([]);
    }

    setLoading(false);
  }, [user, contractId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const sendForSignature = async (data: {
    recipientName: string;
    recipientEmail: string;
    ccEmails: string[];
    message: string;
    deadline: string | null;
  }) => {
    if (!user) return null;

    const { data: result, error } = await (supabase as any)
      .from("contract_signature_requests")
      .insert({
        contract_id: contractId,
        user_id: user.id,
        recipient_name: data.recipientName,
        recipient_email: data.recipientEmail,
        cc_emails: data.ccEmails,
        message: data.message,
        deadline: data.deadline || null,
        status: "gonderildi",
      })
      .select()
      .single();

    if (error) { toast.error("İmza talebi gönderilemedi."); return null; }

    // Log activity
    await (supabase as any).from("contract_activity_log").insert({
      contract_id: contractId,
      action: "imzaya_gonderildi",
      description: `PDF imzaya gönderildi → ${data.recipientEmail}`,
      actor_name: user.user_metadata?.full_name || user.email,
      actor_email: user.email,
    });

    // Send email
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "signature-request",
        recipientEmail: data.recipientEmail,
        idempotencyKey: `sig-req-${result.id}`,
        templateData: {
          recipientName: data.recipientName,
          contractName: "", // will be set by caller
          message: data.message,
          uploadUrl: `${window.location.origin}/sozlesme-imza/${result.token}`,
          deadline: data.deadline,
          senderName: user.user_metadata?.full_name || user.email,
        },
      },
    });

    toast.success("Sözleşme imzaya gönderildi.");
    await fetchAll();
    return result;
  };

  const sendReminder = async (request: SignatureRequest) => {
    if (!user) return;

    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "signature-reminder",
        recipientEmail: request.recipient_email,
        idempotencyKey: `sig-remind-${request.id}-${Date.now()}`,
        templateData: {
          recipientName: request.recipient_name,
          contractName: "",
          uploadUrl: `${window.location.origin}/sozlesme-imza/${request.token}`,
          sentDate: new Date(request.sent_at).toLocaleDateString("tr-TR"),
        },
      },
    });

    await (supabase as any).from("contract_activity_log").insert({
      contract_id: contractId,
      action: "hatirlatma_gonderildi",
      description: `Hatırlatma e-postası gönderildi → ${request.recipient_email}`,
      actor_name: user.user_metadata?.full_name || user.email,
      actor_email: user.email,
    });

    toast.success("Hatırlatma e-postası gönderildi.");
    await fetchAll();
  };

  // Compute signature status for the contract
  const getSignatureStatus = () => {
    if (requests.length === 0) return { status: "taslak", label: "📝 Taslak", color: "#94A3B8" };
    
    const latestReq = requests[0];
    const hasUploads = uploads.some(u => u.signature_request_id === latestReq.id);
    
    if (hasUploads || latestReq.status === "imzalandi") {
      return { status: "imzalandi", label: "✅ İmzalandı", color: "#22C55E" };
    }
    
    if (latestReq.deadline && new Date(latestReq.deadline) < new Date()) {
      return { status: "suresi_doldu", label: "⌛ Süresi Doldu", color: "#EF4444" };
    }
    
    const daysSinceSent = Math.ceil((Date.now() - new Date(latestReq.sent_at).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceSent > 1) {
      return { status: "bekleniyor", label: `⏳ ${daysSinceSent} gündür bekleniyor`, color: "#F59E0B" };
    }
    
    return { status: "gonderildi", label: "📧 Gönderildi", color: "#3B82F6" };
  };

  return {
    requests,
    uploads,
    activities,
    loading,
    sendForSignature,
    sendReminder,
    getSignatureStatus,
    refetch: fetchAll,
  };
}
