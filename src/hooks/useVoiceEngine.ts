// ============================================================
// src/hooks/useVoiceEngine.ts
// React binding for the voice engine. OpenAI Realtime is the only
// provider — there is no fallback vendor and no provider switching.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { createVoiceEngine, defaultEngineConfig } from "@/lib/voice/VoiceEngineFactory";
import { getVoiceProvider, isVoiceDebugEnabled } from "@/lib/voice/voiceConfig";
import { claimMic, releaseMic } from "@/lib/voice/micOwnership";
import { EMPTY_METRICS, type VoiceMetrics } from "@/lib/voice/voiceMetrics";
import { isVoiceErrorRetryable } from "@/lib/voice/voiceTypes";
import type {
  TranscriptChunk,
  VoiceEngine,
  VoiceEngineConfig,
  VoiceErrorKind,
  VoiceProviderId,
  VoiceState,
} from "@/lib/voice/voiceTypes";

export interface UseVoiceEngineResult {
  provider: VoiceProviderId;
  state: VoiceState;
  transcripts: TranscriptChunk[];
  /** User-safe status line (never technical). */
  statusMessage: string | null;
  /** Last user-facing error category, if any. */
  errorKind: VoiceErrorKind | null;
  /**
   * False for permanent configuration/billing failures — the UI must not
   * schedule an automatic reconnect in that case.
   */
  canAutoRetry: boolean;
  metrics: VoiceMetrics;
  micLevel: number;
  /** 0..1 realtime energy of the assistant's voice. */
  outputLevel: number;
  /**
   * Live audio levels sampled without React state, so animations can run at
   * 60fps without re-rendering the component tree.
   */
  levels: React.MutableRefObject<{ mic: number; output: number }>;

  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  /** Full teardown so a retry can build a fresh session. */
  reset: () => Promise<void>;
  sendText: (t: string) => void;
  interrupt: () => void;
  mute: () => void;
  unmute: () => void;
  setVolume: (v: number) => void;
}

const RECONNECT_MESSAGE = "Ses bağlantısı yeniden kuruluyor...";

export function useVoiceEngine(config: VoiceEngineConfig = {}): UseVoiceEngineResult {
  const provider = getVoiceProvider();
  const engineRef = useRef<VoiceEngine | null>(null);
  if (!engineRef.current) engineRef.current = createVoiceEngine();

  const [state, setState] = useState<VoiceState>("idle");
  const [transcripts, setTranscripts] = useState<TranscriptChunk[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<VoiceErrorKind | null>(null);
  const [metrics, setMetrics] = useState<VoiceMetrics>(EMPTY_METRICS);
  const [micLevel, setMicLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  /** Frame-rate levels for the visualization — never triggers a render. */
  const levels = useRef({ mic: 0, output: 0 });
  /** Bumped after a teardown so listeners rebind to the new engine. */
  const [engineEpoch, setEngineEpoch] = useState(0);

  const configRef = useRef(config);
  configRef.current = config;
  const wasConnectedRef = useRef(false);

  useEffect(() => {
    const active = engineRef.current;
    if (!active) return;
    const offs = [
      active.onStateChange((s) => {
        setState(s);
        if (s === "connecting" || s === "mic_setup") {
          setStatusMessage(wasConnectedRef.current ? RECONNECT_MESSAGE : null);
        } else if (s === "ready" || s === "listening" || s === "speaking" || s === "thinking") {
          wasConnectedRef.current = true;
          setStatusMessage(null);
          setErrorKind(null);
        }
      }),

      // Technical codes are logged only — users see the mapped category.
      active.onError((e) => {
        console.error(`[voice] ${e.code}: ${e.message}`);
        if (e.fatal) setErrorKind(e.kind ?? "connection");
      }),
      active.onTranscript((chunk) =>
        setTranscripts((prev) => {
          const idx = prev.findIndex((t) => t.id === chunk.id && t.role === chunk.role);
          if (idx === -1) return [...prev, chunk];
          const next = prev.slice();
          next[idx] = chunk;
          return next;
        }),
      ),
    ];
    return () => {
      offs.forEach((off) => off());
      active.destroy();
      releaseMic("voice_session");
    };
  }, [engineEpoch]);

  // --- live audio levels (drive the orb animation) ---------------------
  // Written into a ref every frame; React state is updated at a low rate and
  // only for the (internal) debug panel, so the overlay does not re-render
  // dozens of times per second.
  useEffect(() => {
    const live = state === "listening" || state === "speaking" || state === "thinking" || state === "ready";
    if (!live) {
      levels.current = { mic: 0, output: 0 };
      setMicLevel(0); setOutputLevel(0);
      return;
    }
    let raf = 0;
    let lastState = 0;
    const debug = isVoiceDebugEnabled();
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const e = engineRef.current;
      if (!e) return;
      levels.current = {
        mic: e.getMicLevel?.() ?? 0,
        output: e.getOutputLevel?.() ?? 0,
      };
      if (debug && t - lastState > 200) {
        lastState = t;
        setMicLevel(levels.current.mic);
        setOutputLevel(levels.current.output);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  // --- dev instrumentation (internal only) -----------------------------
  useEffect(() => {
    if (!isVoiceDebugEnabled()) return;
    const id = window.setInterval(() => {
      const e = engineRef.current;
      if (!e) return;
      setMetrics(e.getMetrics?.() ?? EMPTY_METRICS);
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  const connect = useCallback(async () => {
    setStatusMessage(null);
    setErrorKind(null);
    // The live session owns the microphone; wake-word listening yields.
    claimMic("voice_session");
    await engineRef.current?.connect(defaultEngineConfig(configRef.current));
  }, []);

  const disconnect = useCallback(async () => {
    wasConnectedRef.current = false;
    await engineRef.current?.disconnect();
    releaseMic("voice_session");
  }, []);

  /**
   * Destroys the current engine (peer connection, mic tracks, data
   * channel, listeners) and installs a fresh one. Guarantees a retry can
   * never end up with two sessions.
   */
  const reset = useCallback(async () => {
    wasConnectedRef.current = false;
    const old = engineRef.current;
    engineRef.current = createVoiceEngine();
    try { await old?.disconnect(); } catch { /* noop */ }
    old?.destroy();
    releaseMic("voice_session");
    setTranscripts([]);
    setErrorKind(null);
    setStatusMessage(null);
    setState("idle");
    setEngineEpoch((n) => n + 1);
  }, []);

  return {
    provider,
    state,
    transcripts,
    statusMessage,
    errorKind,
    canAutoRetry: isVoiceErrorRetryable(errorKind),
    metrics,
    micLevel,
    outputLevel,
    levels,
    connect,
    disconnect,
    reset,
    sendText: (t) => engineRef.current?.sendText(t),
    interrupt: () => engineRef.current?.interrupt(),
    mute: () => engineRef.current?.mute(),
    unmute: () => engineRef.current?.unmute(),
    setVolume: (v) => engineRef.current?.setVolume(v),
  };
}
