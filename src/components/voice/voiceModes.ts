// Voice Copilot mode & settings — client-side UX presets only.
// No backend / voice-provider auth changes; these tune the browser audio pipeline
// and local UX (PTT, wake word, barge-in, volume).

export type VoiceMode = "office" | "site" | "driving";
export type Sensitivity = "low" | "medium" | "high";
export type VoiceSpeed = "slow" | "normal" | "fast";

export interface VoiceSettings {
  mode: VoiceMode;
  pushToTalk: boolean;
  voiceSensitivity: Sensitivity;         // how easily we treat sound as speech
  interruptionSensitivity: Sensitivity;  // barge-in aggressiveness
  voiceSpeed: VoiceSpeed;                // TTS pacing hint
  speakerVolume: number;                 // 0..1
  noiseSuppression: boolean;
  siteModeDefault: boolean;              // future sessions start in site mode
}

const KEY = "voice_settings_v2";
const LEGACY_SITE_KEY = "voice_site_mode";

export const DEFAULTS: VoiceSettings = {
  mode: "site",
  pushToTalk: true,
  voiceSensitivity: "high",
  interruptionSensitivity: "low",
  voiceSpeed: "normal",
  speakerVolume: 0.9,
  noiseSuppression: true,
  siteModeDefault: true,
};

export function loadSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<VoiceSettings>;
      return { ...DEFAULTS, ...parsed };
    }
    // Legacy migration
    const legacy = localStorage.getItem(LEGACY_SITE_KEY);
    if (legacy === "0") return { ...DEFAULTS, mode: "office", pushToTalk: false, siteModeDefault: false };
  } catch { /* noop */ }
  return { ...DEFAULTS };
}

export function saveSettings(s: VoiceSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ }
}

// Applying a mode replaces the tuning knobs but keeps user's speakerVolume
// & noiseSuppression preferences.
export function applyModePreset(current: VoiceSettings, mode: VoiceMode): VoiceSettings {
  const base = { ...current, mode };
  switch (mode) {
    case "office":
      return {
        ...base,
        pushToTalk: false,
        voiceSensitivity: "medium",
        interruptionSensitivity: "high",
      };
    case "site":
      return {
        ...base,
        pushToTalk: true,
        voiceSensitivity: "high",
        interruptionSensitivity: "low",
        noiseSuppression: true,
      };
    case "driving":
      return {
        ...base,
        pushToTalk: false,
        voiceSensitivity: "medium",
        interruptionSensitivity: "low",
        speakerVolume: 1,
      };
  }
}

// Anti-barge-in only when interruption sensitivity is low (site/driving default).
export function shouldBlockBargeIn(s: VoiceSettings): boolean {
  return s.interruptionSensitivity === "low" || s.mode === "site" || s.mode === "driving";
}
