// ============================================================
// Evolution API (Baileys / WhatsApp Web) adapter.
//
// İş mantığı Evolution endpoint'lerini BİLMEZ. Yalnızca bu dosya bilir;
// Evolution sürümü/şeması değişirse sadece burası güncellenir.
//
// Credential (base URL + global API key) sadece sunucu tarafındadır ve
// hiçbir cevapta/istemcide görünmez.
// ============================================================

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "qr_required"
  | "failed";

export interface EvolutionQr {
  /** data:image/png;base64,... — yalnızca geçici görüntüleme içindir. */
  qr_base64: string | null;
  /** WhatsApp Web pairing kodu (destekleniyorsa). */
  pairing_code: string | null;
}

const base = () => (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
const key = () => Deno.env.get("EVOLUTION_API_KEY") || "";

export const evolutionConfigured = () => !!base() && !!key();

/** Tahmin edilemeyen instance adı: sa_<uuid-parçası>_<random>. */
export function buildInstanceName(ownerId: string): string {
  const rnd = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  return `sa_${String(ownerId).replace(/-/g, "").slice(0, 12)}_${rnd}`;
}

/** Evolution'ın ham durumlarını sade kullanıcı durumlarına eşler. */
export function mapState(raw?: string | null): ConnectionStatus {
  switch (String(raw ?? "").toLowerCase()) {
    case "open":
      return "connected";
    case "connecting":
      return "connecting";
    case "close":
    case "closed":
      return "disconnected";
    default:
      return "disconnected";
  }
}

async function call<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<{ ok: boolean; status: number; data: T | null; error: string | null }> {
  if (!evolutionConfigured()) {
    return { ok: false, status: 0, data: null, error: "whatsapp_not_configured" };
  }
  try {
    const res = await fetch(`${base()}${path}`, {
      method: init.method ?? "GET",
      headers: { "Content-Type": "application/json", apikey: key() },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!res.ok) {
      const msg = data?.response?.message || data?.message || `evolution_http_${res.status}`;
      return { ok: false, status: res.status, data, error: String(Array.isArray(msg) ? msg[0] : msg).slice(0, 200) };
    }
    return { ok: true, status: res.status, data: data as T, error: null };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: `evolution_unreachable: ${(err as Error).message}`.slice(0, 200) };
  }
}

const pickQr = (data: any): EvolutionQr => ({
  qr_base64: data?.qrcode?.base64 ?? data?.base64 ?? null,
  pairing_code: data?.qrcode?.pairingCode ?? data?.pairingCode ?? data?.code ?? null,
});

export const evolution = {
  /** Instance oluştur; varsa Evolution zaten var hatası döner ve connect yeterlidir. */
  async createInstance(instanceName: string, webhookUrl: string | null, phoneNumber?: string | null) {
    const body: Record<string, unknown> = {
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    };
    if (phoneNumber) body.number = phoneNumber;
    if (webhookUrl) {
      body.webhook = {
        url: webhookUrl,
        byEvents: false,
        base64: true,
        events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE"],
      };
    }
    const res = await call<any>("/instance/create", { method: "POST", body });
    return { ...res, qr: pickQr(res.data) };
  },

  /** QR / pairing bilgisi al (mevcut instance için). */
  async connect(instanceName: string, phoneNumber?: string | null) {
    const q = phoneNumber ? `?number=${encodeURIComponent(phoneNumber)}` : "";
    const res = await call<any>(`/instance/connect/${encodeURIComponent(instanceName)}${q}`);
    return { ...res, qr: pickQr(res.data) };
  },

  async getConnectionState(instanceName: string) {
    const res = await call<any>(`/instance/connectionState/${encodeURIComponent(instanceName)}`);
    const raw = res.data?.instance?.state ?? res.data?.state ?? null;
    return { ...res, state: mapState(raw), raw_state: raw as string | null };
  },

  async setWebhook(instanceName: string, webhookUrl: string) {
    return call<any>(`/webhook/set/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      body: {
        webhook: {
          enabled: true,
          url: webhookUrl,
          byEvents: false,
          base64: true,
          events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE"],
        },
      },
    });
  },

  async sendText(instanceName: string, jid: string, text: string) {
    const res = await call<any>(`/message/sendText/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      body: { number: jid, text, delay: 0, linkPreview: false },
    });
    const id = res.data?.key?.id ?? res.data?.messageId ?? null;
    return { ...res, provider_message_id: id as string | null };
  },

  async logout(instanceName: string) {
    return call<any>(`/instance/logout/${encodeURIComponent(instanceName)}`, { method: "DELETE" });
  },

  async deleteInstance(instanceName: string) {
    return call<any>(`/instance/delete/${encodeURIComponent(instanceName)}`, { method: "DELETE" });
  },
};

/** Telefon numarasını Evolution'ın beklediği JID biçimine çevirir. */
export function toJid(raw: string | null | undefined): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `${digits}@s.whatsapp.net`;
}

/** Evolution mesaj durum kodlarını iç durumlarımıza eşler (uydurma yok). */
export function mapMessageStatus(raw?: string | null): "sent" | "delivered" | "read" | "failed" | null {
  switch (String(raw ?? "").toUpperCase()) {
    case "PENDING":
    case "SERVER_ACK":
      return "sent";
    case "DELIVERY_ACK":
      return "delivered";
    case "READ":
    case "PLAYED":
      return "read";
    case "ERROR":
      return "failed";
    default:
      return null;
  }
}
