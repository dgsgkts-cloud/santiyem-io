// Sprint 31 / 31.1 — AI Operations Brief & Autopilot panel.
// Renders enriched insights (cause · impact · recommendation · suggested steps)
// plus a top-of-brief "Today's Top Action" card for Executive Mode.

import { AlertTriangle, Sparkles, Target, TrendingUp, Zap } from "lucide-react";
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

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <span className="block text-[9.5px] font-semibold uppercase tracking-widest text-muted-foreground/80">
      {label}
    </span>
    <span className="text-[11.5px] text-foreground/85 leading-snug">{value}</span>
  </div>
);

const InsightRow = ({ insight }: { insight: AIInsight }) => {
  const { execute, isBusy } = useActionExecutor();
  const style = priorityStyle[insight.priority];
  const hasAutopilot =
    insight.cause || insight.impact || insight.recommendation || insight.suggestedSteps?.length;
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
        </div>
      </div>

      {hasAutopilot && (
        <div className="pl-3.5 flex flex-col gap-1.5">
          {insight.cause && <Field label="Neden" value={insight.cause} />}
          {insight.impact && <Field label="Etki" value={insight.impact} />}
          {insight.recommendation && (
            <Field label="Öneri" value={insight.recommendation} />
          )}
          {insight.suggestedSteps && insight.suggestedSteps.length > 0 && (
            <div>
              <span className="block text-[9.5px] font-semibold uppercase tracking-widest text-muted-foreground/80 mb-0.5">
                Adımlar
              </span>
              <ul className="space-y-0.5">
                {insight.suggestedSteps.map((s, i) => (
                  <li key={i} className="text-[11.5px] text-foreground/85 leading-snug">
                    {i + 1}. {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

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

const TopActionCard = ({ insight }: { insight: AIInsight }) => {
  const { execute, isBusy } = useActionExecutor();
  const primary = insight.actions?.[0];
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-[#FF6B2B]/40 mb-4"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,107,43,0.16) 0%, rgba(255,143,90,0.06) 55%, hsl(var(--card)) 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-40"
        style={{ background: "radial-gradient(circle, rgba(255,107,43,0.35), transparent 70%)" }}
      />
      <div className="relative p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-[#FF6B2B]/20 border border-[#FF6B2B]/40 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-[#FF6B2B]" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#FF6B2B]">
              Bugünün Öncelikli Aksiyonu
            </div>
            <div className="text-fs-md font-semibold text-foreground leading-tight mt-0.5">
              {insight.topActionLabel ?? insight.title}
            </div>
            {insight.expectedImpact && (
              <div className="text-[11.5px] text-muted-foreground mt-0.5">
                Beklenen etki: <span className="text-foreground/85">{insight.expectedImpact}</span>
              </div>
            )}
          </div>
        </div>
        {primary && (
          <button
            onClick={() => execute(primary)}
            disabled={isBusy(primary.id)}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF6B2B] text-white text-fs-sm font-semibold hover:brightness-110 disabled:opacity-50 transition-all shadow-sm shadow-[#FF6B2B]/25"
          >
            {primary.label}
          </button>
        )}
      </div>
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
  if (!hasAny && !ops.topAction) return null;

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
              Ne oldu · Neden oldu · Ne yapılmalı — tek panelde.
            </p>
          </div>
        </header>

        {ops.topAction && <TopActionCard insight={ops.topAction} />}

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
