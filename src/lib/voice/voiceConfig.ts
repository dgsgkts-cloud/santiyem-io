// ============================================================
// src/lib/voice/voiceConfig.ts
// Single place that decides which voice provider is active.
// Swapping providers must never require touching UI code.
// ============================================================

import type { VoiceProviderId } from "./voiceTypes";

const STORAGE_KEY = "voice_provider";

/**
 * Sprint 32.1 — OpenAI Realtime is the primary engine.
 * ElevenLabs stays reachable purely as a silent automatic fallback.
 */
export const DEFAULT_PROVIDER: VoiceProviderId = "openai-realtime";

/** Provider used when the primary engine cannot be established. */
export const FALLBACK_PROVIDER: VoiceProviderId = "elevenlabs";

/** User-facing copy for ANY transport problem. Never leak technical detail. */
export const VOICE_RECONNECT_MESSAGE = "Ses bağlantısı yeniden kuruluyor...";

/** Temporary developer panel (Sprint 32.1 — remove before production). */
export function isVoiceDebugEnabled(): boolean {
  try {
    if (localStorage.getItem("voice_debug") === "1") return true;
  } catch { /* noop */ }
  return import.meta.env.DEV === true;
}

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export const OPENAI_REALTIME = {
  tokenEndpoint: `${SUPABASE_URL}/functions/v1/openai-realtime-token`,
  /** Overridden by whatever the edge function mints. */
  model: "gpt-realtime",
  voice: "cedar",
};


export function getVoiceProvider(): VoiceProviderId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "openai-realtime" || v === "elevenlabs" || v === "pipeline") return v;
  } catch { /* noop */ }
  return DEFAULT_PROVIDER;
}

export function setVoiceProvider(p: VoiceProviderId): void {
  try { localStorage.setItem(STORAGE_KEY, p); } catch { /* noop */ }
}
