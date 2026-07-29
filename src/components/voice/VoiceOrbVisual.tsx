// ============================================================
// src/components/voice/VoiceOrbVisual.tsx
// Sprint 32.2 — one premium visual per voice state.
// Pure presentation: no engine, no settings, no side effects.
// ============================================================

import { Mic, MicOff, Lock } from "lucide-react";

export type OrbState =
  | "idle"
  | "wake-listening"
  | "wake-detected"
  | "listening"
  | "thinking"
  | "speaking"
  | "disconnected"
  | "reconnecting"
  | "locked";

interface Props {
  state: OrbState;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<Props["size"]>, string> = {
  sm: "w-12 h-12",
  md: "w-14 h-14",
  lg: "w-20 h-20",
};

const ICON_CLASS: Record<NonNullable<Props["size"]>, string> = {
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

/** Per-state gradient + glow. Tuned for the dark Construction OS shell. */
const SURFACE: Record<OrbState, { bg: string; shadow: string }> = {
  idle: {
    bg: "bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5A]",
    shadow: "0 10px 24px -12px rgba(255,107,43,0.30), 0 0 0 1px rgba(255,255,255,0.06) inset",
  },
  "wake-listening": {
    bg: "bg-gradient-to-br from-[#12351F] to-[#0F1419]",
    shadow: "0 0 0 1px rgba(52,211,153,0.35) inset, 0 8px 20px -12px rgba(52,211,153,0.45)",
  },
  "wake-detected": {
    bg: "bg-gradient-to-br from-[#FF8F5A] to-[#FFC48A]",
    shadow: "0 0 30px 6px rgba(255,143,90,0.55), 0 0 0 1px rgba(255,255,255,0.14) inset",
  },
  listening: {
    bg: "bg-gradient-to-br from-[#FF6B2B] to-[#FF8F5A]",
    shadow: "0 0 24px 4px rgba(255,107,43,0.45), 0 0 0 1px rgba(255,255,255,0.10) inset",
  },
  thinking: {
    bg: "bg-gradient-to-br from-[#2A3441] to-[#0F1419]",
    shadow: "0 0 0 1px rgba(255,107,43,0.28) inset, 0 8px 20px -12px rgba(255,107,43,0.35)",
  },
  speaking: {
    bg: "bg-gradient-to-br from-[#1E5A8C] to-[#0F1419]",
    shadow: "0 0 26px 5px rgba(56,140,220,0.40), 0 0 0 1px rgba(255,255,255,0.08) inset",
  },
  disconnected: {
    bg: "bg-[#1E2732]/90",
    shadow: "0 6px 16px -8px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05) inset",
  },
  reconnecting: {
    bg: "bg-gradient-to-br from-[#2A3441] to-[#0F1419]",
    shadow: "0 0 0 1px rgba(255,255,255,0.08) inset",
  },
  locked: {
    bg: "bg-[#1E2732]/90",
    shadow: "0 6px 16px -8px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06) inset",
  },
};

export const ORB_STATE_LABEL: Record<OrbState, string> = {
  idle: "Hazır",
  "wake-listening": "Şantiyem dinleniyor",
  "wake-detected": "Uyandım",
  listening: "Dinliyorum",
  thinking: "Düşünüyorum",
  speaking: "Konuşuyorum",
  disconnected: "Bağlantı kapandı",
  reconnecting: "Yeniden bağlanıyor",
  locked: "Kilitli",
};

export function VoiceOrbVisual({ state, size = "md", className = "" }: Props) {
  const surface = SURFACE[state];
  const orbSize = SIZE_CLASS[size];
  const iconSize = ICON_CLASS[size];

  return (
    <div className={`relative ${className}`}>
      {/* Ambient rings — one per state, never a generic spinner. */}
      {state === "wake-listening" && (
        <span className="pointer-events-none absolute inset-0 rounded-full bg-emerald-400/20 orb-wake-ring" />
      )}
      {state === "wake-detected" && (
        <>
          <span className="pointer-events-none absolute inset-0 rounded-full bg-[#FF8F5A]/40 orb-burst" />
          <span className="pointer-events-none absolute inset-0 rounded-full bg-[#FF8F5A]/25 orb-burst orb-burst-delay" />
        </>
      )}
      {state === "listening" && (
        <span className="pointer-events-none absolute inset-0 rounded-full bg-[#FF6B2B]/25 voice-orb-ring" />
      )}
      {state === "speaking" && (
        <span className="pointer-events-none absolute inset-0 rounded-full bg-sky-400/20 orb-speak-ring" />
      )}

      <div
        className={`relative ${orbSize} rounded-full flex items-center justify-center backdrop-blur-xl transition-all duration-500 ${surface.bg} ${
          state === "thinking" ? "orb-thinking-shell" : ""
        } ${state === "wake-listening" ? "orb-breathe-soft" : ""} ${
          state === "speaking" ? "orb-speak-pulse" : ""
        } ${state === "reconnecting" ? "orb-reconnect" : ""}`}
        style={{ boxShadow: surface.shadow }}
      >
        {/* Thinking: an orbiting arc rather than a loading spinner. */}
        {state === "thinking" && (
          <span className="pointer-events-none absolute inset-[-3px] rounded-full orb-thinking-arc" />
        )}

        {state === "speaking" ? (
          <span className="flex items-end gap-[3px] h-5" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-white/90 voice-wave-bar"
                style={{ height: "100%", animationDelay: `${i * 0.11}s` }}
              />
            ))}
          </span>
        ) : state === "disconnected" ? (
          <MicOff className={`${iconSize} text-white/70`} strokeWidth={2.2} />
        ) : (
          <Mic
            className={`${iconSize} ${
              state === "wake-listening" ? "text-emerald-300" : "text-white"
            }`}
            strokeWidth={2.2}
          />
        )}

        {state === "locked" && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0F1419] border border-[#2A3441] flex items-center justify-center">
            <Lock className="w-3 h-3 text-white/70" />
          </span>
        )}
      </div>
    </div>
  );
}
