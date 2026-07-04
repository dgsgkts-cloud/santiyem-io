// AIProgress — labelled progress bars from ui payload of type "progress".
export type AIProgressRow = { label: string; percent: number; note?: string; tone?: "positive" | "warning" | "danger" | "neutral" };

const barCls = (t?: string) =>
  t === "danger" ? "bg-red-500" : t === "warning" ? "bg-amber-500" : t === "positive" ? "bg-emerald-500" : "bg-primary";

export const AIProgress = ({ title, rows }: { title?: string; rows: AIProgressRow[] }) => {
  if (!rows?.length) return null;
  return (
    <div data-ai-component="AIProgress" className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm space-y-3">
      {title && <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>}
      {rows.map((r, i) => {
        const pct = Math.max(0, Math.min(100, Number(r.percent) || 0));
        return (
          <div key={i}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{r.label}</span>
              <span className="font-mono tabular-nums text-muted-foreground">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full transition-all ${barCls(r.tone)}`} style={{ width: `${pct}%` }} />
            </div>
            {r.note && <div className="mt-0.5 text-[11px] text-muted-foreground">{r.note}</div>}
          </div>
        );
      })}
    </div>
  );
};

export default AIProgress;
