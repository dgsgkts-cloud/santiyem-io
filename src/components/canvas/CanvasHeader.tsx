import { Calendar, Folder, Database, Clock } from "lucide-react";
import type { CanvasTurn } from "@/hooks/useCanvasTurns";
import { inferTitle } from "@/lib/canvasAdapter";

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

export const CanvasHeader = ({ turn }: { turn: CanvasTurn }) => {
  const title = inferTitle(turn);
  const items: { icon: any; label: string }[] = [];
  if (turn.meta?.dateRange) items.push({ icon: Calendar, label: turn.meta.dateRange });
  if (turn.meta?.project) items.push({ icon: Folder, label: turn.meta.project });
  if (turn.meta?.recordsAnalysed != null)
    items.push({ icon: Database, label: `${turn.meta.recordsAnalysed} kayıt` });
  items.push({ icon: Clock, label: fmtTime(turn.createdAt) });

  return (
    <div className="animate-fade-in">
      <h2 className="text-[15px] font-semibold text-foreground leading-tight">{title}</h2>
      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {items.map((it, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <it.icon className="w-3 h-3" />
              {it.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default CanvasHeader;
