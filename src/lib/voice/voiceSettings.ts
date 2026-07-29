// ============================================================
// src/lib/voice/voiceSettings.ts
// Sprint 32.2 — user-facing voice preferences (client only).
// Persisted in localStorage; no backend, no schema.
// ============================================================

import type { WakeWordProviderId } from "./wake/wakeWordTypes";

export type VoiceMode = "push-to-talk" | "always-listening";

export interface VoiceSettings {
  /** Push-to-Talk stays the default for every user. */
  mode: VoiceMode;
  /**
   * When true, the wake word is only needed once — the session stays
   * open for natural back-and-forth until the silence timeout.
   */
  conversationMode: boolean;
  /** Display form of the wake phrase. */
  wakeWord: string;
  /** Swappable detection backend (custom phrases land here later). */
  wakeWordProvider: WakeWordProviderId;
}

export const DEFAULT_WAKE_WORD = "Şantiyem";

/**
 * Accepted spoken variants for the default wake word. Kept as data so a
 * future custom-wake-word feature only extends this list.
 */
export const WAKE_WORD_VARIANTS: Record<string, string[]> = {
  [DEFAULT_WAKE_WORD]: [
    "şantiyem",
    "santiyem",
    "hey şantiyem",
    "hey santiyem",
    "şantiye'm",
  ],
};

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  mode: "push-to-talk",
  conversationMode: false,
  wakeWord: DEFAULT_WAKE_WORD,
  wakeWordProvider: "webspeech",
};

/** Silence after which an active conversation ends automatically. */
export const CONVERSATION_SILENCE_MS = 8_000;
/**
 * With Conversation Mode off, the session closes shortly after the
 * assistant finishes answering the single request.
 */
export const SINGLE_TURN_GRACE_MS = 2_500;

const STORAGE_KEY = "santiyem_voice_settings";
export const VOICE_SETTINGS_EVENT = "santiyem-voice-settings-changed";

function sanitize(raw: unknown): VoiceSettings {
  const v = (raw ?? {}) as Partial<VoiceSettings>;
  return {
    mode: v.mode === "always-listening" ? "always-listening" : "push-to-talk",
    conversationMode: v.conversationMode === true,
    wakeWord: typeof v.wakeWord === "string" && v.wakeWord.trim()
      ? v.wakeWord.trim()
      : DEFAULT_WAKE_WORD,
    wakeWordProvider: (v.wakeWordProvider as WakeWordProviderId) ?? "webspeech",
  };
}

export function getVoiceSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_VOICE_SETTINGS };
    return sanitize(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_VOICE_SETTINGS };
  }
}

export function setVoiceSettings(patch: Partial<VoiceSettings>): VoiceSettings {
  const next = sanitize({ ...getVoiceSettings(), ...patch });
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
  try {
    window.dispatchEvent(new CustomEvent(VOICE_SETTINGS_EVENT, { detail: next }));
  } catch { /* noop */ }
  return next;
}

/** Spoken variants the detector should accept for the configured phrase. */
export function wakePhrasesFor(settings: VoiceSettings): string[] {
  const known = WAKE_WORD_VARIANTS[settings.wakeWord];
  if (known?.length) return known;
  // Custom phrase (future): match the phrase itself plus a "hey" prefix.
  const base = settings.wakeWord.toLocaleLowerCase("tr-TR");
  return [base, `hey ${base}`];
}
