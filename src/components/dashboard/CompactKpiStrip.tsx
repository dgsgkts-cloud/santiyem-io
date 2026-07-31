import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SPRINT 38B — Compact KPI strip.
 * 2x2 on mobile, 4-up from sm, ~60px tall. Replaces the tall KPI ribbons
 * so numbers support the brief instead of dominating the screen.
 */

export interface CompactKpi {
  key: string;
  label: string;
  value: string | number;
  tone?: "good" | "warn" | "alert" | "muted";
  icon?: LucideIcon;
  onClick?: () => void;
}

interface Props {
  items: CompactKpi[];
  loading?: boolean;
}

const toneColor = (t: CompactKpi["tone"]) =>
  t === "alert" ? "#EF4444" : t === "warn" ? "#F59E0B" : t === "good" ? "#22C55E" : "hsl(var(--muted-foreground))";

export function CompactKpiStrip({ items, loading }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 items-stretch">
      {items.map((it) => {
        const Icon = it.icon;
        const color = toneColor(it.tone);
        const Comp = it.onClick ? "button" : "div";
        return (
          <Comp
            key={it.key}
            type={it.onClick ? "button" : undefined}
            onClick={it.onClick}
            className={cn(
              "rounded-card border border-border/70 bg-card px-3 py-2 text-left min-w-0 transition-all duration-200",
              it.onClick && "hover:border-primary/40 active:scale-[0.98] cursor-pointer",
            )}
            style={{ minHeight: 60 }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {Icon ? (
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              )}
              <span className="ds-label truncate text-muted-foreground">{it.label}</span>
            </div>
            {loading ? (
              <div className="h-5 w-16 mt-1 rounded bg-muted/60 animate-pulse" />
            ) : (
              <div
                className="ds-numeric font-semibold truncate mt-0.5"
                style={{
                  fontSize: 19,
                  lineHeight: "24px",
                  color: it.tone && it.tone !== "muted" && it.tone !== "good" ? color : "hsl(var(--foreground))",
                }}
              >
                {it.value}
              </div>
            )}
          </Comp>
        );
      })}
    </div>
  );
}

export default CompactKpiStrip;
