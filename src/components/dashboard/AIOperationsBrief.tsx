// Sprint 31 — AI Operations Brief
// Renders the AI Operations Brain output as an executive morning brief:
// top risks, opportunities, today's priorities — each with priority chip and
// AI-suggested actions wired through the shared useActionExecutor.

import { AlertTriangle, Sparkles, Target, TrendingUp } from "lucide-react";
import type { AIInsight, AIOperationsSummary, AIPriority } from "@/lib/aiOperationsBrain";
import { useActionExecutor } from "@/hooks/useActionExecutor";

interface Props {
  ops: AIOperationsSummary;
}

const priorityStyle: Record<AIPriority, { chip: string; label: string; dot: string }> = {
  critical: {
    chip: "bg-red-500/15 text-red-400 border-red-500/30",
    label: "KRİTİK",
    dot: "bg-red-500",
  },
  high: {
    chip: "bg-[#FF6B2B]/15 text-[#FF6B2B] border-[#FF6B2B]/30",
    label: "YÜKSEK",
    dot: "bg-[#FF6B2B]",
  },
  medium: {
    chip: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    label: "ORTA",
    dot: "bg-amber-500",
  },
  low: {
    chip: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    label: "DÜŞÜK",
    dot: "bg-slate-400",
  },
};

const InsightRow = ({ insight }: { insight: AIInsight }) => {
  const { execute, isBusy } = useActionExecutor();
  const style = priorityStyle[insight.priority];
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3 flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span
              className={`text-[9.5px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded border ${style.chip}`}
            >
              {style.label}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {insight.domain}
            </span>
          </div>
          <p className="text-[13px] font-medium text-foreground leading-snug">
            {insight.title}
          </p>
          {insight.detail && (
            <p className="text-[11.5px] text-muted-foreground mt-0.5">{insight.detail}</p>
          )}
          {insight.recommendation && (
            <p className="text-[11.5px] text-foreground/70 mt-1 italic">
              💡 {insight.recommendation}
            </p>
          )}
        </div>
      </div>
      {insight.actions && insight.actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-3.5">
          {insight.actions.map((a) => (
            <button
              key={a.id}
              onClick={() => execute(a)}
              disabled={isBusy(a.id)}
              className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#FF6B2B]/10 text-[#FF6B2B] hover:bg-[#FF6B2B]/20 border border-[#FF6B2B]/20 transition-colors disabled:opacity-50"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Section = ({
  title,
  icon: Icon,
  items,
  accent,
  empty,
}: {
  title: string;
  icon: typeof AlertTriangle;
  items: AIInsight[];
  accent: string;
  empty: string;
}) => (
  <div className="flex flex-col gap-2 min-w-0">
    <div className="flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5" style={{ color: accent }} strokeWidth={2.2} />
      <span
        className="text-[10.5px] font-semibold uppercase tracking-widest"
        style={{ color: accent }}
      >
        {title}
      </span>
      <span className="text-[10px] text-muted-foreground">({items.length})</span>
    </div>
    {items.length === 0 ? (
      <p className="text-[12px] text-muted-foreground/70 italic px-1">{empty}</p>
    ) : (
      <div className="flex flex-col gap-2">
        {items.map((i) => (
          <InsightRow key={i.id} insight={i} />
        ))}
      </div>
    )}
  </div>
);

export const AIOperationsBrief = ({ ops }: Props) => {
  const hasAny =
    ops.topRisks.length + ops.topOpportunities.length + ops.todayPriorities.length > 0;
  if (!hasAny) return null;

  return (
    <section
      className="relative w-full rounded-2xl overflow-hidden border border-border/70"
      style={{
        background:
          "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
      }}
    >
      <div className="relative p-5 sm:p-6">
        <header className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/15 flex items-center justify-center border border-[#FF6B2B]/25">
            <Sparkles className="w-4 h-4 text-[#FF6B2B]" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h3
              className="text-fs-md font-semibold text-foreground leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
            >
              AI Operasyon Brifingi
            </h3>
            <p className="text-fs-xs text-muted-foreground">
              Şirket verilerinizden türetilen bugünkü riskler, fırsatlar ve öncelikler.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Section
            title="Bugünün Riskleri"
            icon={AlertTriangle}
            items={ops.topRisks}
            accent="#ef4444"
            empty="Kritik risk saptanmadı."
          />
          <Section
            title="Fırsatlar"
            icon={TrendingUp}
            items={ops.topOpportunities}
            accent="#22c55e"
            empty="Şu an için fırsat sinyali yok."
          />
          <Section
            title="Bugünün Öncelikleri"
            icon={Target}
            items={ops.todayPriorities}
            accent="#FF6B2B"
            empty="Bugün için özel öncelik yok."
          />
        </div>
      </div>
    </section>
  );
};

export default AIOperationsBrief;
