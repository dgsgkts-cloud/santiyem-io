import { useEffect, useMemo, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import {
  X, Mic, MicOff, Pause, Play, Square, Keyboard, RotateCw, MessageSquare,
  AlertCircle, HardHat, Radio, TrendingUp, AlertTriangle, Package, Users,
  Activity, ChevronDown, ChevronUp, Sparkle, ArrowRight, Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import type { VoiceAccess } from "@/hooks/useVoiceAccess";
import "@/styles/voice.css";

interface Card {
  id: string;
  type: "kpi" | "warning" | "recommendation" | "info";
  title: string;
  value?: string;
  detail?: string;
  tone?: "positive" | "warning" | "danger" | "neutral";
}

interface Bubble {
  id: string;
  role: "user" | "ai";
  text: string;
  ts: number;
}

interface Props {
  onClose: () => void;
  access: VoiceAccess;
  compact?: boolean;
  autoStart?: boolean;
  initialContext?: string;
}

type UiState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export function VoiceCopilot(props: Props) {
  return (
    <ConversationProvider>
      <VoiceCopilotInner {...props} />
    </ConversationProvider>
  );
}

function VoiceCopilotInner({ onClose, access, compact = false, autoStart = false, initialContext }: Props) {
  const [uiState, setUiState] = useState<UiState>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [error, setError] = useState<string | null>(null);
  // `muted` is driven by the ElevenLabs SDK (conversation.isMuted) below.
  const [paused, setPaused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [projectName, setProjectName] = useState<string>("Tüm Projeler");
  // Construction Site Mode — default ON. Aggressive noise handling + anti-barge-in.
  const [siteMode, setSiteMode] = useState<boolean>(() => {
    try { const v = localStorage.getItem("voice_site_mode"); return v === null ? true : v === "1"; } catch { return true; }
  });
  const siteModeRef = useRef(siteMode);
  useEffect(() => { siteModeRef.current = siteMode; try { localStorage.setItem("voice_site_mode", siteMode ? "1" : "0"); } catch { /* noop */ } }, [siteMode]);
  const sessionStartRef = useRef<number | null>(null);
  const connectWaiterRef = useRef<{ resolve: () => void; reject: (e: Error) => void } | null>(null);
  const lastAiMessageRef = useRef<string>("");
  const navigate = useNavigate();

  // Load active project name (frontend only, no backend changes)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("active_project_name");
      if (stored) setProjectName(stored);
    } catch { /* noop */ }
  }, []);

  const conversation = useConversation({
    overrides: { agent: { language: "tr" } },
    onConnect: () => {
      try {
        connectWaiterRef.current?.resolve();
        connectWaiterRef.current = null;
        sessionStartRef.current = Date.now();
        setUiState("listening");
        if (initialContext) {
          queueMicrotask(() => {
            try { conversation.sendContextualUpdate(initialContext); }
            catch (e) { console.warn("contextual update failed", e); }
          });
        }
      } catch (e) { console.error("onConnect handler failed", e); }
    },
    onDisconnect: () => {
      try {
        setUiState("idle");
        const secs = sessionStartRef.current ? Math.round((Date.now() - sessionStartRef.current) / 1000) : 0;
        sessionStartRef.current = null;
        if (secs > 0) trackUsage(secs);
        if (bubbles.length >= 2) setShowSummary(true);
      } catch (e) { console.error("onDisconnect handler failed", e); }
    },
    onMessage: (msg: any) => {
      try {
        console.log("[voice][onMessage]", msg?.type ?? msg?.source, msg);
        if (msg?.source === "user" && typeof msg.message === "string") {
          setTranscript(msg.message);
          setBubbles((prev) => [...prev, { id: `${Date.now()}-u`, role: "user" as const, text: msg.message, ts: Date.now() }].slice(-40));
        }
        if (msg?.source === "ai" && typeof msg.message === "string") {
          setTranscript(msg.message);
          lastAiMessageRef.current = msg.message;
          setBubbles((prev) => [...prev, { id: `${Date.now()}-a`, role: "ai" as const, text: msg.message, ts: Date.now() }].slice(-40));
        }
      } catch (e) { console.error("onMessage handler failed", e); }
    },
    onError: (e: unknown) => {
      try {
        console.error("Voice error", e);
        const msg = typeof e === "string" ? e : (e instanceof Error ? e.message : "Ses bağlantısında hata.");
        if (connectWaiterRef.current) {
          connectWaiterRef.current.reject(new Error(msg));
          connectWaiterRef.current = null;
          return;
        }
        setError(msg);
        setUiState("error");
      } catch (err) { console.error("onError handler failed", err); }
    },
    clientTools: {
      render_dashboard_card: (params: Partial<Card>) => {
        setCards((prev) => [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: (params.type as Card["type"]) ?? "info",
            title: params.title ?? "Bilgi",
            value: params.value,
            detail: params.detail,
            tone: params.tone ?? "neutral",
          },
          ...prev,
        ].slice(0, 8));
        return "card_rendered";
      },
      navigate_to: (params: { page?: string }) => {
        if (params?.page && typeof params.page === "string") {
          navigate(params.page.startsWith("/") ? params.page : `/${params.page}`);
          return `navigated to ${params.page}`;
        }
        return "no_page";
      },
      query_project_data: async (params: { intent?: string; keyword?: string }) => {
        const t0 = performance.now();
        console.log("[voice][tool] query_project_data CALLED", params);
        setUiState("thinking");
        try {
          const { data: sess } = await supabase.auth.getSession();
          const jwt = sess?.session?.access_token;
          const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt ?? ""}` },
            body: JSON.stringify({
              messages: [{ role: "user", content: `${params.intent ?? ""} ${params.keyword ?? ""}`.trim() }],
              voice_mode: true,
            }),
          });
          console.log("[voice][tool] /chat status:", res.status, "in", Math.round(performance.now() - t0), "ms");
          if (!res.ok) return `Veriye ulaşılamadı (HTTP ${res.status}).`;
          const json = await res.json().catch(() => null);
          const text = json?.text ?? json?.error ?? "";
          const out = String(text).slice(0, 1200) || "Bu konuda veri bulunamadı.";
          console.log("[voice][tool] RETURNING (len " + out.length + "):", out.slice(0, 200));
          return out;
        } catch (e) {
          console.error("[voice][tool] query_project_data FAILED:", e);
          return `Bir hata oluştu: ${String(e).slice(0, 200)}`;
        }
      },
    },
  });

  const trackUsage = async (secs: number) => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const jwt = sess?.session?.access_token;
      if (!jwt) return;
      await fetch(`${SUPABASE_URL}/functions/v1/voice-usage-track`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ seconds: secs }),
      });
      access.refresh();
    } catch (e) { console.warn("usage track failed", e); }
  };

  const CONNECT_TIMEOUT_MS = 15000;
  const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
    new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`${label} zaman aşımına uğradı`)), ms);
      p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
    });

  const start = async () => {
    setError(null);
    setUiState("connecting");
    setShowSummary(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Bu cihaz/tarayıcı mikrofon erişimini desteklemiyor.");
        setUiState("error"); return;
      }
      try {
        const perm = await navigator.permissions?.query?.({ name: "microphone" as PermissionName });
        if (perm?.state === "denied") {
          setError("Mikrofon izni reddedilmiş. Ayarlar > Uygulamalar > Şantiyem > İzinler bölümünden mikrofon iznini açın.");
          setUiState("error"); return;
        }
      } catch { /* noop */ }

      try {
        const stream = await withTimeout(
          navigator.mediaDevices.getUserMedia({ audio: true }),
          CONNECT_TIMEOUT_MS, "Mikrofon izni"
        );
        stream.getTracks().forEach((t) => t.stop());
      } catch (micErr) {
        const name = (micErr as DOMException)?.name;
        if (name === "NotAllowedError" || name === "SecurityError") {
          setError("Mikrofon izni gerekli. Ayarlar > Uygulamalar > Şantiyem > İzinler bölümünden mikrofon iznini açıp tekrar deneyin.");
        } else if (name === "NotFoundError") {
          setError("Mikrofon bulunamadı. Cihazınızın mikrofonunu kontrol edin.");
        } else {
          setError("Mikrofon açılamadı. Lütfen tekrar deneyin.");
        }
        setUiState("error"); return;
      }

      const { data: sess } = await supabase.auth.getSession();
      const jwt = sess?.session?.access_token;
      if (!jwt) throw new Error("Oturum bulunamadı, lütfen tekrar giriş yapın.");

      const res = await withTimeout(
        fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-conversation-token`, {
          method: "POST", headers: { Authorization: `Bearer ${jwt}` },
        }),
        CONNECT_TIMEOUT_MS, "Token isteği"
      );
      if (res.status === 402) {
        const body = await res.json();
        setError(body?.message ?? "Günlük ses kotanız doldu.");
        setUiState("error"); return;
      }
      if (!res.ok) throw new Error(`Token alınamadı (${res.status})`);
      const { token, signed_url } = await res.json();

      const SYSTEM_PROMPT = `Sen deneyimli bir Türk şantiye proje direktörüsün. Kullanıcı seninle Şantiyem uygulaması üzerinden sesli konuşuyor. Sen bir chatbot değilsin; saha tecrübesi olan, kısa ve net konuşan bir yönetici gibi davran.

## DİL
- HER ZAMAN Türkçe konuş. Teknik terimleri Türkçe kullan (hakediş, taşeron, puantaj, metraj, KDV, stopaj, avans, keşif, imalat, ihzarat).
- Cevapların kısa olsun (1–3 cümle). Uzun listeleri okuma; kritik olanı söyle, detay için sayfaya yönlendir.
- Markdown, madde işareti, emoji KULLANMA — sesli okunacak.

## VERİ KURALI (ÇOK ÖNEMLİ)
- Proje verisi hakkında ASLA hafızandan cevap verme. Uydurma yapma.
- Aşağıdaki konulardan HERHANGİ BİRİ geçtiğinde ÖNCE mutlaka \`query_project_data\` aracını çağır:
  ödeme, tahsilat, fatura, hakediş, sözleşme, taşeron, personel, işçi, puantaj, devam, çıkış, malzeme, stok, ihzarat, şantiye günlüğü, görev, iş programı, ilerleme, gecikme, bütçe, nakit, çek, cari.
- Araç sonucu gelmeden konuşmaya başlama.

## ARAÇ PARAMETRELERİ
\`query_project_data({ intent, keyword })\`
- intent: payments | invoices | hakedis | contracts | subcontractors | personnel | attendance | materials | site_diary | tasks | progress | cash | general
- keyword: kullanıcının cümlesinden çıkardığın özel isim veya tarih.

## CEVAP TARZI
- Önce net cevap, sonra 1 cümle bağlam.
- Kritik bir KPI varsa \`render_dashboard_card\` çağır.
- Kullanıcı "detay/aç/göster" derse \`navigate_to\` ile ilgili sayfaya yönlendir.`;

      const overrides = {
        agent: {
          language: "tr",
          firstMessage: "Merhaba, ben Şantiyem AI. Hangi projede yardımcı olayım?",
          prompt: { prompt: SYSTEM_PROMPT },
        },
      } as const;

      const waitForConnect = () =>
        withTimeout(
          new Promise<void>((resolve, reject) => { connectWaiterRef.current = { resolve, reject }; }),
          CONNECT_TIMEOUT_MS, "Ses bağlantısı"
        ).finally(() => { connectWaiterRef.current = null; });

      if (token) {
        try {
          const connected = waitForConnect();
          conversation.startSession({ conversationToken: token, connectionType: "webrtc", overrides });
          await connected; return;
        } catch (e) {
          console.warn("[voice] WebRTC failed, WebSocket fallback:", e);
          try { await conversation.endSession(); } catch { /* noop */ }
        }
      }
      if (signed_url) {
        const connected = waitForConnect();
        conversation.startSession({ signedUrl: signed_url, connectionType: "websocket", overrides });
        await connected; return;
      }
      throw new Error("Ses bağlantısı kurulamadı.");
    } catch (e) {
      console.error("[voice] start failed:", e);
      setError(e instanceof Error ? e.message : String(e));
      setUiState("error");
      toast.error("Sesli asistan başlatılamadı", { description: String(e) });
    }
  };

  const stop = async () => {
    try { await conversation.endSession(); } catch (e) { console.warn(e); }
  };

  useEffect(() => {
    if (conversation.status === "connected") {
      setUiState(conversation.isSpeaking ? "speaking" : "listening");
    }
  }, [conversation.status, conversation.isSpeaking]);

  useEffect(() => {
    if (autoStart && uiState === "idle" && access.hasAccess) start();
    return () => {
      if (conversation.status === "connected") {
        try { conversation.endSession(); } catch { /* noop */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============ MIC MUTE ============
  // Primary path: ElevenLabs SDK — `conversation.setMuted(true)` calls
  // `VoiceConversation.setMicMuted` → `InputController.setMuted`, which stops
  // uplink audio AND disables VAD on the ElevenLabs side.
  //
  // Belt-and-suspenders: we also wrap `navigator.mediaDevices.getUserMedia`
  // during a live session to keep references to every microphone track the SDK
  // opens, so we can flip `track.enabled = false/true` ourselves. This is what
  // iOS Safari actually respects even when a transport keeps the pipe open.
  const muted = conversation.isMuted;
  const micTracksRef = useRef<Set<MediaStreamTrack>>(new Set());

  useEffect(() => {
    if (!navigator?.mediaDevices?.getUserMedia) return;
    const md = navigator.mediaDevices;
    const original = md.getUserMedia.bind(md);
    const buildAudioConstraints = (input: boolean | MediaTrackConstraints | undefined): MediaTrackConstraints => {
      const base: MediaTrackConstraints = typeof input === "object" && input ? { ...input } : {};
      // Always request browser-level DSP; construction sites need every dB of NS/AGC.
      base.echoCancellation = true;
      base.noiseSuppression = true;
      base.autoGainControl = true;
      // Chromium-only hints for stronger NS pipeline. Ignored elsewhere.
      (base as any).googEchoCancellation = true;
      (base as any).googNoiseSuppression = true;
      (base as any).googHighpassFilter = true;
      (base as any).googAutoGainControl = true;
      (base as any).googTypingNoiseDetection = true;
      base.channelCount = 1;
      return base;
    };
    const wrapped: typeof md.getUserMedia = async (constraints) => {
      const patched: MediaStreamConstraints = { ...(constraints || {}) };
      if (patched.audio !== false) patched.audio = buildAudioConstraints(patched.audio as any);
      const stream = await original(patched);
      try {
        for (const t of stream.getAudioTracks()) {
          micTracksRef.current.add(t);
          t.addEventListener("ended", () => micTracksRef.current.delete(t));
          // Re-apply constraints in case the browser dropped a hint.
          try { await t.applyConstraints(buildAudioConstraints(true)); } catch { /* noop */ }
        }
      } catch { /* noop */ }
      return stream;
    };
    md.getUserMedia = wrapped;
    return () => { md.getUserMedia = original; };
  }, []);

  const setLocalTracksEnabled = (enabled: boolean) => {
    try {
      for (const t of micTracksRef.current) {
        if (t.readyState === "live" && t.kind === "audio") t.enabled = enabled;
      }
    } catch (e) { console.warn("[voice] track toggle failed", e); }
  };

  // ============ ANTI-BARGE-IN (Construction Site Mode) ============
  // While the agent is speaking AND site mode is on, silence the mic so
  // hammers, drills, vehicles and background chatter cannot trigger VAD
  // and interrupt the response. Re-enable a moment after AI stops so a
  // deliberate user reply still lands quickly.
  useEffect(() => {
    if (!active) return;
    if (muted) return; // user explicitly muted — respect it
    if (siteMode && conversation.isSpeaking) {
      setLocalTracksEnabled(false);
      return () => {
        // Small grace so tail-end TTS audio doesn't self-trigger VAD on re-open.
        setTimeout(() => { if (!muted) setLocalTracksEnabled(true); }, 350);
      };
    } else {
      setLocalTracksEnabled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.isSpeaking, siteMode, active, muted]);


  const toggleMute = () => {
    const next = !muted;
    console.log("[voice] toggleMute →", next, "tracks:", micTracksRef.current.size);
    try {
      // 1) SDK — updates ElevenLabs InputController; also disables VAD server-side.
      conversation.setMuted(next);
    } catch (e) { console.warn("[voice] conversation.setMuted failed", e); }
    // 2) Local track flag — makes sure iOS Safari really stops streaming.
    setLocalTracksEnabled(!next);
  };
  const togglePause = async () => {
    // Best-effort pause via volume (SDK has no native pause for realtime).
    try { await conversation.setVolume({ volume: paused ? 1 : 0 }); setPaused(!paused); }
    catch (e) { console.warn(e); }
  };
  const repeatAnswer = () => {
    try { conversation.sendUserMessage?.("Son cevabını lütfen tekrar et."); }
    catch (e) { console.warn(e); }
  };

  const active = uiState !== "idle" && uiState !== "error";

  const statusLabel = useMemo(() => {
    if (muted && active) return "Mikrofon kapalı";
    switch (uiState) {
      case "connecting": return "Bağlanıyor…";
      case "listening": return "Dinleniyor";
      case "thinking": return "Şantiye kayıtları inceleniyor…";
      case "speaking": return "Cevap veriliyor";
      case "error": return "Hata";
      default: return access.hasAccess ? "Dokun ve konuş" : "Kota doldu";
    }
  }, [uiState, access.hasAccess, muted, active]);

  return (
    <div
      className="fixed inset-0 z-50 voice-blueprint flex flex-col text-white overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Ambient orange bloom */}
      <div className="pointer-events-none absolute top-[-20%] left-1/2 -translate-x-1/2 w-[120vw] h-[60vh]"
        style={{ background: "radial-gradient(ellipse at center, rgba(255,107,43,0.18), transparent 60%)" }} />

      {/* ============ HEADER ============ */}
      <Header
        projectName={projectName}
        status={uiState}
        onClose={() => { stop(); onClose(); }}
        onOpenHistory={() => setShowHistory((v) => !v)}
        historyOpen={showHistory}
        historyCount={bubbles.length}
        remainingSeconds={access.remainingSeconds}
      />

      {/* ============ MAIN AREA ============ */}
      <div className={`flex-1 grid ${compact ? "grid-cols-1" : "md:grid-cols-[1fr_360px]"} overflow-hidden relative`}>
        {/* LEFT: Orb + transcript */}
        <div className="flex flex-col items-center justify-center px-6 py-6 gap-6 relative overflow-hidden">
          <OrbStage state={uiState} compact={compact} />

          {/* Live subtitle / status */}
          <div className="text-center min-h-[4rem] max-w-xl px-4">
            {error ? (
              <div className="flex items-center justify-center gap-2 text-[#FF8A8A] text-base voice-fade-in">
                <AlertCircle className="w-5 h-5" /> {error}
              </div>
            ) : uiState === "thinking" ? (
              <div className="voice-shimmer-text text-lg font-medium tracking-wide">
                {statusLabel}
              </div>
            ) : transcript && active ? (
              <div className="voice-fade-in text-white/95 text-lg leading-relaxed">
                {transcript}
              </div>
            ) : (
              <div className="text-white/40 text-sm uppercase tracking-[0.25em]">{statusLabel}</div>
            )}
          </div>

          {/* Action bar / Start button */}
          {uiState === "idle" || uiState === "error" ? (
            <StartButton onStart={start} disabled={!access.hasAccess} />
          ) : (
            <ActionBar
              muted={muted}
              paused={paused}
              onMute={toggleMute}
              onPause={togglePause}
              onStop={stop}
              onKeyboard={() => { stop(); onClose(); }}
              onRepeat={repeatAnswer}
              onHistory={() => setShowHistory((v) => !v)}
            />
          )}

          {access.hasAccess && access.remainingSeconds !== null && (
            <div className="text-[11px] text-white/30 tabular-nums">
              Kalan süre: {Math.floor(access.remainingSeconds / 60)} dk {access.remainingSeconds % 60} sn
            </div>
          )}
          {!access.hasAccess && (
            <div className="text-[11px] text-white/40 text-center max-w-xs">
              Ücretsiz planda günlük 10 dk. Sınırsız için Premium'a geçin.
            </div>
          )}
        </div>

        {/* RIGHT: Dashboard rail (desktop) */}
        {!compact && (
          <DashboardRail cards={cards} summary={showSummary ? bubbles : null} onClose={() => setShowSummary(false)} />
        )}

        {/* Slide-over history panel (mobile + desktop) */}
        {showHistory && (
          <HistoryPanel bubbles={bubbles} onClose={() => setShowHistory(false)} />
        )}

        {/* Summary sheet (mobile) */}
        {compact && showSummary && (
          <SummarySheet bubbles={bubbles} cards={cards} onClose={() => setShowSummary(false)} />
        )}
      </div>
    </div>
  );
}

/* =====================================================
   HEADER
   ===================================================== */
function Header({
  projectName, status, onClose, onOpenHistory, historyOpen, historyCount, remainingSeconds,
}: {
  projectName: string; status: UiState; onClose: () => void;
  onOpenHistory: () => void; historyOpen: boolean; historyCount: number;
  remainingSeconds: number | null;
}) {
  const online = status !== "error" && status !== "idle";
  return (
    <div className="relative z-10 flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/5 voice-glass">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #FF6B2B, #C13A00)", boxShadow: "0 4px 20px rgba(255,107,43,0.4)" }}>
          <HardHat className="w-5 h-5 text-white" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.22em] text-[#FF8F5A] font-semibold">ŞANTİYEM AI</span>
            <span className="text-[10px] text-white/30">·</span>
            <span className="text-[10px] uppercase tracking-widest text-white/40">Construction Copilot</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-white/85 font-medium truncate max-w-[40vw] md:max-w-none">{projectName}</span>
            <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider ${online ? "text-emerald-400" : "text-white/40"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-400 voice-online-dot" : "bg-white/30"}`} />
              {online ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenHistory}
          className={`voice-glass-btn h-9 px-3 rounded-lg text-xs text-white/80 flex items-center gap-1.5 ${historyOpen ? "ring-1 ring-[#FF6B2B]/50" : ""}`}
          aria-label="Geçmiş"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="tabular-nums">{historyCount}</span>
        </button>
        <button
          onClick={onClose}
          className="voice-glass-btn h-9 w-9 rounded-lg flex items-center justify-center text-white/70"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   ORB STAGE — 4 states with distinct visualizations
   ===================================================== */
function OrbStage({ state, compact }: { state: UiState; compact: boolean }) {
  const size = compact ? "w-[280px] h-[280px]" : "w-[240px] h-[240px]";
  return (
    <div className={`relative ${size} flex items-center justify-center`}>
      {state === "thinking" ? (
        <ThinkingViz />
      ) : (
        <>
          {(state === "listening" || state === "speaking") && (
            <>
              <div className="absolute inset-0 rounded-full voice-orb-ring" style={{ background: "radial-gradient(circle, rgba(255,107,43,0.35), transparent 65%)" }} />
              <div className="absolute inset-0 rounded-full voice-orb-ring" style={{ background: "radial-gradient(circle, rgba(255,107,43,0.25), transparent 65%)", animationDelay: "0.75s" }} />
            </>
          )}
          <div
            className={`relative w-4/5 h-4/5 rounded-full flex items-center justify-center ${state === "listening" || state === "speaking" ? "voice-orb-pulse" : ""}`}
            style={{
              background: state === "error"
                ? "radial-gradient(circle at 30% 30%, #EF4444, #4a0f0f)"
                : "radial-gradient(circle at 30% 25%, #FFB58A 0%, #FF6B2B 45%, #7a1e00 100%)",
              boxShadow: "0 0 60px 4px rgba(255,107,43,0.4), inset 0 -20px 40px rgba(0,0,0,0.3), inset 0 20px 40px rgba(255,255,255,0.08)",
            }}
          >
            {state === "connecting" ? (
              <Loader2 className="w-10 h-10 text-white animate-spin" strokeWidth={1.6} />
            ) : state === "speaking" ? (
              <div className="flex items-end gap-1.5 h-20">
                {[0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.24, 0.12].map((d, i) => (
                  <div key={i} className="w-1.5 rounded-full bg-white/95 voice-wave-bar"
                    style={{ animationDelay: `${d}s`, height: "100%" }} />
                ))}
              </div>
            ) : state === "listening" ? (
              <div className="flex items-center gap-3">
                <Mic className={compact ? "w-16 h-16 text-white" : "w-12 h-12 text-white"} strokeWidth={1.6} />
              </div>
            ) : state === "error" ? (
              <AlertCircle className="w-14 h-14 text-white" strokeWidth={1.6} />
            ) : (
              <Mic className={compact ? "w-16 h-16 text-white" : "w-12 h-12 text-white"} strokeWidth={1.6} />
            )}
          </div>

          {/* Speaking waveform ring around orb */}
          {state === "speaking" && (
            <div className="absolute inset-[-24px] flex items-center justify-center pointer-events-none">
              <div className="flex items-center justify-center gap-1 w-full h-full">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i}
                    className="w-1 rounded-full bg-[#FF8F5A]/60 voice-wave-ring"
                    style={{
                      height: `${18 + Math.abs(Math.sin(i / 2)) * 22}px`,
                      animationDelay: `${(i % 6) * 0.08}s`,
                    }} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* Thinking: neural arcs + particle field + rotating blueprint */
function ThinkingViz() {
  const particles = Array.from({ length: 14 });
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Rotating blueprint */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full voice-orb-thinking opacity-60">
        <defs>
          <linearGradient id="voiceArcGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF8F5A" />
            <stop offset="100%" stopColor="#FF6B2B" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="90" stroke="rgba(255,107,43,0.15)" strokeWidth="0.6" fill="none" strokeDasharray="4 6" />
        <circle cx="100" cy="100" r="72" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" fill="none" />
        <circle cx="100" cy="100" r="54" stroke="rgba(255,107,43,0.2)" strokeWidth="0.5" fill="none" strokeDasharray="2 4" />
        <line x1="10" y1="100" x2="190" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />
        <line x1="100" y1="10" x2="100" y2="190" stroke="rgba(255,255,255,0.06)" strokeWidth="0.4" />
        <path className="voice-neural-arc" d="M 30 100 Q 100 30 170 100" />
        <path className="voice-neural-arc" d="M 30 100 Q 100 170 170 100" style={{ animationDelay: "0.6s" }} />
        <path className="voice-neural-arc" d="M 100 30 Q 30 100 100 170" style={{ animationDelay: "1.2s" }} />
      </svg>

      {/* Particle field */}
      <div className="absolute inset-0 flex items-center justify-center">
        {particles.map((_, i) => {
          const angle = (i / particles.length) * Math.PI * 2;
          const dx = Math.cos(angle) * 90;
          const dy = Math.sin(angle) * 90;
          return (
            <span key={i} className="voice-particle"
              style={{
                left: "50%", top: "50%",
                ["--dx" as string]: `${dx}px`,
                ["--dy" as string]: `${dy}px`,
                animationDelay: `${(i * 0.18) % 2.6}s`,
              } as React.CSSProperties} />
          );
        })}
      </div>

      {/* Center core */}
      <div className="relative w-24 h-24 rounded-full flex items-center justify-center"
        style={{
          background: "radial-gradient(circle at 30% 30%, #FFB58A, #FF6B2B 60%, #7a1e00)",
          boxShadow: "0 0 40px 4px rgba(255,107,43,0.5)",
        }}>
        <Activity className="w-8 h-8 text-white" strokeWidth={1.8} />
      </div>
    </div>
  );
}

/* =====================================================
   START BUTTON (idle state)
   ===================================================== */
function StartButton({ onStart, disabled }: { onStart: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onStart}
      disabled={disabled}
      className="group relative h-16 px-8 rounded-full flex items-center gap-3 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
      style={{
        background: "linear-gradient(135deg, #FF6B2B 0%, #E85300 100%)",
        boxShadow: "0 12px 40px -8px rgba(255,107,43,0.6), inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <Mic className="w-5 h-5" strokeWidth={2} />
      <span className="text-base">Konuşmayı Başlat</span>
      <span className="absolute inset-0 rounded-full ring-1 ring-white/10 group-hover:ring-white/25 transition-all pointer-events-none" />
    </button>
  );
}

/* =====================================================
   ACTION BAR — glass buttons (Mute / Pause / Stop / Keyboard / Repeat / History)
   ===================================================== */
function ActionBar({
  muted, paused, onMute, onPause, onStop, onKeyboard, onRepeat, onHistory,
}: {
  muted: boolean; paused: boolean;
  onMute: () => void; onPause: () => void; onStop: () => void;
  onKeyboard: () => void; onRepeat: () => void; onHistory: () => void;
}) {
  return (
    <div className="voice-glass-strong rounded-2xl px-2 py-2 flex items-center gap-1.5 voice-fade-in">
      <ActionBtn onClick={onMute} label={muted ? "Mikrofonu aç" : "Sustur"} danger={muted}>
        {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </ActionBtn>
      <ActionBtn onClick={onPause} label={paused ? "Devam" : "Duraklat"} active={paused}>
        {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
      </ActionBtn>
      <ActionBtn onClick={onRepeat} label="Tekrarla">
        <RotateCw className="w-4 h-4" />
      </ActionBtn>
      <ActionBtn onClick={onHistory} label="Geçmiş">
        <MessageSquare className="w-4 h-4" />
      </ActionBtn>
      <ActionBtn onClick={onKeyboard} label="Klavye">
        <Keyboard className="w-4 h-4" />
      </ActionBtn>
      <button
        onClick={onStop}
        className="ml-1 h-11 px-4 rounded-xl flex items-center gap-2 text-white text-sm font-medium transition-all active:scale-95"
        style={{
          background: "linear-gradient(135deg, #E5484D, #B4272B)",
          boxShadow: "0 6px 20px -4px rgba(229,72,77,0.5)",
        }}
      >
        <Square className="w-3.5 h-3.5 fill-white" />
        <span>Bitir</span>
      </button>
    </div>
  );
}
function ActionBtn({ onClick, label, active, danger, children }: {
  onClick: () => void; label: string; active?: boolean; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`h-11 w-11 rounded-xl flex items-center justify-center voice-glass-btn transition-colors ${
        danger
          ? "text-white ring-1 ring-[#FF6B6B]/70"
          : active
            ? "ring-1 ring-[#FF6B2B]/60 text-[#FFB58A]"
            : "text-white/85"
      }`}
      style={danger ? {
        background: "linear-gradient(135deg, #E5484D, #B4272B)",
        boxShadow: "0 6px 20px -4px rgba(229,72,77,0.55)",
      } : undefined}
    >
      {children}
    </button>
  );
}

/* =====================================================
   DASHBOARD RAIL (desktop right column)
   ===================================================== */
function DashboardRail({ cards, summary, onClose }: { cards: Card[]; summary: Bubble[] | null; onClose: () => void }) {
  return (
    <aside className="border-l border-white/5 overflow-y-auto p-4 space-y-3 relative"
      style={{ background: "linear-gradient(180deg, rgba(15,20,25,0.9), rgba(6,9,13,0.95))" }}>
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-2">
          <Sparkle className="w-3.5 h-3.5 text-[#FF8F5A]" strokeWidth={2.2} />
          <span className="text-[10px] uppercase tracking-[0.22em] text-white/50 font-semibold">Canlı Panel</span>
        </div>
        <span className="text-[10px] text-white/30 tabular-nums">{cards.length}/8</span>
      </div>

      {cards.length === 0 ? (
        <div className="voice-glass rounded-2xl p-6 text-center">
          <div className="text-white/40 text-sm leading-relaxed">
            AI konuşma sırasında burada KPI kartları, uyarılar ve öneriler oluşturur.
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-white/25 uppercase tracking-widest">
            <AlertTriangle className="w-3 h-3" /> Ödeme
            <span>·</span>
            <Package className="w-3 h-3" /> Stok
            <span>·</span>
            <Users className="w-3 h-3" /> Puantaj
          </div>
        </div>
      ) : (
        cards.map((c) => <PremiumCard key={c.id} card={c} />)
      )}

      {summary && summary.length >= 2 && (
        <SummaryPanel bubbles={summary} onClose={onClose} />
      )}
    </aside>
  );
}

function PremiumCard({ card }: { card: Card }) {
  const tone = {
    danger:      { icon: AlertTriangle, ring: "rgba(239,68,68,0.4)", glow: "rgba(239,68,68,0.15)", accent: "#FF6B6B" },
    warning:     { icon: AlertTriangle, ring: "rgba(251,191,36,0.4)", glow: "rgba(251,191,36,0.12)", accent: "#FBBF24" },
    positive:    { icon: TrendingUp,    ring: "rgba(52,211,153,0.4)", glow: "rgba(52,211,153,0.12)", accent: "#34D399" },
    neutral:     { icon: Activity,      ring: "rgba(255,107,43,0.35)", glow: "rgba(255,107,43,0.10)", accent: "#FF8F5A" },
  }[card.tone ?? "neutral"];
  const Icon = tone.icon;
  return (
    <div className="voice-card-in voice-glass rounded-2xl p-4 relative overflow-hidden"
      style={{ borderColor: tone.ring, boxShadow: `0 0 0 1px ${tone.ring}, 0 20px 40px -20px ${tone.glow}` }}>
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-60"
        style={{ background: `radial-gradient(circle, ${tone.glow}, transparent 70%)` }} />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: tone.glow, border: `1px solid ${tone.ring}` }}>
            <Icon className="w-3.5 h-3.5" style={{ color: tone.accent }} strokeWidth={2.2} />
          </div>
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-semibold">{card.type}</span>
        </div>
        <div className="text-white/95 font-semibold text-sm leading-snug">{card.title}</div>
        {card.value && (
          <div className="text-3xl font-bold mt-1.5 tabular-nums" style={{ color: tone.accent }}>{card.value}</div>
        )}
        {card.detail && <div className="text-xs text-white/55 mt-1.5 leading-relaxed">{card.detail}</div>}
        {card.type === "recommendation" && (
          <button className="mt-3 text-xs text-[#FF8F5A] flex items-center gap-1 hover:gap-2 transition-all">
            Aksiyon al <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   HISTORY PANEL — conversation bubbles slide-over
   ===================================================== */
function HistoryPanel({ bubbles, onClose }: { bubbles: Bubble[]; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex justify-end voice-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:w-[420px] h-full voice-glass-strong border-l border-white/10 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#FF8F5A]" />
            <span className="text-sm font-semibold">Konuşma Geçmişi</span>
            <span className="text-[10px] text-white/40 tabular-nums">({bubbles.length})</span>
          </div>
          <button onClick={onClose} className="voice-glass-btn h-8 w-8 rounded-lg flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {bubbles.length === 0 ? (
            <div className="text-center text-white/30 text-sm py-16">Henüz konuşma yok.</div>
          ) : (
            bubbles.map((b) => <BubbleRow key={b.id} bubble={b} />)
          )}
        </div>
      </div>
    </div>
  );
}

function BubbleRow({ bubble }: { bubble: Bubble }) {
  const [expanded, setExpanded] = useState(false);
  const long = bubble.text.length > 160;
  const isUser = bubble.role === "user";
  return (
    <div className={`voice-bubble-in flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser
          ? "bg-[#FF6B2B] text-white rounded-br-sm"
          : "voice-glass text-white/90 rounded-bl-sm"
      }`}>
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Şantiyem AI</span>
          </div>
        )}
        <div>{long && !expanded ? bubble.text.slice(0, 160) + "…" : bubble.text}</div>
        {long && !isUser && (
          <button onClick={() => setExpanded((v) => !v)}
            className="mt-1.5 text-[11px] text-[#FF8F5A] flex items-center gap-1">
            {expanded ? <>Daralt <ChevronUp className="w-3 h-3" /></> : <>Devamı <ChevronDown className="w-3 h-3" /></>}
          </button>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   AI SUMMARY
   ===================================================== */
function SummaryPanel({ bubbles, onClose }: { bubbles: Bubble[]; onClose: () => void }) {
  const summary = useMemo(() => buildSummary(bubbles), [bubbles]);
  return (
    <div className="voice-card-in voice-glass-strong rounded-2xl p-4 mt-4"
      style={{ borderColor: "rgba(255,107,43,0.3)", boxShadow: "0 0 0 1px rgba(255,107,43,0.3), 0 20px 60px -20px rgba(255,107,43,0.3)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkle className="w-4 h-4 text-[#FF8F5A]" strokeWidth={2.2} />
          <span className="text-xs uppercase tracking-[0.2em] text-white/60 font-semibold">AI Özeti</span>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white/80"><X className="w-3.5 h-3.5" /></button>
      </div>
      <SummaryBody s={summary} />
    </div>
  );
}
function SummarySheet({ bubbles, cards, onClose }: { bubbles: Bubble[]; cards: Card[]; onClose: () => void }) {
  const summary = useMemo(() => buildSummary(bubbles), [bubbles]);
  return (
    <div className="absolute inset-x-0 bottom-0 z-30 voice-fade-in">
      <div className="voice-glass-strong rounded-t-3xl p-5 max-h-[70vh] overflow-y-auto"
        style={{ boxShadow: "0 -20px 60px -20px rgba(255,107,43,0.4)" }}>
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkle className="w-4 h-4 text-[#FF8F5A]" />
            <span className="text-sm font-semibold">Konuşma Özeti</span>
          </div>
          <button onClick={onClose} className="voice-glass-btn h-8 w-8 rounded-lg flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <SummaryBody s={summary} />
        {cards.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 font-semibold">Kritik Kartlar</div>
            <div className="grid grid-cols-1 gap-2">
              {cards.slice(0, 3).map((c) => <PremiumCard key={c.id} card={c} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryBody({ s }: { s: ReturnType<typeof buildSummary> }) {
  return (
    <div className="space-y-3 text-sm">
      <SummarySection icon={Activity} label="Bugünkü Bulgular" items={s.findings} />
      <SummarySection icon={TrendingUp} label="Önerilen Aksiyonlar" items={s.actions} accent="#34D399" />
      <SummarySection icon={AlertTriangle} label="Kritik Riskler" items={s.risks} accent="#FF6B6B" />
      <SummarySection icon={Sparkle} label="Potansiyel Tasarruf" items={s.savings} accent="#FBBF24" />
      {s.nextQuestion && (
        <div className="voice-glass rounded-xl p-3 mt-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-1">Sonraki Soru Önerisi</div>
          <div className="text-sm text-white/85">"{s.nextQuestion}"</div>
        </div>
      )}
    </div>
  );
}
function SummarySection({ icon: Icon, label, items, accent = "#FF8F5A" }:
  { icon: any; label: string; items: string[]; accent?: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5" style={{ color: accent }} strokeWidth={2} />
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-semibold">{label}</span>
      </div>
      <ul className="space-y-1 pl-1">
        {items.slice(0, 3).map((t, i) => (
          <li key={i} className="text-white/80 text-sm leading-relaxed flex gap-2">
            <span style={{ color: accent }} className="mt-1.5 shrink-0">▸</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Heuristic summary purely from client-side bubbles — no backend calls */
function buildSummary(bubbles: Bubble[]) {
  const aiTexts = bubbles.filter((b) => b.role === "ai").map((b) => b.text);
  const userTexts = bubbles.filter((b) => b.role === "user").map((b) => b.text);

  const findings: string[] = [];
  const actions: string[] = [];
  const risks: string[] = [];
  const savings: string[] = [];

  for (const t of aiTexts) {
    const lower = t.toLowerCase();
    if (/(gecikti|geciken|risk|kritik|acil|aşıldı|yetersiz|düşük stok|ödenmedi)/i.test(t)) risks.push(t.slice(0, 140));
    else if (/(öneri|yapılmalı|önce|takip|kontrol et|iletişim|ara|görüş)/i.test(t)) actions.push(t.slice(0, 140));
    else if (/(tasarruf|kâr|kar|verim|iyileştir|azalt)/i.test(t)) savings.push(t.slice(0, 140));
    else findings.push(t.slice(0, 140));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = lower;
  }

  const lastUser = userTexts[userTexts.length - 1]?.toLowerCase() ?? "";
  let nextQuestion = "Bu haftaki hakediş durumu nedir?";
  if (lastUser.includes("ödeme")) nextQuestion = "Bekleyen taşeron ödemelerini listeler misin?";
  else if (lastUser.includes("stok") || lastUser.includes("malzeme")) nextQuestion = "Kritik seviyedeki malzemeleri gösterir misin?";
  else if (lastUser.includes("puantaj") || lastUser.includes("işçi") || lastUser.includes("personel")) nextQuestion = "Bugünkü devamsızlıkları görebilir miyim?";
  else if (lastUser.includes("hakediş")) nextQuestion = "Son hakedişin KDV ve stopaj dökümünü ver.";

  return {
    findings: findings.slice(0, 3),
    actions: actions.slice(0, 3),
    risks: risks.slice(0, 3),
    savings: savings.slice(0, 3),
    nextQuestion,
  };
}
