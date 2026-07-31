// ============================================================
// Sprint 42 / 42B — the single in-page voice surface.
// Full-screen focused overlay: one shared state machine, real
// audio-reactive orb, live captions above the controls and only
// the essential controls. No route change, no white second page,
// no dashboard content while a conversation is active.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Captions, CaptionsOff, X, Keyboard, Hand } from "lucide-react";
import { useVoiceEngine } from "@/hooks/useVoiceEngine";
import { CONVERSATION_SILENCE_MS, SINGLE_TURN_GRACE_MS } from "@/lib/voice/voiceSettings";
import { voiceHaptic } from "@/lib/voice/haptics";
import { MicPermissionScreen } from "./MicPermissionScreen";
import { VoiceReactiveOrb, type VoicePhase } from "./VoiceReactiveOrb";
import { VoiceCaptions } from "./VoiceCaptions";
import "@/styles/voice.css";

interface Props {
  onClose: () => void;
  autoStart?: boolean;
  initialContext?: string;
  /** Wake sessions self-terminate after silence. */
  sessionMode?: "manual" | "wake";
  conversationMode?: boolean;
  greeting?: string;
  onSessionEnd?: (reason: "silence" | "turn-complete" | "user") => void;
}

/**
 * Single source of truth for what the user is told. Turkish only, never
 * ONLINE/OFFLINE, and never two contradictory labels on one screen.
 */
const PHASE_LABEL: Record<VoicePhase, string> = {
  idle: "Hazır",
  requesting_permission: "Mikrofon izni bekleniyor",
  connecting: "Hazırlanıyor",
  listening: "Dinliyorum",
  user_finished: "Anlıyorum",
  thinking: "Yanıt hazırlanıyor",
  speaking: "Yanıtlıyor",
  interrupted: "Dinliyorum",
  ending: "Bağlantı kesildi",
  error: "Bağlantı kesildi",
};

/** Only surface "Hazırlanıyor" if initialization is actually slow. */
const PREPARING_VISIBLE_AFTER_MS = 700;
const CONNECT_TIMEOUT_MS = 8000;

