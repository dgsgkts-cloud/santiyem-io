// ============================================================
// src/lib/voice/wake/wakeWordTypes.ts
// Provider-agnostic wake-word contract. Nothing here may
// reference a concrete vendor (Web Speech, Porcupine, …) and
// nothing here may reference the realtime voice engine.
// ============================================================

/**
 * Swappable wake-word backends. Adding a provider here must never
 * require a UI change — the factory resolves the implementation.
 */
export type WakeWordProviderId =
  | "webspeech"
  | "openai"
  | "porcupine"
  | "picovoice"
  | "openwakeword"
  | "custom";

export type WakeWordState =
  /** Not running; no microphone held. */
  | "stopped"
  /** Acquiring resources. */
  | "starting"
  /** Actively scanning audio for the wake phrase. */
  | "listening"
  /** Temporarily suspended (keyboard, modal, background…). Resumable. */
  | "paused"
  /** Browser/device cannot run this provider at all. */
  | "unsupported"
  /** Microphone permission missing or revoked. Terminal until re-enabled. */
  | "denied"
  /** Recoverable failure; the engine backs off and retries. */
  | "error";

export interface WakeWordEvent {
  /** The phrase variant that matched. */
  phrase: string;
  /** Raw recognised text that contained the phrase. */
  transcript: string;
  ts: number;
}

export interface WakeWordEngineConfig {
  /**
   * Accepted phrase variants, lower-cased by the engine.
   * Multiple entries allow diacritic/spelling tolerance.
   */
  phrases: string[];
  language?: string;
  /** Ignore repeat detections inside this window. */
  cooldownMs?: number;
}

/**
 * Every wake-word provider implements this. UI and hooks depend on
 * this interface only — never on a vendor SDK.
 */
export interface WakeWordEngine {
  readonly provider: WakeWordProviderId;
  /** Static capability probe — false means "never try to start". */
  readonly supported: boolean;

  start(config: WakeWordEngineConfig): Promise<void>;
  stop(): void;

  /** Suspend detection but keep the engine armed for `resume()`. */
  pause(reason?: string): void;
  resume(): void;

  getState(): WakeWordState;

  onWakeWord(cb: (e: WakeWordEvent) => void): () => void;
  onStateChange(cb: (s: WakeWordState) => void): () => void;

  /** Release every resource. The instance is unusable afterwards. */
  destroy(): void;
}
