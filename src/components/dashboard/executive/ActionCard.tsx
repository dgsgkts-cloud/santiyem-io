import { useState } from "react";
import { AlertTriangle, AlertCircle, Info, Sparkles, Zap } from "lucide-react";
import type { Finding } from "@/hooks/useExecutiveBrief";
import { recommendFor } from "@/lib/executiveRecommendations";
import { executeAction, type ActionDef, type ActionPriority, type ExecuteContext } from "@/lib/actionRegistry";

interface ActionCardProps {
  finding: Finding;
  ctx: ExecuteContext;
}

const priorityMeta: Record<ActionPriority, { label: string; dot: string; ring: string; text: string }> = {
  immediate: { label: "Hemen", dot: "bg-destructive", ring: "border-destructive/40", text: "text-destructive" },
  today: { label: "Bugün", dot: "bg-amber-500", ring: "border-amber-500/40", text: "text-amber-500" },
  "this-week": { label: "Bu Hafta", dot: "bg-yellow-500", ring: "border-yellow-500/40", text: "text-yellow-500" },
  optional: { label: "Opsiyonel", dot: "bg-emerald-500", ring: "border-emerald-500/40", text: "text-emerald-500" },
};

const sevIcon = { critical: AlertTriangle, important: AlertCircle, info: Info } as const;

export function ActionCard({ finding, ctx }: ActionCardProps) {
  const rec = recommendFor(finding);
  const meta = priorityMeta[rec.priority];
  const Icon = sevIcon[finding.severity];
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (a: ActionDef) => {
    if (a.confirm && confirmingId !== a.id) {
      setConfirmingId(a.id);
      return;
    }
    setConfirmingId(null);
    setBusyId(a.id);
    await executeAction(a, ctx);
    setBusyId(null);
  };

  return (
    <article className={`rounded-xl border ${meta.ring} bg-card p-4 space-y-3`}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${meta.text}`} />
          <div className="min-w-0">
            <h4 className="text-[13.5px] font-medium text-foreground leading-snug">{finding.title}</h4>
            {finding.detail && (
              <p className="text-[12px] text-muted-foreground mt-0.5">{finding.detail}</p>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] shrink-0 ${meta.ring} ${meta.text} bg-transparent`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <Insight icon={Info} label="Neden" text={rec.why} />
        <Insight icon={Sparkles} label="Öneri" text={rec.recommendation} accent />
        <Insight icon={Zap} label="Beklenen Etki" text={rec.impact} />
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {rec.actions.map((a) => {
          const confirming = confirmingId === a.id;
          const busy = busyId === a.id;
          const primary = a.variant === "primary";
          const danger = a.variant === "danger";
          const base =
            "text-[12px] px-2.5 py-1.5 rounded-md border transition-colors disabled:opacity-60";
          const style = primary
            ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
            : danger
            ? "border-destructive/40 text-destructive hover:bg-destructive/10"
            : "border-border text-foreground/80 hover:bg-muted";
          return (
            <button
              key={a.id}
              onClick={() => run(a)}
              disabled={busy}
              className={`${base} ${style}`}
            >
              {busy ? "…" : confirming ? "Onayla" : a.label}
            </button>
          );
        })}
        {confirmingId && (
          <button
            onClick={() => setConfirmingId(null)}
            className="text-[12px] px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground"
          >
            Vazgeç
          </button>
        )}
      </div>
    </article>
  );
}

function Insight({
  icon: Icon,
  label,
  text,
  accent,
}: {
  icon: typeof Info;
  label: string;
  text: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-lg border ${accent ? "border-primary/25 bg-primary/[0.04]" : "border-border/50 bg-background/40"} p-2.5`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3 h-3 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        <span className="text-[10.5px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className="text-[12.5px] text-foreground/85 leading-snug">{text}</p>
    </div>
  );
}