export function VoiceSessionOverlay({
  onClose,
  autoStart = true,
  initialContext,
  sessionMode = "manual",
  conversationMode = false,
  greeting,
  onSessionEnd,
}: Props) {
  const engineConfig = useMemo(() => ({ instructionsSuffix: initialContext }), [initialContext]);
  const voice = useVoiceEngine(engineConfig);

  const [muted, setMuted] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [micBlocked, setMicBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [askingPermission, setAskingPermission] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [showPreparing, setShowPreparing] = useState(false);
  const startedRef = useRef(false);
  const greetedRef = useRef(false);
  const endedRef = useRef(false);
  const spokeOnceRef = useRef(false);
  const stoppedRef = useRef(false);
  const autoRetriesRef = useRef(0);
  const [retryIn, setRetryIn] = useState<number | null>(null);


  const activityRef = useRef(Date.now());
  const turnCompletedAtRef = useRef<number | null>(null);

  // ---- start: permission, then connect --------------------------------
  const start = useCallback(async () => {
    setFailed(false);
    setAskingPermission(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setAskingPermission(false);
      setMicBlocked(true);
      return;
    }
    setMicBlocked(false);
    setAskingPermission(false);
    setPreparing(true);
    try {
      await voice.connect();
    } catch {
      setFailed(true);
    } finally {
      setPreparing(false);
    }
  }, [voice]);

  useEffect(() => {
    if (startedRef.current || !autoStart) return;
    startedRef.current = true;
    void start();
    // Intentionally runs once per mounted session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // "Hazırlanıyor" appears only when preparation is slow (~700ms+).
  useEffect(() => {
    if (!preparing) { setShowPreparing(false); return; }
    const t = window.setTimeout(() => setShowPreparing(true), PREPARING_VISIBLE_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [preparing]);

  // Never stay in a loading state: 8s ceiling, then a recoverable failure.
  useEffect(() => {
    if (!preparing && !showPreparing) return;
    const t = window.setTimeout(() => {
      if (voice.state !== "listening" && voice.state !== "speaking" && voice.state !== "thinking") {
        setPreparing(false);
        setFailed(true);
      }
    }, CONNECT_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [preparing, showPreparing, voice.state]);

  useEffect(() => {
    if (voice.state === "listening" || voice.state === "speaking" || voice.state === "thinking") {
      setFailed(false);
      setPreparing(false);
      stoppedRef.current = false;
      autoRetriesRef.current = 0;
      setRetryIn(null);
    }
  }, [voice.state]);



  // Greeting for wake sessions — spoken once when the session goes live.
  useEffect(() => {
    if (!greeting || greetedRef.current) return;
    if (voice.state !== "listening") return;
    greetedRef.current = true;
    voice.sendText(greeting);
  }, [greeting, voice]);

  // ---- end session ---------------------------------------------------
  const end = useCallback(
    (reason: "silence" | "turn-complete" | "user") => {
      if (endedRef.current) return;
      endedRef.current = true;
      voiceHaptic("end");
      void voice.disconnect().finally(() => {
        onSessionEnd?.(reason);
        onClose();
      });
    },
    [voice, onSessionEnd, onClose],
  );

  // Escape closes; body scroll is locked while the overlay owns the screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") end("user"); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [end]);

  // ---- wake-session auto close (unchanged behaviour) ------------------
  useEffect(() => {
    if (voice.state === "listening" || voice.state === "speaking" || voice.state === "thinking") {
      activityRef.current = Date.now();
    }
    if (voice.state === "speaking") spokeOnceRef.current = true;
    if (voice.state === "listening" && spokeOnceRef.current) {
      turnCompletedAtRef.current ??= Date.now();
    } else {
      turnCompletedAtRef.current = null;
    }
  }, [voice.state, voice.transcripts]);

  useEffect(() => {
    if (sessionMode !== "wake") return;
    const id = window.setInterval(() => {
      const idleFor = Date.now() - activityRef.current;
      if (!conversationMode && turnCompletedAtRef.current &&
          Date.now() - turnCompletedAtRef.current > SINGLE_TURN_GRACE_MS) {
        end("turn-complete");
      } else if (idleFor > CONVERSATION_SILENCE_MS) {
        end("silence");
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [sessionMode, conversationMode, end]);

  // ---- one derived phase ----------------------------------------------
  const phase: VoicePhase = askingPermission
    ? "requesting_permission"
    : failed || voice.state === "error" || voice.state === "disconnected"
      ? "error"
      : showPreparing
        ? "connecting"
        : voice.state === "interrupted"
          ? "listening"
          : voice.state === "idle"
            ? (preparing ? "connecting" : "idle")
            : (voice.state as VoicePhase);

  // Connection lost → immediately silence audio and hold a single
  // "Bağlantı kesildi" screen with one reconnect action.
  useEffect(() => {
    if (phase !== "error" || stoppedRef.current) return;
    stoppedRef.current = true;
    try { voice.interrupt(); } catch { /* noop */ }
    try { voice.mute(); } catch { /* noop */ }
    void voice.disconnect().catch(() => { /* noop */ });
  }, [phase, voice]);

  const reconnect = useCallback(() => {
    stoppedRef.current = false;
    setMuted(false);
    void start();
  }, [start]);


  const isSpeaking = phase === "speaking";
  const level = isSpeaking ? voice.outputLevel : muted ? 0 : voice.micLevel;
  const noAnalyser = level === 0 && (phase === "listening" || phase === "speaking");

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (next) voice.mute(); else voice.unmute();
  };

  if (micBlocked) {
    return (
      <MicPermissionScreen
        onRetry={() => { void start(); }}
        onCancel={() => end("user")}
      />
    );
  }

  const ctrl =
    "flex h-14 w-14 items-center justify-center rounded-full border transition active:scale-95";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Şantiyem AI sesli mod"
      className="fixed inset-0 z-[70] flex flex-col bg-[#0B0F14] animate-in fade-in duration-200"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 12px)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 16px)",
        minHeight: "100dvh",
      }}
    >
      {/* Top — compact close only. */}
      <div className="flex shrink-0 items-center justify-end px-4">
        <button
          type="button"
          onClick={() => end("user")}
          aria-label="Sesli modu kapat"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Center — orb + single state label. */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-5">
        <VoiceReactiveOrb phase={phase} level={level} fallbackMotion={noAnalyser} />

        {phase === "error" ? (
          <div className="w-full max-w-xs text-center">
            <p className="text-[15px] font-medium text-white/90">Bağlantı kesildi</p>
            <p className="mt-1 text-[13px] text-white/55">Ses durduruldu. Yeniden bağlanabilirsiniz.</p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={reconnect}
                className="flex items-center justify-center rounded-[16px] bg-primary text-[15px] font-semibold text-primary-foreground"
                style={{ height: 48 }}
              >
                Yeniden Bağlan
              </button>

              <button
                type="button"
                onClick={() => end("user")}
                className="flex items-center justify-center rounded-[14px] border border-white/15 text-[14px] font-medium text-white/85"
                style={{ height: 44 }}
              >
                Yazarak Devam Et
              </button>
              <button
                type="button"
                onClick={() => end("user")}
                className="flex min-h-[44px] items-center justify-center text-[14px] text-white/55"
              >
                Kapat
              </button>
            </div>
          </div>
        ) : (
          <p aria-live="polite" className="text-[15px] font-medium tracking-tight text-white/80">
            {PHASE_LABEL[phase]}
          </p>
        )}

        {/* Barge-in only while the assistant is actually speaking. */}
        {isSpeaking && !conversationMode && (
          <button
            type="button"
            onClick={() => voice.interrupt()}
            className="flex min-h-[44px] items-center gap-2 rounded-[14px] border border-white/15 px-4 text-[14px] font-medium text-white/85"
          >
            <Hand className="h-4 w-4" /> Sözünü Kes
          </button>
        )}
      </div>

      {/* Captions — own region, never behind the controls. */}
      {captionsOn && phase !== "error" && (
        <div className="shrink-0 px-5">
          <VoiceCaptions transcripts={voice.transcripts} />
        </div>
      )}

      {/* Controls — three essentials + optional text hand-off. */}
      {phase !== "error" && (
        <div className="mt-5 flex shrink-0 flex-col items-center gap-3 px-5">
          <div className="flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Mikrofonu aç" : "Mikrofonu kapat"}
              aria-pressed={muted}
              className={`${ctrl} ${muted ? "border-white/20 bg-white/15 text-white" : "border-white/10 bg-white/5 text-white/80"}`}
            >
              {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={() => setCaptionsOn((v) => !v)}
              aria-label={captionsOn ? "Altyazıyı kapat" : "Altyazıyı aç"}
              aria-pressed={captionsOn}
              className={`${ctrl} ${captionsOn ? "border-white/20 bg-white/15 text-white" : "border-white/10 bg-white/5 text-white/80"}`}
            >
              {captionsOn ? <Captions className="h-5 w-5" /> : <CaptionsOff className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={() => end("user")}
              aria-label="Görüşmeyi bitir"
              className={`${ctrl} border-transparent bg-destructive text-destructive-foreground`}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => end("user")}
            className="flex min-h-[44px] items-center gap-2 rounded-[14px] px-3 text-[13px] text-white/55"
            aria-label="Yazarak devam et"
          >
            <Keyboard className="h-4 w-4" /> Yazarak Devam Et
          </button>
        </div>
      )}
    </div>
  );
}

export default VoiceSessionOverlay;
