// WhatsApp Yönetici Özeti — okuma/yazma katmanı.
// Tüm gönderim ve credential işleri edge function'da; burada sadece ayarlar.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SummaryFrequency = "daily" | "weekly" | "off";

export interface WhatsAppRecipient {
  id: string;
  display_name: string;
  phone_number: string | null;
  is_active: boolean;
  opt_in: boolean;
  summary_frequency: SummaryFrequency;
  preferred_time: string;
  timezone: string;
  weekday: number;
  summary_scope: "all_projects" | "selected_projects";
  project_ids: string[];
}

export interface WhatsAppLog {
  id: string;
  message_type: string;
  status: string;
  sent_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  recipient_label: string | null;
  created_at: string;
}

export interface WhatsAppSummaryStatus {
  connection: "connected" | "not_connected" | "error";
  available?: boolean;
  connection_detail?: {
    id: string;
    status: string;
    mode: string;
    connected_number: string | null;
    connected_at: string | null;
    last_health_check: string | null;
  } | null;
  recipients: WhatsAppRecipient[];
  logs: WhatsAppLog[];
}

const call = async <T,>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("whatsapp-summary", { body });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
};

export const useWhatsAppSummary = (enabled = true) => {
  const qc = useQueryClient();
  const key = ["whatsapp-summary-status"];

  const status = useQuery({
    queryKey: key,
    enabled,
    staleTime: 30_000,
    queryFn: () => call<WhatsAppSummaryStatus>({ action: "status" }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const save = useMutation({
    mutationFn: (recipient: Partial<WhatsAppRecipient> & { display_name: string }) =>
      call<{ ok: boolean }>({ action: "save_recipient", recipient }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => call<{ ok: boolean }>({ action: "delete_recipient", id }),
    onSuccess: invalidate,
  });

  const sendTest = useMutation({
    mutationFn: (recipientId: string) =>
      call<{ ok: boolean; error?: string; preview?: string; not_connected?: boolean; fallback_url?: string | null }>({
        action: "send_test",
        recipient_id: recipientId,
      }),
    onSuccess: invalidate,
  });

  const preview = useMutation({
    mutationFn: () => call<{ preview: string }>({ action: "preview" }),
  });

  return {
    status: status.data,
    isLoading: status.isLoading,
    error: status.error as Error | null,
    save,
    remove,
    sendTest,
    preview,
    refresh: invalidate,
  };
};
