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
}

const STATE_LABEL: Record<string, string> = {
  idle: "Hazır",
  connecting: "Bağlanıyor…",
  listening: "Dinliyorum",
  thinking: "Düşünüyorum…",
  speaking: "Konuşuyorum",
  interrupted: "Dinliyorum",
  disconnected: "Bağlantı kapandı",
  error: "Hazır",
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
  const startedRef = useRef(false);
  const spokeRef = useRef(false);
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
    void voice.connect();
  }, [autoStart, voice]);

  // Auto-narrate a handed-off briefing after the session is live.
  useEffect(() => {
    if (!autoSpeak || spokeRef.current || !initialContext) return;
    if (voice.state !== "listening") return;
    spokeRef.current = true;
    voice.sendText(initialContext);
  }, [autoSpeak, initialContext, voice]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [voice.transcripts.length]);

  const connected = voice.state !== "idle" && voice.state !== "disconnected";
  const busy = voice.state === "connecting";

  const handleClose = () => { void voice.disconnect(); onClose(); };

  const toggleMute = () => {
    if (muted) { voice.unmute(); setMuted(false); } else { voice.mute(); setMuted(true); }
  };

  const submitDraft = () => {
    const t = draft.trim();
    if (!t) return;
    voice.sendText(t);
    setDraft("");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Şantiyem AI · Sesli Mod</p>
          <p className="text-xs text-muted-foreground">
            {voice.statusMessage ?? STATE_LABEL[voice.state] ?? "Hazır"}
          </p>
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

        {voice.transcripts.length === 0 && !busy && (
          <p className="pt-10 text-center text-sm text-muted-foreground">
            Konuşmaya başlayın — dinliyorum.
          </p>
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
