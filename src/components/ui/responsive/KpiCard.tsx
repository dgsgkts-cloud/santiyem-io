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
        "card-refined text-left w-full p-4 flex flex-col gap-2 min-w-0",
        onClick && "cursor-pointer hover:border-primary/40 transition-colors",
        className
      )}
      style={{ minHeight: 96 }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-fs-xs uppercase tracking-wide text-muted-foreground truncate">
          {label}
        </span>
        {Icon && (
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              backgroundColor: accent
                ? `${accent}20`
                : "hsl(var(--muted) / 0.6)",
              color: accent ?? "hsl(var(--foreground))",
            }}
          >
            <Icon className="w-4 h-4" />
          </span>
        )}
      </div>
      <div className="text-fs-2xl font-semibold text-foreground leading-tight truncate">
        {value}
      </div>
      {(hint || trend) && (
        <div className="flex items-center gap-2 text-fs-xs">
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
