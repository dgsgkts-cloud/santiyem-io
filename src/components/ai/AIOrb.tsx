// Sprint 37 — AI Core Orb.
// A single premium "core" visual with 5 calm states. Pure presentation.

import { cn } from "@/lib/utils";

export type AIOrbState = "idle" | "listening" | "thinking" | "speaking" | "completed";

const stateTone: Record<AIOrbState, { core: string; ring: string; halo: string }> = {
  idle: {
    core: "hsl(var(--primary) / 0.85)",
    ring: "hsl(var(--primary) / 0.25)",
    halo: "hsl(var(--primary) / 0.18)",
  },
  listening: {
    core: "hsl(var(--primary))",
    ring: "hsl(var(--primary) / 0.45)",
    halo: "hsl(var(--primary) / 0.28)",
  },
  thinking: {
    core: "hsl(var(--info, 210 90% 60%) / 0.9)",
    ring: "hsl(var(--info, 210 90% 60%) / 0.35)",
    halo: "hsl(var(--info, 210 90% 60%) / 0.2)",
  },
  speaking: {
    core: "hsl(var(--primary))",
    ring: "hsl(var(--primary) / 0.5)",
    halo: "hsl(var(--primary) / 0.3)",
  },
  completed: {
    core: "hsl(var(--success, 152 60% 45%))",
    ring: "hsl(var(--success, 152 60% 45%) / 0.35)",
    halo: "hsl(var(--success, 152 60% 45%) / 0.2)",
  },
};

interface AIOrbProps {
  state?: AIOrbState;
  /** 0..1 live audio energy — scales the core when speaking/listening. */
  energy?: number;
  size?: number;
  className?: string;
}

export const AIOrb = ({ state = "idle", energy = 0, size = 72, className }: AIOrbProps) => {
  const tone = stateTone[state];
  const reactive = state === "speaking" || state === "listening";
  const scale = reactive ? 1 + Math.min(Math.max(energy, 0), 1) * 0.14 : 1;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Outer halo — always breathing, very soft */}
      <span
        className="absolute inset-0 rounded-full blur-xl"
        style={{
          background: `radial-gradient(circle, ${tone.halo} 0%, transparent 70%)`,
          animation: "ai-orb-breathe 4.5s ease-in-out infinite",
        }}
      />
      {/* Energy wave ring */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          border: `1px solid ${tone.ring}`,
          animation:
            state === "thinking"
              ? "ai-orb-wave 2.2s ease-out infinite"
              : state === "listening"
                ? "ai-orb-wave 1.6s ease-out infinite"
                : "ai-orb-breathe 5s ease-in-out infinite",
        }}
      />
      {/* Second ring, offset for a layered feel */}
      <span
        className="absolute rounded-full"
        style={{
          inset: size * 0.1,
          border: `1px solid ${tone.ring}`,
          opacity: 0.6,
          animation: "ai-orb-wave 3s ease-out infinite",
          animationDelay: "0.8s",
        }}
      />
      {/* Core */}
      <span
        className="absolute rounded-full"
        style={{
          inset: size * 0.24,
          background: `radial-gradient(circle at 35% 30%, ${tone.core} 0%, ${tone.halo} 100%)`,
          boxShadow: `0 0 ${size * 0.35}px ${tone.halo}`,
          transform: `scale(${scale})`,
          transition: "transform 120ms ease-out, background 400ms ease",
          animation: state === "idle" ? "ai-orb-breathe 4s ease-in-out infinite" : undefined,
        }}
      />
    </div>
  );
};

export default AIOrb;
