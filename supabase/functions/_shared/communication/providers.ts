// Built-in providers for the Communication Hub.
// WhatsApp = official Meta WhatsApp Business Cloud API (Graph v20).
// Falls back to a wa.me deep-link when Cloud API credentials are not configured.
// Email routes through the existing send-transactional-email edge function.

import type {
  CommMessage,
  CommunicationProvider,
  ProviderPreview,
  ProviderSendResult,
} from "./types.ts";

const sanitizePhone = (raw: string) => raw.replace(/[^\d+]/g, "").replace(/^\+/, "");

const GRAPH_VERSION = "v20.0";

function hasWhatsAppCloudCreds(): boolean {
  return !!Deno.env.get("WHATSAPP_ACCESS_TOKEN") && !!Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
}

// Map WA Cloud API HTTP status to retryable / non-retryable.
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

async function sendViaCloud(msg: CommMessage): Promise<ProviderSendResult> {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
  const to = sanitizePhone(msg.recipient);
  if (!to) return { success: false, provider: "whatsapp-cloud", error: "Geçersiz telefon", retryable: false };

  // Build payload based on message_type
  const type = (msg as any).message_type || "text";
  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type,
  };

  if (type === "text") {
    payload.text = { body: msg.body, preview_url: false };
  } else if (type === "template") {
    const templateName = (msg as any).template_name;
    const language = (msg as any).template_language || "tr";
    const vars = (msg as any).template_variables || {};
    if (!templateName) {
      return { success: false, provider: "whatsapp-cloud", error: "Şablon adı gerekli", retryable: false };
    }
    // vars.body is expected to be an array of strings for {{1}}, {{2}}, ...
    const bodyParams = Array.isArray(vars.body)
      ? vars.body.map((v: string) => ({ type: "text", text: String(v) }))
      : [];
    payload.template = {
      name: templateName,
      language: { code: language },
      components: bodyParams.length ? [{ type: "body", parameters: bodyParams }] : [],
    };
  } else if (type === "image") {
    const url = (msg as any).media_url || msg.attachments?.[0]?.url;
    if (!url) return { success: false, provider: "whatsapp-cloud", error: "Resim URL gerekli", retryable: false };
    payload.image = { link: url, caption: (msg as any).media_caption || msg.body || undefined };
  } else if (type === "document") {
    const url = (msg as any).media_url || msg.attachments?.[0]?.url;
    const filename = msg.attachments?.[0]?.name || "document.pdf";
    if (!url) return { success: false, provider: "whatsapp-cloud", error: "Belge URL gerekli", retryable: false };
    payload.document = { link: url, filename, caption: (msg as any).media_caption || msg.body || undefined };
  } else if (type === "location") {
    const meta = (msg.metadata || {}) as Record<string, unknown>;
    payload.location = {
      latitude: meta.latitude,
      longitude: meta.longitude,
      name: meta.name || msg.recipient_name || "Konum",
      address: meta.address || "",
    };
  } else {
    return { success: false, provider: "whatsapp-cloud", error: `Desteklenmeyen tip: ${type}`, retryable: false };
  }

  try {
    const resp = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const err = data?.error;
      const code = err?.code;
      const detail = err?.error_data?.details || err?.message || `HTTP ${resp.status}`;
      // Common non-retryable: 190 (expired token), 131026 (invalid recipient), 132000-series template
      const nonRetryableCodes = new Set([190, 131026, 131047, 132000, 132001, 132005, 132007, 132012, 132015]);
      const retryable = !nonRetryableCodes.has(code) && isRetryableStatus(resp.status);
      return {
        success: false,
        provider: "whatsapp-cloud",
        error: code ? `[${code}] ${detail}` : detail,
        retryable,
        raw: data,
      };
    }

    const wamid: string | undefined = data?.messages?.[0]?.id;
    return {
      success: true,
      provider: "whatsapp-cloud",
      provider_message_id: wamid,
      raw: data,
    };
  } catch (err) {
    return {
      success: false,
      provider: "whatsapp-cloud",
      error: (err as Error).message,
      retryable: true,
    };
  }
}

export const whatsappProvider: CommunicationProvider = {
  channel: "whatsapp",
  name: "whatsapp-cloud",
  async previewMessage(msg: CommMessage): Promise<ProviderPreview> {
    const configured = hasWhatsAppCloudCreds();
    const type = (msg as any).message_type || "text";
    const notes = configured
      ? `Meta WhatsApp Business Cloud API üzerinden gönderilecek (${type}). Onaylanınca ${msg.recipient} numarasına ulaşacak.`
      : "WhatsApp Cloud API yapılandırılmamış — wa.me bağlantısı üretilecek (gönderim kullanıcıda).";
    return {
      channel: "whatsapp",
      recipient: msg.recipient,
      body: msg.body,
      attachments: msg.attachments,
      render_notes: notes,
    };
  },
  async sendMessage(msg: CommMessage): Promise<ProviderSendResult> {
    // Prefer official Cloud API when configured
    if (hasWhatsAppCloudCreds()) {
      return sendViaCloud(msg);
    }
    // Fallback: wa.me deep-link
    const phone = sanitizePhone(msg.recipient);
    if (!phone) {
      return { success: false, provider: "whatsapp-web", error: "Geçersiz telefon", retryable: false };
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg.body)}`;
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
