// Thin client for the Communication Hub edge function.
// Any future feature that needs to send WhatsApp/Email/SMS/etc. should call
// through here instead of talking to a provider directly.

import { supabase } from "@/integrations/supabase/client";
import { isDemoMode, interceptExternalSend } from "@/lib/demoMode";

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

/**
 * Demo accounts never reach a real provider: the message is stored as a draft
 * (so history stays truthful) and the UI shows a preview instead.
 */
const demoIntercept = async (input: CreateMessageInput) => {
  interceptExternalSend({
    channel: input.channel,
    recipient: input.recipient,
    recipientName: input.recipient_name,
    subject: input.subject,
    body: input.body,
  });
  return await call("create", { ...input, auto_send: false });
};

const demoBlockSend = async (id: string) => {
  const info: any = await call("preview", { id }).catch(() => null);
  const msg = info?.message ?? info ?? {};
  interceptExternalSend({
    channel: msg.channel ?? "email",
    recipient: msg.recipient ?? "—",
    recipientName: msg.recipient_name,
    subject: msg.subject,
    body: msg.body ?? "",
  });
  return { ok: true, demo: true };
};

export const communicationHub = {
  create: (input: CreateMessageInput) =>
    isDemoMode() ? demoIntercept(input) : call("create", { ...input }),
  preview: (id: string) => call("preview", { id }),
  send: (id: string) => (isDemoMode() ? demoBlockSend(id) : call("send", { id })),
  retry: (id: string) => (isDemoMode() ? demoBlockSend(id) : call("retry", { id })),
  cancel: (id: string) => call("cancel", { id }),
  /** Sprint 34.1 — safe manual retry: requeues through the dispatcher. */
  requeue: (id: string) => (isDemoMode() ? demoBlockSend(id) : call("requeue", { id })),
  attempts: (id: string) => call("attempts", { id }),
  schedule: (id: string, scheduled_at: string) => call("schedule", { id, scheduled_at }),
  status: (id: string) => call("status", { id }),
  list: (filter: ListFilter = {}) => call("list", { ...filter }),


  // Email account management (Sprint 9.1)
  emailAccounts: {
    list: () => call("email-accounts.list", {}),
    upsert: (input: EmailAccountInput) => call("email-accounts.upsert", { ...input }),
    remove: (id: string) => call("email-accounts.delete", { id }),
    setDefault: (id: string) => call("email-accounts.set-default", { id }),
    verify: (id: string) => call("email-accounts.verify", { id }),
  },
};
