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
import type { RealtimeCard } from "./RealtimeVoicePanel";
import { VoiceSessionOverlay } from "./VoiceSessionOverlay";


interface Props {
  onClose: () => void;
  access: VoiceAccess;
  compact?: boolean;
  autoStart?: boolean;
  initialContext?: string;
  initialCards?: RealtimeCard[];
  autoSpeak?: boolean;
  /** Sprint 32.2 — "wake" sessions self-terminate after silence. */
  sessionMode?: "manual" | "wake";
  conversationMode?: boolean;
  greeting?: string;
  onSessionEnd?: (reason: "silence" | "turn-complete" | "user") => void;
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
    // The legacy copilot has no wake-session contract — strip those props.
    const { sessionMode: _sm, conversationMode: _cm, greeting: _g, onSessionEnd, ...legacyProps } = props;
    return (
      <>
        <VoiceCopilot
          {...legacyProps}
          onClose={() => { onSessionEnd?.("user"); legacyProps.onClose(); }}
          initialCards={props.initialCards?.map((c) => ({ ...c, type: "info" as const }))}
        />
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

  // Sprint 42 — single unified voice surface: the in-page overlay.
  return (
    <VoiceSessionOverlay
      onClose={props.onClose}
      autoStart
      initialContext={props.initialContext}
      sessionMode={props.sessionMode}
      conversationMode={props.conversationMode}
      greeting={props.greeting}
      onSessionEnd={props.onSessionEnd}
    />
  );
}

