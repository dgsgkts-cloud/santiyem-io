// DEPO — Transferler. Gerçek kayıtlar: talep → onay → sevk → teslim.
// Kayıt yoksa hiçbir şey uydurulmaz; akış açıklaması gösterilir.
import { useMemo, useState } from "react";
import { ArrowLeftRight, Plus, Search } from "lucide-react";
import { SectionCard } from "@/components/ui/responsive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { useInventoryTransfers, type TransferRow } from "@/hooks/useInventoryTransfers";
import { useDepotPermissions } from "@/hooks/useDepotPermissions";
import {
  TRANSFER_STAGES, TRANSFER_STATUS_LABEL, TRANSFER_STATUS_TONE, TRANSFER_ACTION_LABEL,
  availableTransferActions, transferProgress, type TransferAction, type TransferActor,
  type TransferStatus,
} from "@/lib/inventory/transferModel";
import type { WarehouseData } from "../useWarehouseData";
import { InsufficientData } from "../warehouseUi";
import { TRUTH_COPY, fmtQty } from "../inventoryTruth";
import { CreateTransferDialog, TransferActionDialog } from "../TransferDialogs";
import { TransferDetailSheet } from "../TransferDetailSheet";

interface Props { data: WarehouseData }

const FILTERS: { key: "all" | "open" | "pending" | "transit" | "closed"; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "open", label: "Açık" },
  { key: "pending", label: "Onay Bekleyen" },
  { key: "transit", label: "Yolda" },
  { key: "closed", label: "Kapanan" },
];

