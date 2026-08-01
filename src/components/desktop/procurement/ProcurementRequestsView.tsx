// Sprint M1.4 — Purchase Requests: search + status filter + responsive grid.
// Actions are status-based and wired to the workflow mutation layer.
import { useState } from "react";
import { Building2, Building2 as Bldg, CheckCircle2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsiveGrid } from "@/components/ui/responsive";
import { STATUSES, daysFromNow, fmtTRY, type Request } from "./procurementConstants";
import { PriorityDot, StatusPill } from "./procurementUi";
import { RequestActionBar } from "./RequestActionBar";
import type { WorkflowAction } from "./procurementWorkflow";
import type { RequestWorkflow } from "./useRequestWorkflow";

interface Props {
  workflow: RequestWorkflow;
  onAction: (action: WorkflowAction, request: Request) => void;
}

const ApprovalTimeline = ({ stage }: { stage: number }) => {
  const steps = ["Talep", "Yönetici", "Finans", "Direktör", "Onay"];
  return (
    <div className="flex items-center gap-1 mt-3">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-1 min-w-0">
          <div
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-fs-xs font-semibold shrink-0",
              i <= stage
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "bg-muted/40 text-muted-foreground border border-border"
            )}
          >
            {i <= stage ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
          </div>
          <span className="text-fs-xs text-muted-foreground hidden md:inline truncate">
            {s}
          </span>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "flex-1 h-px",
                i < stage ? "bg-emerald-500/40" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export const ProcurementRequestsView = ({ workflow, onAction }: Props) => {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const requests = workflow.requests;
  const matchesQuery = (r: Request) =>
    q === "" ||
    r.no.toLowerCase().includes(q.toLowerCase()) ||
    r.project.toLowerCase().includes(q.toLowerCase());
  const filtered = requests.filter(
    (r) => (status === "all" || r.status === status) && matchesQuery(r)
  );
  const countFor = (s: string) =>
    requests.filter((r) => (s === "all" || r.status === s) && matchesQuery(r)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Talep ara…"
            aria-label="Talep ara"
            className="w-full min-h-[40px] pl-9 pr-3 py-2 text-fs-sm rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF6B2B]/50"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 border border-border p-0.5 overflow-x-auto no-scrollbar max-w-full">
          {["all", ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
              className={cn(
                "min-h-[32px] px-2.5 py-1 text-fs-xs rounded-md transition-colors whitespace-nowrap",
                status === s
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              {s === "all" ? "Tümü" : s}
              <span className="ml-1 text-muted-foreground">{countFor(s)}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Bldg className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
          <div className="text-fs-sm text-foreground">Bu filtreye uygun talep yok</div>
          <div className="text-fs-xs text-muted-foreground mt-1">
            Filtreyi değiştirin veya yeni bir satın alma talebi oluşturun.
          </div>
        </div>
      )}

      <ResponsiveGrid variant="auto" minItemWidth={280} className="gap-3">
        {filtered.map((r) => (
          <div
            key={r.id}
            className="group rounded-xl border border-border bg-card hover:border-[#FF6B2B]/30 hover:bg-muted/40 transition-all p-4"
          >
            <div className="flex items-start justify-between mb-2 gap-2">
              <button
                onClick={() => onAction("detail", r)}
                className="text-left min-w-0 flex-1"
                aria-label={`${r.no} detayını aç`}
              >
                <div className="flex items-center gap-2 text-fs-xs text-muted-foreground font-mono truncate">
                  {r.no}
                </div>
                <div className="text-foreground text-fs-sm font-semibold mt-0.5 flex items-center gap-2 truncate">
                  <PriorityDot p={r.priority} /> {r.category}
                </div>
              </button>
              <StatusPill
                status={r.status}
                label={approvalStatusLabel({
                  status: r.status,
                  approverName: r.approverName,
                  approverRoleLabel: r.approverRole,
                })}
              />

            </div>
            <div className="flex items-center gap-2 text-fs-xs text-muted-foreground mb-2 min-w-0">
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{r.project}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 py-2 border-y border-border">
              <div className="min-w-0">
                <div className="text-fs-xs text-muted-foreground uppercase">Bütçe</div>
                <div className="text-fs-xs text-foreground font-medium truncate">
                  {fmtTRY(r.budget)}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-fs-xs text-muted-foreground uppercase">İhtiyaç</div>
                <div
                  className={cn(
                    "text-fs-xs font-medium truncate",
                    r.needBy < 0
                      ? "text-red-400"
                      : r.needBy < 5
                      ? "text-amber-400"
                      : "text-foreground"
                  )}
                >
                  {r.needBy < 0 ? `${-r.needBy}g gecikme` : daysFromNow(r.needBy)}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-fs-xs text-muted-foreground uppercase">Talep</div>
                <div className="text-fs-xs text-foreground font-medium truncate">
                  {r.requester}
                </div>
              </div>
            </div>
            <ApprovalTimeline stage={r.approvalStage} />
            {r.rejectionReason && (
              <div className="mt-2 text-fs-xs text-red-400">
                Red nedeni: {r.rejectionReason}
              </div>
            )}
            {r.rfq && (
              <div className="mt-2 text-fs-xs text-muted-foreground">
                {r.rfq.no} · {r.rfq.sentAt ? "tedarikçilere iletildi" : "hazırlandı"}
              </div>
            )}
            <RequestActionBar request={r} workflow={workflow} onAction={onAction} />
          </div>
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export default ProcurementRequestsView;
