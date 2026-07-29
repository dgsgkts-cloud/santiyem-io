import { CheckCircle2, Clock, XCircle, CalendarDays, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SPRINT 38C — Workforce pulse.
 * Answers "who is present / late / absent" before any detailed list.
 * Compact 2x2 → 4-up responsive grid, no horizontal scrolling.
 */

export interface PulseCounts {
  present: number;
  half: number;
  absent: number;
  leave: number;
  unmarked: number;
  total: number;
}

interface Props {
  counts: PulseCounts;
  dateLabel?: string;
  active?: string | null;
  onSelect?: (key: "present" | "half" | "absent" | "leave" | "unmarked" | null) => void;
  loading?: boolean;
}

const ITEMS = [
  { key: "present", label: "Sahada", icon: CheckCircle2, color: "#22C55E" },
  { key: "half", label: "Yarım Gün", icon: Clock, color: "#F59E0B" },
  { key: "absent", label: "Gelmedi", icon: XCircle, color: "#EF4444" },
  { key: "leave", label: "İzinli", icon: CalendarDays, color: "#3B82F6" },
] as const;

export function WorkforcePulse({ counts, dateLabel, active, onSelect, loading }: Props) {
  const marked = counts.total - counts.unmarked;
  const pct = counts.total > 0 ? Math.round((counts.present / counts.total) * 100) : 0;

  return (
    <section className="rounded-card border border-border/70 bg-card shadow-card overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <h3 className="ds-title text-foreground">Bugünkü Durum</h3>
          {dateLabel && <p className="ds-caption text-muted-foreground mt-0.5">{dateLabel}</p>}
        </div>
        <span className="shrink-0 ds-caption font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground tabular-nums">
          %{pct} sahada
        </span>
      </header>

      <div className="px-3 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          const value = counts[it.key];
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onSelect?.(isActive ? null : it.key)}
              disabled={!onSelect}
              className={cn(
                "rounded-card border px-3 py-2 text-left min-w-0 transition-all duration-200",
                isActive ? "border-primary/50 bg-primary/[0.06]" : "border-border/60 bg-background/40",
                onSelect && "hover:border-primary/40 active:scale-[0.98]",
              )}
              style={{ minHeight: 60 }}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: it.color }} />
                <span className="ds-label text-muted-foreground truncate">{it.label}</span>
              </span>
              {loading ? (
                <span className="block h-5 w-10 mt-1 rounded bg-muted/60 animate-pulse" />
              ) : (
                <span
                  className="block ds-numeric font-semibold tabular-nums mt-0.5"
                  style={{ fontSize: 19, lineHeight: "24px", color: value > 0 ? it.color : "hsl(var(--muted-foreground))" }}
                >
                  {value}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <footer className="flex items-center gap-2 px-4 pb-3">
        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
        <p className="ds-caption text-muted-foreground truncate">
          {counts.total} kişiden {marked} işaretlendi
          {counts.unmarked > 0 ? ` · ${counts.unmarked} kişi bekliyor` : " · liste tamam"}
        </p>
      </footer>
    </section>
  );
}

export default WorkforcePulse;
