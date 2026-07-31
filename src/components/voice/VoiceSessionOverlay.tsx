// ============================================================
// Sprint 42 — ChatGPT-style in-page voice overlay.
// One single voice surface for the whole app: full-screen focused
// overlay, real audio-reactive orb, live subtitles and three
// controls (mute · subtitles · end). No provider wording, no
// debug/technical copy, no secondary voice screen.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Captions, CaptionsOff, X } from "lucide-react";
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

/** Human status copy — one line, never technical. */
const PHASE_LABEL: Record<VoicePhase, string> = {
  idle: "Hazır",
  requesting_permission: "Mikrofon izni bekleniyor…",
  connecting: "Bağlanıyor…",
  listening: "Dinliyorum",
  user_finished: "Anladım…",
  thinking: "Düşünüyorum…",
  speaking: "Konuşuyorum",
  interrupted: "Dinliyorum",
  ending: "Kapatılıyor…",
  error: "Ses şu an kullanılamıyor",
};

const CONNECT_TIMEOUT_MS = 14000;

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
  const [phaseOverride, setPhaseOverride] = useState<VoicePhase | null>("requesting_permission");
  const startedRef = useRef(false);
  const greetedRef = useRef(false);
  const endedRef = useRef(false);
  const spokeOnceRef = useRef(false);
  const activityRef = useRef(Date.now());
  const turnCompletedAtRef = useRef<number | null>(null);

  // ---- start: permission first, then connect ------------------------
  const start = useCallback(async () => {
    setPhaseOverride("requesting_permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setMicBlocked(true);
      setPhaseOverride(null);
      return;
    }
    setMicBlocked(false);
    setPhaseOverride("connecting");
    try {
      await voice.connect();
      setPhaseOverride(null);
    } catch {
      setPhaseOverride("error");
    }
  }, [voice]);

  useEffect(() => {
    if (startedRef.current || !autoStart) return;
    startedRef.current = true;
    void start();
    // start() identity changes with the engine hook; we intentionally run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // Connection watchdog — never leave the user on an endless spinner.
  useEffect(() => {
    if (phaseOverride !== "connecting") return;
    const t = window.setTimeout(() => {
      if (voice.state === "idle" || voice.state === "connecting") setPhaseOverride("error");
    }, CONNECT_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [phaseOverride, voice.state]);

  useEffect(() => {
    if (voice.state === "listening" || voice.state === "speaking" || voice.state === "thinking") {
      setPhaseOverride(null);
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
      setPhaseOverride("ending");
      voiceHaptic("end");
      void voice.disconnect().finally(() => {
        onSessionEnd?.(reason);
        onClose();
      });
    },
    [voice, onSessionEnd, onClose],
  );

  // Escape closes the overlay; body scroll is locked while it is open.
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

  // ---- derived phase --------------------------------------------------
  const phase: VoicePhase =
    phaseOverride ??
    (voice.state === "error" || voice.state === "disconnected"
      ? "error"
      : voice.state === "interrupted"
        ? "interrupted"
        : (voice.state as VoicePhase));

  const level = phase === "speaking" ? voice.outputLevel : muted ? 0 : voice.micLevel;
  const noAnalyser = level === 0 && (phase === "listening" || phase === "speaking");

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (next) voice.mute(); else voice.unmute();
    voiceHaptic("tap");
  };

  if (micBlocked) {
    return (
      <MicPermissionScreen
        onRetry={() => { endedRef.current = false; void start(); }}
        onCancel={() => end("user")}
      />
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Şantiyem AI sesli mod"
      className="fixed inset-0 z-[70] flex flex-col items-center justify-between bg-[#0B0F14]/98 backdrop-blur-xl animate-in fade-in duration-200"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 20px)",
        minHeight: "100dvh",
      }}
    >
      {/* Top row — quiet close affordance only. */}
      <div className="flex w-full items-center justify-end px-4">
        <button
          type="button"
          onClick={() => end("user")}
          aria-label="Sesli modu kapat"
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Orb + status */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5">
        <VoiceReactiveOrb phase={phase} level={level} fallbackMotion={noAnalyser} />
        <p
          aria-live="polite"
          className="text-[15px] font-medium tracking-tight text-white/80"
        >
          {PHASE_LABEL[phase]}
        </p>
        {phase === "error" && (
          <button
            type="button"
            onClick={() => { setPhaseOverride(null); void start(); }}
            className="rounded-control-md border border-white/15 px-4 py-2 text-[14px] font-medium text-white/90 transition hover:bg-white/10"
            style={{ borderRadius: "var(--radius-control-md, 12px)" }}
          >
            Tekrar dene
          </button>
        )}
      </div>

      {/* Subtitles */}
      <div className="w-full px-5">
        {captionsOn && <VoiceCaptions transcripts={voice.transcripts} />}
      </div>

      {/* Controls */}
      <div className="mt-6 flex w-full items-center justify-center gap-5 px-5">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Mikrofonu aç" : "Mikrofonu kapat"}
          aria-pressed={muted}
          className={`flex h-14 w-14 items-center justify-center rounded-full border transition ${
            muted
              ? "border-white/20 bg-white/15 text-white"
              : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
          }`}
        >
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onClick={() => setCaptionsOn((v) => !v)}
          aria-label={captionsOn ? "Altyazıları kapat" : "Altyazıları aç"}
          aria-pressed={captionsOn}
          className={`flex h-14 w-14 items-center justify-center rounded-full border transition ${
            captionsOn
              ? "border-white/20 bg-white/15 text-white"
              : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
          }`}
        >
          {captionsOn ? <Captions className="h-5 w-5" /> : <CaptionsOff className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onClick={() => end("user")}
          aria-label="Görüşmeyi bitir"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition hover:opacity-90"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

export default VoiceSessionOverlay;
