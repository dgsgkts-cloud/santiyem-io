import { Sparkles } from "lucide-react";

interface InsightListProps {
  insights: string[];
}

export function InsightList({ insights }: InsightListProps) {
  if (!insights.length) return null;
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">AI İçgörüler</span>
      </div>
      <ul className="space-y-1.5">
        {insights.map((t, i) => (
          <li key={i} className="text-[13px] text-foreground/85 leading-relaxed flex gap-2">
            <span className="text-primary/70 shrink-0">›</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
