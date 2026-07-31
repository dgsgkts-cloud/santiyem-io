import { ChevronLeft, MoreHorizontal } from "lucide-react";

interface Props {
  name: string;
  secondary?: string;
  status: string;
  statusColor: string;
  onBack: () => void;
  onOverflow: () => void;
}

/**
 * SPRINT 41A — compact mobile project header.
 * 88-104px content height, safe-area aware, no decorative card, no logo.
 */
export default function MobileProjectHeader({
  name, secondary, status, statusColor, onBack, onOverflow,
}: Props) {
  return (
    <header
      className="sticky top-0 z-20 -mx-4 px-4 bg-background/95 backdrop-blur-md border-b border-border/50"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
    >
      <div className="flex items-start gap-2 pb-3">
        <button
          onClick={onBack}
          aria-label="Geri"
          className="-ml-2 h-11 w-11 shrink-0 flex items-center justify-center rounded-[12px] text-foreground active:bg-muted"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div className="min-w-0 flex-1 pt-1.5">
          <h1 className="text-[23px] leading-[1.15] font-semibold text-foreground line-clamp-2 break-words">
            {name}
          </h1>
          {secondary && (
            <p className="text-[13px] text-muted-foreground mt-1 truncate">{secondary}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 pt-1.5">
          <span
            className="px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap"
            style={{ backgroundColor: `${statusColor}1f`, color: statusColor }}
          >
            {status}
          </span>
          <button
            onClick={onOverflow}
            aria-label="Proje işlemleri"
            className="h-11 w-11 -mr-2 flex items-center justify-center rounded-[12px] text-muted-foreground active:bg-muted"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
