// ============================================================
// src/components/voice/VoiceExperience.tsx
// Single entry point for voice. Picks the active provider and
// silently swaps to the legacy ElevenLabs copilot if the primary
// engine cannot be established.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import type { VoiceAccess } from "@/hooks/useVoiceAccess";
import { createVoiceEngine, usesLegacyComponent } from "@/lib/voice/VoiceEngineFactory";
import { FALLBACK_PROVIDER, getVoiceProvider, VOICE_RECONNECT_MESSAGE } from "@/lib/voice/voiceConfig";
import { VoiceCopilot } from "./VoiceCopilot";
import { RealtimeVoicePanel, type RealtimeCard } from "./RealtimeVoicePanel";

interface Props {
  onClose: () => void;
  access: VoiceAccess;
  compact?: boolean;
  autoStart?: boolean;
  initialContext?: string;
  initialCards?: RealtimeCard[];
  autoSpeak?: boolean;
}

/** Probe: can this browser + backend actually run the primary engine? */
function primaryIsUsable(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof RTCPeerConnection === "undefined") return false;
  if (!navigator.mediaDevices?.getUserMedia) return false;
  return usesLegacyComponent(createVoiceEngine(getVoiceProvider())) === false;
}

export function VoiceExperience(props: Props) {
  const [useLegacy, setUseLegacy] = useState(() => !primaryIsUsable());
  const [reconnecting, setReconnecting] = useState(false);

  const fallback = useCallback((reason: string) => {
    console.warn(`[voice] switching to ${FALLBACK_PROVIDER}: ${reason}`);
    setReconnecting(true);
    setUseLegacy(true);
  }, []);

  // Engine-level fallbacks bubble up through a window event so the
  // switch also works when the panel unmounts mid-failure.
  useEffect(() => {
    const handler = (e: Event) => fallback(String((e as CustomEvent).detail ?? "engine_fallback"));
    window.addEventListener("voice-engine-fallback", handler);
    return () => window.removeEventListener("voice-engine-fallback", handler);
  }, [fallback]);

  useEffect(() => {
    if (!reconnecting) return;
    const t = window.setTimeout(() => setReconnecting(false), 2500);
    return () => window.clearTimeout(t);
  }, [reconnecting]);

  if (useLegacy) {
    return (
      <>
        <VoiceCopilot {...props} />
        {reconnecting && (
          <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center">
            <div className="rounded-full bg-card/95 px-4 py-2 text-xs text-muted-foreground shadow-lg">
              {VOICE_RECONNECT_MESSAGE}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <RealtimeVoicePanel
      onClose={props.onClose}
      compact={props.compact}
      autoStart={props.autoStart}
      initialContext={props.initialContext}
      initialCards={props.initialCards}
      autoSpeak={props.autoSpeak}
    />
  );
}
