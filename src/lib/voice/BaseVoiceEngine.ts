// ============================================================
// src/lib/voice/BaseVoiceEngine.ts
// Shared plumbing (state machine + emitter) for all providers.
// ============================================================

import { VoiceEmitter } from "./voiceEvents";
import type {
  TranscriptChunk,
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
    this.emitter.emit("state", s);
  }

  protected emitTranscript(chunk: TranscriptChunk) {
    this.emitter.emit("transcript", chunk);
  }

  protected emitError(code: string, message: string, fatal = false) {
    console.error(`[voice:${this.provider}] ${code}: ${message}`);
    this.emitter.emit("error", { code, message, fatal });
    if (fatal) this.setState("error");
  }

  protected emitFallback(reason: string) {
    this.emitter.emit("fallback", { reason });
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
  onError(cb: (e: { code: string; message: string; fatal?: boolean }) => void) { return this.emitter.on("error", cb); }
  onFallback(cb: (e: { reason: string }) => void) { return this.emitter.on("fallback", cb); }
  onToolCall(cb: (c: { callId: string; name: string; args: Record<string, unknown> }) => void) {
    return this.emitter.on("toolCall", cb);
  }
}
