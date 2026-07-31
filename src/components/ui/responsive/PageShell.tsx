import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SPRINT M1 — Unified page shell.
 * Consistent max-width, spacing, and safe-area handling on every module.
 * Sidebar/TopBar are rendered by the parent layout — this owns the content region.
 */
interface PageShellProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Removes the default max-width wrapper (for dashboards that want full-bleed). */
  bleed?: boolean;
  /** Optional max-width override (defaults to 1400px). */
  maxWidth?: number | string;
}

export function PageShell({
  title,
  subtitle,
  actions,
  children,
  className,
  bleed,
  maxWidth = 1400,
}: PageShellProps) {
  const mw = typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth;
  return (
    <div
      className={cn("w-full no-overflow-x safe-area-bottom", className)}
      style={{
        // SPRINT 40 — mobile rhythm: 16px gutters, 16px top, generous bottom so
        // the floating voice button never covers the last row.
        paddingLeft: "max(env(safe-area-inset-left, 0px), 16px)",
        paddingRight: "max(env(safe-area-inset-right, 0px), 16px)",
        paddingTop: "16px",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 40px)",
      }}
    >
      <div
        className={cn(bleed ? "w-full" : "mx-auto w-full")}
        style={bleed ? undefined : { maxWidth: mw }}
      >
        {(title || actions) && (
          <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
            <div className="min-w-0">
              {title && <h1 className="ds-heading text-foreground truncate">{title}</h1>}
              {subtitle && <p className="ds-body text-muted-foreground mt-1">{subtitle}</p>}
            </div>
            {actions && (
              <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>
            )}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}


export default PageShell;
