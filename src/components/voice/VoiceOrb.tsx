import { useEffect, useState } from "react";
import { Mic, Lock } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { useVoiceAccess } from "@/hooks/useVoiceAccess";
import { VoiceCopilot } from "./VoiceCopilot";
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

  if (!signedIn) return null;

  const bottomOffset = Capacitor.isNativePlatform()
    ? "calc(env(safe-area-inset-bottom, 0px) + 96px)"
    : "calc(env(safe-area-inset-bottom, 0px) + 88px)";

  return (
    <>
      <button
        onClick={() => { setPending({}); setOpen(true); }}
        aria-label="Şantiyem AI · Sesli Mod"
        className="fixed left-1/2 -translate-x-1/2 z-40 group"
        style={{ bottom: bottomOffset }}
      >
        <div className="relative">
          {access.hasAccess && (
            <div className="absolute inset-0 rounded-full bg-[#FF6B2B]/40 voice-orb-ring pointer-events-none" />
          )}
          <div
            className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-active:scale-95 backdrop-blur-xl ${
              access.hasAccess
                ? "bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5A]"
                : "bg-[#1E2732]/90"
            }`}
            style={{
              boxShadow: access.hasAccess
                ? "0 20px 50px -12px rgba(255,107,43,0.55), 0 0 0 1px rgba(255,255,255,0.08) inset"
                : "0 20px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset",
            }}
          >
            <Mic className="w-7 h-7 text-white" strokeWidth={2.2} />
            {!access.hasAccess && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0F1419] border border-[#2A3441] flex items-center justify-center">
                <Lock className="w-3 h-3 text-white/70" />
              </div>
            )}
          </div>
        </div>
      </button>
      {open && (
        <VoiceErrorBoundary onClose={() => { setOpen(false); setPending({}); }}>
          <VoiceCopilot
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
