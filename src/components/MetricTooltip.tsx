import { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MetricTooltipProps {
  /** Tam değer — tooltip içinde gösterilir */
  full: string;
  /** Tetikleyici — kısaltılmış metrik (ör. ₺1.5M) */
  children: ReactNode;
  /** İsteğe bağlı yan ek bilgi */
  side?: "top" | "right" | "bottom" | "left";
  /** Tetikleyici sarmalayıcısının className’i (truncate vb. için) */
  className?: string;
  asChild?: boolean;
}

/**
 * Kısaltılmış finans metriklerinde tutarlı, erişilebilir tooltip.
 * HTML title yerine shadcn Tooltip kullanır.
 */
const MetricTooltip = ({ full, children, side = "top", className, asChild = true }: MetricTooltipProps) => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild={asChild} className={className}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className="font-mono text-xs">
        {full}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default MetricTooltip;
