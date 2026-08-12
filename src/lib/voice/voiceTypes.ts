// ============================================================
// src/lib/voice/voiceTypes.ts
// Provider-agnostic voice types. Nothing here may reference a
// concrete vendor beyond the single supported transport.
// ============================================================

/** OpenAI Realtime is the only supported voice provider. */
export type VoiceProviderId = "openai-realtime";

/**
 * User-facing error categories. Raw technical codes (token_401, sdp_500,
 * pc_failed, data_channel_closed) never reach the UI.
 */
export type VoiceErrorKind =
  | "mic_permission"
  /** Token/session rejected (401/403) or the service is not configured. */
  | "auth"
  /** Quota / billing exhausted on the voice provider account. */
  | "quota"
  /** Invalid model or invalid session configuration (400). */
  | "config"
  /** Network or handshake timeout. */
  | "timeout"
  /** Handshake never produced a usable session. */
  | "connection"
  /** SDP succeeded but OpenAI never sent `session.created`. */
  | "session_not_started"
  /** An established session dropped afterwards. */
  | "connection_lost"
  | "audio_playback";

/** Error kinds that are permanent configuration/billing failures. */
export const PERMANENT_VOICE_ERRORS: readonly VoiceErrorKind[] = [
  "mic_permission",
  "auth",
  "quota",
  "config",
  "session_not_started",
];

export function isVoiceErrorRetryable(kind: VoiceErrorKind | null): boolean {
  if (!kind) return true;
  return !PERMANENT_VOICE_ERRORS.includes(kind);
}


/** Compact card payload handed to a voice session as initial context. */
export interface RealtimeCard {
  id: string;
  title: string;
  value?: string;
  detail?: string;
  tone?: "positive" | "warning" | "danger" | "neutral";
}

/** Global voice lifecycle states (Sprint 32.0 contract). */
export type VoiceState =
  | "idle"
  /** Microphone is being requested / prepared. */
  | "mic_setup"
  /** Transport (token + WebRTC + data channel) is being established. */
  | "connecting"
  /** Realtime session exists (session.created) but no turn started yet. */
  | "ready"
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
  error: { code: string; message: string; fatal?: boolean; kind?: VoiceErrorKind };
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
  /** No model field: the Realtime model is resolved server-side only. */
  /** 0..1 output volume. */
  volume?: number;
  language?: string;
  /**
   * Microphone placement, used for OpenAI input noise reduction.
   * Room/laptop microphones = far_field (default); an explicitly selected
   * headset / close-talk microphone = near_field.
   */
  micProximity?: "far_field" | "near_field";

  /** Auto reconnect attempts before the session ends in an error state. */
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
  onError(cb: (e: { code: string; message: string; fatal?: boolean; kind?: VoiceErrorKind }) => void): () => void;
}
