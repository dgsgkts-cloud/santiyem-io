// ============================================================
// Sprint 42 / 42B — the single in-page voice surface.
// Full-screen focused overlay: one shared state machine, real
// audio-reactive orb, live captions above the controls and only
// the essential controls. No route change, no white second page,
// no dashboard content while a conversation is active.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Captions, CaptionsOff, ChevronLeft, PhoneOff, Hand } from "lucide-react";
import { useVoiceEngine } from "@/hooks/useVoiceEngine";
import { CONVERSATION_SILENCE_MS, SINGLE_TURN_GRACE_MS } from "@/lib/voice/voiceSettings";
import { voiceHaptic } from "@/lib/voice/haptics";
import { MicPermissionScreen } from "./MicPermissionScreen";
import { VoiceReactiveOrb, type VoicePhase } from "./VoiceReactiveOrb";
import { VoiceCaptions } from "./VoiceCaptions";
import {
  buildResumeContext,
  clearVoiceTranscript,
  loadVoiceTranscript,
  saveVoiceTranscript,
} from "@/lib/voice/voiceTranscriptStore";
import type { TranscriptChunk } from "@/lib/voice/voiceTypes";
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
  idle: "AI hazırlanıyor...",
  requesting_permission: "Mikrofon izni bekleniyor",
  mic_setup: "AI hazırlanıyor...",
  connecting: "OpenAI'ya bağlanılıyor...",
  ready: "AI hazırlanıyor...",
  listening: "Dinliyorum",
  user_finished: "Anlıyorum",
  thinking: "Düşünüyorum...",
  speaking: "Yanıtlıyorum...",
  interrupted: "Dinliyorum",
  ending: "Görüşme kapatılıyor",
  error: "Bağlantı kesildi",
};

/** Short personality line, shown only before the first exchange. */
const OPENING_HINT = "Merhaba. Hazırım. Projenizle ilgili ne öğrenmek istersiniz?";

/** Session states that mean the transport is genuinely alive. */
const LIVE_STATES = ["ready", "listening", "speaking", "thinking"] as const;
const isLive = (s: string) => (LIVE_STATES as readonly string[]).includes(s);


/** Only surface "Hazırlanıyor" if initialization is actually slow. */
const PREPARING_VISIBLE_AFTER_MS = 700;
const CONNECT_TIMEOUT_MS = 8000;
/** Short, visible grace period before an automatic reconnect attempt. */
const RETRY_COUNTDOWN_SECONDS = 3;
const MAX_AUTO_RETRIES = 2;

