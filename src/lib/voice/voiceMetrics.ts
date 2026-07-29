// ============================================================
// src/lib/voice/voiceMetrics.ts
// Internal-only latency instrumentation for the voice stack.
// Never surfaced to end users — only the dev panel + console.
// ============================================================

import { logger } from "@/lib/logger";

export interface VoiceMetrics {
  /** ms from connect() to the transport being usable. */
  connectionMs: number | null;
  /** ms from connect() to the first user transcript delta. */
  firstTranscriptMs: number | null;
  /** ms from connect() to the first assistant text token. */
  firstTokenMs: number | null;
  /** ms from connect() to the first assistant audio frame. */
  firstAudioMs: number | null;
  /** Latency of the most recent turn (user speech end → first audio). */
  lastTurnMs: number | null;
  reconnects: number;
}

export const EMPTY_METRICS: VoiceMetrics = {
  connectionMs: null,
  firstTranscriptMs: null,
  firstTokenMs: null,
  firstAudioMs: null,
  lastTurnMs: null,
  reconnects: 0,
};

export class VoiceMetricsTracker {
  private t0 = 0;
  private turnStart = 0;
  private m: VoiceMetrics = { ...EMPTY_METRICS };

  startSession() {
    this.t0 = performance.now();
    this.m = { ...EMPTY_METRICS, reconnects: this.m.reconnects };
  }

  private since() {
    return this.t0 ? Math.round(performance.now() - this.t0) : null;
  }

  markConnected() {
    if (this.m.connectionMs == null) {
      this.m.connectionMs = this.since();
      logger.debug(`[voice:metrics] connection=${this.m.connectionMs}ms`);
    }
  }

  markFirstTranscript() {
    if (this.m.firstTranscriptMs == null) {
      this.m.firstTranscriptMs = this.since();
      logger.debug(`[voice:metrics] firstTranscript=${this.m.firstTranscriptMs}ms`);
    }
  }

  markTurnStart() {
    this.turnStart = performance.now();
  }

  markFirstToken() {
    if (this.m.firstTokenMs == null) {
      this.m.firstTokenMs = this.since();
      logger.debug(`[voice:metrics] firstToken=${this.m.firstTokenMs}ms`);
    }
  }

  markFirstAudio() {
    if (this.m.firstAudioMs == null) {
      this.m.firstAudioMs = this.since();
      logger.debug(`[voice:metrics] firstAudio=${this.m.firstAudioMs}ms`);
    }
    if (this.turnStart) {
      this.m.lastTurnMs = Math.round(performance.now() - this.turnStart);
      this.turnStart = 0;
    }
  }

  markReconnect() {
    this.m.reconnects += 1;
  }

  /** Next assistant turn should re-measure "first audio" latency. */
  resetTurn() {
    this.turnStart = performance.now();
  }

  snapshot(): VoiceMetrics {
    return { ...this.m };
  }
}
