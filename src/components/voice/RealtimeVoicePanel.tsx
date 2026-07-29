// ============================================================
// src/components/voice/RealtimeVoicePanel.tsx
// Sprint 32.1 — UI for the OpenAI Realtime voice engine.
// Uses the shared Şantiyem AI brain + shared tool schema; no
// vendor-specific behaviour leaks into this component.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Mic, MicOff, Square, Keyboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceEngine } from "@/hooks/useVoiceEngine";
import { isVoiceDebugEnabled } from "@/lib/voice/voiceConfig";
import { CONVERSATION_SILENCE_MS, SINGLE_TURN_GRACE_MS } from "@/lib/voice/voiceSettings";
import { VoiceOrbVisual, type OrbState } from "./VoiceOrbVisual";
import { VoiceLiveWaveform } from "./VoiceLiveWaveform";
import { MicPermissionScreen } from "./MicPermissionScreen";
import { voiceHaptic } from "@/lib/voice/haptics";
import { VOICE_UI_EVENT } from "@/lib/voice/voiceTools";
import { VoiceDebugPanel } from "./VoiceDebugPanel";
import "@/styles/voice.css";

export interface RealtimeCard {
  id: string;
  title: string;
  value?: string;
  detail?: string;
  tone?: "positive" | "warning" | "danger" | "neutral";
}

interface Props {
  onClose: () => void;
  compact?: boolean;
  autoStart?: boolean;
  initialContext?: string;
  initialCards?: RealtimeCard[];
  autoSpeak?: boolean;
  /**
   * "wake" sessions were started by the wake word and end themselves after
   * silence so the app can return to wake-word listening. "manual" is the
   * unchanged Push-to-Talk behaviour.
   */
  sessionMode?: "manual" | "wake";
  /** Wake sessions only: keep the mic open for natural back-and-forth. */
  conversationMode?: boolean;
  /** Spoken once as soon as a wake session goes live. */
  greeting?: string;
  /** Fired when a wake session closes itself. */
  onSessionEnd?: (reason: "silence" | "turn-complete" | "user") => void;
}

// Friendly, human states only — no WebRTC/token/datachannel wording ever
// reaches the user. Technical detail stays in the console for developers.
const STATE_LABEL: Record<string, string> = {
  idle: "Hazır",
  connecting: "Bağlanıyor…",
  listening: "Dinliyorum",
  thinking: "Düşünüyorum…",
  speaking: "Konuşuyorum",
  interrupted: "Dinliyorum",
  disconnected: "Ses kapandı",
  error: "Ses şu an kullanılamıyor",
};

const TONE_CLASS: Record<string, string> = {
  positive: "border-emerald-500/40",
  warning: "border-amber-500/40",
  danger: "border-destructive/50",
  neutral: "border-border",
};

