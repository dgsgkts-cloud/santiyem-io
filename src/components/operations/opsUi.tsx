/**
 * SPRINT 38F — Site Operations UI kit.
 * Presentation-only primitives shared by Daily Log, Tasks, Reminders and Calendar
 * so every operational screen reads with the same density, spacing and rhythm.
 * Built on the finance kit so the whole product speaks one visual language.
 */
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  FinanceStatStrip as OpsStatStrip,
  FinanceRow as OpsRow,
  FinanceRowAction as OpsRowAction,
  FinanceFilterBar as OpsFilterBar,
  FinanceListShell as OpsListShell,
  FinanceStatusPill as OpsPill,
  type FinanceTone as OpsTone,
} from "@/components/finance/financeUi";

export { OpsStatStrip, OpsRow, OpsRowAction, OpsFilterBar, OpsListShell, OpsPill };
export type { OpsTone };

/** Section label with an optional count and trailing action — one header style everywhere. */
export const OpsSectionHeader = ({ title, count, action, icon: Icon, className }: {
  title: string;
  count?: number;
  action?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) => (
  <div className={cn("flex items-center justify-between gap-2 min-h-[24px]", className)}>
    <div className="flex items-center gap-1.5 min-w-0">
      {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
      <h3 className="ds-label truncate">{title}</h3>
      {typeof count === "number" && <span className="ds-caption text-muted-foreground">· {count}</span>}
    </div>
    {action}
  </div>
);

/** Quiet empty state: why it is empty + the single next step. */
export const OpsEmpty = ({ icon, title, description, action }: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <div className="rounded-card border border-border/80 bg-card shadow-soft flex flex-col items-center justify-center text-center py-10 px-6">
    {icon && <span className="text-3xl mb-2.5">{icon}</span>}
    <p className="ds-body font-semibold text-foreground">{title}</p>
    {description && <p className="ds-caption text-muted-foreground max-w-sm mt-1">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/** Fixed-height skeleton rows — same 60px rhythm as OpsRow, so nothing shifts on load. */
export const OpsSkeletonRows = ({ rows = 4 }: { rows?: number }) => (
  <div className="rounded-card border border-border/80 bg-card overflow-hidden divide-y divide-border/60">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-3" style={{ height: 60 }}>
        <div className="flex-1 space-y-2">
          <div className="h-3 rounded bg-muted/50 animate-pulse" style={{ width: `${55 + (i % 3) * 12}%` }} />
          <div className="h-2.5 rounded bg-muted/30 animate-pulse w-1/3" />
        </div>
        <div className="h-4 w-14 rounded bg-muted/40 animate-pulse" />
      </div>
    ))}
  </div>
);

/** Timeline entry: a calm rail + dot instead of one bordered card per event. */
export const OpsTimelineItem = ({ tone = "neutral", time, title, detail, right, onClick, last }: {
  tone?: OpsTone;
  time?: React.ReactNode;
  title: React.ReactNode;
  detail?: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
  last?: boolean;
}) => (
  <div
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
    className={cn("relative flex gap-3 pl-1 pr-1", onClick && "cursor-pointer group")}
  >
    <div className="flex flex-col items-center shrink-0 pt-[15px]">
      <span className={cn("w-2 h-2 rounded-full", TIMELINE_DOT[tone])} />
      {!last && <span className="w-px flex-1 bg-border/70 my-1" />}
    </div>
    <div className="flex-1 min-w-0 py-2.5 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="ds-body font-medium text-foreground truncate">{title}</p>
        {detail && <p className="ds-caption text-muted-foreground truncate mt-0.5">{detail}</p>}
      </div>
      {time && <span className="ds-caption text-muted-foreground shrink-0 tabular-nums">{time}</span>}
      {right}
    </div>
  </div>
);

const TIMELINE_DOT: Record<string, string> = {
  neutral: "bg-muted-foreground/50",
  info: "bg-sky-400/80",
  positive: "bg-emerald-400/80",
  attention: "bg-amber-400/80",
  overdue: "bg-rose-400/80",
};
