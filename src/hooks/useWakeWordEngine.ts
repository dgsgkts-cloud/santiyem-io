// ============================================================
// src/hooks/useWakeWordEngine.ts
// React binding for the provider-agnostic wake-word engine.
// Owns: enable/disable, automatic pause/resume, permission loss.
// Knows nothing about OpenAI Realtime — the two stay decoupled.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { createWakeWordEngine } from "@/lib/voice/wake";
import type {
  WakeWordEngine,
  WakeWordEvent,
  WakeWordProviderId,
  WakeWordState,
} from "@/lib/voice/wake";
import { useVoiceActivityGuards, type VoicePauseReason } from "./useVoiceActivityGuards";

interface Options {
  /** Master switch — false releases the microphone entirely. */
  enabled: boolean;
  phrases: string[];
  provider?: WakeWordProviderId;
  language?: string;
  /** Extra caller-driven suspend (e.g. a conversation is already live). */
  suspended?: boolean;
  onWake: (e: WakeWordEvent) => void;
}

export interface UseWakeWordResult {
  state: WakeWordState;
  /** True when detection is actively running right now. */
  active: boolean;
  supported: boolean;
  pauseReasons: VoicePauseReason[];
}

export function useWakeWordEngine({
  enabled,
  phrases,
  provider = "webspeech",
  language = "tr-TR",
  suspended = false,
  onWake,
}: Options): UseWakeWordResult {
  const engineRef = useRef<WakeWordEngine | null>(null);
  const [state, setState] = useState<WakeWordState>("stopped");
  const [supported, setSupported] = useState(true);

  const onWakeRef = useRef(onWake);
  onWakeRef.current = onWake;

  const guards = useVoiceActivityGuards(enabled);
  const phrasesKey = phrases.join("|");

  // --- engine lifecycle -------------------------------------------------
  useEffect(() => {
    if (!enabled) return;

    const engine = createWakeWordEngine(provider);
    engineRef.current = engine;
    setSupported(engine.supported);

    const offWake = engine.onWakeWord((e) => onWakeRef.current?.(e));
    const offState = engine.onStateChange(setState);

    void engine.start({ phrases: phrasesKey.split("|"), language, cooldownMs: 2500 });

    return () => {
      offWake();
      offState();
      // Releases the microphone — nothing keeps listening once disabled.
      engine.destroy();
      engineRef.current = null;
      setState("stopped");
    };
  }, [enabled, provider, language, phrasesKey]);

  // --- automatic pause / resume ----------------------------------------
  const shouldPause = guards.paused || suspended;

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !enabled) return;
    if (shouldPause) {
      engine.pause(guards.reasons[0] ?? "suspended");
    } else {
      engine.resume();
    }
  }, [shouldPause, guards.reasons, enabled]);

  // --- permission revocation -------------------------------------------
  // If the user revokes microphone access mid-session we stop immediately.
  useEffect(() => {
    if (!enabled || !navigator.permissions?.query) return;
    let status: PermissionStatus | null = null;
    let cancelled = false;

    const onChange = () => {
      if (status?.state === "denied") engineRef.current?.stop();
    };

    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((s) => {
        if (cancelled) return;
        status = s;
        s.addEventListener("change", onChange);
        onChange();
      })
      .catch(() => { /* Firefox has no microphone permission descriptor */ });

    return () => {
      cancelled = true;
      status?.removeEventListener("change", onChange);
    };
  }, [enabled]);

  const active = enabled && state === "listening";

  return {
    state,
    active,
    supported,
    pauseReasons: guards.reasons,
  };
}

/** Imperative helper for callers that need a one-off capability probe. */
export function useWakeWordSupport(provider: WakeWordProviderId = "webspeech") {
  return useCallback(() => {
    const e = createWakeWordEngine(provider);
    const ok = e.supported;
    e.destroy();
    return ok;
  }, [provider]);
}
