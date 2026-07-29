// ============================================================
// src/hooks/useVoiceEngine.ts
// React binding for the provider-agnostic voice engine.
// Sprint 32.1 — OpenAI Realtime primary, ElevenLabs silent fallback.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createVoiceEngine,
  defaultEngineConfig,
  usesLegacyComponent,
} from "@/lib/voice/VoiceEngineFactory";
import {
  FALLBACK_PROVIDER,
  getVoiceProvider,
  isVoiceDebugEnabled,
} from "@/lib/voice/voiceConfig";
import { EMPTY_METRICS, type VoiceMetrics } from "@/lib/voice/voiceMetrics";
import type {
  TranscriptChunk,
  VoiceEngine,
  VoiceEngineConfig,
  VoiceProviderId,
  VoiceState,
} from "@/lib/voice/voiceTypes";

export interface UseVoiceEngineResult {
  provider: VoiceProviderId;
  /** true → mount the legacy ElevenLabs component instead of using this engine. */
  legacy: boolean;
  /** true once the primary engine failed and we silently switched providers. */
  fellBack: boolean;
  state: VoiceState;
  transcripts: TranscriptChunk[];
  /** User-safe status line (never technical). */
  statusMessage: string | null;
  metrics: VoiceMetrics;
  micLevel: number;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendText: (t: string) => void;
  interrupt: () => void;
  mute: () => void;
  unmute: () => void;
  setVolume: (v: number) => void;
}

const RECONNECT_MESSAGE = "Ses bağlantısı yeniden kuruluyor...";

export function useVoiceEngine(config: VoiceEngineConfig = {}): UseVoiceEngineResult {
  const [provider, setProvider] = useState<VoiceProviderId>(() => getVoiceProvider());
  const [fellBack, setFellBack] = useState(false);
  const engineRef = useRef<VoiceEngine | null>(null);
  if (!engineRef.current) engineRef.current = createVoiceEngine(provider);
  const engine = engineRef.current;
  const legacy = usesLegacyComponent(engine);

  const [state, setState] = useState<VoiceState>("idle");
  const [transcripts, setTranscripts] = useState<TranscriptChunk[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<VoiceMetrics>(EMPTY_METRICS);
  const [micLevel, setMicLevel] = useState(0);

  const configRef = useRef(config);
  configRef.current = config;
  const wasConnectedRef = useRef(false);

  // --- silent fallback -------------------------------------------------
  const switchToFallback = useCallback(
    async (reason: string) => {
      console.warn(`[voice] falling back to ${FALLBACK_PROVIDER} (${reason})`);
      setStatusMessage(RECONNECT_MESSAGE);
      try { await engineRef.current?.disconnect(); } catch { /* noop */ }
      engineRef.current?.destroy();
      engineRef.current = createVoiceEngine(FALLBACK_PROVIDER);
      setProvider(FALLBACK_PROVIDER);
      setFellBack(true);
    },
    [],
  );

  useEffect(() => {
    const active = engineRef.current;
    if (!active) return;
    const offs = [
      active.onStateChange((s) => {
        setState(s);
        if (s === "connecting") {
          setStatusMessage(wasConnectedRef.current ? RECONNECT_MESSAGE : null);
        } else if (s === "listening" || s === "speaking" || s === "thinking") {
          wasConnectedRef.current = true;
          setStatusMessage(null);
        }
      }),
      // Technical errors are logged only — users never see them.
      active.onError((e) => console.error(`[voice] ${e.code}: ${e.message}`)),
      active.onFallback((f) => { void switchToFallback(f.reason); }),
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
    };
  }, [provider, switchToFallback]);

  // --- dev instrumentation (internal only) -----------------------------
  useEffect(() => {
    if (!isVoiceDebugEnabled()) return;
    const id = window.setInterval(() => {
      const e = engineRef.current;
      if (!e) return;
      setMetrics(e.getMetrics?.() ?? EMPTY_METRICS);
      setMicLevel(e.getMicLevel?.() ?? 0);
    }, 250);
    return () => window.clearInterval(id);
  }, [provider]);

  const connect = useCallback(async () => {
    setStatusMessage(null);
    await engineRef.current?.connect(defaultEngineConfig(configRef.current));
  }, []);

  const disconnect = useCallback(async () => {
    wasConnectedRef.current = false;
    await engineRef.current?.disconnect();
  }, []);

  return {
    provider,
    legacy: legacy || fellBack,
    fellBack,
    state,
    transcripts,
    statusMessage,
    metrics,
    micLevel,
    connect,
    disconnect,
    sendText: (t) => engineRef.current?.sendText(t),
    interrupt: () => engineRef.current?.interrupt(),
    mute: () => engineRef.current?.mute(),
    unmute: () => engineRef.current?.unmute(),
    setVolume: (v) => engineRef.current?.setVolume(v),
  };
}