export const TransfersView = ({ data }: Props) => {
  const { user } = useUser();
  const { transfers, isLoading } = useInventoryTransfers();
  const { permissions } = useDepotPermissions();
  const [filter, setFilter] = useState<typeof FILTERS[number]["key"]>("all");
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<TransferRow | null>(null);
  const [action, setAction] = useState<{ a: TransferAction; t: TransferRow } | null>(null);

  const actor: TransferActor = {
    userId: user?.id ?? null,
    isOwner: permissions.approve_transfer && permissions.override_safety_stock,
    permissions,
  };

  const nameOfMaterial = (id: string) => data.items.find((i) => i.id === id)?.name ?? "—";
  const nameOfWarehouse = (id: string) => data.warehouses.find((w) => w.id === id)?.name ?? "—";

  const rows = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    return transfers.filter((t) => {
      const st = t.status;
      if (filter === "pending" && !["requested", "pending_approval"].includes(st)) return false;
      if (filter === "transit" && t.in_transit_quantity <= 0) return false;
      if (filter === "open" && ["received", "rejected", "cancelled"].includes(st)) return false;
      if (filter === "closed" && !["received", "rejected", "cancelled", "discrepancy"].includes(st)) return false;
      if (!needle) return true;
      return [t.transfer_no, nameOfMaterial(t.material_id), nameOfWarehouse(t.source_warehouse_id),
        nameOfWarehouse(t.dest_warehouse_id)]
        .join(" ").toLocaleLowerCase("tr").includes(needle);
    });
  }, [transfers, filter, q, data.items, data.warehouses]);

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Transfer no, malzeme veya depo ara"
          className="pl-8 min-h-[44px] text-base sm:text-fs-sm"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-2.5 h-9 rounded-pill ds-caption border transition-colors",
              filter === f.key
                ? "border-[#FF6B2B]/40 bg-[#FF6B2B]/[0.10] text-[#FF6B2B]"
                : "border-border/70 bg-card text-muted-foreground hover:bg-muted/25",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {permissions.create_transfer && (
        <Button onClick={() => setCreateOpen(true)} className="min-h-[44px]">
          <Plus className="w-4 h-4 mr-1.5" /> Yeni Transfer
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {header}

      {isLoading ? (
        <InsufficientData icon={ArrowLeftRight} title="Transfer kayıtları yükleniyor." />
      ) : transfers.length === 0 ? (
        <div className="space-y-3">
          <InsufficientData
            icon={ArrowLeftRight}
            title={TRUTH_COPY.noTransfers}
            hint="Yeni Transfer ile talep oluşturduğunuzda akış burada takip edilir."
          />
          <SectionCard title="Transfer Akışı" subtitle="Kayıt oluşturulduğunda izlenecek durumlar">
            <ol className="flex items-center gap-2 flex-wrap">
              {TRANSFER_STAGES.map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="px-2.5 h-8 inline-flex items-center rounded-pill ds-caption border border-border/70 bg-card text-muted-foreground">
                    {i + 1}. {s}
                  </span>
                  {i < TRANSFER_STAGES.length - 1 && <span className="text-muted-foreground">→</span>}
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      ) : rows.length === 0 ? (
        <InsufficientData icon={Search} title="Bu filtreye uyan transfer bulunmuyor." />
      ) : (
        <div className="space-y-2">
          {rows.map((t) => {
            const p = transferProgress(t);
            const acts = availableTransferActions(t, actor);
            return (
              <article
                key={t.id}
                className="rounded-card border border-border/60 bg-background/40 hover:bg-muted/20 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setDetail(t)}
                  className="w-full text-left p-3 space-y-2"
                  style={{ minHeight: 68 }}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="ds-body text-foreground truncate">
                        {nameOfMaterial(t.material_id)}
                        <span className="text-muted-foreground"> · {fmtQty(t.requested_quantity)} {t.unit}</span>
                      </p>
                      <p className="ds-caption text-muted-foreground truncate">
                        {t.transfer_no} · {nameOfWarehouse(t.source_warehouse_id)} → {nameOfWarehouse(t.dest_warehouse_id)}
                      </p>
                    </div>
                    <span className={cn("text-fs-xs px-2 py-0.5 rounded-full border shrink-0",
                      TRANSFER_STATUS_TONE[t.status as TransferStatus])}>
                      {TRANSFER_STATUS_LABEL[t.status as TransferStatus] ?? t.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="ds-caption text-muted-foreground">Transfer Akışı</span>
                      <span className="ds-caption text-muted-foreground">{p.label}</span>
                    </div>
                    <div className="h-[5px] w-full rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all",
                          p.failed ? "bg-rose-400/80" : "bg-emerald-400/80")}
                        style={{ width: `${Math.round(p.ratio * 100)}%` }}
                      />
                    </div>
                    {t.in_transit_quantity > 0 && (
                      <p className="ds-caption text-indigo-300/90">
                        Yolda: {fmtQty(t.in_transit_quantity)} {t.unit}
                      </p>
                    )}
                  </div>
                </button>
                {acts.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-3 pb-3">
                    {acts.map((a) => (
                      <Button
                        key={a}
                        size="sm"
                        variant={a === "approve" || a === "dispatch" || a === "receive" ? "default" : "outline"}
                        className="min-h-[40px]"
                        onClick={() => setAction({ a, t })}
                      >
                        {TRANSFER_ACTION_LABEL[a]}
                      </Button>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <CreateTransferDialog open={createOpen} onClose={() => setCreateOpen(false)} data={data} />
      <TransferActionDialog
        action={action?.a ?? null}
        transfer={action?.t ?? null}
        materialName={action ? nameOfMaterial(action.t.material_id) : ""}
        onClose={() => setAction(null)}
      />
      <TransferDetailSheet
        transfer={detail}
        onClose={() => setDetail(null)}
        actor={actor}
        materialName={detail ? nameOfMaterial(detail.material_id) : ""}
        sourceName={detail ? nameOfWarehouse(detail.source_warehouse_id) : ""}
        destName={detail ? nameOfWarehouse(detail.dest_warehouse_id) : ""}
        onAction={(a, t) => { setDetail(null); setAction({ a, t }); }}
      />
    </div>
  );
};

export default TransfersView;
