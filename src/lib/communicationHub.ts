// Thin client for the Communication Hub edge function.
// Any future feature that needs to send WhatsApp/Email/SMS/etc. should call
// through here instead of talking to a provider directly.

import { supabase } from "@/integrations/supabase/client";

export type CommChannel = "whatsapp" | "email" | "sms" | "push" | "teams" | "slack";
export type EmailProviderName =
  | "smtp" | "microsoft_graph" | "gmail" | "sendgrid" | "ses" | "mailgun" | "lovable";

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
  // Sprint 9.1 — email extras
  cc?: string[];
  bcc?: string[];
  email_account_id?: string;
  project_id?: string;
  related_action?: string;
}

export interface EmailAccountInput {
  id?: string;
  display_name: string;
  from_email: string;
  reply_to?: string | null;
  signature?: string | null;
  provider: EmailProviderName;
  config: Record<string, unknown>;
  is_default?: boolean;
}

export interface ListFilter {
  status?: string;
  channel?: CommChannel;
  limit?: number;
  project_id?: string;
  recipient?: string;
  search?: string;
}

async function call(action: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("communication-hub", {
    body: { action, ...payload },
  });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error?: string }).error!);
  return data;
}

export const communicationHub = {
  create: (input: CreateMessageInput) => call("create", { ...input }),
  preview: (id: string) => call("preview", { id }),
  send: (id: string) => call("send", { id }),
  retry: (id: string) => call("retry", { id }),
  cancel: (id: string) => call("cancel", { id }),
  schedule: (id: string, scheduled_at: string) => call("schedule", { id, scheduled_at }),
  status: (id: string) => call("status", { id }),
  list: (filter: ListFilter = {}) => call("list", filter),

  // Email account management (Sprint 9.1)
  emailAccounts: {
    list: () => call("email-accounts.list", {}),
    upsert: (input: EmailAccountInput) => call("email-accounts.upsert", { ...input }),
    remove: (id: string) => call("email-accounts.delete", { id }),
    setDefault: (id: string) => call("email-accounts.set-default", { id }),
    verify: (id: string) => call("email-accounts.verify", { id }),
  },
};
