// AICanvas — the primary visual surface for every assistant turn.
// Composes header, live status, thinking timeline, visuals (via existing
// AIResponseRenderer), summary card fallback, source panel, and follow-ups.
// Purely presentational: consumes the global canvas store.

import { useCanvasTurns } from "@/hooks/useCanvasTurns";
import { AIResponseRenderer } from "@/components/ai/AIResponseRenderer";
import { isSummaryOnly } from "@/lib/canvasAdapter";
import CanvasHeader from "./CanvasHeader";
import AIStatusBadge from "./AIStatusBadge";
import AIThinkingTimeline from "./AIThinkingTimeline";
import SummaryCard from "./SummaryCard";
import SourcePanel from "./SourcePanel";
import SuggestedFollowups from "./SuggestedFollowups";
import ExpandableVisual from "./ExpandableVisual";
import CanvasHistory from "./CanvasHistory";
import CanvasEmptyState from "./CanvasEmptyState";

export const AICanvas = ({
  showHistory = true,
  onExecutiveBrief,
  className,
}: {
  showHistory?: boolean;
  onExecutiveBrief?: () => void;
  className?: string;
}) => {
  const { turns, status } = useCanvasTurns();
  const latest = turns[turns.length - 1];
  const history = turns.slice(0, -1);

  if (!latest) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between px-4 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            AI Canvas
          </p>
          <AIStatusBadge />
        </div>
        <CanvasEmptyState onExecutiveBrief={onExecutiveBrief} />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CanvasHeader turn={latest} />
          </div>
          <AIStatusBadge />
        </div>

        {status !== "completed" && status !== "idle" && (
          <AIThinkingTimeline turn={latest} />
        )}

        <div className="space-y-3">
          {isSummaryOnly(latest.ui) ? (
            <SummaryCard turn={latest} />
          ) : (
            latest.ui.map((payload, i) => (
              <ExpandableVisual key={i} title={payload.title || `Görsel ${i + 1}`}>
                <AIResponseRenderer ui={payload} />
              </ExpandableVisual>
            ))
          )}
        </div>

        <SourcePanel turn={latest} />
        <SuggestedFollowups turn={latest} />
        {status === "completed" && <AIThinkingTimeline turn={latest} />}

        {showHistory && <CanvasHistory turns={history} />}
      </div>
    </div>
  );
};

export default AICanvas;
