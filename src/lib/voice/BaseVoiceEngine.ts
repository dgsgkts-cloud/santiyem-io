// ============================================================
// src/lib/voice/BaseVoiceEngine.ts
// Shared plumbing (state machine + emitter) for all providers.
// ============================================================

import { VoiceEmitter } from "./voiceEvents";
import type {
import { setVoiceDiagnostics } from "./voiceDiagnostics";
  TranscriptChunk,
  VoiceErrorKind,
  VoiceEngine,
  VoiceEngineConfig,
  VoiceProviderId,
  VoiceState,
} from "./voiceTypes";

export abstract class BaseVoiceEngine implements VoiceEngine {
  abstract readonly provider: VoiceProviderId;

  protected emitter = new VoiceEmitter();
  protected state: VoiceState = "idle";
  protected config: VoiceEngineConfig = {};
  protected muted = false;

  protected setState(s: VoiceState) {
    if (this.state === s) return;
    this.state = s;
    setVoiceDiagnostics({ sessionState: s });
    this.emitter.emit("state", s);
  }

  protected emitTranscript(chunk: TranscriptChunk) {
    this.emitter.emit("transcript", chunk);
  }

  /**
   * Technical codes stay in the console; the UI only ever consumes `kind`.
   */
  protected emitError(code: string, message: string, fatal = false, kind?: VoiceErrorKind) {
    console.error(`[voice:${this.provider}] ${code}: ${message}`);
    setVoiceDiagnostics({ lastErrorCode: code });
    this.emitter.emit("error", { code, message, fatal, kind: kind ?? classifyVoiceError(code) });
    if (fatal) this.setState("error");
  }

  abstract connect(config?: VoiceEngineConfig): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract startListening(): void;
  abstract stopListening(): void;
  abstract mute(): void;
  abstract unmute(): void;
  abstract sendText(text: string): void;
  abstract interrupt(): void;
  abstract setVolume(v: number): void;

  isMuted() { return this.muted; }
  getState() { return this.state; }
  isConnected() {
    return this.state !== "idle" && this.state !== "disconnected" && this.state !== "error";
  }

  destroy() {
    void this.disconnect();
    this.emitter.clear();
  }

  onTranscript(cb: (t: TranscriptChunk) => void) { return this.emitter.on("transcript", cb); }
  onResponse(cb: (r: { text: string; ts: number }) => void) { return this.emitter.on("response", cb); }
  onStateChange(cb: (s: VoiceState) => void) { return this.emitter.on("state", cb); }
  onError(cb: (e: { code: string; message: string; fatal?: boolean; kind?: VoiceErrorKind }) => void) {
    return this.emitter.on("error", cb);
  }
  onToolCall(cb: (c: { callId: string; name: string; args: Record<string, unknown> }) => void) {
    return this.emitter.on("toolCall", cb);
  }
}

/** Maps internal codes to the five user-facing categories. */
export function classifyVoiceError(code: string): VoiceErrorKind {
  if (/audio_device_unavailable|mic|permission|NotAllowed/i.test(code)) return "mic_permission";
  if (/token|auth|401|403|client_secret|quota/i.test(code)) return "auth";
  if (/connection_lost|data_channel_closed|pc_failed|pc_disconnected/i.test(code)) return "connection_lost";
  if (/playback|audio_play/i.test(code)) return "audio_playback";
  return "connection";
}
