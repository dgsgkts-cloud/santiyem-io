// ============================================================
// Sprint 42 — Central voice orb.
// Reacts to REAL audio energy (mic while listening, playback while
// speaking) supplied by the engine's Web Audio analysers. Falls back
// to a calm breathing motion when no level data is available and
// respects prefers-reduced-motion.
// ============================================================

import { useEffect, useRef, useState } from "react";

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

export function VoiceReactiveOrb({ phase, level, fallbackMotion = false }: Props) {
  const reduced = usePrefersReducedMotion();
  // Smoothed level so the orb never jitters between frames.
  const [smooth, setSmooth] = useState(0);
  const target = useRef(0);
  target.current = Math.max(0, Math.min(1, level));

  useEffect(() => {
    if (reduced) { setSmooth(0); return; }
    let raf = 0;
    let cur = 0;
    let t0 = performance.now();
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      // Breathing fallback keeps the orb alive when analysers are silent.
      const breathe =
        fallbackMotion ||
        phase === "connecting" ||
        phase === "mic_setup" ||
        phase === "ready" ||
        phase === "thinking" ||
        phase === "requesting_permission"

          ? (Math.sin((t - t0) / 620) + 1) / 2 * 0.35
          : 0;
      const want = Math.max(target.current, breathe);
      cur += (want - cur) * 0.18;
      setSmooth(cur);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, fallbackMotion, phase]);

  const active = phase === "listening" || phase === "speaking";
  const inward = phase === "thinking" || phase === "ending";
  const scale = reduced ? 1 : 1 + smooth * (active ? 0.14 : 0.05) - (inward ? 0.06 : 0);
  const glow = 0.28 + smooth * 0.5;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: "clamp(190px, 65vw, 260px)",
        height: "clamp(190px, 65vw, 260px)",
      }}
      aria-hidden
    >
      {/* Warm ambient halo */}
      <div
        className="absolute inset-0 rounded-full transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.30) 0%, hsl(var(--primary) / 0.08) 55%, transparent 72%)",
          opacity: phase === "error" ? 0.25 : 0.55 + smooth * 0.35,
          transform: `scale(${1 + smooth * 0.12})`,
        }}
      />

      {/* Reactive ring */}
      <div
        className="absolute rounded-full border"
        style={{
          inset: "12%",
          borderColor: `hsl(var(--primary) / ${0.2 + smooth * 0.5})`,
          transform: `scale(${scale})`,
          transition: reduced ? "none" : "transform 90ms linear",
        }}
      />

      {/* Core */}
      <div
        className="relative rounded-full"
        style={{
          width: "58%",
          height: "58%",
          transform: `scale(${scale})`,
          transition: reduced ? "none" : "transform 90ms linear",
          background:
            phase === "error"
              ? "radial-gradient(circle at 32% 28%, hsl(var(--muted)), hsl(var(--background)) 75%)"
              : "radial-gradient(circle at 32% 28%, hsl(28 100% 74%), hsl(var(--primary)) 58%, hsl(18 90% 26%) 100%)",
          boxShadow:
            phase === "error"
              ? "none"
              : `0 0 ${28 + smooth * 60}px ${2 + smooth * 8}px hsl(var(--primary) / ${glow})`,
        }}
      />
    </div>
  );
}

export default VoiceReactiveOrb;
