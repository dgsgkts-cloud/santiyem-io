// ============================================================
// MessagingProvider soyutlaması.
//
// İş mantığı (yönetici özeti) doğrudan Meta endpoint'lerine, telefon numarası
// modeline veya tek bir mesaj formatına bağlı DEĞİLDİR. Provider kuralları
// (outbound/template/messaging-window) burada merkezîdir; değişirse finans ve
// AI katmanına dokunmak gerekmez.
//
// Gönderim mevcut Communication Hub WhatsApp sağlayıcısını yeniden kullanır.
// ============================================================

import { whatsappProvider } from "../communication/providers.ts";
import { normalizeResult, safeError } from "../communication/dispatchCore.ts";

export type MessagingProviderId = "whatsapp_cloud";

/** Alıcı kimliği yalnızca telefon string'i değildir — genişletilebilir. */
export interface MessagingRecipient {
  provider?: string | null;
  external_recipient_id?: string | null;
  phone_number?: string | null;
  business_scoped_user_id?: string | null;
  display_name?: string | null;
}

export interface SendOutcome {
  ok: boolean;
  provider: string;
  provider_message_id: string | null;
  status: "sent" | "failed" | "manual_action_required";
  error: string | null;
  fallback_url?: string | null;
}

/** Meta WhatsApp Business Platform durumları → iç durumlarımız. */
export function mapDeliveryStatus(raw: string): "sent" | "delivered" | "read" | "failed" | null {
  switch (raw) {
    case "accepted":
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "read":
return "read";
    case "failed":
      return "failed";
    default:
      return null;
  }
}

export interface MessagingProvider {
  readonly id: MessagingProviderId;
  isConfigured(): boolean;
  resolveRecipient(r: MessagingRecipient): string | null;
  sendMessage(r: MessagingRecipient, body: string): Promise<SendOutcome>;
  sendTemplate(
    r: MessagingRecipient,
    template: { name: string; language?: string; bodyParams: string[] },
  ): Promise<SendOutcome>;
  handleDeliveryStatus(raw: string): "sent" | "delivered" | "read" | "failed" | null;
}

const sanitizePhone = (raw: string) => raw.replace(/[^\d+]/g, "").replace(/^\+/, "");

function fakeMessage(recipient: string, extra: Record<string, unknown>) {
  return {
    id: crypto.randomUUID(),
    user_id: "system",
    channel: "whatsapp",
    recipient,
    attachments: [],
    priority: "normal",
    status: "queued",
    retry_count: 0,
    max_retries: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...extra,
  } as any;
}

async function send(recipient: string, extra: Record<string, unknown>): Promise<SendOutcome> {
  try {
    const res = await whatsappProvider.sendMessage(fakeMessage(recipient, extra));
    const n = normalizeResult(res);
    return {
      ok: n.ok,
      provider: n.provider,
      provider_message_id: n.provider_message_id ?? null,
      status: n.status === "retrying" ? "failed" : (n.status as SendOutcome["status"]),
      error: n.error_message,
      fallback_url: n.fallback_url ?? null,
    };
  } catch (err) {
    return {
      ok: false,
      provider: "whatsapp-cloud",
      provider_message_id: null,
      status: "failed",
      error: safeError((err as Error).message),
    };
  }
}

export const whatsappMessaging: MessagingProvider = {
  id: "whatsapp_cloud",

  isConfigured() {
    return !!Deno.env.get("WHATSAPP_ACCESS_TOKEN") && !!Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  },

  resolveRecipient(r) {
    const raw = r.external_recipient_id || r.phone_number || r.business_scoped_user_id || "";
    const cleaned = sanitizePhone(String(raw));
    return cleaned.length >= 10 ? cleaned : null;
  },

  async sendMessage(r, body) {
    const to = this.resolveRecipient(r);
    if (!to) {
      return { ok: false, provider: "whatsapp-cloud", provider_message_id: null, status: "failed", error: "Geçersiz alıcı" };
    }
    return send(to, { message_type: "text", body });
  },

  async sendTemplate(r, template) {
    const to = this.resolveRecipient(r);
    if (!to) {
      return { ok: false, provider: "whatsapp-cloud", provider_message_id: null, status: "failed", error: "Geçersiz alıcı" };
    }
    return send(to, {
      message_type: "template",
      body: template.bodyParams.join(" "),
      template_name: template.name,
      template_language: template.language ?? "tr",
      template_variables: { body: template.bodyParams },
    });
  },

  handleDeliveryStatus: mapDeliveryStatus,
};

/** Şantiyem yönetici özeti için tekrar kullanılabilir şablon tanımı. */
export const MANAGER_SUMMARY_TEMPLATE = {
  name: Deno.env.get("WHATSAPP_SUMMARY_TEMPLATE") || "santiyem_yonetici_ozeti",
  language: Deno.env.get("WHATSAPP_SUMMARY_TEMPLATE_LANG") || "tr",
};

/**
 * 24 saatlik müşteri hizmetleri penceresi dışında serbest metin gönderilemez.
 * Yönetici özeti planlı/utility bir mesaj olduğu için şablon tercih edilir;
 * şablon yapılandırılmamışsa serbest metne düşer.
 */
export function preferTemplate(): boolean {
  return !!Deno.env.get("WHATSAPP_SUMMARY_TEMPLATE");
}
