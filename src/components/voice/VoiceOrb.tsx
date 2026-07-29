import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { useVoiceAccess } from "@/hooks/useVoiceAccess";
import { useVoiceSettings } from "@/hooks/useVoiceSettings";
import { useWakeWordEngine } from "@/hooks/useWakeWordEngine";
import { wakePhrasesFor } from "@/lib/voice/voiceSettings";
import { playSleepChime, playWakeChime } from "@/lib/voice/wakeChime";
import { voiceHaptic } from "@/lib/voice/haptics";
import { MicPermissionScreen } from "./MicPermissionScreen";
import {
  AlwaysListeningOnboarding,
  alwaysListeningOnboardingSeen,
} from "./AlwaysListeningOnboarding";
import { VoiceExperience } from "./VoiceExperience";
import { VoiceErrorBoundary } from "./VoiceErrorBoundary";
import { VoiceOrbVisual, type OrbState } from "./VoiceOrbVisual";
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

/** Spoken acknowledgement after the wake word — kept short by design. */
const WAKE_GREETING =
  'Kullanıcı seni uyandırdı. Sadece "Dinliyorum." de, başka hiçbir şey ekleme ve sonra sessizce bekle.';

/**
 * Global floating microphone button that opens the Voice Copilot overlay.
 * Hidden on the marketing landing (unauthenticated users).
 */
export function VoiceOrb() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [showFinanceTip, setShowFinanceTip] = useState(false);
  const [wokeUp, setWokeUp] = useState(false);
  const [pending, setPending] = useState<{
    initialContext?: string;
    initialCards?: BriefCard[];
    autoSpeak?: boolean;
  }>({});
  const access = useVoiceAccess();
  const { settings, update } = useVoiceSettings();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPermission, setShowPermission] = useState(false);
  const sessionModeRef = useRef<"manual" | "wake">("manual");
  const [sessionMode, setSessionMode] = useState<"manual" | "wake">("manual");



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

  // ---------------------------------------------------------------
  // Sprint 32.2 — Always Listening
  // The wake-word engine only runs when the user opted in, has voice
  // access and is signed in. It is suspended while a conversation is
  // already open so the two never fight over the microphone.
  // ---------------------------------------------------------------
  const optedIntoAlwaysListening =
    signedIn && access.hasAccess && settings.mode === "always-listening";

  // First run: explain wake word, privacy, battery and foreground-only
  // before the microphone is ever armed. Shown exactly once.
  const [onboarded, setOnboarded] = useState(() => alwaysListeningOnboardingSeen());
  useEffect(() => {
    if (optedIntoAlwaysListening && !onboarded) setShowOnboarding(true);
  }, [optedIntoAlwaysListening, onboarded]);

  const alwaysListening = optedIntoAlwaysListening && onboarded;

  const closeSession = useCallback((reason: "silence" | "turn-complete" | "user") => {
    setOpen(false);
    setPending({});
    setWokeUp(false);
    sessionModeRef.current = "manual";
    setSessionMode("manual");
    // Audible confirmation that we went back to standby.
    if (reason !== "user") playSleepChime();
    voiceHaptic("end");
  }, []);

  const handleWake = useCallback(() => {
    if (sessionModeRef.current === "wake") return;
    sessionModeRef.current = "wake";
    setSessionMode("wake");
    // Confirmation lands before the panel mounts, so wake feels instant.
    playWakeChime();
    voiceHaptic("wake");
    setWokeUp(true);
    setPending({});
    setOpen(true);
    // Clear the "wake detected" flash once the session takes over.
    window.setTimeout(() => setWokeUp(false), 1200);
  }, []);

  const wake = useWakeWordEngine({
    enabled: alwaysListening,
    phrases: wakePhrasesFor(settings),
    provider: settings.wakeWordProvider,
    suspended: open,
    onWake: handleWake,
  });

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
  const orbVisualSize = isDesktop ? "sm" : "md";

  // Idle orb state. Live conversation states are owned by the panel.
  const orbState: OrbState = !access.hasAccess
    ? "locked"
    : wokeUp
      ? "wake-detected"
      : wake.active
        ? "wake-listening"
        : "idle";

  const session = (
    <VoiceErrorBoundary onClose={() => closeSession("user")}>
      <VoiceExperience
        onClose={() => closeSession("user")}
        access={access}
        initialContext={pending.initialContext}
        initialCards={pending.initialCards}
        autoSpeak={pending.autoSpeak}
        autoStart={pending.autoSpeak || sessionMode === "wake"}
        sessionMode={sessionMode}
        conversationMode={settings.conversationMode}
        greeting={sessionMode === "wake" ? WAKE_GREETING : undefined}
        onSessionEnd={closeSession}
      />
    </VoiceErrorBoundary>
  );

  if (inputActive && !isDesktop) {
    // Keyboard-open guard on mobile — render only the overlay portal if open.
    return open ? session : null;
  }

  return (
    <>
      {showOnboarding && (
        <AlwaysListeningOnboarding
          wakeWord={settings.wakeWord}
          onDone={() => { setOnboarded(true); setShowOnboarding(false); }}
          onCancel={() => { setShowOnboarding(false); update({ mode: "push-to-talk" }); }}
        />
      )}

      {showPermission && (
        <MicPermissionScreen
          onRetry={() => {
            setShowPermission(false);
            navigator.mediaDevices?.getUserMedia({ audio: true })
              .then((s) => s.getTracks().forEach((t) => t.stop()))
              .catch(() => setShowPermission(true));
          }}
          onCancel={() => setShowPermission(false)}
        />
      )}

      <button
        onClick={() => { setPending({}); sessionModeRef.current = "manual"; setSessionMode("manual"); setOpen(true); }}
        aria-label="Şantiyem AI · Sesli Mod"
        className={positionClass}
        style={{ bottom: bottomOffset }}
      >
        <VoiceOrbVisual
          state={orbState}
          size={orbVisualSize}
          className="transition-transform duration-300 group-hover:scale-105 group-active:scale-95"
        />
      </button>

      {/* Always Listening status — hidden entirely in Push-to-Talk mode. */}
      {alwaysListening && !open && (
        <div
          className={`fixed ${isDesktop ? "right-6" : "right-4"} z-40 ${
            wake.state === "denied" ? "" : "pointer-events-none"
          }`}
          style={{ bottom: `calc(${bottomOffset} + ${isDesktop ? 56 : 64}px)` }}
        >
          <button
            type="button"
            disabled={wake.state !== "denied"}
            onClick={() => setShowPermission(true)}
            className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-[#0F1419]/90 px-2.5 py-1 backdrop-blur-md"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                wake.active ? "bg-emerald-400 voice-status-dot" : "bg-white/25"
              }`}
            />
            <span className="text-[11px] font-medium text-white/80">
              {wake.active
                ? `${settings.wakeWord} dinleniyor`
                : wake.state === "denied"
                  ? "Mikrofon izni gerekli"
                  : wake.state === "unsupported"
                    ? "Bu tarayıcıda desteklenmiyor"
                    : "Duraklatıldı"}
            </span>
          </button>
        </div>
      )}

      {showFinanceTip && isDesktop && (
        <div
          className={`fixed ${isDesktop ? "right-6" : "right-4"} z-40 animate-in fade-in slide-in-from-bottom-2`}
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
      {open && session}
    </>

  );
}
