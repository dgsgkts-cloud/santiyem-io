// ============================================================
// src/components/voice/VoiceLiveWaveform.tsx
// Sprint 32.3 — live input waveform so the user can always see
// that the microphone is hearing them. Driven by real energy.
// ============================================================

interface Props {
  /** 0..1 realtime audio energy. */
  level: number;
  bars?: number;
  className?: string;
  tone?: "primary" | "sky";
}

const WEIGHTS = [0.35, 0.6, 0.85, 1, 0.9, 0.7, 1, 0.8, 0.55, 0.9, 0.65, 0.4];

export function VoiceLiveWaveform({ level, bars = 12, className = "", tone = "primary" }: Props) {
  const energy = Math.max(0, Math.min(1, level));
  const color = tone === "sky" ? "bg-sky-400/80" : "bg-primary/80";

  return (
    <div className={`flex h-8 items-center justify-center gap-[3px] ${className}`} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const w = WEIGHTS[i % WEIGHTS.length];
        const h = 12 + energy * w * 88;
        return (
          <span
            key={i}
            className={`w-[3px] rounded-full ${color}`}
            style={{ height: `${h}%`, transition: "height 80ms ease-out" }}
          />
        );
      })}
    </div>
  );
}
