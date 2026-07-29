import { useState } from "react";
import { AlertTriangle, ChevronDown, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SPRINT 38B — Grouped critical alerts.
 * One card, deduped titles, max 3 visible with the rest behind a disclosure.
 * Presentation only — findings and handlers come from the dashboard.
 */

export interface AlertItem {
  id: string;
  severity: "critical" | "important" | "info";
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface Props {
  items: AlertItem[];
  loading?: boolean;
}

const sevColor = (s: AlertItem["severity"]) =>
  s === "critical" ? "#EF4444" : s === "important" ? "#F59E0B" : "hsl(var(--muted-foreground))";

export function CriticalAlertsCard({ items, loading }: Props) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 3);
  const hidden = items.length - visible.length;

  return (
    <section className="rounded-card border border-border/70 bg-card shadow-card overflow-hidden">
      <header className="flex items-center gap-2 px-4 pt-4 pb-3">
        <AlertTriangle
          className="w-4 h-4 shrink-0"
          style={{ color: items.length ? "#F59E0B" : "hsl(var(--muted-foreground))" }}
        />
        <h2 className="ds-title text-foreground">Kritik Uyarılar</h2>
        {items.length > 0 && (
          <span className="ds-caption font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground tabular-nums">
            {items.length}
          </span>
        )}
      </header>

      <div className="px-4 pb-4">
        {loading ? (
          <div className="space-y-2">
            <div className="h-12 rounded-lg bg-muted/50 animate-pulse" />
            <div className="h-12 rounded-lg bg-muted/40 animate-pulse" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-3">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="ds-body text-foreground/85">
              Bugün kritik bir konu yok. Operasyon sakin görünüyor.
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-1.5">
              {visible.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-background/40 px-3 py-2.5 transition-colors hover:border-border"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0 mt-[7px]"
                    style={{ backgroundColor: sevColor(a.severity) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="ds-body font-medium text-foreground leading-snug">{a.title}</p>
                    {a.detail && (
                      <p className="ds-caption text-muted-foreground mt-0.5 line-clamp-2">{a.detail}</p>
                    )}
                  </div>
                  {a.actionLabel && a.onAction && (
                    <button
                      onClick={a.onAction}
                      className="shrink-0 ds-caption font-medium px-2.5 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 active:scale-[0.97] transition-all"
                    >
                      {a.actionLabel}
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {(hidden > 0 || expanded) && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 ds-caption font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? "Daha az göster" : `${hidden} uyarı daha`}
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-180")} />
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default CriticalAlertsCard;
