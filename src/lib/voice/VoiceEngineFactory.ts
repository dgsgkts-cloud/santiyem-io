// ============================================================
// src/lib/voice/VoiceEngineFactory.ts
// OpenAI Realtime is the only engine. No provider argument, no
// vendor branching, no unreachable cases.
// ============================================================

import { OpenAIRealtimeEngine } from "./OpenAIRealtimeEngine";
import { executeVoiceTool, VOICE_TOOLS } from "./voiceTools";
import type { VoiceEngine, VoiceEngineConfig } from "./voiceTypes";

export function createVoiceEngine(): VoiceEngine {
  return new OpenAIRealtimeEngine();
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
