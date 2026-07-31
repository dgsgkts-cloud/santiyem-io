import { cn } from "@/lib/utils";

/**
 * SPRINT 38A — Compact project stat strip.
 * Replaces the tall 4-card KPI row with a low-height segmented grid
 * (2x2 on mobile, 4-up from sm). Each cell doubles as a status filter.
 * Presentation only — counts are passed in by the page.
 */

export type ProjectStatKey = "all" | "active" | "completed" | "delayed";

interface StatItem {
  key: ProjectStatKey;
  label: string;
  value: number;
  color: string;
}

interface Props {
  items: StatItem[];
  activeKey: ProjectStatKey;
  onSelect: (key: ProjectStatKey) => void;
}

export default function ProjectStatStrip({ items, activeKey, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {items.map((it) => {
        const isActive = activeKey === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onSelect(isActive && it.key !== "all" ? "all" : it.key)}
            aria-pressed={isActive}
            className={cn(
              "group rounded-card border bg-card px-3 py-2.5 text-left transition-all duration-200 min-w-0",
              "flex flex-col justify-center gap-1",
              "hover:border-primary/40 active:scale-[0.98]",
              isActive ? "border-primary/60 shadow-soft" : "border-border/70",
            )}
            style={{ minHeight: 80 }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: it.color }}
              />
              <span className="ds-label truncate text-muted-foreground">{it.label}</span>
            </div>
            <div
              className="ds-numeric font-semibold text-foreground mt-0.5"
              style={{ fontSize: 20, lineHeight: "24px" }}
            >
              {it.value}
            </div>
          </button>
        );
      })}
    </div>
  );
}
