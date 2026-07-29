// ============================================================
// src/lib/voice/wake/WebSpeechWakeWordEngine.ts
// Default wake-word provider: on-device Web Speech recognition.
// No audio ever leaves the browser session for detection, and the
// microphone is released the moment the engine stops or pauses.
// ============================================================

import { BaseWakeWordEngine } from "./BaseWakeWordEngine";
import type { WakeWordProviderId } from "./wakeWordTypes";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionLike)
    | null;
}

/** Battery guard: never restart faster than this, and back off on errors. */
const MIN_RESTART_MS = 700;
const MAX_RESTART_MS = 15_000;
/** Stop retrying after this many consecutive failures (no infinite loops). */
const MAX_CONSECUTIVE_FAILURES = 6;

export class WebSpeechWakeWordEngine extends BaseWakeWordEngine {
  readonly provider: WakeWordProviderId = "webspeech";
  readonly supported = getRecognitionCtor() !== null;

  private recognition: SpeechRecognitionLike | null = null;
  private restartTimer: number | null = null;
  private backoffMs = MIN_RESTART_MS;
  private failures = 0;
  /** True while we intentionally tear the recogniser down. */
  private stopping = false;

  protected onStart(): void {
    const Ctor = getRecognitionCtor();
    if (!Ctor) { this.setState("unsupported"); return; }

    this.stopping = false;
    this.clearRestart();
    this.teardownRecognition();

    const rec = new Ctor();
    rec.lang = this.config.language ?? "tr-TR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (ev: any) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const alt = ev.results[i]?.[0];
        const text = String(alt?.transcript ?? "");
        if (!text.trim()) continue;
        // A successful recognition means the pipeline is healthy.
        this.failures = 0;
        this.backoffMs = MIN_RESTART_MS;
        if (this.considerTranscript(text)) return;
      }
    };

    rec.onerror = (ev: any) => {
      const code = String(ev?.error ?? "");
      // "no-speech"/"aborted" are normal in a continuous listener.
      if (code === "no-speech" || code === "aborted") return;
      if (code === "not-allowed" || code === "service-not-allowed") {
        this.stopping = true;
        this.teardownRecognition();
        this.setState("denied");
        return;
      }
      this.failures += 1;
      this.backoffMs = Math.min(this.backoffMs * 2, MAX_RESTART_MS);
    };

    rec.onend = () => {
      if (this.stopping || this.isDestroyed) return;
      if (this.getState() !== "listening" && this.getState() !== "starting") return;
      if (this.failures >= MAX_CONSECUTIVE_FAILURES) {
        // Give up rather than spin the microphone forever.
        this.teardownRecognition();
        this.setState("error");
        return;
      }
      this.scheduleRestart();
    };

    this.recognition = rec;
    try {
      rec.start();
    } catch (err) {
      // "already started" is benign; anything else is a real failure.
      if (!/already/i.test(String((err as Error)?.message))) throw err;
    }
  }

  protected onStop(): void {
    this.stopping = true;
    this.clearRestart();
    this.teardownRecognition();
    this.failures = 0;
    this.backoffMs = MIN_RESTART_MS;
  }

  private scheduleRestart(): void {
    this.clearRestart();
    this.restartTimer = window.setTimeout(() => {
      this.restartTimer = null;
      if (this.stopping || this.isDestroyed) return;
      if (this.getState() !== "listening" && this.getState() !== "starting") return;
      try {
        this.recognition?.start();
      } catch {
        // Recogniser is unusable — rebuild it on the next tick.
        try { this.onStart(); } catch { this.setState("error"); }
      }
    }, this.backoffMs);
  }

  private clearRestart(): void {
    if (this.restartTimer !== null) {
      window.clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  /** Detach handlers before aborting so `onend` cannot resurrect us. */
  private teardownRecognition(): void {
    const rec = this.recognition;
    if (!rec) return;
    this.recognition = null;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try { rec.abort(); } catch { /* noop */ }
    try { rec.stop(); } catch { /* noop */ }
  }
}
