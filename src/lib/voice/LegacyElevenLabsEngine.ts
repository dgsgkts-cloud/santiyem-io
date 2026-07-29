// ============================================================
// src/lib/voice/LegacyElevenLabsEngine.ts
// Adapter that keeps the existing ElevenLabs agent path reachable
// through the VoiceEngine contract. The heavy lifting still lives in
// `VoiceCopilot` (ElevenLabs React SDK); this adapter simply reports
// the provider so callers can branch once, in the factory, instead of
// scattering vendor checks across the UI.
// ============================================================

import { BaseVoiceEngine } from "./BaseVoiceEngine";
import type { VoiceEngineConfig, VoiceProviderId } from "./voiceTypes";

export class LegacyElevenLabsEngine extends BaseVoiceEngine {
  readonly provider: VoiceProviderId = "elevenlabs";

  /** True — the UI must mount the SDK-driven component for this provider. */
  readonly requiresLegacyComponent = true;

  async connect(config: VoiceEngineConfig = {}): Promise<void> {
    this.config = { ...this.config, ...config };
    this.setState("connecting");
  }

  async disconnect(): Promise<void> { this.setState("disconnected"); }
  startListening(): void { this.setState("listening"); }
  stopListening(): void { this.setState("idle"); }
  mute(): void { this.muted = true; }
  unmute(): void { this.muted = false; }
  sendText(): void { /* handled by the legacy component */ }
  interrupt(): void { this.setState("listening"); }
  setVolume(v: number): void { this.config.volume = v; }
}
