import { MessageSquarePlus } from "lucide-react";
import type { CanvasTurn } from "@/hooks/useCanvasTurns";
import { dispatchFollowup, getFollowups } from "@/lib/canvasAdapter";

export const SuggestedFollowups = ({ turn }: { turn: CanvasTurn }) => {
  const items = getFollowups(turn);
  if (!items.length) return null;
  return (
    <div className="animate-fade-in">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
        <MessageSquarePlus className="w-3 h-3" /> Önerilen Sorular
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((q, i) => (
          <button
            key={i}
            onClick={() => dispatchFollowup(q)}
            className="text-[12px] px-2.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedFollowups;
