// AICanvas — the primary visual surface for every assistant turn.
// Composes header, live status, thinking timeline, visuals (via existing
// AIResponseRenderer), summary card fallback, source panel, follow-ups,
// referenced-entity chips, and pinning. Purely presentational.

import { useEffect, useRef } from "react";
import { useCanvasTurns } from "@/hooks/useCanvasTurns";
import { AIResponseRenderer } from "@/components/ai/AIResponseRenderer";
import { isSummaryOnly } from "@/lib/canvasAdapter";
import { extractEntities } from "@/lib/entityExtractor";
import { workspaceBus } from "@/lib/workspaceBus";
import CanvasHeader from "./CanvasHeader";
import AIStatusBadge from "./AIStatusBadge";
import AIThinkingTimeline from "./AIThinkingTimeline";
import SummaryCard from "./SummaryCard";
import SourcePanel from "./SourcePanel";
import SuggestedFollowups from "./SuggestedFollowups";
import ExpandableVisual from "./ExpandableVisual";
import CanvasHistory from "./CanvasHistory";
import CanvasEmptyState from "./CanvasEmptyState";
import PreviewCard from "./PreviewCard";
import PinButton from "./PinButton";
import { useSmartNavigation } from "@/hooks/useSmartNavigation";

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
  const publishedRef = useRef<string | null>(null);

  // Enable app-wide smart navigation when the canvas is mounted.
  useSmartNavigation();

  // When a new completed turn arrives, extract entities → publish highlights.
  useEffect(() => {
    if (!latest || status !== "completed") return;
    if (publishedRef.current === latest.id) return;
    publishedRef.current = latest.id;
    const refs = extractEntities({
      ui: latest.ui,
      speech: latest.speech,
      meta: latest.meta,
    });
    if (refs.length) {
      workspaceBus.publish({ type: "highlight", refs, ttlMs: 2400 });
      // Filter matching lists (projects list → project ids, etc.)
      const byKind = new Map<string, string[]>();
      for (const r of refs) {
        const arr = byKind.get(r.kind) ?? [];
        arr.push(r.id);
        byKind.set(r.kind, arr);
      }
      byKind.forEach((ids, kind) => {
        if (ids.length >= 2) {
          workspaceBus.publish({ type: "filter", kind: kind as any, ids, label: "AI seçimi" });
        }
      });
    }
  }, [latest, status]);

  if (!latest) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between px-4 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Şantiyem AI · Canlı Görünüm
          </p>
          <AIStatusBadge />
        </div>
        <CanvasEmptyState onExecutiveBrief={onExecutiveBrief} />
      </div>
    );
  }

  const refs = extractEntities({
    ui: latest.ui,
    speech: latest.speech,
    meta: latest.meta,
  }).slice(0, 4);

  return (
    <div className={className}>
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CanvasHeader turn={latest} />
          </div>
          <AIStatusBadge />
        </div>

        {refs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 animate-fade-in">
            {refs.map((r, i) => (
              <PreviewCard key={`${r.kind}-${r.id}-${i}`} ref={r} />
            ))}
          </div>
        )}

        {status !== "completed" && status !== "idle" && (
          <AIThinkingTimeline turn={latest} />
        )}

        <div className="space-y-3">
          {isSummaryOnly(latest.ui) ? (
            <SummaryCard turn={latest} />
          ) : (
            latest.ui.map((payload, i) => {
              const title = payload.title || `Görsel ${i + 1}`;
              return (
                <div
                  key={i}
                  className="animate-fade-in"
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
                >
                  <ExpandableVisual
                    title={title}
                    extra={<PinButton title={title} ui={payload} />}
                  >
                    <AIResponseRenderer ui={payload} />
                  </ExpandableVisual>
                </div>
              );
            })
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
