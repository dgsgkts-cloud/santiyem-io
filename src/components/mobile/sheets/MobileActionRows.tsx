import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActionTone = "primary" | "success" | "danger" | "warning" | "info" | "neutral";

const TONE: Record<ActionTone, string> = {
  primary: "bg-primary/12 text-primary",
  success: "bg-emerald-500/12 text-emerald-400",
  danger: "bg-rose-500/12 text-rose-400",
  warning: "bg-amber-500/12 text-amber-400",
  info: "bg-sky-500/12 text-sky-400",
  neutral: "bg-muted text-muted-foreground",
};

export interface MobileActionRowItem {
  id: string;
  label: string;
  description?: string;
  icon: ReactNode;
  tone?: ActionTone;
  onSelect: () => void;
  disabled?: boolean;
  /** Visually separates destructive rows. */
  destructive?: boolean;
}

/**
 * SPRINT 41B — compact contextual action rows (40px icon container, title,
 * one-line description, chevron, 68px min height). Colour lives in the icon
 * container only; rows never get a saturated background.
 */
export function MobileActionRows({ items }: { items: MobileActionRowItem[] }) {
  const normal = items.filter(i => !i.destructive);
  const destructive = items.filter(i => i.destructive);

  const renderGroup = (group: MobileActionRowItem[]) => (
    <div className="rounded-[16px] border border-border/70 bg-background/40 overflow-hidden divide-y divide-border/60">
      {group.map(item => (
        <button
          key={item.id}
          type="button"
          disabled={item.disabled}
          onClick={item.onSelect}
          className={cn(
            "w-full flex items-center gap-3 px-3.5 py-3 text-left min-h-[68px] transition-colors",
            item.disabled ? "opacity-45" : "active:bg-muted/60",
          )}
        >
          <span
            className={cn(
              "h-10 w-10 rounded-[12px] flex items-center justify-center shrink-0",
              TONE[item.destructive ? "danger" : item.tone ?? "neutral"],
            )}
          >
            {item.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block text-[15px] font-medium leading-tight",
                item.destructive ? "text-rose-400" : "text-foreground",
              )}
            >
              {item.label}
            </span>
            {item.description && (
              <span className="block text-[12.5px] text-muted-foreground leading-snug mt-0.5">
                {item.description}
              </span>
            )}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 pb-1">
      {normal.length > 0 && renderGroup(normal)}
      {destructive.length > 0 && renderGroup(destructive)}
    </div>
  );
}

export default MobileActionRows;
