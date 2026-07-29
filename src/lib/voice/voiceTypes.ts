// ============================================================
// src/lib/voice/voiceTypes.ts
// Provider-agnostic voice types. Nothing here may reference a
// concrete vendor (ElevenLabs, OpenAI, …).
// ============================================================

export type VoiceProviderId = "openai-realtime" | "elevenlabs" | "pipeline";

/** Global voice lifecycle states (Sprint 32.0 contract). */
export type VoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "disconnected"
  | "error";

export type TranscriptRole = "user" | "assistant";

export interface TranscriptChunk {
  id: string;
  role: TranscriptRole;
  text: string;
  /** false while the model/ASR is still streaming this item. */
  final: boolean;
  ts: number;
}

export interface VoiceToolCall {
  callId: string;
  name: string;
  args: Record<string, unknown>;
}

export type VoiceToolResult = { ok: true; data: unknown } | { ok: false; error: string };

export interface VoiceEngineEvents {
  state: VoiceState;
  /** Partial or final transcript chunk (user or assistant). */
  transcript: TranscriptChunk;
  /** Final assistant text for a completed turn. */
  response: { text: string; ts: number };
  toolCall: VoiceToolCall;
  error: { code: string; message: string; fatal?: boolean };
  /** Emitted when the engine gives up and the UI should fall back to text chat. */
  fallback: { reason: string };
}

export type VoiceEventName = keyof VoiceEngineEvents;

export interface VoiceToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface VoiceEngineConfig {
  /** Extra runtime context appended to the shared system prompt. */
  instructionsSuffix?: string;
  /** Shared tool schema — identical to the one used by text chat. */
  tools?: VoiceToolDefinition[];
  /** Executes a tool call and returns a JSON-serialisable result. */
  onToolCall?: (call: VoiceToolCall) => Promise<VoiceToolResult>;
  voice?: string;
  model?: string;
  /** 0..1 output volume. */
  volume?: number;
  language?: string;
  /** Auto reconnect attempts before emitting `fallback`. */
  maxReconnects?: number;
}

/**
 * Every voice provider must implement this. Application code depends on this
 * interface only — never on a vendor SDK.
 */
export interface VoiceEngine {
  readonly provider: VoiceProviderId;

  connect(config?: VoiceEngineConfig): Promise<void>;
  disconnect(): Promise<void>;

  startListening(): void;
  stopListening(): void;

  mute(): void;
  unmute(): void;
  isMuted(): boolean;

  isConnected(): boolean;
  getState(): VoiceState;

  sendText(text: string): void;
  /** Stop assistant speech immediately and resume listening. */
  interrupt(): void;

  setVolume(v: number): void;
  destroy(): void;

  /** 0..1 microphone input level (optional). */
  getMicLevel?(): number;
  /** 0..1 assistant output audio level (optional). */
  getOutputLevel?(): number;
  /** Internal latency instrumentation — dev panel only (optional). */
  getMetrics?(): {
    connectionMs: number | null;
    firstTranscriptMs: number | null;
    firstTokenMs: number | null;
    firstAudioMs: number | null;
    lastTurnMs: number | null;
    reconnects: number;
  };

  onTranscript(cb: (t: TranscriptChunk) => void): () => void;
  onResponse(cb: (r: { text: string; ts: number }) => void): () => void;
  onStateChange(cb: (s: VoiceState) => void): () => void;
  onError(cb: (e: { code: string; message: string; fatal?: boolean }) => void): () => void;
  onFallback(cb: (e: { reason: string }) => void): () => void;
}
