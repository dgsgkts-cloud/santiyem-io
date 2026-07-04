import { useEffect, useState } from "react";
import { Mic, Lock } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { useVoiceAccess } from "@/hooks/useVoiceAccess";
import { VoiceCopilot } from "./VoiceCopilot";
import { VoiceErrorBoundary } from "./VoiceErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/voice.css";

/**
 * Global floating microphone button that opens the Voice Copilot overlay.
 * Hidden on the marketing landing (unauthenticated users).
 */
export function VoiceOrb() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const access = useVoiceAccess();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data?.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_, s) => setSignedIn(!!s?.user));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handler = () => setOpen(true);
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
        onClick={() => setOpen(true)}
        aria-label="AI Sesli Asistan"
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
      {open && (() => {
        // Consume any pending briefing hand-off from MorningBriefingCard.
        const brief = (window as unknown as { __briefingText?: string }).__briefingText;
        if (brief) {
          try { delete (window as unknown as { __briefingText?: string }).__briefingText; } catch { /* noop */ }
        }
        const initialContext = brief
          ? `SABAH YÖNETİCİ BRİFİNGİ (sesli oku ve ardından tek bir eyleme yönelik soruyla bitir; bu bir yönetici brifingidir, standart selamlama YAPMA): ${brief}`
          : undefined;
        return (
          <VoiceErrorBoundary onClose={() => setOpen(false)}>
            <VoiceBrain onClose={() => setOpen(false)} access={access} initialContext={initialContext} />
          </VoiceErrorBoundary>
        );
      })()}
    </>
  );
}
