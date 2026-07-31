import { ReactNode } from "react";
import { MobileSheet } from "./MobileSheet";
import { cn } from "@/lib/utils";

interface MobileConfirmSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  /** Must explain the consequence — never a generic "Emin misiniz?". */
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  tone?: "danger" | "primary";
  busy?: boolean;
  children?: ReactNode;
}

/** SPRINT 41B — short confirmation sheet with contextual consequence copy. */
export function MobileConfirmSheet({
  open, onOpenChange, title, description, confirmLabel,
  cancelLabel = "Vazgeç", onConfirm, tone = "primary", busy, children,
}: MobileConfirmSheetProps) {
  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      variant="confirm"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-12 rounded-[13px] border border-border text-[15px] font-medium text-foreground active:bg-muted"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={cn(
              "flex-1 h-12 rounded-[13px] text-[15px] font-semibold disabled:opacity-50",
              tone === "danger"
                ? "bg-rose-500 text-white active:bg-rose-600"
                : "bg-primary text-primary-foreground active:opacity-90",
            )}
          >
            {busy ? "Kaydediliyor…" : confirmLabel}
          </button>
        </div>
      }
    >
      {children}
    </MobileSheet>
  );
}

export default MobileConfirmSheet;
