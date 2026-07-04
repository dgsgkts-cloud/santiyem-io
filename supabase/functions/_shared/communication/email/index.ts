// ============================================================
// _shared/communication/email/index.ts
// Email provider entry point for the Communication Hub.
//
// - Looks up the target email_account (explicit id, or user default).
// - Dispatches to the correct driver via emailDriverRegistry.
// - Falls back to the Lovable Cloud driver when the user hasn't configured
//   any account yet, so the existing behaviour keeps working.
// - Composes html/text/subject/attachments/cc/bcc from the CommMessage.
// ============================================================

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import type {
  CommMessage,
  CommunicationProvider,
  ProviderPreview,
  ProviderSendResult,
} from "../types.ts";
import type { EmailAccount, EmailDriver, EmailProviderName } from "./types.ts";
import { smtpDriver } from "./smtp.ts";
import { lovableDriver } from "./lovable.ts";
import {
  microsoftGraphDriver,
  gmailDriver,
  sendgridDriver,
  sesDriver,
  mailgunDriver,
} from "./stubs.ts";

export const emailDriverRegistry: Record<EmailProviderName, EmailDriver> = {
  smtp: smtpDriver,
  lovable: lovableDriver,
  microsoft_graph: microsoftGraphDriver,
  gmail: gmailDriver,
  sendgrid: sendgridDriver,
  ses: sesDriver,
  mailgun: mailgunDriver,
};

function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function resolveAccount(msg: CommMessage): Promise<EmailAccount | null> {
  const sb = serviceClient();
  const meta = (msg.metadata || {}) as Record<string, unknown>;
  const accountId = (msg as unknown as { email_account_id?: string }).email_account_id
    || (meta.email_account_id as string | undefined);

  if (accountId) {
    const { data } = await sb.from("email_accounts")
      .select("*").eq("id", accountId).eq("user_id", msg.user_id).maybeSingle();
    if (data) return data as EmailAccount;
  }
  const { data: def } = await sb.from("email_accounts")
    .select("*").eq("user_id", msg.user_id).eq("is_default", true).maybeSingle();
  return (def as EmailAccount) || null;
}

function readList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(v => typeof v === "string");
  if (typeof value === "string") return value.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  return [];
}

function bodyToHtml(body: string): string {
  // Escape then convert newlines to <br> so plain-text drafts render.
  const esc = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111">${esc.replace(/\n/g, "<br/>")}</div>`;
}

async function markAccountStatus(id: string, ok: boolean, error?: string) {
  const sb = serviceClient();
  await sb.from("email_accounts").update({
    last_sync_at: new Date().toISOString(),
    status: ok ? "active" : "error",
    last_error: ok ? null : (error || null),
  }).eq("id", id);
}

export const emailProvider: CommunicationProvider = {
  channel: "email",
  name: "email-router",

  async previewMessage(msg: CommMessage): Promise<ProviderPreview> {
    const account = await resolveAccount(msg);
    const cc = readList((msg as unknown as { cc?: unknown }).cc);
    const bcc = readList((msg as unknown as { bcc?: unknown }).bcc);
    const parts: string[] = [];
    if (account) {
      parts.push(`Hesap: ${account.display_name} (${account.from_email})`);
      parts.push(`Sağlayıcı: ${account.provider}`);
    } else {
      parts.push("Yapılandırılmış e-posta hesabı yok — yerleşik Lovable Cloud gönderim kullanılacak.");
    }
    if (cc.length) parts.push(`CC: ${cc.join(", ")}`);
    if (bcc.length) parts.push(`BCC: ${bcc.join(", ")}`);
    if (msg.attachments?.length) parts.push(`${msg.attachments.length} ek eklenecek.`);
    if (account?.signature) parts.push("İmza otomatik eklenecek.");
    return {
      channel: "email",
      recipient: msg.recipient,
      subject: msg.subject || "(konu yok)",
      body: msg.body,
      attachments: msg.attachments || [],
      render_notes: parts.join(" • "),
    };
  },

  async sendMessage(msg: CommMessage): Promise<ProviderSendResult> {
    const account = await resolveAccount(msg);
    const providerName: EmailProviderName = account?.provider || "lovable";
    const driver = emailDriverRegistry[providerName];
    if (!driver) {
      return { success: false, provider: `email-${providerName}`, error: `Sağlayıcı bulunamadı: ${providerName}`, retryable: false };
    }

    const cc = readList((msg as unknown as { cc?: unknown }).cc);
    const bcc = readList((msg as unknown as { bcc?: unknown }).bcc);
    const to = readList(msg.recipient).length ? readList(msg.recipient) : [msg.recipient];

    const signature = account?.signature ? `\n\n—\n${account.signature}` : "";
    const composedText = `${msg.body}${signature}`;

    const stubAccount: EmailAccount = account || {
      id: "lovable-default",
      user_id: msg.user_id,
      display_name: "Lovable Cloud",
      from_email: "notify@lovable.dev",
      reply_to: null,
      signature: null,
      provider: "lovable",
      status: "active",
      is_default: true,
      config: {},
      last_sync_at: null,
      last_error: null,
    };

    const result = await driver.send(stubAccount, {
      from: {
        email: stubAccount.from_email,
        name: stubAccount.display_name,
      },
      reply_to: stubAccount.reply_to || undefined,
      to,
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
      subject: msg.subject || "(konu yok)",
      text: composedText,
      html: bodyToHtml(composedText),
      attachments: (msg.attachments || []).map(a => ({
        filename: a.name,
        url: a.url,
        mime: a.mime,
      })),
    });

    if (account) {
      await markAccountStatus(account.id, result.success, result.error);
    }

    return {
      success: result.success,
      provider: `email-${result.provider}`,
      provider_message_id: result.provider_message_id,
      error: result.error,
      retryable: result.retryable,
      raw: result.raw,
    };
  },
};
