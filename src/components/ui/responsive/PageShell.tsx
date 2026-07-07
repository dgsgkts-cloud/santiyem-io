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
      className={cn(
        "w-full min-h-full smooth-scroll no-overflow-x",
        "px-3 sm:px-4 lg:px-6 py-4 lg:py-6",
        "safe-area-bottom safe-area-x",
        className
      )}
    >
      <div
        className={cn(bleed ? "w-full" : "mx-auto w-full")}
        style={bleed ? undefined : { maxWidth: mw }}
      >
        {(title || actions) && (
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 lg:mb-6">
            <div className="min-w-0">
              {title && (
                <h1
                  className="text-fs-xl font-semibold text-foreground truncate"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-fs-sm text-muted-foreground mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2 flex-wrap">{actions}</div>
            )}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}

export default PageShell;
