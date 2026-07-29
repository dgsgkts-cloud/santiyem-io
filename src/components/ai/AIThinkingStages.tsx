// Sprint 37 — AI Thinking Experience.
// Replaces the generic typing dots with construction-domain reasoning stages.
// Purely cosmetic: it never exposes model internals, it reassures the user.

import { useEffect, useState } from "react";
import { AIOrb } from "@/components/ai/AIOrb";

const STAGES = [
  "Proje verileri inceleniyor…",
  "Finansal durum analiz ediliyor…",
  "Personel ve puantaj kontrol ediliyor…",
  "Malzeme stoğu gözden geçiriliyor…",
  "Proje riskleri değerlendiriliyor…",
  "Öneriler hazırlanıyor…",
];

interface Props {
  /** Optionally narrow the stages (e.g. photo analysis). */
  stages?: string[];
}

const AIThinkingStages = ({ stages = STAGES }: Props) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1 < stages.length ? i + 1 : i));
    }, 1400);
    return () => clearInterval(t);
  }, [stages.length]);

  return (
    <div className="flex gap-3 animate-fade-in">
      <AIOrb state="thinking" size={32} className="mt-0.5" />
      <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 min-w-[240px]">
        <div className="flex flex-col gap-1.5">
          {stages.slice(0, index + 1).map((s, i) => {
            const isCurrent = i === index;
            return (
              <div key={s} className="flex items-center gap-2 animate-fade-in">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: isCurrent
                      ? "hsl(var(--primary))"
                      : "hsl(var(--muted-foreground) / 0.5)",
                    animation: isCurrent ? "ai-orb-breathe 1.6s ease-in-out infinite" : undefined,
                  }}
                />
                <span
                  className="text-[12.5px] leading-tight"
                  style={{
                    color: isCurrent
                      ? "hsl(var(--foreground))"
                      : "hsl(var(--muted-foreground))",
                  }}
                >
                  {s}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AIThinkingStages;
