// ============================================================
// src/lib/voice/voiceConfig.ts
// Single place that decides which voice provider is active.
// Swapping providers must never require touching UI code.
// ============================================================

import type { VoiceProviderId } from "./voiceTypes";

const STORAGE_KEY = "voice_provider";

/** Default provider for the product. Change here to flip the whole app. */
export const DEFAULT_PROVIDER: VoiceProviderId = "elevenlabs";

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
