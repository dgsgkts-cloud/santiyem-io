// ============================================================
// src/components/voice/VoiceExperience.tsx
// Sprint 42B — ONE voice surface for the whole product: the
// in-page full-screen overlay. The obsolete second voice screen
// (VoiceCopilot) is no longer part of the user flow; provider
// selection and the ElevenLabs fallback stay inside the engine
// layer (useVoiceEngine → VoiceEngineFactory), so nothing about
// the backend or the AI tools changes here.
// ============================================================

import type { VoiceAccess } from "@/hooks/useVoiceAccess";
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

export function VoiceExperience(props: Props) {
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
