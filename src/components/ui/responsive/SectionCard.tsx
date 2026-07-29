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
    <section
      className={cn(
        "rounded-card border border-border/80 bg-card shadow-card flex flex-col min-w-0",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            {title && <h3 className="ds-title text-foreground truncate">{title}</h3>}
            {subtitle && <p className="ds-caption truncate mt-1">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn(padded ? "px-5 pb-5 pt-0" : "")}>{children}</div>
    </section>
  );
}


export default SectionCard;
