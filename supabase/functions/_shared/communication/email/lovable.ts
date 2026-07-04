// ============================================================
// _shared/communication/email/lovable.ts
// Lovable Cloud driver — routes through send-transactional-email, the same
// queue that powers app emails. Used when the account provider is "lovable"
// or when no account is configured at all.
// ============================================================

import type { EmailAccount, EmailDriver, EmailSendInput, EmailSendResult } from "./types.ts";

async function invokeLovable(payload: {
  subject: string;
  body: string;
  recipient: string;
  recipient_name?: string;
  idempotency_key: string;
}): Promise<EmailSendResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        templateName: "generic-message",
        recipientEmail: payload.recipient,
        idempotencyKey: payload.idempotency_key,
        templateData: {
          subject: payload.subject,
          body: payload.body,
          name: payload.recipient_name,
        },
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const status = resp.status;
      return {
        success: false,
        provider: "lovable",
        error: (data as { error?: string })?.error || `HTTP ${status}`,
        retryable: status >= 500 || status === 429,
        raw: data,
      };
    }
    return {
      success: true,
      provider: "lovable",
      provider_message_id: (data as { messageId?: string; id?: string })?.messageId
        || (data as { id?: string })?.id,
      raw: data,
    };
  } catch (err) {
    return {
      success: false,
      provider: "lovable",
      error: (err as Error).message,
      retryable: true,
    };
  }
}

export const lovableDriver: EmailDriver = {
  provider: "lovable",
  async send(_account: EmailAccount, input: EmailSendInput): Promise<EmailSendResult> {
    // Lovable path currently supports single recipient + plain body/subject.
    // CC/BCC/attachments are not yet supported through the queue template;
    // callers wanting those must configure an SMTP or API-based account.
    const primary = input.to[0];
    if (!primary) {
      return { success: false, provider: "lovable", error: "Alıcı yok", retryable: false };
    }
    return invokeLovable({
      subject: input.subject,
      body: input.text || input.html || "",
      recipient: primary,
      idempotency_key: `comm-${Date.now()}-${primary}`,
    });
  },
  async verify() {
    // Nothing to verify — Lovable Cloud is always available inside the sandbox.
    return { ok: true };
  },
};
