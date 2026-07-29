// Sprint 37 — AI Insight Card.
// Premium card that explains: what happened · why it matters · suggested action.

import {
  AlertTriangle,
  TrendingUp,
  Target,
  Package,
  Wallet,
  CalendarClock,
  HardHat,
  Truck,
  ArrowRight,
} from "lucide-react";
import type { AIInsight, AIPriority, AIInsightDomain } from "@/lib/aiOperationsBrain";
import { useActionExecutor } from "@/hooks/useActionExecutor";

const tone: Record<AIPriority, { chip: string; label: string; bar: string }> = {
  critical: { chip: "bg-danger/15 text-danger border-danger/30", label: "KRİTİK", bar: "bg-danger" },
  high: { chip: "bg-primary/15 text-primary border-primary/30", label: "YÜKSEK", bar: "bg-primary" },
  medium: { chip: "bg-warning/15 text-warning border-warning/30", label: "ORTA", bar: "bg-warning" },
  low: { chip: "bg-muted text-muted-foreground border-border", label: "BİLGİ", bar: "bg-muted-foreground/50" },
};

const domainIcon: Record<AIInsightDomain, typeof AlertTriangle> = {
  finance: Wallet,
  projects: Target,
  personnel: HardHat,
  procurement: Package,
  fleet: Truck,
  tasks: CalendarClock,
};

export const AIInsightCard = ({ insight }: { insight: AIInsight }) => {
  const { execute, isBusy } = useActionExecutor();
  const t = tone[insight.priority];
  const Icon = insight.kind === "opportunity" ? TrendingUp : domainIcon[insight.domain] ?? AlertTriangle;

  return (
    <div className="relative overflow-hidden rounded-card border border-border/70 bg-card/70 p-4 transition-all hover:border-primary/30 hover:shadow-card">
      <span className={`absolute left-0 top-0 h-full w-[3px] ${t.bar}`} />
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-muted/60">
          <Icon className="h-4 w-4 text-foreground/80" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className={`rounded border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-widest ${t.chip}`}>
              {t.label}
            </span>
            {insight.kind === "opportunity" && (
              <span className="rounded border border-success/30 bg-success/15 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-widest text-success">
                FIRSAT
              </span>
            )}
          </div>
          <p className="text-[13.5px] font-semibold leading-snug text-foreground">{insight.title}</p>
          {(insight.detail || insight.cause) && (
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {insight.detail ?? insight.cause}
            </p>
          )}
          {insight.impact && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-foreground/75">
              <span className="font-semibold text-muted-foreground">Neden önemli: </span>
              {insight.impact}
            </p>
          )}
          {insight.recommendation && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-foreground/85">
              <span className="font-semibold text-primary">Öneri: </span>
              {insight.recommendation}
            </p>
          )}
          {!!insight.actions?.length && (
            <div className="mt-3 flex flex-wrap gap-2">
              {insight.actions.slice(0, 3).map((a) => (
                <button
                  key={a.id}
                  disabled={isBusy}
                  onClick={() => execute(a)}
                  className="group inline-flex items-center gap-1.5 rounded-control border border-border bg-background/60 px-2.5 py-1.5 text-[11.5px] font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 active:scale-[0.98] disabled:opacity-50"
                >
                  {a.label}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIInsightCard;
