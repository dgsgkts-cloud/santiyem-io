// AITimeline — vertical event timeline from ui payload of type "timeline".
import { Circle, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export type AITimelineEvent = { date: string; label: string; status?: string; note?: string };

const statusIcon = (s?: string) => {
  if (!s) return <Circle className="h-3.5 w-3.5 text-muted-foreground" />;
  if (/tamamland|ok|onayl/i.test(s)) return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (/geci|risk|kritik|iptal/i.test(s)) return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
  if (/bekli|dikkat/i.test(s)) return <Clock className="h-3.5 w-3.5 text-amber-500" />;
  return <Circle className="h-3.5 w-3.5 text-sky-500" />;
};

export const AITimeline = ({ title, events }: { title?: string; events: AITimelineEvent[] }) => {
  if (!events?.length) return null;
  return (
    <div data-ai-component="AITimeline" className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
      {title && <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>}
      <ol className="relative border-l border-border/60 pl-4 space-y-3">
        {events.map((e, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[22px] top-0.5 grid h-4 w-4 place-items-center rounded-full bg-background">{statusIcon(e.status)}</span>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-[11px] text-muted-foreground">{e.date}</span>
              <span className="text-sm font-medium text-foreground">{e.label}</span>
              {e.status && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{e.status}</span>}
            </div>
            {e.note && <p className="mt-0.5 text-xs text-muted-foreground">{e.note}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
};

export default AITimeline;
