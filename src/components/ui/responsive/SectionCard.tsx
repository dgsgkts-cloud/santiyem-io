import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SPRINT M1 — Unified content section card.
 * Same header/body/action rules across every module & breakpoint.
 */
interface SectionCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  padded?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  subtitle,
  action,
  padded = true,
  children,
  className,
}: SectionCardProps) {
  return (
    <section className={cn("card-refined flex flex-col min-w-0", className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
          <div className="min-w-0">
            {title && (
              <h3 className="text-fs-md font-semibold text-foreground truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-fs-xs text-muted-foreground truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn(padded ? "px-4 pb-4 pt-2" : "")}>{children}</div>
    </section>
  );
}

export default SectionCard;
