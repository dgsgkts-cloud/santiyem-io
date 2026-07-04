// Thin client for the Communication Hub edge function.
// Any future feature that needs to send WhatsApp/Email/SMS/etc. should call
// through here instead of talking to a provider directly.

import { supabase } from "@/integrations/supabase/client";

export type CommChannel = "whatsapp" | "email" | "sms" | "push" | "teams" | "slack";

export interface CreateMessageInput {
  channel: CommChannel;
  recipient: string;
  recipient_name?: string;
  subject?: string;
  body: string;
  attachments?: { name: string; url: string; mime?: string }[];
  priority?: "low" | "normal" | "high" | "urgent";
  scheduled_at?: string;
  created_from?: string;
  metadata?: Record<string, unknown>;
  auto_send?: boolean;
}

async function call(action: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("communication-hub", {
    body: { action, ...payload },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

export const communicationHub = {
  create: (input: CreateMessageInput) => call("create", input),
  preview: (id: string) => call("preview", { id }),
  send: (id: string) => call("send", { id }),
  retry: (id: string) => call("retry", { id }),
  cancel: (id: string) => call("cancel", { id }),
  schedule: (id: string, scheduled_at: string) => call("schedule", { id, scheduled_at }),
  status: (id: string) => call("status", { id }),
  list: (filter: { status?: string; channel?: CommChannel; limit?: number } = {}) =>
    call("list", filter),
};
