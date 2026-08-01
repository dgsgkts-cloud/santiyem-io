// ============================================================
// src/lib/voice/voiceConfig.ts
// OpenAI Realtime is the ONLY voice provider. There is no provider
// switch, no fallback vendor and no stored preference that can
// change the transport.
// ============================================================

import type { VoiceProviderId } from "./voiceTypes";

/** Legacy key that used to hold a provider preference. */
const LEGACY_STORAGE_KEY = "voice_provider";

export const DEFAULT_PROVIDER: VoiceProviderId = "openai-realtime";

/** User-facing copy for ANY transport problem. Never leak technical detail. */
export const VOICE_RECONNECT_MESSAGE = "Ses bağlantısı yeniden kuruluyor...";

/** Temporary developer panel. */
export function isVoiceDebugEnabled(): boolean {
  try {
    if (localStorage.getItem("voice_debug") === "1") return true;
  } catch { /* noop */ }
  return import.meta.env.DEV === true;
}

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/**
 * NON-AUTHORITATIVE model label. The Realtime model is resolved server-side
 * from the OPENAI_REALTIME_MODEL environment variable and returned by the
 * edge function; this constant exists only for typing/diagnostics display
 * before the server response arrives. It is never sent to the server and
 * never used to open a session.
 */
export const REALTIME_MODEL_DISPLAY_FALLBACK = "gpt-realtime";

export const OPENAI_REALTIME = {
  tokenEndpoint: `${SUPABASE_URL}/functions/v1/openai-realtime-token`,
  voice: "cedar",
};

/** Always OpenAI Realtime — storage, query params and env cannot override it. */
export function getVoiceProvider(): VoiceProviderId {
  return DEFAULT_PROVIDER;
}

/**
 * One-time cleanup of stale browser state. Older builds persisted a
 * provider preference (sometimes "elevenlabs"); provider selection no
 * longer exists, so the key is simply removed. Safe in Safari private
 * mode / storage-disabled environments.
 */
export function migrateVoiceProviderStorage(): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(LEGACY_STORAGE_KEY) !== null) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch { /* storage unavailable — nothing to migrate */ }
}
