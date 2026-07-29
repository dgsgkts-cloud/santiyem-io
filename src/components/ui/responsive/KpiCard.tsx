import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * SPRINT M1 — Unified KPI card used across Dashboard, Finance, Fleet, etc.
 * Same visual rules, responsive typography, one component everywhere.
 */
interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  accent?: string;
  trend?: { value: string; positive?: boolean };
  onClick?: () => void;
  className?: string;
}

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  trend,
  onClick,
  className,
}: KpiCardProps) {
  const Component = onClick ? "button" : "div";
  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        // SPRINT 36 — denser KPI: less height, more info per screen.
        "rounded-card border border-border/80 bg-card shadow-soft text-left w-full p-3 flex flex-col gap-1 min-w-0",
        onClick && "cursor-pointer hover:border-primary/40 transition-colors",
        className
      )}
      style={{ minHeight: 72 }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="ds-label truncate">{label}</span>
        {Icon && (
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{
              backgroundColor: accent
                ? `${accent}20`
                : "hsl(var(--muted) / 0.6)",
              color: accent ?? "hsl(var(--foreground))",
            }}
          >
            <Icon className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
      <div className="ds-heading ds-numeric text-foreground truncate" style={{ fontSize: 20, lineHeight: "26px" }}>
        {value}
      </div>
      {(hint || trend) && (
        <div className="flex items-center gap-2 ds-caption">

          {trend && (
            <span
              className={cn(
                "font-medium",
                trend.positive ? "text-emerald-500" : "text-red-500"
              )}
            >
              {trend.value}
            </span>
          )}
          {hint && (
            <span className="text-muted-foreground truncate">{hint}</span>
          )}
        </div>
      )}
    </Component>
  );
}

export default KpiCard;
