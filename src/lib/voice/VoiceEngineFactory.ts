// ============================================================
// src/lib/voice/VoiceEngineFactory.ts
// The ONLY place that knows which concrete engine exists.
// UI code calls `createVoiceEngine()` and depends on the interface.
// ============================================================

import { getVoiceProvider } from "./voiceConfig";
import { LegacyElevenLabsEngine } from "./LegacyElevenLabsEngine";
import { OpenAIRealtimeEngine } from "./OpenAIRealtimeEngine";
import { executeVoiceTool, VOICE_TOOLS } from "./voiceTools";
import type { VoiceEngine, VoiceEngineConfig, VoiceProviderId } from "./voiceTypes";

export function createVoiceEngine(provider: VoiceProviderId = getVoiceProvider()): VoiceEngine {
  switch (provider) {
    case "openai-realtime":
      return new OpenAIRealtimeEngine();
    case "elevenlabs":
    case "pipeline":
    default:
      return new LegacyElevenLabsEngine();
  }
}

/** Sensible defaults so callers only pass what differs. */
export function defaultEngineConfig(overrides: VoiceEngineConfig = {}): VoiceEngineConfig {
  return {
    tools: VOICE_TOOLS,
    onToolCall: executeVoiceTool,
    volume: 0.9,
    language: "tr",
    maxReconnects: 2,
    ...overrides,
  };
}

/** True when the provider still needs the legacy SDK component mounted. */
export function usesLegacyComponent(engine: VoiceEngine): boolean {
  return (engine as LegacyElevenLabsEngine).requiresLegacyComponent === true;
}
