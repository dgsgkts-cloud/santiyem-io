import { ReactNode } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";

export interface SheetAction {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: "default" | "danger";
}

interface MobileActionSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  description?: string;
  actions?: SheetAction[];
  children?: ReactNode;
  /** compact = content-driven (35-50%), form = taller (65-90%) */
  size?: "compact" | "form";
}

/**
 * SPRINT 41A — native-feeling bottom sheet for mobile Project Detail.
 * Content-driven height, drag indicator, top radius 20px, bottom safe area.
 */
export default function MobileActionSheet({
  open, onOpenChange, title, description, actions, children, size = "compact",
}: MobileActionSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="rounded-t-[20px] border-border/60"
        style={{
          maxHeight: size === "form" ? "88vh" : "52vh",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
        }}
      >
        <div className="px-4 pt-3 overflow-y-auto">
          {(title || description) && (
            <div className="pb-3">
              {title && <div className="text-[17px] font-semibold text-foreground">{title}</div>}
              {description && (
                <div className="text-[13px] text-muted-foreground mt-1 leading-snug">{description}</div>
              )}
            </div>
          )}

          {children}

          {actions && actions.length > 0 && (
            <div className="rounded-[16px] bg-muted/40 overflow-hidden divide-y divide-border/60">
              {actions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => { onOpenChange(false); setTimeout(a.onSelect, 120); }}
                  className={`w-full flex items-center gap-3 px-4 text-left text-[15px] min-h-[52px] active:bg-muted ${
                    a.tone === "danger" ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {a.icon}
                  <span className="truncate">{a.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
