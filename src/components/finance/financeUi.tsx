// SPRINT 38E — Finance UI kit.
// Presentation-only primitives shared by Finance, Cash, Progress Payments,
// Invoices and Contracts so every financial screen speaks one language:
// compact KPIs, dense rows, calm status tones, quick actions.
import * as React from "react";
import { Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Calm status tones (no aggressive reds — soft tints + a quiet rail) ── */
export type FinanceTone = "positive" | "neutral" | "info" | "attention" | "overdue";

export const FINANCE_TONE: Record<FinanceTone, { pill: string; dot: string; text: string; rail: string }> = {
  positive: { pill: "bg-emerald-500/[0.08] text-emerald-300/90 border-emerald-500/20", dot: "bg-emerald-400/80", text: "text-emerald-300/90", rail: "bg-emerald-400/60" },
  neutral: { pill: "bg-muted/60 text-muted-foreground border-border/70", dot: "bg-muted-foreground/50", text: "text-foreground/80", rail: "bg-border" },
  info: { pill: "bg-sky-500/[0.08] text-sky-300/90 border-sky-500/20", dot: "bg-sky-400/80", text: "text-sky-300/90", rail: "bg-sky-400/60" },
  attention: { pill: "bg-amber-500/[0.08] text-amber-300/90 border-amber-500/20", dot: "bg-amber-400/80", text: "text-amber-300/90", rail: "bg-amber-400/60" },
  overdue: { pill: "bg-rose-500/[0.08] text-rose-300/90 border-rose-500/20", dot: "bg-rose-400/80", text: "text-rose-300/90", rail: "bg-rose-400/70" },
};

export const FinanceStatusPill = ({ tone = "neutral", children, className }: {
  tone?: FinanceTone; children: React.ReactNode; className?: string;
}) => (
  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ds-caption whitespace-nowrap", FINANCE_TONE[tone].pill, className)}>
    {children}
  </span>
);

/* ── Compact KPI strip: 2 columns on mobile, 4 on desktop, never scrolls ── */
export interface FinanceStat {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: FinanceTone;
  onClick?: () => void;
  active?: boolean;
}

export const FinanceStatStrip = ({ stats, columns = 4, className }: {
  stats: FinanceStat[]; columns?: 3 | 4 | 5; className?: string;
}) => (
  <div
    className={cn(
      "grid grid-cols-2 gap-2",
      columns === 3 && "lg:grid-cols-3",
      columns === 4 && "lg:grid-cols-4",
      columns === 5 && "sm:grid-cols-3 lg:grid-cols-5",
      className
    )}
  >
    {stats.map((s, i) => {
      const tone = FINANCE_TONE[s.tone ?? "neutral"];
      const Comp: any = s.onClick ? "button" : "div";
      return (
        <Comp
          key={i}
          type={s.onClick ? "button" : undefined}
          onClick={s.onClick}
          className={cn(
            "rounded-card border bg-card shadow-soft p-3 text-left min-w-0 flex flex-col justify-between transition-colors",
            s.active ? "border-primary/40" : "border-border/80",
            s.onClick && "hover:border-primary/40 cursor-pointer"
          )}
          style={{ minHeight: 72 }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="ds-label truncate">{s.label}</span>
            {s.icon && <s.icon className={cn("w-3.5 h-3.5 shrink-0", tone.text)} />}
          </div>
          <div className={cn("ds-numeric font-semibold truncate", tone.text)} style={{ fontSize: 19, lineHeight: "25px" }}>
            {s.value}
          </div>
          {s.hint && <div className="ds-caption text-muted-foreground truncate">{s.hint}</div>}
        </Comp>
      );
    })}
  </div>
);

/* ── Dense money row: who · how much · when · status · quick actions ── */
export const FinanceRow = ({
  title, subtitle, amount, amountTone = "neutral", meta, status, statusTone = "neutral",
  actions, onClick, rail,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  amount: React.ReactNode;
  amountTone?: FinanceTone;
  meta?: React.ReactNode;
  status?: React.ReactNode;
  statusTone?: FinanceTone;
  actions?: React.ReactNode;
  onClick?: () => void;
  rail?: FinanceTone;
}) => (
  <div
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    className={cn(
      "group relative flex items-center gap-3 px-3 py-2.5 min-w-0 transition-colors",
      onClick && "cursor-pointer hover:bg-muted/30"
    )}
    style={{ minHeight: 60 }}
  >
    {rail && <span className={cn("absolute left-0 top-2 bottom-2 w-[3px] rounded-full", FINANCE_TONE[rail].rail)} aria-hidden />}
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 min-w-0">
        <span className="ds-body font-medium text-foreground truncate">{title}</span>
        {status && <FinanceStatusPill tone={statusTone}>{status}</FinanceStatusPill>}
      </div>
      {subtitle && <div className="ds-caption text-muted-foreground truncate mt-0.5">{subtitle}</div>}
    </div>
    <div className="text-right shrink-0">
      <div className={cn("ds-body ds-numeric font-semibold", FINANCE_TONE[amountTone].text)}>{amount}</div>
      {meta && <div className="ds-caption text-muted-foreground">{meta}</div>}
    </div>
    {actions && <div className="flex items-center gap-0.5 shrink-0">{actions}</div>}
  </div>
);

export const FinanceRowAction = ({ label, icon: Icon, onClick, tone }: {
  label: string; icon: LucideIcon; onClick: () => void; tone?: string;
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={cn(
      "w-11 h-11 sm:w-9 sm:h-9 rounded-control flex items-center justify-center shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
      tone
    )}
  >
    <Icon className="w-4 h-4" />
  </button>
);

/* ── One filter line: search always visible + optional segmented chips ── */
export const FinanceFilterBar = ({
  query, onQuery, placeholder = "Ara…", chips, active, onChip, right, sticky = true,
}: {
  query: string;
  onQuery: (v: string) => void;
  placeholder?: string;
  chips?: { value: string; label: string; count?: number }[];
  active?: string;
  onChip?: (v: string) => void;
  right?: React.ReactNode;
  sticky?: boolean;
}) => (
  <div className={cn("space-y-2 -mx-1 px-1 py-2 bg-background/85 backdrop-blur-sm", sticky && "sticky top-0 z-10")}>
    <div className="flex items-center gap-2">
      <div className="relative flex-1 min-w-0">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 h-11 text-fs-sm rounded-control bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
        />
        {query && (
          <button
            onClick={() => onQuery("")}
            aria-label="Aramayı temizle"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {right}
    </div>
    {chips && chips.length > 0 && (
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {chips.map((c) => (
          <button
            key={c.value}
            onClick={() => onChip?.(c.value)}
            className={cn(
              "px-3 h-8 rounded-pill ds-caption whitespace-nowrap border transition-colors shrink-0",
              active === c.value
                ? "bg-primary/[0.08] text-foreground border-primary/40"
                : "bg-card text-muted-foreground border-border/70 hover:text-foreground"
            )}
          >
            {c.label}{typeof c.count === "number" ? ` · ${c.count}` : ""}
          </button>
        ))}
      </div>
    )}
  </div>
);

/* ── Attention list: what needs a decision today, quietly emphasised ── */
export const AttentionList = ({ items }: {
  items: { id: string; title: string; detail: string; amount?: string; tone?: FinanceTone; onClick?: () => void }[];
}) => (
  <div className="rounded-card border border-border/80 bg-card shadow-soft divide-y divide-border/60 overflow-hidden">
    {items.map((it) => (
      <FinanceRow
        key={it.id}
        rail={it.tone ?? "attention"}
        title={it.title}
        subtitle={it.detail}
        amount={it.amount ?? ""}
        amountTone={it.tone ?? "attention"}
        onClick={it.onClick}
      />
    ))}
  </div>
);

export const FinanceListShell = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <section className={cn("rounded-card border border-border/80 bg-card shadow-soft overflow-hidden divide-y divide-border/60", className)}>
    {children}
  </section>
);
