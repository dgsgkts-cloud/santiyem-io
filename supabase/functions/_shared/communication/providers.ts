// Built-in providers for the Communication Hub.
// WhatsApp returns a wa.me deep-link (user completes send in WhatsApp).
// Email routes through the existing send-transactional-email edge function.

import type {
  CommMessage,
  CommunicationProvider,
  ProviderPreview,
  ProviderSendResult,
} from "./types.ts";

const sanitizePhone = (raw: string) => raw.replace(/[^\d+]/g, "").replace(/^\+/, "");

export const whatsappProvider: CommunicationProvider = {
  channel: "whatsapp",
  name: "whatsapp-web",
  async previewMessage(msg: CommMessage): Promise<ProviderPreview> {
    return {
      channel: "whatsapp",
      recipient: msg.recipient,
      body: msg.body,
      attachments: msg.attachments,
      render_notes: "WhatsApp Web/mobile üzerinden gönderilecek. Emoji ve markdown desteklenir.",
    };
  },
  async sendMessage(msg: CommMessage): Promise<ProviderSendResult> {
    const phone = sanitizePhone(msg.recipient);
    if (!phone) {
      return { success: false, provider: "whatsapp-web", error: "Geçersiz telefon", retryable: false };
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg.body)}`;
    // The provider prepares the deep-link; final delivery is user-confirmed
    // when they open the link. We optimistically mark as "sent".
    return { success: true, provider: "whatsapp-web", external_url: url };
  },
};

export const emailProvider: CommunicationProvider = {
  channel: "email",
  name: "lovable-email",
  async previewMessage(msg: CommMessage): Promise<ProviderPreview> {
    return {
      channel: "email",
      recipient: msg.recipient,
      subject: msg.subject || "(konu yok)",
      body: msg.body,
      attachments: msg.attachments,
      render_notes: "Şirket alan adınızdan gönderilecek. Alt bilgi ve unsubscribe otomatik eklenir.",
    };
  },
  async sendMessage(msg: CommMessage): Promise<ProviderSendResult> {
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
          recipientEmail: msg.recipient,
          idempotencyKey: `comm-${msg.id}`,
          templateData: { subject: msg.subject, body: msg.body, name: msg.recipient_name },
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const status = resp.status;
        return {
          success: false,
          provider: "lovable-email",
          error: data?.error || `HTTP ${status}`,
          retryable: status >= 500 || status === 429,
          raw: data,
        };
      }
      return {
        success: true,
        provider: "lovable-email",
        provider_message_id: data?.messageId || data?.id,
        raw: data,
      };
    } catch (err) {
      return {
        success: false,
        provider: "lovable-email",
        error: (err as Error).message,
        retryable: true,
      };
    }
  },
};

export const providerRegistry: Record<string, CommunicationProvider> = {
  whatsapp: whatsappProvider,
  email: emailProvider,
};

export function getProvider(channel: string): CommunicationProvider | null {
  return providerRegistry[channel] || null;
}
