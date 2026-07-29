// ============================================================
// Communication Hub — shared dispatch engine (Sprint 34.1)
// Used by the `communication-dispatcher` edge function.
// It reuses the EXISTING provider registry — no new providers.
// ============================================================

import { getProvider } from "./providers.ts";
import type { CommMessage, ProviderSendResult } from "./types.ts";

export const MAX_ATTEMPTS = 5;

/** Backoff schedule in minutes, indexed by attempt number (1-based). */
const BACKOFF_MINUTES = [1, 5, 15, 60, 360];

/** Bounded exponential backoff with ±20% jitter. */
export function nextRetryAt(attempt: number, now = new Date()): Date {
  const base = BACKOFF_MINUTES[Math.min(attempt, BACKOFF_MINUTES.length) - 1] ?? 360;
  const jitter = 1 + (Math.random() * 0.4 - 0.2);
  return new Date(now.getTime() + base * 60_000 * jitter);
}

export interface NormalizedResult {
  ok: boolean;
  provider: string;
  provider_message_id?: string | null;
  /** Terminal-ish status hint for the message row. */
  status: "sent" | "failed" | "retrying" | "manual_action_required";
  retryable: boolean;
  error_code: string | null;
  error_message: string | null;
  fallback_url?: string | null;
}

const RETRYABLE_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);

const RETRYABLE_PATTERNS = [
  /timeout/i, /timed out/i, /etimedout/i, /econnreset/i, /econnrefused/i,
  /network/i, /socket/i, /temporar/i, /rate limit/i, /too many requests/i,
  /try again/i, /unavailable/i, /dns/i, /tls handshake/i,
];

const PERMANENT_PATTERNS = [
  /invalid (recipient|email|phone|address|number)/i,
  /geçersiz (telefon|e-?posta|alıcı)/i,
  /no recipients/i, /recipient.*(not allowed|rejected|blocked)/i,
  /şablon adı gerekli/i, /template (not found|does not exist|rejected|paused)/i,
  /malformed/i, /desteklenmeyen/i, /unsupported/i,
  /unauthor/i, /forbidden/i, /permission denied/i,
  /authentication/i, /invalid (api key|credentials|token)/i,
  /not configured/i, /yapılandırılmamış/i, /hesap bulunamadı/i,
];

function extractHttpStatus(text: string): number | null {
  const m = text.match(/\b(?:HTTP|status)\s*[:=]?\s*(\d{3})\b/i);
  if (m) return Number(m[1]);
  return null;
}

/** Classify a failure into retryable / permanent + a normalized error code. */
export function classifyFailure(
  errorMessage: string | undefined,
  providerHint?: boolean,
): { retryable: boolean; code: string } {
  const text = errorMessage || "";
  const http = extractHttpStatus(text);

  if (http !== null) {
    if (RETRYABLE_HTTP.has(http)) return { retryable: true, code: `http_${http}` };
    if (http >= 400 && http < 500) return { retryable: false, code: `http_${http}` };
  }

  for (const re of PERMANENT_PATTERNS) {
    if (re.test(text)) return { retryable: false, code: "permanent_provider_error" };
  }
  for (const re of RETRYABLE_PATTERNS) {
    if (re.test(text)) return { retryable: true, code: "transient_provider_error" };
  }

  // Fall back to the provider's own hint, else treat as permanent so we do not
  // loop forever on unknown errors.
  if (providerHint === true) return { retryable: true, code: "transient_provider_error" };
  if (providerHint === false) return { retryable: false, code: "permanent_provider_error" };
  return { retryable: false, code: "unknown_error" };
}

/** Redact anything that smells like a credential before persisting/logging. */
export function safeError(msg: string | null | undefined): string | null {
  if (!msg) return null;
  return msg
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer ***")
    .replace(/(api[_-]?key|access[_-]?token|password|secret|authorization)["'\s:=]+[^\s,"'}]+/gi, "$1=***")
    .slice(0, 500);
}

/** Normalize any provider result into the shared dispatcher contract. */
export function normalizeResult(res: ProviderSendResult): NormalizedResult {
  if (res.success) {
    // wa.me deep-link is NOT an automatic delivery — user action required.
    if (res.external_url) {
      return {
        ok: true,
        provider: res.provider,
        provider_message_id: res.provider_message_id ?? null,
        status: "manual_action_required",
        retryable: false,
        error_code: null,
        error_message: null,
        fallback_url: res.external_url,
      };
    }
    return {
      ok: true,
      provider: res.provider,
      provider_message_id: res.provider_message_id ?? null,
      status: "sent",
      retryable: false,
      error_code: null,
      error_message: null,
      fallback_url: null,
    };
  }

  const { retryable, code } = classifyFailure(res.error, res.retryable);
  return {
    ok: false,
    provider: res.provider,
    provider_message_id: res.provider_message_id ?? null,
    status: retryable ? "retrying" : "failed",
    retryable,
    error_code: code,
    error_message: safeError(res.error) || "Bilinmeyen gönderim hatası",
    fallback_url: null,
  };
}

/** Send one message through the existing provider registry. */
export async function sendThroughRegistry(msg: CommMessage): Promise<NormalizedResult> {
  const provider = getProvider(msg.channel);
  if (!provider) {
    return {
      ok: false,
      provider: msg.channel,
      status: "failed",
      retryable: false,
      error_code: "unsupported_channel",
      error_message: `Desteklenmeyen kanal: ${msg.channel}`,
    };
  }
  try {
    const res = await provider.sendMessage(msg);
    return normalizeResult(res);
  } catch (err) {
    const message = safeError((err as Error).message) || "Sağlayıcı hatası";
    const { retryable, code } = classifyFailure(message, true);
    return {
      ok: false,
      provider: provider.name,
      status: retryable ? "retrying" : "failed",
      retryable,
      error_code: code,
      error_message: message,
    };
  }
}
