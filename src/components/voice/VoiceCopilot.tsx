import { useEffect, useMemo, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { X, Mic, MicOff, Keyboard, Loader2, AlertCircle, ArrowRight, HardHat } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import type { VoiceAccess } from "@/hooks/useVoiceAccess";

interface Card {
  id: string;
  type: "kpi" | "warning" | "recommendation" | "info";
  title: string;
  value?: string;
  detail?: string;
  tone?: "positive" | "warning" | "danger" | "neutral";
}

interface Props {
  onClose: () => void;
  access: VoiceAccess;
  compact?: boolean; // hands-free mode hides dashboard rail
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
  const [cards, setCards] = useState<Card[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const sessionStartRef = useRef<number | null>(null);
  const connectWaiterRef = useRef<{ resolve: () => void; reject: (e: Error) => void } | null>(null);
  const navigate = useNavigate();

  const conversation = useConversation({
    overrides: {
      agent: { language: "tr" },
    },
    onConnect: () => {
      try {
        connectWaiterRef.current?.resolve();
        connectWaiterRef.current = null;
        sessionStartRef.current = Date.now();
        setUiState("listening");
        if (initialContext) {
          queueMicrotask(() => {
            try {
              conversation.sendContextualUpdate(initialContext);
            } catch (e) {
              console.warn("contextual update failed", e);
            }
          });
        }
      } catch (e) {
        console.error("onConnect handler failed", e);
      }
    },
    onDisconnect: () => {
      try {
        setUiState("idle");
        const secs = sessionStartRef.current ? Math.round((Date.now() - sessionStartRef.current) / 1000) : 0;
        sessionStartRef.current = null;
        if (secs > 0) trackUsage(secs);
      } catch (e) {
        console.error("onDisconnect handler failed", e);
      }
    },
    onMessage: (msg: any) => {
      try {
        console.log("[voice][onMessage]", msg?.type ?? msg?.source, msg);
        if (msg?.source === "user" && typeof msg.message === "string") {
          setTranscript(msg.message);
        }
        if (msg?.source === "ai" && typeof msg.message === "string") {
          setTranscript(msg.message);
        }
      } catch (e) {
        console.error("onMessage handler failed", e);
      }
    },
    onError: (e: unknown) => {
      try {
        console.error("Voice error", e);
        const msg = typeof e === "string" ? e : (e instanceof Error ? e.message : "Ses bağlantısında hata.");
        if (connectWaiterRef.current) {
          connectWaiterRef.current.reject(new Error(msg));
          connectWaiterRef.current = null;
          return; // start() flow handles the fallback / error UI
        }
        setError(msg);
        setUiState("error");
      } catch (err) {
        console.error("onError handler failed", err);
      }
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
        try {
          const { data: sess } = await supabase.auth.getSession();
          const jwt = sess?.session?.access_token;
          console.log("[voice][tool] fetching /chat, jwt?", Boolean(jwt));
          const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${jwt ?? ""}`,
            },
            body: JSON.stringify({
              messages: [{ role: "user", content: `${params.intent ?? ""} ${params.keyword ?? ""}`.trim() }],
              voice_mode: true,
            }),
          });
          console.log("[voice][tool] /chat status:", res.status, "in", Math.round(performance.now() - t0), "ms");
          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            console.warn("[voice][tool] /chat error body:", errText);
            const out = `Veriye ulaşılamadı (HTTP ${res.status}).`;
            console.log("[voice][tool] RETURNING:", out);
            return out;
          }
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
    } catch (e) {
      console.warn("usage track failed", e);
    }
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
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Bu cihaz/tarayıcı mikrofon erişimini desteklemiyor.");
        setUiState("error");
        return;
      }

      // Check (don't request) mic permission first for a fast, clear error.
      try {
        const perm = await navigator.permissions?.query?.({ name: "microphone" as PermissionName });
        console.log("[voice] mic permission state:", perm?.state);
        if (perm?.state === "denied") {
          setError("Mikrofon izni reddedilmiş. Ayarlar > Uygulamalar > Şantiyem > İzinler bölümünden mikrofon iznini açın.");
          setUiState("error");
          return;
        }
      } catch { /* permissions API not supported everywhere */ }

      // Actively open the mic once (triggers the permission prompt) and release
      // it immediately. This catches permission/hardware failures early instead
      // of the SDK silently hanging in "connecting".
      try {
        console.log("[voice] requesting microphone…");
        const stream = await withTimeout(
          navigator.mediaDevices.getUserMedia({ audio: true }),
          CONNECT_TIMEOUT_MS,
          "Mikrofon izni"
        );
        stream.getTracks().forEach((t) => t.stop());
        console.log("[voice] microphone OK");
      } catch (micErr) {
        console.error("[voice] getUserMedia failed:", micErr);
        const name = (micErr as DOMException)?.name;
        if (name === "NotAllowedError" || name === "SecurityError") {
          setError("Mikrofon izni gerekli. Ayarlar > Uygulamalar > Şantiyem > İzinler bölümünden mikrofon iznini açıp tekrar deneyin.");
        } else if (name === "NotFoundError") {
          setError("Mikrofon bulunamadı. Cihazınızın mikrofonunu kontrol edin.");
        } else {
          setError("Mikrofon açılamadı. Lütfen tekrar deneyin.");
        }
        setUiState("error");
        return;
      }

      const { data: sess } = await supabase.auth.getSession();
      const jwt = sess?.session?.access_token;
      if (!jwt) throw new Error("Oturum bulunamadı, lütfen tekrar giriş yapın.");

      console.log("[voice] fetching conversation token…");
      const res = await withTimeout(
        fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-conversation-token`, {
          method: "POST",
          headers: { Authorization: `Bearer ${jwt}` },
        }),
        CONNECT_TIMEOUT_MS,
        "Token isteği"
      );
      if (res.status === 402) {
        const body = await res.json();
        setError(body?.message ?? "Günlük ses kotanız doldu.");
        setUiState("error");
        return;
      }
      if (!res.ok) {
        throw new Error(`Token alınamadı (${res.status})`);
      }
      const { token, signed_url, agent_id } = await res.json();
      console.log("[voice] token received. agent:", agent_id, "webrtc token:", Boolean(token), "signed_url:", Boolean(signed_url));

      const overrides = {
        agent: {
          language: "tr",
          firstMessage: "Merhaba, ben Şantiyem AI. Hangi projede yardımcı olayım?",
        },
      } as const;

      // startSession is fire-and-forget in this SDK version;
      // success/failure arrives via onConnect/onError callbacks.
      const waitForConnect = () =>
        withTimeout(
          new Promise<void>((resolve, reject) => {
            connectWaiterRef.current = { resolve, reject };
          }),
          CONNECT_TIMEOUT_MS,
          "Ses bağlantısı"
        ).finally(() => {
          connectWaiterRef.current = null;
        });

      // 1) Try WebRTC first (lower latency)
      if (token) {
        try {
          console.log("[voice] starting WebRTC session…");
          const connected = waitForConnect();
          conversation.startSession({
            conversationToken: token,
            connectionType: "webrtc",
            overrides,
          });
          await connected;
          console.log("[voice] WebRTC session started");
          return;
        } catch (e) {
          console.warn("[voice] WebRTC failed, will try WebSocket fallback:", e);
          try { await conversation.endSession(); } catch { /* noop */ }
        }
      }

      // 2) Fallback: WebSocket via signed URL
      if (signed_url) {
        console.log("[voice] starting WebSocket session…");
        const connected = waitForConnect();
        conversation.startSession({
          signedUrl: signed_url,
          connectionType: "websocket",
          overrides,
        });
        await connected;
        console.log("[voice] WebSocket session started");
        return;
      }

      throw new Error("Ses bağlantısı kurulamadı. Lütfen tekrar deneyin.");
    } catch (e) {
      console.error("[voice] start failed:", e);
      setError(e instanceof Error ? e.message : String(e));
      setUiState("error");
      toast.error("Sesli asistan başlatılamadı", { description: String(e) });
    }
  };

  const stop = async () => {
    try {
      await conversation.endSession();
    } catch (e) {
      console.warn(e);
    }
  };

  // Track speaking/listening state
  useEffect(() => {
    if (conversation.status === "connected") {
      setUiState(conversation.isSpeaking ? "speaking" : "listening");
    }
  }, [conversation.status, conversation.isSpeaking]);

  useEffect(() => {
    if (autoStart && uiState === "idle" && access.hasAccess) {
      start();
    }
    return () => {
      if (conversation.status === "connected") {
        try { conversation.endSession(); } catch { /* noop */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = async () => {
    try {
      await conversation.setVolume({ volume: muted ? 1 : 0 });
      setMuted(!muted);
    } catch (e) {
      console.warn(e);
    }
  };

  const label = useMemo(() => {
    switch (uiState) {
      case "connecting": return "Bağlanıyor…";
      case "listening": return "Dinliyorum";
      case "thinking": return "Düşünüyor";
      case "speaking": return "Konuşuyor";
      case "error": return "Hata";
      default: return access.hasAccess ? "Konuşmak için başlat" : "Kota doldu";
    }
  }, [uiState, access.hasAccess]);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0A0E13]/95 backdrop-blur-xl flex flex-col"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div>
          <div className="text-xs text-white/50 uppercase tracking-widest">Şantiyem</div>
          <div className="text-white font-semibold">AI Construction Copilot</div>
        </div>
        <div className="flex items-center gap-2">
          {!compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { stop(); onClose(); navigate("/saha"); }}
              className="text-white/70 hover:text-white hover:bg-white/5"
            >
              <HardHat className="w-4 h-4 mr-1" /> Saha Modu
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { stop(); onClose(); }}
            className="text-white/70 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className={`flex-1 grid ${compact ? "grid-cols-1" : "md:grid-cols-[1fr_380px]"} overflow-hidden`}>
        {/* Orb + transcript */}
        <div className="flex flex-col items-center justify-center px-6 py-8 gap-8">
          <OrbVisual state={uiState} compact={compact} />
          <div className={`text-center ${compact ? "text-3xl md:text-4xl" : "text-lg"} text-white/90 max-w-2xl min-h-[3rem] leading-relaxed`}>
            {error ? (
              <span className="text-[#FF6B6B] flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5" /> {error}
              </span>
            ) : transcript ? (
              transcript
            ) : (
              <span className="text-white/40">{label}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {uiState === "idle" || uiState === "error" ? (
              <Button
                onClick={start}
                disabled={!access.hasAccess}
                size="lg"
                className="bg-[#FF6B2B] hover:bg-[#FF7A3F] text-white rounded-full px-8 h-12"
              >
                <Mic className="w-5 h-5 mr-2" /> Konuşmayı Başlat
              </Button>
            ) : (
              <>
                <Button
                  onClick={toggleMute}
                  size="lg"
                  variant="outline"
                  className="rounded-full h-12 w-12 p-0 border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
                <Button
                  onClick={stop}
                  size="lg"
                  variant="destructive"
                  className="rounded-full h-12 px-6"
                >
                  Kapat
                </Button>
              </>
            )}
            {!compact && (
              <Button
                onClick={() => { stop(); onClose(); }}
                variant="ghost"
                size="lg"
                className="text-white/60 hover:text-white hover:bg-white/5 rounded-full h-12"
              >
                <Keyboard className="w-4 h-4 mr-2" /> Yazmaya geç
              </Button>
            )}
          </div>

          {!access.hasAccess && (
            <div className="text-xs text-white/50 text-center max-w-md">
              Ücretsiz planda günlük 10 dakika sesli asistan hakkı bulunur. Sınırsız kullanım için Premium'a yükselin.
            </div>
          )}
          {access.hasAccess && access.remainingSeconds !== null && (
            <div className="text-xs text-white/40">
              Bugünkü kalan süreniz: {Math.floor(access.remainingSeconds / 60)} dk {access.remainingSeconds % 60} sn
            </div>
          )}
        </div>

        {/* Dashboard rail */}
        {!compact && (
          <div className="border-l border-white/5 bg-[#0F1419] overflow-y-auto p-4 space-y-3">
            <div className="text-xs uppercase tracking-widest text-white/40 px-1 pb-1">Canlı Dashboard</div>
            {cards.length === 0 ? (
              <div className="text-sm text-white/30 px-1 py-8 text-center">
                Sesli konuşma sırasında AI burada KPI kartları, uyarılar ve öneriler oluşturur.
              </div>
            ) : (
              cards.map((c) => <CopilotCard key={c.id} card={c} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OrbVisual({ state, compact }: { state: UiState; compact: boolean }) {
  const size = compact ? "w-64 h-64" : "w-44 h-44";
  return (
    <div className={`relative ${size} flex items-center justify-center`}>
      {(state === "listening" || state === "speaking") && (
        <>
          <div className="absolute inset-0 rounded-full bg-[#FF6B2B]/20 voice-orb-ring" />
          <div className="absolute inset-0 rounded-full bg-[#FF6B2B]/20 voice-orb-ring" style={{ animationDelay: "0.6s" }} />
        </>
      )}
      <div
        className={`relative w-full h-full rounded-full flex items-center justify-center transition-all ${
          state === "listening" ? "voice-orb-pulse" : ""
        }`}
        style={{
          background:
            state === "error"
              ? "radial-gradient(circle at 30% 30%, #EF4444, #7f1d1d)"
              : "radial-gradient(circle at 30% 30%, #FF8F5A, #C13A00)",
          boxShadow: "0 0 80px 0 rgba(255,107,43,0.35)",
        }}
      >
        {state === "connecting" || state === "thinking" ? (
          <Loader2 className="w-10 h-10 text-white voice-orb-thinking" />
        ) : state === "speaking" ? (
          <div className="flex items-end gap-1 h-16">
            {[0.1, 0.25, 0.4, 0.55, 0.7].map((d, i) => (
              <div
                key={i}
                className="w-2 rounded-full bg-white voice-wave-bar"
                style={{ animationDelay: `${d}s`, height: "100%" }}
              />
            ))}
          </div>
        ) : (
          <Mic className={`${compact ? "w-24 h-24" : "w-14 h-14"} text-white`} strokeWidth={1.6} />
        )}
      </div>
    </div>
  );
}

function CopilotCard({ card }: { card: Card }) {
  const toneClass = {
    positive: "border-emerald-500/30 bg-emerald-500/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    danger: "border-red-500/30 bg-red-500/5",
    neutral: "border-white/10 bg-white/5",
  }[card.tone ?? "neutral"];
  return (
    <div className={`voice-card-in rounded-xl border ${toneClass} p-4`}>
      <div className="text-[11px] uppercase tracking-widest text-white/40 mb-1">{card.type}</div>
      <div className="text-white font-semibold text-sm">{card.title}</div>
      {card.value && <div className="text-2xl font-bold text-white mt-1 tabular-nums">{card.value}</div>}
      {card.detail && <div className="text-xs text-white/60 mt-1 leading-relaxed">{card.detail}</div>}
      {card.type === "recommendation" && (
        <button className="mt-3 text-xs text-[#FF6B2B] flex items-center gap-1 hover:underline">
          Aksiyon al <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
