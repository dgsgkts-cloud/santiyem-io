import { useEffect, useState } from "react";
import { Mic, Lock } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { useVoiceAccess } from "@/hooks/useVoiceAccess";
import { VoiceExperience } from "./VoiceExperience";
import { VoiceErrorBoundary } from "./VoiceErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/voice.css";

type BriefCard = {
  id: string;
  type: "kpi" | "warning" | "recommendation" | "info";
  title: string;
  value?: string;
  detail?: string;
  tone?: "positive" | "warning" | "danger" | "neutral";
};

type OpenPayload = { autoSpeak?: boolean; requiresBriefing?: boolean };

/**
 * Global floating microphone button that opens the Voice Copilot overlay.
 * Hidden on the marketing landing (unauthenticated users).
 */
export function VoiceOrb() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [showFinanceTip, setShowFinanceTip] = useState(false);
  const [pending, setPending] = useState<{
    initialContext?: string;
    initialCards?: BriefCard[];
    autoSpeak?: boolean;
  }>({});
  const access = useVoiceAccess();


  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data?.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_, s) => setSignedIn(!!s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = ((e as CustomEvent).detail ?? {}) as OpenPayload;
      const w = window as unknown as {
        __briefingText?: string;
        __briefingCards?: BriefCard[];
        __briefingAutoSpeak?: boolean;
      };
      const brief = w.__briefingText;
      const cards = w.__briefingCards;
      const autoSpeak = detail.autoSpeak ?? w.__briefingAutoSpeak ?? false;

      // Sprint 15.3 — Voice Fix #5: brifing zorunluysa ve yoksa açma.
      if (detail.requiresBriefing && !brief) {
        toast.error("Okunacak bir yönetici özeti bulunamadı.");
        return;
      }

      setPending({
        initialContext: brief
          ? `SABAH YÖNETİCİ BRİFİNGİ (aşağıdaki metni tam olarak, sanki sen okuyormuşsun gibi Türkçe sesli oku; giriş cümlesi ekleme, standart selamlama YAPMA; bittiğinde tek somut soruyla bitir): ${brief}`
          : undefined,
        initialCards: cards,
        autoSpeak,
      });

      // Hand-off tüketildi — window state'ini temizle.
      try {
        delete w.__briefingText;
        delete w.__briefingCards;
        delete w.__briefingAutoSpeak;
      } catch { /* noop */ }

      setOpen(true);
    };
    window.addEventListener("open-voice-copilot", handler);
    return () => window.removeEventListener("open-voice-copilot", handler);
  }, []);

  // Sprint 22 — one-time contextual tooltip inside Finance module.
  useEffect(() => {
    if (!signedIn || !access.hasAccess) return;
    const path = window.location.pathname;
    const isFinance = path.includes("/odemeler-kasa") || path.includes("/finans");
    if (!isFinance) return;
    if (typeof localStorage !== "undefined" && localStorage.getItem("finance_voice_tip_dismissed") === "1") return;
    const tips = [
      "Nakit durumunu analiz edebilirim.",
      "Giderlerini özetleyebilirim.",
      "Bu ayı tahmin edebilirim.",
    ];
    (window as any).__financeVoiceTip = tips[Math.floor(Math.random() * tips.length)];
    const t = setTimeout(() => setShowFinanceTip(true), 8000);
    return () => clearTimeout(t);
  }, [signedIn, access.hasAccess]);

  const dismissTip = () => {
    setShowFinanceTip(false);
    try { localStorage.setItem("finance_voice_tip_dismissed", "1"); } catch { /* noop */ }
  };

  // Sprint M2.0 — Hide the floating mic while the on-screen keyboard is open
  // (any text input/textarea/contenteditable is focused).
  const [inputActive, setInputActive] = useState(false);
  useEffect(() => {
    const check = () => {
      const a = document.activeElement as HTMLElement | null;
      if (!a) return setInputActive(false);
      const tag = a.tagName;
      setInputActive(
        tag === "INPUT" || tag === "TEXTAREA" || a.isContentEditable === true,
      );
    };
    document.addEventListener("focusin", check);
    document.addEventListener("focusout", check);
    return () => {
      document.removeEventListener("focusin", check);
      document.removeEventListener("focusout", check);
    };
  }, []);

  if (!signedIn) return null;


  const isNative = Capacitor.isNativePlatform();
  // Sprint M2.0 — Mobile mic moves to bottom-right (WhatsApp-style FAB) above tab bar.
  const isDesktop = typeof window !== "undefined" && window.matchMedia?.("(min-width: 768px)").matches;
  const bottomOffset = isDesktop
    ? (isNative
        ? "calc(env(safe-area-inset-bottom, 0px) + 96px)"
        : "calc(env(safe-area-inset-bottom, 0px) + 24px)")
    : "calc(env(safe-area-inset-bottom, 0px) + 88px)";

  const positionClass = isDesktop
    ? "fixed right-6 z-40 group"
    : "fixed right-4 z-40 group";
  const orbSize = isDesktop ? "w-12 h-12" : "w-14 h-14";
  const iconSize = isDesktop ? "w-5 h-5" : "w-6 h-6";

  if (inputActive && !isDesktop) {
    // Keyboard-open guard on mobile — render only the overlay portal if open.
    return open ? (
      <VoiceErrorBoundary onClose={() => { setOpen(false); setPending({}); }}>
        <VoiceExperience
          onClose={() => { setOpen(false); setPending({}); }}
          access={access}
          initialContext={pending.initialContext}
          initialCards={pending.initialCards}
          autoSpeak={pending.autoSpeak}
          autoStart={pending.autoSpeak}
        />
      </VoiceErrorBoundary>
    ) : null;
  }

  return (
    <>
      <button
        onClick={() => { setPending({}); setOpen(true); }}
        aria-label="Şantiyem AI · Sesli Mod"
        className={positionClass}
        style={{ bottom: bottomOffset }}
      >
        <div className="relative">
          {access.hasAccess && !isDesktop && (
            <div className="absolute inset-0 rounded-full bg-[#FF6B2B]/20 voice-orb-ring pointer-events-none" style={{ opacity: 0.5 }} />
          )}
          <div
            className={`relative ${orbSize} rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-active:scale-95 backdrop-blur-xl ${
              access.hasAccess
                ? "bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5A]"
                : "bg-[#1E2732]/90"
            }`}
            style={{
              boxShadow: access.hasAccess
                ? (isDesktop
                    ? "0 6px 16px -8px rgba(255,107,43,0.35), 0 0 0 1px rgba(255,255,255,0.06) inset"
                    : "0 10px 24px -12px rgba(255,107,43,0.28), 0 0 0 1px rgba(255,255,255,0.06) inset")
                : "0 6px 16px -8px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06) inset",
            }}
          >
            <Mic className={`${iconSize} text-white`} strokeWidth={2.2} />
            {!access.hasAccess && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0F1419] border border-[#2A3441] flex items-center justify-center">
                <Lock className="w-3 h-3 text-white/70" />
              </div>
            )}
          </div>
        </div>
      </button>
      {showFinanceTip && isDesktop && (
        <div
          className="fixed right-6 z-40 animate-in fade-in slide-in-from-bottom-2"
          style={{ bottom: `calc(${bottomOffset} + 60px)` }}
        >
          <div className="relative max-w-[240px] rounded-xl bg-[#1E2732] border border-[#FF6B2B]/30 shadow-xl px-3 py-2.5">
            <button
              onClick={dismissTip}
              className="absolute top-1 right-1.5 text-white/50 hover:text-white text-[14px] leading-none"
              aria-label="Kapat"
            >×</button>
            <p className="text-[11px] font-semibold text-[#FF6B2B] mb-0.5">✨ Şantiyem AI</p>
            <p className="text-[12px] text-white/90 leading-snug pr-3">
              {(window as any).__financeVoiceTip || "Nakit durumunu analiz edebilirim."}
            </p>
          </div>
        </div>
      )}
      {open && (
        <VoiceErrorBoundary onClose={() => { setOpen(false); setPending({}); }}>
          <VoiceExperience
            onClose={() => { setOpen(false); setPending({}); }}
            access={access}
            initialContext={pending.initialContext}
            initialCards={pending.initialCards}
            autoSpeak={pending.autoSpeak}
            autoStart={pending.autoSpeak}
          />
        </VoiceErrorBoundary>
      )}
    </>
  );
}
