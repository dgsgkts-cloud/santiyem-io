// DEPO — transfer detay paneli: miktar zinciri, uyuşmazlık ve okunabilir geçmiş.
import { ArrowLeftRight, Clock } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/responsive";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInventoryTransfers, type TransferRow } from "@/hooks/useInventoryTransfers";
import {
  TRANSFER_STATUS_LABEL, TRANSFER_STATUS_TONE, TRANSFER_ACTION_LABEL,
  availableTransferActions, discrepancyTotal, transferProgress,
  type TransferAction, type TransferActor, type TransferStatus,
} from "@/lib/inventory/transferModel";
import { fmtQty, fmtDateTime } from "./inventoryTruth";

const ts = (v: string) => fmtDateTime(new Date(v));

const ACTION_LABEL_TR: Record<string, string> = {
  created: "Talep oluşturuldu",
  approve: "Onaylandı",
  reject: "Reddedildi",
  revise: "Revizyon istendi",
  dispatch: "Sevk edildi",
  receive: "Teslim alındı",
  cancel: "İptal edildi",
  return: "Kaynağa iade edildi",
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-2 py-1.5 border-b border-border/40 last:border-0">
    <span className="ds-caption text-muted-foreground">{label}</span>
    <span className="ds-body text-foreground text-right">{value}</span>
  </div>
);

export const TransferDetailSheet = ({
  transfer, onClose, actor, materialName, sourceName, destName, onAction, onOpenFull,
}: {
  transfer: TransferRow | null;
  onClose: () => void;
  actor: TransferActor;
  materialName: string;
  sourceName: string;
  destName: string;
  onAction: (a: TransferAction, t: TransferRow) => void;
  /** Kanonik detay sayfasını açar — panel yalnızca hızlı önizlemedir. */
  onOpenFull?: (t: TransferRow) => void;
}) => {
  const { eventsFor } = useInventoryTransfers();
  const history = transfer ? eventsFor(transfer.id) : [];
  const actions = transfer ? availableTransferActions(transfer, actor) : [];
  const progress = transfer ? transferProgress(transfer) : null;
  const disc = transfer ? discrepancyTotal(transfer) : 0;

  return (
    <ResponsiveSheet
      open={!!transfer}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title={transfer ? `${transfer.transfer_no} · ${materialName}` : undefined}
      description={transfer ? `${sourceName} → ${destName}` : undefined}
      size="md"
    >
      {transfer && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-fs-xs px-2 py-0.5 rounded-full border",
              TRANSFER_STATUS_TONE[transfer.status as TransferStatus])}>
              {TRANSFER_STATUS_LABEL[transfer.status as TransferStatus] ?? transfer.status}
            </span>
            {progress && (
              <span className="ds-caption text-muted-foreground">{progress.label}</span>
            )}
          </div>

          <section className="rounded-card border border-border/70 bg-background/40 p-3">
            <h3 className="ds-body font-medium text-foreground mb-1.5">Miktar Zinciri</h3>
            <Row label="Talep edilen" value={`${fmtQty(transfer.requested_quantity)} ${transfer.unit}`} />
            <Row label="Sevk edilen" value={`${fmtQty(transfer.dispatched_quantity)} ${transfer.unit}`} />
            <Row label="Yolda" value={`${fmtQty(transfer.in_transit_quantity)} ${transfer.unit}`} />
            <Row label="Teslim alınan" value={`${fmtQty(transfer.received_quantity)} ${transfer.unit}`} />
            {disc > 0 && (
              <Row
                label="Uyuşmazlık (hasar / eksik / red)"
                value={`${fmtQty(transfer.damaged_quantity)} / ${fmtQty(transfer.missing_quantity)} / ${fmtQty(transfer.rejected_quantity)} ${transfer.unit}`}
              />
            )}
            <Row label="Birim maliyet" value={transfer.unit_cost === null ? "Bilinmiyor" : fmtQty(transfer.unit_cost)} />
          </section>

          <section className="rounded-card border border-border/70 bg-background/40 p-3">
            <h3 className="ds-body font-medium text-foreground mb-1.5">Kayıt Bilgileri</h3>
            <Row label="Talep tarihi" value={ts(transfer.requested_at ?? transfer.created_at)} />
            {transfer.required_date && <Row label="İhtiyaç tarihi" value={transfer.required_date} />}
            {transfer.approved_at && <Row label="Onay" value={ts(transfer.approved_at)} />}
            {transfer.dispatched_at && <Row label="Sevk" value={ts(transfer.dispatched_at)} />}
            {transfer.expected_arrival_at && <Row label="Tahmini varış" value={ts(transfer.expected_arrival_at)} />}
            {transfer.received_at && <Row label="Teslim" value={ts(transfer.received_at)} />}
            {transfer.dispatch_reference && <Row label="Sevk belgesi" value={transfer.dispatch_reference} />}
            {transfer.reason && <Row label="Sebep" value={transfer.reason} />}
            {transfer.rejection_reason && <Row label="Red sebebi" value={transfer.rejection_reason} />}
            {transfer.revision_note && <Row label="Revizyon notu" value={transfer.revision_note} />}
            {transfer.cancel_reason && <Row label="İptal sebebi" value={transfer.cancel_reason} />}
            {transfer.discrepancy_note && <Row label="Uyuşmazlık notu" value={transfer.discrepancy_note} />}
          </section>

          <section className="rounded-card border border-border/70 bg-background/40 p-3">
            <h3 className="ds-body font-medium text-foreground mb-2">Geçmiş</h3>
            {history.length === 0 ? (
              <p className="ds-caption text-muted-foreground">Bu transfer için olay kaydı bulunmuyor.</p>
            ) : (
              <ol className="space-y-2.5">
                {history.map((e) => (
                  <li key={e.id} className="flex gap-2.5">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#FF6B2B] shrink-0" />
                    <div className="min-w-0">
                      <p className="ds-body text-foreground">
                        {ACTION_LABEL_TR[e.action] ?? e.action}
                        {typeof e.payload?.quantity === "number" && (
                          <span className="text-muted-foreground">
                            {" "}· {fmtQty(Number(e.payload.quantity))} {transfer.unit}
                          </span>
                        )}
                      </p>
                      <p className="ds-caption text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        {ts(e.created_at)}
                      </p>
                      {e.note && <p className="ds-caption text-muted-foreground mt-0.5">{e.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {onOpenFull && (
            <Button
              variant="outline"
              className="min-h-[44px] w-full sm:w-auto"
              onClick={() => onOpenFull(transfer)}
            >
              Tüm detayları aç
            </Button>
          )}

          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <Button
                  key={a}
                  size="sm"
                  variant={a === "approve" || a === "dispatch" || a === "receive" ? "default" : "outline"}
                  className="min-h-[44px]"
                  onClick={() => onAction(a, transfer)}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />
                  {TRANSFER_ACTION_LABEL[a]}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </ResponsiveSheet>
  );
};

export default TransferDetailSheet;
