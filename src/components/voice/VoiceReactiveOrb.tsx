// ============================================================
// Central Şantiyem AI voice orb — premium, phase-aware visual.
// Reacts to REAL audio energy (mic while listening, playback while
// speaking) supplied by the engine's Web Audio analysers. Falls back
// to a calm breathing motion when no level data is available and
// respects prefers-reduced-motion.
//
// Purely presentational: no transport, no engine, no state machine.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";

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
  /** 0..1 real audio level for the active direction. */
  level: number;
  /** true when the engine reports no analyser data at all. */
  fallbackMotion?: boolean;
}

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
};

/** Phases where the orb breathes on its own instead of following audio. */
const BREATHING_PHASES: readonly VoicePhase[] = [
  "connecting",
  "mic_setup",
  "requesting_permission",
  "ready",
  "thinking",
  "idle",
];

const WAVE_BARS = 28;

export function VoiceReactiveOrb({ phase, level, fallbackMotion = false }: Props) {
  const reduced = usePrefersReducedMotion();
  // Smoothed level so the orb never jitters between frames.
  const [smooth, setSmooth] = useState(0);
  // Slow rotation used by the thinking / speaking energy layers.
  const [spin, setSpin] = useState(0);
  const target = useRef(0);
  target.current = Math.max(0, Math.min(1, level));

  const breathing = fallbackMotion || BREATHING_PHASES.includes(phase);

  useEffect(() => {
    if (reduced) { setSmooth(0); setSpin(0); return; }
    let raf = 0;
    let cur = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const elapsed = t - t0;
      // Calm breathing keeps the orb alive when analysers are silent.
      const breathe = breathing
        ? ((Math.sin(elapsed / (phase === "thinking" ? 520 : 900)) + 1) / 2) *
          (phase === "thinking" ? 0.34 : 0.26)
        : 0;
      const want = Math.max(target.current, breathe);
      cur += (want - cur) * 0.16;
      setSmooth(cur);
      setSpin((elapsed / 42) % 360);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, breathing, phase]);

  const isSpeaking = phase === "speaking";
  const isListening = phase === "listening";
  const isThinking = phase === "thinking";
  const isError = phase === "error";

  const scale = reduced
    ? 1
    : 1 + smooth * (isListening || isSpeaking ? 0.13 : 0.05) - (isThinking ? 0.04 : 0);
  const glow = 0.26 + smooth * 0.5;

  // Deterministic bar offsets so the wave looks organic but never random
  // between renders.
  const barPhases = useMemo(
    () => Array.from({ length: WAVE_BARS }, (_, i) => Math.sin(i * 1.7) * 0.5 + 0.5),
    [],
  );

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: "clamp(200px, 68vw, 288px)",
        height: "clamp(200px, 68vw, 288px)",
      }}
      aria-hidden
    >
      {/* Ambient aurora — soft depth behind everything. */}
      <div
        className="absolute -inset-[18%] rounded-full transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.22) 0%, hsl(var(--primary) / 0.06) 52%, transparent 74%)",
          opacity: isError ? 0.18 : 0.5 + smooth * 0.4,
          transform: `scale(${1 + smooth * 0.1})`,
          filter: "blur(2px)",
        }}
      />

      {/* Speaking energy — a ring of audio bars around the core. */}
      {isSpeaking && !reduced && (
        <div
          className="absolute inset-0"
          style={{ transform: `rotate(${spin * 0.35}deg)` }}
        >
          {barPhases.map((p, i) => {
            const angle = (360 / WAVE_BARS) * i;
            const energy = Math.max(0.18, smooth * (0.55 + p * 0.9));
            return (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 rounded-full"
                style={{
                  width: 2.5,
                  height: `${16 + energy * 34}px`,
                  background: `hsl(var(--primary) / ${0.25 + energy * 0.6})`,
                  transformOrigin: "center top",
                  transform: `rotate(${angle}deg) translateY(38%)`,
                  transition: "height 90ms linear",
                }}
              />
            );
          })}
        </div>
      )}

      {/* Thinking — slow conic sweep, calm rather than busy. */}
      {isThinking && !reduced && (
        <div
          className="absolute rounded-full"
          style={{
            inset: "6%",
            background:
              "conic-gradient(from 0deg, transparent 0deg, hsl(var(--primary) / 0.32) 90deg, transparent 190deg)",
            transform: `rotate(${spin}deg)`,
            maskImage: "radial-gradient(circle, transparent 58%, black 62%)",
            WebkitMaskImage: "radial-gradient(circle, transparent 58%, black 62%)",
          }}
        />
      )}

      {/* Reactive outer ring. */}
      <div
        className="absolute rounded-full border"
        style={{
          inset: "10%",
          borderColor: isError
            ? "hsl(0 0% 100% / 0.10)"
            : `hsl(var(--primary) / ${0.14 + smooth * 0.46})`,
          transform: `scale(${scale})`,
          transition: reduced ? "none" : "transform 90ms linear",
        }}
      />

      {/* Second, thinner ring — depth + a listening "halo". */}
      <div
        className="absolute rounded-full border"
        style={{
          inset: "20%",
          borderColor: isError
            ? "hsl(0 0% 100% / 0.06)"
            : `hsl(var(--primary) / ${0.10 + smooth * 0.3})`,
          transform: `scale(${1 + smooth * (isListening ? 0.08 : 0.03)})`,
          transition: reduced ? "none" : "transform 120ms linear",
        }}
      />

      {/* Core. */}
      <div
        className="relative rounded-full"
        style={{
          width: "54%",
          height: "54%",
          transform: `scale(${scale})`,
          transition: reduced ? "none" : "transform 90ms linear",
          background: isError
            ? "radial-gradient(circle at 34% 28%, hsl(0 0% 100% / 0.12), hsl(220 26% 10%) 76%)"
            : "radial-gradient(circle at 32% 26%, hsl(30 100% 78%) 0%, hsl(var(--primary)) 54%, hsl(16 88% 24%) 100%)",
          boxShadow: isError
            ? "inset 0 0 0 1px hsl(0 0% 100% / 0.08)"
            : `0 0 ${30 + smooth * 66}px ${2 + smooth * 9}px hsl(var(--primary) / ${glow})`,
        }}
      >
        {/* Glass highlight for a premium, physical feel. */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 24%, hsl(0 0% 100% / 0.28) 0%, transparent 46%)",
            opacity: isError ? 0.25 : 0.9,
          }}
        />
      </div>
    </div>
  );
}

export default VoiceReactiveOrb;
