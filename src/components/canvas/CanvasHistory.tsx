import { useState } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import type { CanvasTurn } from "@/hooks/useCanvasTurns";
import { AIResponseRenderer } from "@/components/ai/AIResponseRenderer";
import { SummaryCard } from "./SummaryCard";
import { inferTitle, isSummaryOnly } from "@/lib/canvasAdapter";

export const CanvasHistory = ({ turns }: { turns: CanvasTurn[] }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  if (!turns.length) return null;
  return (
    <div className="border-t border-border/60 mt-4 pt-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">
        Önceki Canvas Yanıtları
      </p>
      <div className="space-y-1.5">
        {turns
          .slice()
          .reverse()
          .map((t) => {
            const open = openId === t.id;
            return (
              <div key={t.id} className="rounded-lg border border-border/50 bg-card/40">
                <button
                  onClick={() => setOpenId(open ? null : t.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left"
                >
                  {open ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span className="text-[12px] text-foreground/90 truncate flex-1">
                    {inferTitle(t)}
                  </span>
                  <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(t.createdAt).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </button>
                {open && (
                  <div className="px-3 pb-3 animate-fade-in">
                    {isSummaryOnly(t.ui) ? (
                      <SummaryCard turn={t} />
                    ) : (
                      <AIResponseRenderer ui={t.ui} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default CanvasHistory;
