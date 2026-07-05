import { Database } from "lucide-react";
import type { CanvasTurn } from "@/hooks/useCanvasTurns";

export const SourcePanel = ({ turn }: { turn: CanvasTurn }) => {
  const sources = turn.meta?.sources ?? [];
  if (!sources.length) return null;
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 animate-fade-in">
      <div className="flex items-center gap-1.5 mb-2">
        <Database className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Kaynaklar
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-background border border-border/70 text-foreground/85"
          >
            {s.label}
            {s.count != null && (
              <span className="text-muted-foreground">· {s.count}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
};

export default SourcePanel;
