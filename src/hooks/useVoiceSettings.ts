// ============================================================
// src/hooks/useVoiceSettings.ts
// React binding for the client-side voice preferences.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import {
  getVoiceSettings,
  setVoiceSettings,
  VOICE_SETTINGS_EVENT,
  type VoiceSettings,
} from "@/lib/voice/voiceSettings";

export function useVoiceSettings() {
  const [settings, setSettings] = useState<VoiceSettings>(() => getVoiceSettings());

  useEffect(() => {
    const sync = () => setSettings(getVoiceSettings());
    window.addEventListener(VOICE_SETTINGS_EVENT, sync);
    // Keep multiple tabs of the same workspace in agreement.
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(VOICE_SETTINGS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((patch: Partial<VoiceSettings>) => {
    setSettings(setVoiceSettings(patch));
  }, []);

  return { settings, update };
}
