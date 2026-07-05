import { Check } from "lucide-react";
import type { CanvasTurn } from "@/hooks/useCanvasTurns";
import { deriveThinkingSteps } from "@/lib/canvasAdapter";

export const AIThinkingTimeline = ({ turn }: { turn: CanvasTurn }) => {
  const steps = deriveThinkingSteps(turn);
  if (!steps.length) return null;
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1.5 animate-fade-in">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Sistem Adımları
      </p>
      <ul className="space-y-1">
        {steps.map((s, i) => (
          <li
            key={i}
            className="flex items-center gap-2 text-[12px] text-foreground/80 animate-fade-in"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <Check className="w-3 h-3" strokeWidth={3} />
            </span>
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AIThinkingTimeline;
