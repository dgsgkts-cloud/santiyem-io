import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Sade etiket + isteğe bağlı açıklama ikonu.
 * Tooltip olmadan da ekran anlaşılır kalır.
 */
export default function ProfitInfoLabel({
  label, hint, className,
}: { label: string; hint?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
      <span>{label}</span>
      {hint && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`${label} nedir?`}
              className="text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[260px] text-[12px] leading-relaxed">
            {hint}
          </TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}
