// Satın Alma → Siparişler: status-aware action bar
// (one primary, one secondary, "Detay" link, overflow for the rest).
import { Loader2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ACTION_LABELS,
  actionsForOrder,
  type OrderAction,
  type PurchaseOrder,
} from "./orderModel";
import type { OrderWorkflow } from "./usePurchaseOrders";

export const OrderActionBar = ({
  order,
  workflow,
  onAction,
  showDetail = true,
  className,
}: {
  order: PurchaseOrder;
  workflow: OrderWorkflow;
  onAction: (action: OrderAction, order: PurchaseOrder) => void;
  showDetail?: boolean;
  className?: string;
}) => {
  const { primary, secondary, overflow } = actionsForOrder(order);
  const pending = workflow.pendingAction(order.id);

  const Btn = ({
    action,
    variant,
  }: {
    action: OrderAction;
    variant: "default" | "outline";
  }) => (
    <Button
      size="sm"
      variant={variant}
      className="flex-1 min-h-[36px] text-fs-xs"
      disabled={!!pending}
      onClick={() => onAction(action, order)}
    >
      {pending === action && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
      {ACTION_LABELS[action]}
    </Button>
  );

  const extra = overflow.filter((a) => a !== primary && a !== secondary);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {primary && <Btn action={primary} variant="default" />}
      {secondary && <Btn action={secondary} variant="outline" />}
      {showDetail && (
        <button
          onClick={() => onAction("detail", order)}
          className="text-fs-xs text-[#FF6B2B] hover:underline px-2 min-h-[36px] whitespace-nowrap"
        >
          Detay
        </button>
      )}
      {extra.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="min-h-[36px] px-2"
              aria-label="Diğer işlemler"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {extra.map((action) => (
              <DropdownMenuItem
                key={action}
                onClick={() => onAction(action, order)}
                className={
                  action === "delete" || action === "cancel" ? "text-red-400" : ""
                }
              >
                {ACTION_LABELS[action]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
