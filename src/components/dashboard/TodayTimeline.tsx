// Sprint 30.0 — "Bugünün Planı" timeline.
// Renders a light timeline of today's known events (hakediş beklentileri,
// çek vadeleri, taşeron ödemeleri, kritik görevler). Hidden if empty.
import { Wallet, CreditCard, ListChecks, Truck, Users, FileText } from "lucide-react";
import { useExecutiveBrief, type TodayEvent } from "@/hooks/useExecutiveBrief";

const iconFor = (k: TodayEvent["kind"]) =>
  k === "collection" ? Wallet :
  k === "payment" ? CreditCard :
  k === "task" ? ListChecks :
  k === "delivery" ? Truck :
  k === "meeting" ? Users :
  FileText;

const toneFor = (k: TodayEvent["kind"]) =>
  k === "collection" ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/[0.06]" :
  k === "payment" ? "text-amber-500 border-amber-500/30 bg-amber-500/[0.06]" :
  k === "task" ? "text-cyan-500 border-cyan-500/30 bg-cyan-500/[0.06]" :
  "text-muted-foreground border-border/60 bg-card";

export function TodayTimeline() {
  const { kpis, loading } = useExecutiveBrief();
  if (loading) return null;
  if (!kpis.todayEvents.length) return null;

  return (
    <section aria-label="Bugünün planı" className="space-y-3">
      <div>
        <h2 className="text-fs-lg font-semibold tracking-tight text-foreground">
          Bugünün Planı
        </h2>
        <p className="text-fs-xs text-muted-foreground">
          Bugün olması beklenen operasyonel hareketler.
        </p>
      </div>

      <ol className="relative border-l border-border/60 pl-4 space-y-2.5">
        {kpis.todayEvents.map((e) => {
          const Icon = iconFor(e.kind);
          return (
            <li key={e.id} className="relative">
              <span className="absolute -left-[22px] top-2 w-2 h-2 rounded-full bg-primary/70 ring-4 ring-background" />
              <div
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${toneFor(e.kind)}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {e.time && (
                  <span className="text-fs-xs font-mono tabular-nums text-muted-foreground w-12 shrink-0">
                    {e.time}
                  </span>
                )}
                <span className="text-fs-sm text-foreground truncate">{e.label}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default TodayTimeline;
