import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

/**
 * SPRINT 38B — Today's actions.
 * One card with the most-used jumps so the user does not hunt the sidebar.
 */

export interface TodayAction {
  key: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  onClick: () => void;
  locked?: boolean;
}

export function TodayActionsCard({ actions }: { actions: TodayAction[] }) {
  return (
    <section className="rounded-card border border-border/70 bg-card shadow-card overflow-hidden">
      <header className="px-4 pt-4 pb-2.5">
        <h2 className="ds-title text-foreground">Bugünün Aksiyonları</h2>
      </header>
      <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              onClick={a.onClick}
              disabled={a.locked}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all hover:bg-muted/40 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block ds-body font-medium text-foreground truncate">{a.label}</span>
                {a.hint && <span className="block ds-caption text-muted-foreground truncate">{a.hint}</span>}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default TodayActionsCard;
