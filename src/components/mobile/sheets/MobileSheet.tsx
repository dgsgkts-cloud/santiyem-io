import { ReactNode, useEffect } from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

/**
 * SPRINT 41B — the single mobile bottom-sheet primitive for the whole app.
 *
 * Variants map to content-driven heights (no fixed full-screen sheets):
 *  - action   : compact operation picker      (max 65vh)
 *  - confirm  : short confirmation            (max 42vh)
 *  - form     : focused form + sticky footer  (max 94vh)
 *  - selector : searchable option list        (max 82vh)
 *  - detail   : read-only record detail       (max 80vh)
 *
 * Behaviour: drag handle, safe-area padding, keyboard avoidance (vaul
 * repositionInputs), focus trap + Escape/back handling (Radix Dialog under
 * the hood), background scroll lock, optional swipe-to-dismiss guard for
 * unsaved changes, reduced-motion support, accessible title + description.
 */
export type MobileSheetVariant = "action" | "confirm" | "form" | "selector" | "detail";

const MAX_H: Record<MobileSheetVariant, string> = {
  action: "65vh",
  confirm: "42vh",
  form: "94vh",
  selector: "82vh",
  detail: "80vh",
};

export interface MobileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: MobileSheetVariant;
  children?: ReactNode;
  /** Sticky footer (form actions). Already clears the bottom safe area. */
  footer?: ReactNode;
  /**
   * When true, swipe-to-dismiss and overlay taps are blocked and
   * `onGuardedClose` is called instead — used for unsaved changes.
   */
  guardClose?: boolean;
  onGuardedClose?: () => void;
  className?: string;
}

export function MobileSheet({
  open, onOpenChange, title, description, variant = "action",
  children, footer, guardClose, onGuardedClose, className,
}: MobileSheetProps) {
  // Background scroll lock is handled by vaul/Radix; this guards iOS rubber-band
  // on the page behind the sheet when the sheet itself scrolls.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overscrollBehavior;
    document.body.style.overscrollBehavior = "none";
    return () => { document.body.style.overscrollBehavior = prev; };
  }, [open]);

  const requestChange = (next: boolean) => {
    if (!next && guardClose) { onGuardedClose?.(); return; }
    onOpenChange(next);
  };

  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={requestChange}
      dismissible={!guardClose}
      repositionInputs
      shouldScaleBackground={false}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-[2px] motion-reduce:transition-none" />
        <DrawerPrimitive.Content
          className={cn(
            // 22px top radius, brand surfaces, spring-like vaul transition
            "fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-[22px] border-t border-border/70",
            "bg-card shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.45)] motion-reduce:transition-none",
            className,
          )}
          style={{ maxHeight: MAX_H[variant] }}
        >
          {/* drag handle */}
          <div className="pt-2.5 pb-1 flex justify-center shrink-0">
            <div className="h-[5px] w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="px-4 pb-2 shrink-0">
            <DrawerPrimitive.Title className="text-[19px] font-semibold text-foreground leading-tight">
              {title}
            </DrawerPrimitive.Title>
            <DrawerPrimitive.Description
              className={cn(
                "text-[13px] text-muted-foreground mt-1 leading-snug",
                !description && "sr-only",
              )}
            >
              {description ?? title}
            </DrawerPrimitive.Description>
          </div>

          <div
            className="px-4 overflow-y-auto overscroll-contain flex-1 min-h-0"
            style={footer ? undefined : { paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
          >
            {children}
          </div>

          {footer && (
            <div
              className="px-4 pt-3 border-t border-border/70 bg-card shrink-0"
              style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
            >
              {footer}
            </div>
          )}
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}

export default MobileSheet;