export function RealtimeVoicePanel({
  onClose,
  compact = false,
  autoStart = false,
  initialContext,
  initialCards = [],
  autoSpeak = false,
  sessionMode = "manual",
  conversationMode = false,
  greeting,
  onSessionEnd,
}: Props) {
  const engineConfig = useMemo(
    () => ({ instructionsSuffix: initialContext }),
    [initialContext],
  );
  const voice = useVoiceEngine(engineConfig);
  const [cards, setCards] = useState<RealtimeCard[]>(initialCards);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [muted, setMuted] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);
  const [closingIn, setClosingIn] = useState<number | null>(null);
  const startedRef = useRef(false);
  const spokeRef = useRef(false);
  // Wake-session bookkeeping.
  const greetedRef = useRef(false);
  const endedRef = useRef(false);
  const spokeOnceRef = useRef(false);
  const activityRef = useRef(Date.now());
  const turnCompletedAtRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const debug = isVoiceDebugEnabled();

  // Tool-driven UI events (render_dashboard_card).
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { kind: string; payload: Record<string, unknown> };
      if (detail?.kind !== "card") return;
      const p = detail.payload ?? {};
      setCards((prev) => [
        {
          id: `${Date.now()}`,
          title: String(p.title ?? ""),
          value: p.value ? String(p.value) : undefined,
          detail: p.detail ? String(p.detail) : undefined,
          tone: (p.tone as RealtimeCard["tone"]) ?? "neutral",
        },
        ...prev,
      ].slice(0, 8));
    };
    window.addEventListener(VOICE_UI_EVENT, handler);
    return () => window.removeEventListener(VOICE_UI_EVENT, handler);
  }, []);

  // Connect once.
  useEffect(() => {
    if (!autoStart || startedRef.current) return;
    startedRef.current = true;
    voiceHaptic("start");
    void voice.connect();
  }, [autoStart, voice]);

  // Auto-narrate a handed-off briefing after the session is live.
  useEffect(() => {
    if (!autoSpeak || spokeRef.current || !initialContext) return;
    if (voice.state !== "listening") return;
    spokeRef.current = true;
    voice.sendText(initialContext);
  }, [autoSpeak, initialContext, voice]);

  // Wake sessions greet the user once, as soon as the session is live.
  useEffect(() => {
    if (sessionMode !== "wake" || !greeting || greetedRef.current) return;
    if (voice.state !== "listening") return;
    greetedRef.current = true;
    voice.sendText(greeting);
  }, [sessionMode, greeting, voice]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [voice.transcripts.length]);

  const connected = voice.state !== "idle" && voice.state !== "disconnected";
  const busy = voice.state === "connecting";

  const handleClose = () => { void voice.disconnect(); onClose(); };

  // --- automatic session end (wake sessions only) ----------------------
  // Any speech, thinking or new transcript counts as activity; after the
  // silence window the session closes and the app returns to wake-word mode.
  useEffect(() => {
    if (sessionMode !== "wake") return;
    activityRef.current = Date.now();
  }, [sessionMode, voice.state, voice.transcripts.length]);

  // Track when the assistant finishes a turn (speaking → listening).
  useEffect(() => {
    if (sessionMode !== "wake") return;
    if (voice.state === "speaking") { spokeOnceRef.current = true; return; }
    if (voice.state === "listening" && spokeOnceRef.current) {
      turnCompletedAtRef.current = Date.now();
    }
  }, [sessionMode, voice.state]);

  useEffect(() => {
    if (sessionMode !== "wake") return;

    const endSession = (reason: "silence" | "turn-complete") => {
      if (endedRef.current) return;
      endedRef.current = true;
      voiceHaptic("end");
      void voice.disconnect();
      onSessionEnd?.(reason);
      onClose();
    };

    const id = window.setInterval(() => {
      if (endedRef.current) return;
      // Never cut the assistant off mid-sentence.
      if (voice.state === "speaking" || voice.state === "thinking") { setClosingIn(null); return; }
      if (voice.state === "connecting") { setClosingIn(null); return; }

      const now = Date.now();
      const remaining = CONVERSATION_SILENCE_MS - (now - activityRef.current);
      // Visible, calm countdown instead of an abrupt close.
      setClosingIn(remaining > 0 ? Math.ceil(remaining / 1000) : 0);
      if (remaining <= 0) {
        endSession("silence");
        return;
      }
      // Conversation Mode off → one request per wake word.
      if (
        !conversationMode &&
        turnCompletedAtRef.current &&
        now - turnCompletedAtRef.current >= SINGLE_TURN_GRACE_MS
      ) {
        endSession("turn-complete");
      }
    }, 250);

    return () => { window.clearInterval(id); setClosingIn(null); };
  }, [sessionMode, conversationMode, voice, onClose, onSessionEnd]);

  // Permission problems become a premium explanation screen, not an error.
  useEffect(() => {
    if (voice.state !== "error" && voice.state !== "disconnected") return;
    if (!navigator.permissions?.query) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((p) => { if (!cancelled && p.state === "denied") setMicBlocked(true); })
      .catch(() => { /* permission API is optional */ });
    return () => { cancelled = true; };
  }, [voice.state]);

  const toggleMute = () => {
    if (muted) { voice.unmute(); setMuted(false); } else { voice.mute(); setMuted(true); }
  };

  const submitDraft = () => {
    const t = draft.trim();
    if (!t) return;
    voice.sendText(t);
    setDraft("");
  };

  // Map engine state onto the shared orb visual vocabulary.
  const orbState: OrbState =
    voice.statusMessage ? "reconnecting"
    : voice.state === "speaking" ? "speaking"
    : voice.state === "thinking" ? "thinking"
    : voice.state === "connecting" ? "reconnecting"
    : voice.state === "disconnected" ? "disconnected"
    : connected ? "listening"
    : "idle";

  const level = voice.state === "speaking" ? voice.outputLevel : voice.micLevel;
  const countdownRatio =
    closingIn !== null && closingIn <= 5 && voice.state === "listening"
      ? Math.max(0, closingIn / (CONVERSATION_SILENCE_MS / 1000))
      : undefined;


  if (micBlocked) {
    return (
      <MicPermissionScreen
        onRetry={() => { setMicBlocked(false); void voice.connect(); }}
        onCancel={handleClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <VoiceOrbVisual state={orbState} size="sm" level={level} countdown={countdownRatio} />
          <div>
            <p className="text-sm font-semibold text-foreground">Şantiyem AI · Sesli Mod</p>
            <p className="text-xs text-muted-foreground">
              {closingIn !== null && closingIn <= 5 && voice.state === "listening"
                ? `Konuşma kapanıyor… ${closingIn}`
                : voice.statusMessage ?? STATE_LABEL[voice.state] ?? "Hazır"}
              {sessionMode === "wake" && conversationMode && connected && (
                <span className="ml-1 text-muted-foreground/70">· Sohbet modu</span>
              )}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Kapat">
          <X className="h-5 w-5" />
        </Button>
      </header>


      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {cards.length > 0 && (
          <div className={compact ? "space-y-2" : "grid gap-2 sm:grid-cols-2"}>
            {cards.map((c) => (
              <div key={c.id} className={`rounded-xl border bg-card p-3 ${TONE_CLASS[c.tone ?? "neutral"]}`}>
                <p className="text-xs text-muted-foreground">{c.title}</p>
                {c.value && <p className="text-lg font-semibold text-foreground">{c.value}</p>}
                {c.detail && <p className="text-xs text-muted-foreground">{c.detail}</p>}
              </div>
            ))}
          </div>
        )}

        {voice.transcripts.map((t) => (
          <div
            key={`${t.role}-${t.id}`}
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
              t.role === "user"
                ? "ml-auto bg-primary/15 text-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            {t.text}
          </div>
        ))}

        {connected && (voice.state === "listening" || voice.state === "speaking") && (
          <VoiceLiveWaveform
            level={level}
            tone={voice.state === "speaking" ? "sky" : "primary"}
            className="pt-1"
          />
        )}

        {voice.state === "thinking" && (
          <div className="max-w-[85%]">
            <AIThinkingStages />
          </div>
        )}

        {voice.transcripts.length === 0 && !busy && (
          <div className="pt-8 text-center">
            <p className="text-sm text-muted-foreground">Konuşmaya başlayın — dinliyorum.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                "Bugünün risklerini özetle",
                "Geciken ödemeleri söyle",
                "Sahada kaç kişi var?",
                "Kritik malzeme var mı?",
              ].map((h) => (
                <span
                  key={h}
                  className="rounded-control border border-border/60 bg-card/60 px-3 py-1.5 text-[12px] text-muted-foreground"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {debug && (
        <div className="px-5 pb-2">
          <VoiceDebugPanel
            provider={voice.provider}
            state={voice.state}
            metrics={voice.metrics}
            micLevel={voice.micLevel}
            fellBack={voice.fellBack}
          />
        </div>
      )}

      <footer className="border-t border-border px-5 py-4">
        {typing ? (
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitDraft(); }}
              placeholder="Sorunuzu yazın…"
              className="h-11 flex-1 rounded-xl border border-border bg-card px-3 text-base text-foreground outline-none focus:border-primary"
            />
            <Button onClick={submitDraft}>Gönder</Button>
            <Button variant="ghost" size="icon" onClick={() => setTyping(false)} aria-label="Klavyeyi kapat">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setTyping(true)} aria-label="Yazarak sor">
              <Keyboard className="h-5 w-5" />
            </Button>

            {!connected ? (
              <Button className="h-14 flex-1 rounded-full text-base" onClick={() => void voice.connect()} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Mic className="mr-2 h-5 w-5" />}
                {busy ? "Bağlanıyor…" : "Konuşmaya başla"}
              </Button>
            ) : (
              <>
                <Button
                  variant={muted ? "secondary" : "default"}
                  className="h-14 w-14 rounded-full"
                  onClick={toggleMute}
                  aria-label={muted ? "Mikrofonu aç" : "Mikrofonu kapat"}
                >
                  {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>
                <Button
                  variant="secondary"
                  className="h-14 flex-1 rounded-full"
                  onClick={() => voice.interrupt()}
                  disabled={voice.state !== "speaking"}
                >
                  <Square className="mr-2 h-4 w-4" /> Sözünü kes
                </Button>
                <Button variant="ghost" className="h-14 rounded-full" onClick={handleClose}>
                  Bitir
                </Button>
              </>
            )}
          </div>
        )}
      </footer>
    </div>
  );
}
