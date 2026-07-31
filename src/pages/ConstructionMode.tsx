import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { VoiceExperience } from "@/components/voice/VoiceExperience";
import { useVoiceAccess } from "@/hooks/useVoiceAccess";

/**
 * Hands-free "Saha Modu" — big microphone, glove-friendly.
 * Uses the shared in-page OpenAI Realtime voice overlay.
 */
export default function ConstructionMode() {
  const navigate = useNavigate();
  const access = useVoiceAccess();

  // Keep screen awake while on site
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinel> } };
    if (nav.wakeLock?.request) {
      nav.wakeLock.request("screen").then((w) => (wakeLock = w)).catch(() => {});
    }
    return () => { if (wakeLock) wakeLock.release().catch(() => {}); };
  }, []);

  if (access.loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white/60">Yükleniyor…</div>;
  }

  return (
    <VoiceExperience
      onClose={() => navigate(-1)}
      access={access}
      compact
      autoStart={access.hasAccess}
    />
  );
}
