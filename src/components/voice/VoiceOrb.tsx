import { useEffect, useState } from "react";
import { Mic, Lock } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { useVoiceAccess } from "@/hooks/useVoiceAccess";
import { VoiceCopilot } from "./VoiceCopilot";
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

  const bottomOffset = Capacitor.isNativePlatform() ? "calc(env(safe-area-inset-bottom) + 92px)" : "96px";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="AI Sesli Asistan"
        className="fixed right-5 z-40 group"
        style={{ bottom: bottomOffset }}
      >
        <div className="relative">
          {access.hasAccess && (
            <div className="absolute inset-0 rounded-full bg-[#FF6B2B]/40 voice-orb-ring pointer-events-none" />
          )}
          <div
            className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105 ${
              access.hasAccess
                ? "bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5A]"
                : "bg-[#1E2732]"
            }`}
            style={{ boxShadow: "0 10px 40px -10px rgba(255,107,43,0.6)" }}
          >
            <Mic className="w-6 h-6 text-white" strokeWidth={2.2} />
            {!access.hasAccess && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0F1419] border border-[#2A3441] flex items-center justify-center">
                <Lock className="w-3 h-3 text-white/70" />
              </div>
            )}
          </div>
        </div>
      </button>
      {open && <VoiceCopilot onClose={() => setOpen(false)} access={access} />}
    </>
  );
}
