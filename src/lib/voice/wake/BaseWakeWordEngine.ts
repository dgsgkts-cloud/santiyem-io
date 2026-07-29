// ============================================================
// src/lib/voice/wake/BaseWakeWordEngine.ts
// Shared lifecycle for every wake-word provider: state machine,
// listener plumbing, phrase matching and detection cooldown.
// Concrete providers only implement the audio plumbing.
// ============================================================

import type {
  WakeWordEngine,
  WakeWordEngineConfig,
  WakeWordEvent,
  WakeWordProviderId,
  WakeWordState,
} from "./wakeWordTypes";

const DEFAULT_COOLDOWN_MS = 2500;

/** Strip diacritics so "şantiyem" also matches "santiyem". */
export function normalizePhrase(input: string): string {
  return input
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ıİ]/g, "i")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export abstract class BaseWakeWordEngine implements WakeWordEngine {
  abstract readonly provider: WakeWordProviderId;
  abstract readonly supported: boolean;

  protected config: WakeWordEngineConfig = { phrases: [] };
  protected normalizedPhrases: string[] = [];

  private state: WakeWordState = "stopped";
  private wakeListeners = new Set<(e: WakeWordEvent) => void>();
  private stateListeners = new Set<(s: WakeWordState) => void>();
  private lastDetectionAt = 0;
  private destroyed = false;

  // --- lifecycle (template methods) -----------------------------------

  async start(config: WakeWordEngineConfig): Promise<void> {
    if (this.destroyed) return;
    if (!this.supported) {
      this.setState("unsupported");
      return;
    }
    this.config = config;
    this.normalizedPhrases = config.phrases
      .map(normalizePhrase)
      .filter((p) => p.length > 1);

    if (this.state === "listening" || this.state === "starting") return;
    this.setState("starting");
    try {
      await this.onStart();
      // A provider may already have moved to denied/error during startup.
      if (this.getState() === "starting") this.setState("listening");
    } catch (err) {
      this.handleFailure(err);
    }
  }

  stop(): void {
    if (this.state === "stopped") return;
    try {
      this.onStop();
    } finally {
      this.setState("stopped");
    }
  }

  pause(reason?: string): void {
    // Only a running engine can be paused; never resurrect a denied engine.
    if (this.state !== "listening" && this.state !== "starting") return;
    try {
      this.onPause(reason);
    } finally {
      this.setState("paused");
    }
  }

  resume(): void {
    if (this.state !== "paused") return;
    this.setState("starting");
    try {
      const r = this.onResume();
      if (r instanceof Promise) {
        void r.then(
          () => { if (this.getState() === "starting") this.setState("listening"); },
          (e) => this.handleFailure(e),
        );
      } else if (this.getState() === "starting") {
        this.setState("listening");
      }
    } catch (err) {
      this.handleFailure(err);
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    try { this.onStop(); } catch { /* noop */ }
    this.setState("stopped");
    this.wakeListeners.clear();
    this.stateListeners.clear();
  }

  // --- provider hooks --------------------------------------------------

  protected abstract onStart(): Promise<void> | void;
  protected abstract onStop(): void;
  protected onPause(_reason?: string): void { this.onStop(); }
  protected onResume(): Promise<void> | void { return this.onStart(); }

  // --- shared helpers for providers -----------------------------------

  /** Feed recognised text; emits `wakeWord` when a phrase matches. */
  protected considerTranscript(raw: string): boolean {
    if (this.state !== "listening") return false;
    const text = normalizePhrase(raw);
    if (!text) return false;

    const hit = this.normalizedPhrases.find((p) => text.includes(p));
    if (!hit) return false;

    const now = Date.now();
    const cooldown = this.config.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    if (now - this.lastDetectionAt < cooldown) return false;
    this.lastDetectionAt = now;

    const event: WakeWordEvent = { phrase: hit, transcript: raw, ts: now };
    this.wakeListeners.forEach((cb) => {
      try { cb(event); } catch { /* listener errors never break detection */ }
    });
    return true;
  }

  protected setState(next: WakeWordState): void {
    if (this.state === next) return;
    this.state = next;
    this.stateListeners.forEach((cb) => {
      try { cb(next); } catch { /* noop */ }
    });
  }

  /** Permission problems are terminal; everything else is recoverable. */
  protected handleFailure(err: unknown): void {
    const name = (err as { name?: string; error?: string } | undefined);
    const code = String(name?.name ?? name?.error ?? err ?? "");
    if (/not-?allowed|denied|permission/i.test(code)) {
      this.onStop();
      this.setState("denied");
      return;
    }
    this.setState("error");
  }

  protected get isDestroyed(): boolean { return this.destroyed; }

  // --- public accessors -------------------------------------------------

  getState(): WakeWordState { return this.state; }

  onWakeWord(cb: (e: WakeWordEvent) => void): () => void {
    this.wakeListeners.add(cb);
    return () => this.wakeListeners.delete(cb);
  }

  onStateChange(cb: (s: WakeWordState) => void): () => void {
    this.stateListeners.add(cb);
    return () => this.stateListeners.delete(cb);
  }
}
