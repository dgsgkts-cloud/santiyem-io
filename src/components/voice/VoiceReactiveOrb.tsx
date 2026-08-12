// ============================================================
// Şantiyem AI voice visualization — minimal, calm, premium.
//
// A small (~72px) neutral core with a very soft glow and one thin
// fluid halo that follows real audio energy. No big flat orange disc:
// the brand colour appears only as a faint accent in the glow.
//
// Performance: the animation never touches React state. A single rAF
// loop smooths the level from a ref and writes CSS custom properties
// on the root element, so nothing above it re-renders.
// ============================================================

import { useEffect, useRef } from "react";

export type VoicePhase =
  | "idle"
  | "requesting_permission"
  | "mic_setup"
  | "connecting"
  | "ready"
  | "listening"
  | "user_finished"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "ending"
  | "error";

interface Props {
  phase: VoicePhase;
  /** Live levels ref: `{ mic, output }`, both 0..1. */
  levels?: React.MutableRefObject<{ mic: number; output: number }>;
  /** Static fallback level when no analyser data exists. */
  level?: number;
  muted?: boolean;
}

/** Phases that breathe on their own instead of following audio. */
const BREATHING: readonly VoicePhase[] = [
  "idle",
  "requesting_permission",
  "mic_setup",
  "connecting",
  "ready",
  "thinking",
];

const usePrefersReducedMotion = () => {
  const ref = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    ref.current = mq.matches;
    const on = () => { ref.current = mq.matches; };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return ref;
};

export function VoiceReactiveOrb({ phase, levels, level = 0, muted = false }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  // Keep the latest inputs in refs: the loop must not restart per render.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const staticLevel = useRef(level);
  staticLevel.current = level;

  useEffect(() => {
    let raf = 0;
    let smooth = 0;
    let drift = 0;
    const t0 = performance.now();

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const el = rootRef.current;
      if (!el) return;

      const p = phaseRef.current;
      const isSpeaking = p === "speaking";
      const isListening = p === "listening" || p === "interrupted";
      const live = levels?.current;
      const raw = mutedRef.current
        ? 0
        : isSpeaking
          ? (live?.output ?? staticLevel.current)
          : isListening
            ? (live?.mic ?? staticLevel.current)
            : 0;

      // Self-driven breathing when there is nothing to react to.
      const elapsed = t - t0;
      const breathe =
        !reduced.current && (BREATHING.includes(p) || (raw === 0 && !mutedRef.current))
          ? ((Math.sin(elapsed / (p === "thinking" ? 900 : 2600)) + 1) / 2) * 0.22
          : 0;

      const want = reduced.current ? 0 : Math.max(Math.min(raw, 1), breathe);
      // Exponential smoothing — no sudden scale jumps, ever.
      smooth += (want - smooth) * (isSpeaking ? 0.12 : 0.09);
      drift = (elapsed / 90) % 360;

      // Deliberately small motion range: 1.00 → ~1.07.
      el.style.setProperty("--vo-scale", (1 + smooth * 0.07).toFixed(4));
      el.style.setProperty("--vo-halo", (1 + smooth * 0.16).toFixed(4));
      el.style.setProperty("--vo-glow", (0.16 + smooth * 0.4).toFixed(3));
      el.style.setProperty("--vo-spin", `${drift.toFixed(1)}deg`);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [levels, reduced]);

  const isError = phase === "error";

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="relative flex items-center justify-center"
      style={
        {
          width: "clamp(140px, 44vw, 180px)",
          height: "clamp(140px, 44vw, 180px)",
          "--vo-scale": 1,
          "--vo-halo": 1,
          "--vo-glow": 0.16,
          "--vo-spin": "0deg",
        } as React.CSSProperties
      }
    >
      {/* Soft ambient glow — faint brand accent only. */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: isError
            ? "radial-gradient(circle, hsl(0 0% 100% / 0.05) 0%, transparent 68%)"
            : "radial-gradient(circle, hsl(var(--primary) / 0.16) 0%, hsl(210 60% 60% / 0.06) 42%, transparent 70%)",
          opacity: isError ? 0.5 : "var(--vo-glow)" as unknown as number,
          transform: "scale(var(--vo-halo))",
          filter: "blur(10px)",
          willChange: "transform, opacity",
        }}
      />

      {/* Thin fluid halo — the only element that visibly moves with audio. */}
      <div
        className="absolute rounded-full"
        style={{
          inset: "22%",
          border: `1px solid ${isError ? "hsl(0 0% 100% / 0.08)" : "hsl(0 0% 100% / 0.14)"}`,
          transform: "scale(var(--vo-halo)) rotate(var(--vo-spin))",
          maskImage:
            "conic-gradient(from 0deg, transparent 0deg, black 70deg, black 250deg, transparent 340deg)",
          WebkitMaskImage:
            "conic-gradient(from 0deg, transparent 0deg, black 70deg, black 250deg, transparent 340deg)",
          willChange: "transform",
        }}
      />

      {/* Core — small, neutral, glassy. */}
      <div
        className="relative rounded-full"
        style={{
          width: 76,
          height: 76,
          transform: "scale(var(--vo-scale))",
          willChange: "transform",
          background: isError
            ? "radial-gradient(circle at 34% 28%, hsl(0 0% 100% / 0.10), hsl(220 24% 12%) 78%)"
            : muted
              ? "radial-gradient(circle at 32% 26%, hsl(0 0% 100% / 0.16) 0%, hsl(220 22% 16%) 76%)"
              : "radial-gradient(circle at 32% 26%, hsl(0 0% 100% / 0.34) 0%, hsl(24 40% 30% / 0.55) 46%, hsl(220 26% 12%) 100%)",
          boxShadow: isError
            ? "inset 0 0 0 1px hsl(0 0% 100% / 0.08)"
            : "inset 0 0 0 1px hsl(0 0% 100% / 0.10), 0 0 32px 2px hsl(var(--primary) / 0.18)",
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 24%, hsl(0 0% 100% / 0.22) 0%, transparent 52%)",
            opacity: isError ? 0.3 : 0.9,
          }}
        />
      </div>
    </div>
  );
}

export default VoiceReactiveOrb;