export function VoiceSessionOverlay({
  onClose,
  autoStart = true,
  initialContext,
  sessionMode = "manual",
  conversationMode = false,
  greeting,
  onSessionEnd,
}: Props) {
  // Conversation that survived a previous drop (or a closed overlay).
  const [resumeChunks, setResumeChunks] = useState<TranscriptChunk[]>(() => loadVoiceTranscript());

  const engineConfig = useMemo(

    () => ({
      instructionsSuffix: [initialContext, buildResumeContext(resumeChunks)]
        .filter(Boolean)
        .join("\n\n") || undefined,
    }),
    [initialContext, resumeChunks],
  );
  const voice = useVoiceEngine(engineConfig);

  // Full conversation = what survived the drop + what is live now.
  const transcripts = useMemo<TranscriptChunk[]>(() => {
    if (resumeChunks.length === 0) return voice.transcripts;
    const seen = new Set(voice.transcripts.map((t) => `${t.role}:${t.id}`));
    return [...resumeChunks.filter((c) => !seen.has(`${c.role}:${c.id}`)), ...voice.transcripts];
  }, [resumeChunks, voice.transcripts]);

  // Persist the tail continuously so nothing is lost if the overlay
  // unmounts or the connection dies mid-sentence.
  useEffect(() => {
    if (transcripts.length > 0) saveVoiceTranscript(transcripts);
  }, [transcripts]);

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
  // Single-flight: repeated taps can never create a second engine, and a
  // retry always tears the previous session down first.
  const startingRef = useRef(false);
  const start = useCallback(async (isRetry = false) => {
    if (startingRef.current) return;
    startingRef.current = true;
    setFailed(false);
    setAskingPermission(true);
    try {
      if (isRetry) await voice.reset();
      let probe: MediaStream | null = null;
      try {
        probe = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setAskingPermission(false);
        setMicBlocked(true);
        return;
      } finally {
        // Always release the probe stream — only one mic stream may live.
        probe?.getTracks().forEach((t) => t.stop());
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
    } finally {
      startingRef.current = false;
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
      if (!isLive(voice.state)) {
        setPreparing(false);
        setFailed(true);
      }
    }, CONNECT_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [preparing, showPreparing, voice.state]);

  // The engine can also discover a blocked microphone (device lost or
  // permission revoked mid-session). That is never a transport failure.
  useEffect(() => {
    if (voice.errorKind === "mic_permission") {
      setPreparing(false);
      setFailed(false);
      setMicBlocked(true);
    }
  }, [voice.errorKind]);

  useEffect(() => {
    if (isLive(voice.state)) {
      setFailed(false);
      setPreparing(false);
      stoppedRef.current = false;
      autoRetriesRef.current = 0;
      setRetryIn(null);
    }
  }, [voice.state]);




  // Greeting for wake sessions — spoken once, and never repeated when we
  // are resuming an interrupted conversation.
  useEffect(() => {
    if (!greeting || greetedRef.current) return;
    if (voice.state !== "listening") return;
    greetedRef.current = true;
    if (resumeChunks.length > 0) return;
    voice.sendText(greeting);
  }, [greeting, voice, resumeChunks.length]);

  // ---- end session ---------------------------------------------------
  const end = useCallback(
    (reason: "silence" | "turn-complete" | "user") => {
      if (endedRef.current) return;
      endedRef.current = true;
      voiceHaptic("end");
      // Deliberate end → the conversation is finished, drop the snapshot.
      clearVoiceTranscript();
      void voice.disconnect().finally(() => {
        onSessionEnd?.(reason);
        onClose();
      });
    },
    [voice, onSessionEnd, onClose],

  );

  // Continue in text mode: keep the conversation snapshot so the chat can
  // resume with context, then hand focus to the composer.
  const continueWithText = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    voiceHaptic("end");
    void voice.disconnect().finally(() => {
      onSessionEnd?.("user");
      onClose();
      window.setTimeout(() => {
        document.querySelector<HTMLTextAreaElement>("main textarea, textarea")?.focus();
      }, 120);
    });
  }, [voice, onSessionEnd, onClose]);

  // Body scroll is locked while the overlay owns the screen.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);


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
  // The label always reflects the real transport state: mic → OpenAI →
  // hazır → dinliyorum. "Dinliyorum" can only come from the engine, which
  // sets it after `session.created`.
  const phase: VoicePhase = micBlocked
    ? "error"
    : askingPermission
    ? "requesting_permission"
    : failed || voice.state === "error" || voice.state === "disconnected"
      ? "error"
      : voice.state === "interrupted"
        ? "listening"
        : voice.state === "idle"
          ? (preparing ? "mic_setup" : "idle")
          : (voice.state as VoicePhase);


  // Connection lost → keep the transcript, immediately silence audio,
  // then run a short countdown and retry automatically (max 2 attempts)
  // before the user has to act.
  const transcriptsRef = useRef<TranscriptChunk[]>([]);
  transcriptsRef.current = transcripts;

  useEffect(() => {
    if (phase !== "error" || micBlocked || stoppedRef.current) return;
    stoppedRef.current = true;
    const snapshot = transcriptsRef.current;
    if (snapshot.length > 0) {
      saveVoiceTranscript(snapshot);
      setResumeChunks(snapshot);
    }
    try { voice.interrupt(); } catch { /* noop */ }
    try { voice.mute(); } catch { /* noop */ }
    void voice.disconnect().catch(() => { /* noop */ });
    // Auto-reconnect is for temporary network/WebRTC drops only. Permanent
    // configuration, auth or quota failures must never be retried on a timer.
    if (voice.canAutoRetry && autoRetriesRef.current < MAX_AUTO_RETRIES) {
      setRetryIn(RETRY_COUNTDOWN_SECONDS);
    } else {
      setRetryIn(null);
    }
  }, [phase, micBlocked, voice]);


  const reconnect = useCallback(() => {
    setRetryIn(null);
    stoppedRef.current = false;
    setMuted(false);
    void start(true);
  }, [start]);

  // Countdown tick → auto reconnect when it reaches zero.
  useEffect(() => {
    if (retryIn === null) return;
    if (retryIn <= 0) {
      autoRetriesRef.current += 1;
      reconnect();
      return;
    }
    const t = window.setTimeout(() => setRetryIn((v) => (v === null ? null : v - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [retryIn, reconnect]);

  // Last exchange, shown while disconnected so the context is visible.
  const lastUserLine = [...transcripts].reverse().find((t) => t.role === "user" && t.text.trim())?.text.trim();
  const lastAssistantLine = [...transcripts]
    .reverse()
    .find((t) => t.role !== "user" && t.text.trim())?.text.trim();


  // User-facing categories — never a raw code, never a wrong cause.
  const errorCopy = (() => {
    switch (voice.errorKind) {
      case "mic_permission":
        return {
          title: "Mikrofon izni gerekli",
          body: "Sesli asistanı kullanmak için tarayıcı ayarlarından mikrofon iznini açmanız gerekiyor.",
        };
      case "auth":
      case "quota":
        return {
          title: "Sesli hizmet başlatılamadı",
          body: "Sesli asistan yapılandırmasında bir sorun oluştu. Lütfen daha sonra tekrar deneyin.",
        };
      case "config":
        return {
          title: "Sesli asistan yapılandırılamadı",
          body: "Sesli asistan yapılandırmasında bir sorun oluştu. Lütfen daha sonra tekrar deneyin.",
        };
      case "timeout":
        return {
          title: "Bağlantı zaman aşımına uğradı",
          body: "Ağ bağlantınızı kontrol edip tekrar deneyebilir veya yazarak devam edebilirsiniz.",
        };
      case "session_not_started":
        return {
          title: "OpenAI oturumu başlatılamadı",
          body: "Sesli oturum başlatılamadı. Tekrar deneyebilir veya yazarak devam edebilirsiniz.",
        };
      case "audio_playback":
        return {
          title: "Sesli yanıt oynatılamadı",
          body: "Yanıt sesi cihazınızda çalınamadı. Tekrar deneyebilir veya yazarak devam edebilirsiniz.",
        };
      case "connection_lost":
        return {
          title: "Bağlantı kesildi",
          body: "Ses durduruldu. Yeniden bağlanabilir veya yazarak devam edebilirsiniz.",
        };
      default:
        return {
          title: "Sesli bağlantı kurulamadı",
          body: "Bağlantıyı yeniden kurmayı deneyebilir veya yazarak devam edebilirsiniz.",
        };
    }
  })();

  const isSpeaking = phase === "speaking";
  const level = isSpeaking ? voice.outputLevel : muted ? 0 : voice.micLevel;
  const noAnalyser = level === 0 && (phase === "listening" || phase === "speaking");

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (next) voice.mute(); else voice.unmute();
  };

  // ---- overlay-scoped keyboard shortcuts ------------------------------
  // Space = mute/unmute · Escape = end session · Ctrl/Cmd+Enter = text mode.
  // Listeners live and die with this overlay; nothing is registered globally.
  const shortcutRef = useRef({ toggleMute, end, continueWithText });
  shortcutRef.current = { toggleMute, end, continueWithText };

  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable === true
      );
    };

    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;

      if (e.key === "Escape") {
        e.preventDefault();
        shortcutRef.current.end("user");
        return;
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        shortcutRef.current.continueWithText();
        return;
      }
      if ((e.code === "Space" || e.key === " ") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Stop the page from scrolling / re-triggering a focused button.
        e.preventDefault();
        if (e.repeat) return;
        shortcutRef.current.toggleMute();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (micBlocked) {

    return (
      <MicPermissionScreen
        onRetry={() => { void start(true); }}
        onCancel={() => end("user")}
      />
    );
  }

  const showOpeningHint =
    transcripts.length === 0 && (phase === "listening" || phase === "ready");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Şantiyem AI sesli görüşme"
      className="fixed inset-0 z-[70] flex flex-col bg-[#070B14] animate-in fade-in duration-300"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 8px)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 20px)",
        minHeight: "100dvh",
      }}
    >
      {/* Ambient depth — keeps the screen from feeling like a flat page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 70% at 50% 6%, hsl(var(--primary) / 0.10) 0%, transparent 60%), radial-gradient(100% 65% at 50% 112%, hsl(220 70% 40% / 0.16) 0%, transparent 68%)",
        }}
      />

      {/* ── Minimal header: back · Şantiyem AI · captions ── */}
      <header className="relative z-10 flex h-14 shrink-0 items-center justify-between px-2">
        <button
          type="button"
          onClick={() => end("user")}
          aria-label="Geri dön"
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[15px] font-semibold tracking-tight text-white">
            Şantiyem AI
          </span>
          <span className="text-[11px] font-medium tracking-wide text-white/40">
            Sesli Asistan
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCaptionsOn((v) => !v)}
          aria-label={captionsOn ? "Altyazıyı kapat" : "Altyazıyı aç"}
          aria-pressed={captionsOn}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95 ${
            captionsOn ? "text-white/80 hover:bg-white/10" : "text-white/35 hover:bg-white/10"
          }`}
        >
          {captionsOn ? <Captions className="h-5 w-5" /> : <CaptionsOff className="h-5 w-5" />}
        </button>
      </header>

      {/* ── Center: orb + state, or a premium recovery state ── */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-7 px-6">
        {phase === "error" ? (
          <div className="w-full max-w-sm text-center">
            <VoiceReactiveOrb phase="error" level={0} />
            <p className="mt-6 text-[19px] font-semibold tracking-tight text-white">
              {errorCopy.title}
            </p>
            <p aria-live="polite" className="mt-2 text-[14px] leading-relaxed text-white/55">
              {retryIn !== null
                ? `Bağlantı yeniden kuruluyor… ${retryIn}`
                : errorCopy.body}
            </p>

            {/* The conversation is kept — show where we left off. */}
            {(lastUserLine || lastAssistantLine) && (
              <div className="mt-5 rounded-[18px] border border-white/[0.07] bg-white/[0.03] p-4 text-left">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  Konuşma korundu
                </p>
                {lastUserLine && (
                  <p className="mt-2 line-clamp-2 text-[13.5px] text-white/60">{lastUserLine}</p>
                )}
                {lastAssistantLine && (
                  <p className="mt-1.5 line-clamp-2 text-[13.5px] text-white/85">
                    {lastAssistantLine}
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={reconnect}
                className="flex items-center justify-center rounded-full bg-primary text-[15px] font-semibold text-primary-foreground transition active:scale-[0.98]"
                style={{ height: 52 }}
              >
                {retryIn !== null ? "Şimdi Yeniden Bağlan" : "Tekrar Dene"}
              </button>
              <button
                type="button"
                onClick={() => end("user")}
                className="flex items-center justify-center rounded-full border border-white/12 text-[14.5px] font-medium text-white/80 transition hover:bg-white/5 active:scale-[0.98]"
                style={{ height: 48 }}
              >
                Yazarak Devam Et
              </button>
            </div>

          </div>
        ) : (
          <>
            <VoiceReactiveOrb phase={phase} level={level} fallbackMotion={noAnalyser} />

            <div className="flex flex-col items-center gap-2 text-center">
              <p
                key={PHASE_LABEL[phase]}
                aria-live="polite"
                className="animate-fade-in text-[17px] font-medium tracking-tight text-white/90"
              >
                {PHASE_LABEL[phase]}
              </p>
              {showOpeningHint && (
                <p className="max-w-[300px] animate-fade-in text-[13.5px] leading-relaxed text-white/40">
                  {OPENING_HINT}
                </p>
              )}
            </div>

            {/* Barge-in only while the assistant is actually speaking. */}
            {isSpeaking && !conversationMode && (
              <button
                type="button"
                onClick={() => voice.interrupt()}
                className="flex min-h-[44px] items-center gap-2 rounded-full border border-white/12 px-5 text-[13.5px] font-medium text-white/80 transition hover:bg-white/5 active:scale-95"
              >
                <Hand className="h-4 w-4" /> Sözünü Kes
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Live transcript: only the current exchange ── */}
      {phase !== "error" && captionsOn && transcripts.length > 0 && (
        <div className="relative z-10 shrink-0 px-6 pb-2">
          <VoiceCaptions transcripts={transcripts} />
        </div>
      )}

      {/* ── Bottom controls: mute · end ── */}
      {phase !== "error" && (
        <div className="relative z-10 mt-6 flex shrink-0 flex-col items-center gap-4 px-6">
          <div className="flex items-center justify-center gap-8">
            <div className="relative flex items-center justify-center">
              {/* Subtle mic activity indicator */}
              {!muted && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute rounded-full border border-primary/40 transition-[transform,opacity] duration-200"
                  style={{
                    height: 64,
                    width: 64,
                    transform: `scale(${1 + Math.min(level, 1) * 0.28})`,
                    opacity: 0.15 + Math.min(level, 1) * 0.55,
                  }}
                />
              )}
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? "Mikrofonu aç" : "Mikrofonu kapat"}
                aria-pressed={muted}
                className={`relative flex h-16 w-16 items-center justify-center rounded-full border transition active:scale-95 ${
                  muted
                    ? "border-white/25 bg-white/[0.14] text-white"
                    : "border-white/[0.08] bg-white/[0.06] text-white/85 hover:bg-white/[0.1]"
                }`}
              >
                {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => end("user")}
              aria-label="Görüşmeyi bitir"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-[0_10px_30px_-8px_hsl(var(--destructive)/0.7)] transition hover:opacity-90 active:scale-95"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VoiceSessionOverlay;
