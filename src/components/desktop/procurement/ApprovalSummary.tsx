// Compact approval-progress summary for purchase-request cards.
// Replaces the old five-circle stepper with truncated labels ("Tal…", "Yö…").
// The whole row is one tap target (>=44px) that opens the full "Onay Geçmişi".
import { useState } from "react";
import { Check, ChevronRight, Circle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Request } from "./procurementConstants";
import { buildApprovalFlow, fmtStageDate, type ApprovalStage } from "./approvalFlow";

const StageIcon = ({ state }: { state: ApprovalStage["state"] }) => {
  if (state === "done")
    return (
      <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
        <Check className="w-3 h-3 text-emerald-400" aria-hidden />
      </span>
    );
  if (state === "rejected" || state === "cancelled")
    return (
      <span className="w-5 h-5 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center shrink-0">
        <X className="w-3 h-3 text-red-400" aria-hidden />
      </span>
    );
  return (
    <span
      className={cn(
        "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
        state === "current"
          ? "border-amber-500/50 bg-amber-500/10"
          : "border-border bg-muted/40"
      )}
    >
      <Circle
        className={cn(
          "w-2 h-2",
          state === "current" ? "text-amber-400" : "text-muted-foreground"
        )}
        aria-hidden
      />
    </span>
  );
};

export const ApprovalHistoryDialog = ({
  request,
  open,
  onClose,
}: {
  request: Request | null;
  open: boolean;
  onClose: () => void;
}) => {
  if (!request) return null;
  const flow = buildApprovalFlow(request);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Onay Geçmişi</DialogTitle>
          <DialogDescription>
            {request.no} · {request.project}
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-3">
          {flow.stages.map((s) => {
            const when = fmtStageDate(s.at);
            return (
              <li key={s.key} className="flex gap-3">
                <StageIcon state={s.state} />
                <div className="min-w-0 flex-1">
                  <div className="text-fs-sm text-foreground">{s.label}</div>
                  <div className="text-fs-xs text-muted-foreground">
                    {[s.actor, s.role, when].filter(Boolean).join(" · ") || s.statusLabel}
                  </div>
                  {s.actor && s.statusLabel && s.state !== "pending" && (
                    <div className="text-fs-xs text-muted-foreground">{s.statusLabel}</div>
                  )}
                  {s.note && (
                    <div className="text-fs-xs text-foreground/80 mt-0.5">{s.note}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {!!request.audit?.length && (
          <div className="pt-3 border-t border-border">
            <div className="text-fs-xs uppercase tracking-wide text-muted-foreground mb-1.5">
              İşlem kaydı
            </div>
            <ul className="space-y-1.5">
              {request.audit.map((a, i) => (
                <li key={`${a.at}-${i}`} className="text-fs-xs text-muted-foreground">
                  <span className="text-foreground">{a.event}</span> · {a.actor}
                  {fmtStageDate(a.at) ? ` · ${fmtStageDate(a.at)}` : ""}
                  {a.reason ? ` · ${a.reason}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const ApprovalSummary = ({ request }: { request: Request }) => {
  const [open, setOpen] = useState(false);
  const flow = buildApprovalFlow(request);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={flow.ariaLabel}
        className="w-full mt-3 min-h-[44px] text-left rounded-lg px-1 -mx-1 py-1.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B2B]/40"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
          <span className="text-fs-xs uppercase tracking-wide text-muted-foreground">
            Onay Akışı
          </span>
          {!flow.terminated && (
            <span className="text-fs-xs text-muted-foreground whitespace-nowrap">
              {flow.completed}/{flow.total} tamamlandı
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span
            className={cn(
              "text-fs-sm min-w-0 flex-1",
              flow.rejected || flow.cancelled ? "text-red-400" : "text-foreground"
            )}
          >
            {flow.currentLabel}
            {flow.rejected && request.rejectionReason && (
              <span className="text-muted-foreground"> · Gerekçeyi görüntüle</span>
            )}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
        </div>
        <div
          className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden"
          role="presentation"
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              flow.rejected || flow.cancelled ? "bg-red-500/70" : "bg-emerald-500/70"
            )}
            style={{ width: `${flow.percent}%` }}
          />
        </div>
      </button>

      <ApprovalHistoryDialog request={request} open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default ApprovalSummary;
