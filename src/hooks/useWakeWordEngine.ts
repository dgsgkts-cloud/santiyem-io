// ============================================================
// src/hooks/useWakeWordEngine.ts
// React binding for the provider-agnostic wake-word engine.
// Owns: enable/disable, automatic pause/resume, permission loss.
// Knows nothing about OpenAI Realtime — the two stay decoupled.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { createWakeWordEngine } from "@/lib/voice/wake";
import { queryMicPermission, onMicPermissionChange } from "@/lib/voice/micPermission";

import type {
  WakeWordEngine,
  WakeWordEvent,
  WakeWordProviderId,
  WakeWordState,
} from "@/lib/voice/wake";
import { useVoiceActivityGuards, type VoicePauseReason } from "./useVoiceActivityGuards";
import { claimMic, getMicOwner, onMicOwnerChange, releaseMic } from "@/lib/voice/micOwnership";

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

  // --- microphone ownership --------------------------------------------
  // A live voice session always owns the microphone. Wake-word detection
  // must never call getUserMedia at the same time.
  const [micOwner, setMicOwner] = useState(getMicOwner);
  useEffect(() => onMicOwnerChange(setMicOwner), []);
  const sessionOwnsMic = micOwner === "voice_session";

  // --- permission gate ---------------------------------------------------
  // Background detection may NEVER raise the browser permission prompt: it
  // starts only when the microphone is already granted, and stops again the
  // moment the user revokes it.
  const [micGranted, setMicGranted] = useState(false);
  useEffect(() => {
    let alive = true;
    void queryMicPermission().then((p) => { if (alive) setMicGranted(p === "granted"); });
    const off = onMicPermissionChange((p) => setMicGranted(p === "granted"));
    return () => { alive = false; off(); };
  }, []);

  // --- engine lifecycle -------------------------------------------------
  useEffect(() => {
    if (!enabled || sessionOwnsMic || !micGranted) return;
    // Refused while a conversation holds the microphone.
    if (!claimMic("wake_word")) return;

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
      releaseMic("wake_word");
      setState("stopped");
    };
  }, [enabled, provider, language, phrasesKey, sessionOwnsMic, micGranted]);


  // --- automatic pause / resume ----------------------------------------
  const shouldPause = guards.paused || suspended || sessionOwnsMic;

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

  const active = enabled && !sessionOwnsMic && state === "listening";

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
