// ============================================================
// src/hooks/useVoiceEngine.ts
// React binding for the provider-agnostic voice engine.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createVoiceEngine,
  defaultEngineConfig,
  usesLegacyComponent,
} from "@/lib/voice/VoiceEngineFactory";
import { getVoiceProvider } from "@/lib/voice/voiceConfig";
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
  state: VoiceState;
  transcripts: TranscriptChunk[];
  error: string | null;
  fallback: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendText: (t: string) => void;
  interrupt: () => void;
  mute: () => void;
  unmute: () => void;
  setVolume: (v: number) => void;
}

export function useVoiceEngine(config: VoiceEngineConfig = {}): UseVoiceEngineResult {
  const provider = getVoiceProvider();
  const engineRef = useRef<VoiceEngine | null>(null);
  if (!engineRef.current) engineRef.current = createVoiceEngine(provider);
  const engine = engineRef.current;
  const legacy = usesLegacyComponent(engine);

  const [state, setState] = useState<VoiceState>("idle");
  const [transcripts, setTranscripts] = useState<TranscriptChunk[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);

  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const offs = [
      engine.onStateChange(setState),
      engine.onError((e) => setError(e.message)),
      engine.onFallback((f) => setFallback(f.reason)),
      engine.onTranscript((chunk) =>
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
      engine.destroy();
    };
  }, [engine]);

  const connect = useCallback(async () => {
    setError(null);
    setFallback(null);
    await engine.connect(defaultEngineConfig(configRef.current));
  }, [engine]);

  const disconnect = useCallback(async () => { await engine.disconnect(); }, [engine]);

  return {
    provider,
    legacy,
    state,
    transcripts,
    error,
    fallback,
    connect,
    disconnect,
    sendText: (t) => engine.sendText(t),
    interrupt: () => engine.interrupt(),
    mute: () => engine.mute(),
    unmute: () => engine.unmute(),
    setVolume: (v) => engine.setVolume(v),
  };
}
