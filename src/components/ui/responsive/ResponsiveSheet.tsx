import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * SPRINT M1 — Unified sheet / drawer / modal.
 *
 * Desktop / tablet: side drawer (right).
 * Mobile:           bottom sheet with safe-area padding.
 *
 * Same actions, same content, only positioning differs — matches the
 * responsive contract in Sprint M1 §9.
 */
interface ResponsiveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Override placement per breakpoint. Defaults to auto (side on desktop, bottom on mobile). */
  side?: "auto" | "right" | "bottom" | "left" | "top";
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZE_CLASSES: Record<NonNullable<ResponsiveSheetProps["size"]>, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
};

export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "auto",
  className,
  size = "md",
}: ResponsiveSheetProps) {
  const isMobile = useIsMobile();
  const resolvedSide =
    side === "auto" ? (isMobile ? "bottom" : "right") : side;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={resolvedSide}
        className={cn(
          "flex flex-col gap-0 p-0",
          resolvedSide === "right" && SIZE_CLASSES[size],
          resolvedSide === "bottom" &&
            "max-h-[92vh] rounded-t-2xl safe-area-bottom",
          className
        )}
      >
        {(title || description) && (
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/60 text-left">
            {title && <SheetTitle className="text-fs-lg">{title}</SheetTitle>}
            {description && (
              <SheetDescription className="text-fs-sm text-muted-foreground">
                {description}
              </SheetDescription>
            )}
          </SheetHeader>
        )}
        <div className="flex-1 overflow-y-auto smooth-scroll px-4 py-4">
          {children}
        </div>
        {footer && (
          <div className="px-4 py-3 border-t border-border/60 safe-area-bottom">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default ResponsiveSheet;
