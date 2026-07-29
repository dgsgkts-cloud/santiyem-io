// ============================================================
// src/components/voice/VoiceOrbVisual.tsx
// Sprint 32.3 — one premium visual per voice state, driven by
// real audio energy. Pure presentation: no engine, no settings.
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
  /** 0..1 realtime audio energy — mic while listening, voice while speaking. */
  level?: number;
  /** 0..1 remaining share of the silence timer; renders a countdown ring. */
  countdown?: number;
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

/** Deterministic per-bar weighting so the waveform never looks mechanical. */
const BAR_WEIGHT = [0.55, 0.85, 1, 0.8, 0.6];

export function VoiceOrbVisual({
  state,
  size = "md",
  className = "",
  level = 0,
  countdown,
}: Props) {
  const surface = SURFACE[state];
  const orbSize = SIZE_CLASS[size];
  const iconSize = ICON_CLASS[size];
  const energy = Math.max(0, Math.min(1, level));

  const showCountdown = typeof countdown === "number" && countdown > 0 && countdown < 1;

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
        <>
          <span className="pointer-events-none absolute inset-0 rounded-full bg-[#FF6B2B]/25 voice-orb-ring" />
          {/* Reacts to the user's actual voice, so the mic never feels dead. */}
          <span
            className="pointer-events-none absolute inset-0 rounded-full bg-[#FF6B2B]/25 transition-transform duration-75"
            style={{ transform: `scale(${1 + energy * 0.45})`, opacity: 0.25 + energy * 0.4 }}
          />
        </>
      )}
      {state === "speaking" && (
        <span
          className="pointer-events-none absolute inset-0 rounded-full bg-sky-400/25 transition-transform duration-75"
          style={{ transform: `scale(${1 + energy * 0.5})`, opacity: 0.2 + energy * 0.45 }}
        />
      )}
      {state === "thinking" && (
        <span className="pointer-events-none absolute inset-[-6px] rounded-full orb-thinking-halo" />
      )}

      {/* Silence countdown — a calm shrinking ring, never a hard cut. */}
      {showCountdown && (
        <svg className="pointer-events-none absolute inset-[-5px]" viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="4" />
          <circle
            cx="50" cy="50" r="46" fill="none"
            stroke="#FF6B2B" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 46}
            strokeDashoffset={2 * Math.PI * 46 * (1 - countdown!)}
            transform="rotate(-90 50 50)"
            style={{ transition: "stroke-dashoffset 240ms linear" }}
          />
        </svg>
      )}

      <div
        className={`relative ${orbSize} rounded-full flex items-center justify-center backdrop-blur-xl transition-all duration-500 ${surface.bg} ${
          state === "thinking" ? "orb-thinking-shell" : ""
        } ${state === "wake-listening" ? "orb-breathe-soft" : ""} ${
          state === "reconnecting" ? "orb-reconnect" : ""
        }`}
        style={{
          boxShadow: surface.shadow,
          transform:
            state === "speaking" || state === "listening"
              ? `scale(${1 + energy * 0.09})`
              : undefined,
          transitionDuration: state === "speaking" || state === "listening" ? "80ms" : undefined,
        }}
      >
        {/* Thinking: an orbiting arc rather than a loading spinner. */}
        {state === "thinking" && (
          <span className="pointer-events-none absolute inset-[-3px] rounded-full orb-thinking-arc" />
        )}

        {state === "speaking" || state === "listening" ? (
          <span className="flex items-center gap-[3px] h-5" aria-hidden>
            {BAR_WEIGHT.map((w, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-white/90"
                style={{
                  height: `${Math.round(18 + energy * w * 82)}%`,
                  transition: "height 70ms ease-out",
                }}
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
