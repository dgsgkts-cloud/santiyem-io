import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SPRINT 38A — Collapsible section for the project detail screen.
 * Secondary information stays one tap away instead of adding scroll.
 * Presentation only — children mount lazily on first open.
 */
interface Props {
  title: ReactNode;
  hint?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export default function CollapsibleSection({
  title, hint, defaultOpen = false, children, className,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [everOpened, setEverOpened] = useState(defaultOpen);

  const toggle = () => {
    setOpen((v) => !v);
    setEverOpened(true);
  };

  return (
    <section
      className={cn(
        "rounded-card border border-border/80 bg-card shadow-card min-w-0 overflow-hidden",
        className,
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="min-w-0 flex items-center gap-2">
          <h3 className="ds-title text-foreground truncate">{title}</h3>
          {hint && <span className="ds-caption text-muted-foreground shrink-0">{hint}</span>}
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {everOpened && (
        <div className={cn("px-5 pb-5", !open && "hidden")}>{children}</div>
      )}
    </section>
  );
}
