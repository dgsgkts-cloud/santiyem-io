// AIKpiCards — grid of KPI tiles from ui payload of type "kpi".
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type AIKpi = { label: string; value: string | number; trend?: string; note?: string; tone?: "positive" | "warning" | "danger" | "neutral" };

const toneCls = (t?: string) =>
  t === "danger" ? "border-red-500/25 bg-red-500/5" :
  t === "warning" ? "border-amber-500/25 bg-amber-500/5" :
  t === "positive" ? "border-emerald-500/25 bg-emerald-500/5" :
  "border-border/60 bg-card/70";

const trendIcon = (t?: string) => {
  if (!t) return null;
  if (/^[▲↑+]|artı|yüksel/i.test(t)) return <TrendingUp className="h-3 w-3 text-emerald-500" />;
  if (/^[▼↓-]|düş|azal/i.test(t)) return <TrendingDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
};

export const AIKpiCards = ({ title, items }: { title?: string; items: AIKpi[] }) => {
  if (!items?.length) return null;
  const cols = items.length >= 4 ? "grid-cols-2 lg:grid-cols-4" : items.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <div data-ai-component="AIKpiCards" className="space-y-2">
      {title && <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>}
      <div className={`grid gap-2 ${cols}`}>
        {items.map((k, i) => (
          <div key={i} className={`rounded-2xl border p-3 shadow-sm ${toneCls(k.tone)}`}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{k.label}</div>
            <div className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">{k.value}</div>
            {k.trend && <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">{trendIcon(k.trend)}<span>{k.trend}</span></div>}
            {k.note && <div className="mt-0.5 text-[11px] text-muted-foreground">{k.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIKpiCards;
