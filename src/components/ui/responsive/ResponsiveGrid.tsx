import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SPRINT M1 — Unified responsive grid.
 *
 * Variants:
 *  - "kpi"     → 1 col (mobile) / 2 col (tablet) / 4 col (desktop)
 *  - "section" → 1 col (mobile+tablet) / 2 col (desktop)
 *  - "auto"    → auto-fill minmax(260px, 1fr)
 *
 * Use everywhere KPI cards or paired sections appear so the layout
 * behaves identically across every module.
 */
export type ResponsiveGridVariant = "kpi" | "section" | "auto";

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: ResponsiveGridVariant;
  minItemWidth?: number;
}

export const ResponsiveGrid = React.forwardRef<HTMLDivElement, ResponsiveGridProps>(
  ({ className, variant = "kpi", minItemWidth = 260, style, children, ...rest }, ref) => {
    if (variant === "auto") {
      return (
        <div
          ref={ref}
          className={cn("grid gap-4", className)}
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${minItemWidth}px, 1fr))`,
            ...style,
          }}
          {...rest}
        >
          {children}
        </div>
      );
    }
    return (
      <div
        ref={ref}
        className={cn(variant === "kpi" ? "grid-kpi" : "grid-section", className)}
        style={style}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
ResponsiveGrid.displayName = "ResponsiveGrid";

export default ResponsiveGrid;
