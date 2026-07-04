// ============================================================
// _shared/communication/email/types.ts
// Types shared across all email drivers.
// ============================================================

export type EmailProviderName =
  | "smtp"
  | "microsoft_graph"
  | "gmail"
  | "sendgrid"
  | "ses"
  | "mailgun"
  | "lovable";

export interface EmailAccount {
  id: string;
  user_id: string;
  display_name: string;
  from_email: string;
  reply_to: string | null;
  signature: string | null;
  provider: EmailProviderName;
  status: "active" | "disabled" | "error" | "unverified";
  is_default: boolean;
  /**
   * Non-secret configuration. Providers look up actual credentials from
   * Supabase Secrets via the env-var names stored here.
   *
   * SMTP:            { host, port, secure, username, password_secret,
   *                    reply_to? }
   * SendGrid:        { api_key_secret }
   * Mailgun:         { domain, api_key_secret, region? }
   * SES:             { region, access_key_id_secret, secret_access_key_secret }
   * Microsoft Graph: { tenant_id, client_id, client_secret_secret,
   *                    user_principal_name }
   * Gmail:           { refresh_token_secret, client_id_secret,
   *                    client_secret_secret }
   * Lovable:         {}   // uses built-in Lovable Cloud email sender
   */
  config: Record<string, unknown>;
  last_sync_at: string | null;
  last_error: string | null;
}

export interface EmailSendInput {
  from: { email: string; name?: string };
  reply_to?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachmentInput[];
}

export interface EmailAttachmentInput {
  filename: string;
  url?: string;         // Provider will fetch and embed if content missing
  content?: string;     // base64
  mime?: string;
}

export interface EmailSendResult {
  success: boolean;
  provider: EmailProviderName;
  provider_message_id?: string;
  retryable?: boolean;
  error?: string;
  raw?: unknown;
}

export interface EmailDriver {
  readonly provider: EmailProviderName;
  send(account: EmailAccount, input: EmailSendInput): Promise<EmailSendResult>;
  /** Optional: verify account can authenticate without sending. */
  verify?(account: EmailAccount): Promise<{ ok: boolean; error?: string }>;
}
