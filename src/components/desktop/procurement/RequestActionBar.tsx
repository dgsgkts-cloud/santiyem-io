// Status-based action bar for purchase-request cards.
// One primary + one secondary + a "Detay" link + overflow for rare/destructive
// actions. Loading state is scoped to the clicked action only.
import { Loader2, MoreHorizontal } from "lucide-react";
import {
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  Pencil,
  RotateCcw,
  Send,
  ShoppingCart,
  Trash2,
  Truck,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Request } from "./procurementConstants";
import {
  ACTION_LABELS,
  actionsForRequest,
  PERMISSION_MESSAGE,
  type WorkflowAction,
} from "./procurementWorkflow";
import type { RequestWorkflow } from "./useRequestWorkflow";

const ICONS: Partial<Record<WorkflowAction, React.ComponentType<{ className?: string }>>> = {
  submit: Upload,
  edit: Pencil,
  delete: Trash2,
  approve: CheckCircle2,
  reject: XCircle,
  rfq: Send,
  send_rfq: Send,
  to_order: ShoppingCart,
  open_order: ExternalLink,
  track_delivery: Truck,
  reopen: RotateCcw,
  copy: Copy,
  detail: ChevronRight,
};

interface Props {
  request: Request;
  workflow: RequestWorkflow;
  onAction: (action: WorkflowAction, request: Request) => void;
}

export const RequestActionBar = ({ request, workflow, onAction }: Props) => {
  const plan = actionsForRequest(request);

  const render = (
    action: WorkflowAction,
    variant: "primary" | "secondary"
  ) => {
    const Icon = ICONS[action];
    const allowed = workflow.can(action);
    const loading = workflow.isPending(request.id, action);
    const anyPending = !!workflow.pending;
    const destructive = action === "reject";
    return (
      <Button
        key={action}
        type="button"
        variant={variant === "primary" ? (destructive ? "destructive" : "default") : "outline"}
        onClick={() => onAction(action, request)}
        disabled={anyPending}
        aria-busy={loading}
        aria-label={`${ACTION_LABELS[action]} — ${request.no}`}
        title={allowed ? ACTION_LABELS[action] : PERMISSION_MESSAGE}
        className={cn(
          "flex-1 h-10 rounded-xl text-fs-xs font-medium gap-1.5",
          !allowed && "opacity-60"
        )}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          Icon && <Icon className="w-3.5 h-3.5" />
        )}
        {ACTION_LABELS[action]}
      </Button>
    );
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        {render(plan.primary, "primary")}
        {plan.secondary && render(plan.secondary, "secondary")}
        {plan.overflow.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 w-10 shrink-0 rounded-xl p-0"
                aria-label="Diğer işlemler"
                disabled={!!workflow.pending}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {plan.overflow.map((a) => {
                const Icon = ICONS[a];
                return (
                  <DropdownMenuItem
                    key={a}
                    onSelect={() => onAction(a, request)}
                    className={cn(a === "delete" && "text-red-400 focus:text-red-400")}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 mr-2" />}
                    {ACTION_LABELS[a]}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {plan.tertiary === "detail" && (
        <button
          type="button"
          onClick={() => onAction("detail", request)}
          className="w-full min-h-[40px] text-fs-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 rounded-xl"
          aria-label={`${request.no} detayını aç`}
        >
          Detay <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export default RequestActionBar;
