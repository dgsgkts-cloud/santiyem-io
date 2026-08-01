// Sprint M1.4 — Detail drawer for requests / orders / suppliers using ResponsiveSheet.
// Request detail includes items, approval/rejection history, linked RFQ & order,
// a not-found state for invalid ids and the same status-based actions as the card.
import { ResponsiveSheet } from "@/components/ui/responsive";
import {
  daysFromNow,
  fmtTRY,
  type Order,
  type Request,
  type Supplier,
} from "./procurementConstants";
import { StatusPill } from "./procurementUi";
import { approvalStatusLabel } from "./approvalPolicy";
import { RequestActionBar } from "./RequestActionBar";
import type { WorkflowAction } from "./procurementWorkflow";
import type { RequestWorkflow } from "./useRequestWorkflow";

export type ProcurementDetail =
  | { kind: "request"; item: Request | null }
  | { kind: "order"; item: Order }
  | { kind: "supplier"; item: Supplier }
  | null;

interface Props {
  detail: ProcurementDetail;
  onClose: () => void;
  workflow?: RequestWorkflow;
  onAction?: (action: WorkflowAction, request: Request) => void;
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 py-2 border-b border-border/60 last:border-0">
    <span className="text-fs-xs uppercase text-muted-foreground tracking-wide">
      {label}
    </span>
    <span className="text-fs-sm text-foreground text-right min-w-0">{value}</span>
  </div>
);

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : "—";

export const ProcurementDetailSheet = ({
  detail,
  onClose,
  workflow,
  onAction,
}: Props) => {
  const open = !!detail;
  const missingRequest = detail?.kind === "request" && !detail.item;

  const title = missingRequest
    ? "Talep bulunamadı"
    : detail?.kind === "request"
    ? detail.item!.no
    : detail?.kind === "order"
    ? detail.item.no
    : detail?.kind === "supplier"
    ? detail.item.name
    : "";

  const subtitle = missingRequest
    ? "Bu talep kaydına ulaşılamadı."
    : detail?.kind === "request"
    ? `${detail.item!.category} · ${detail.item!.project}`
    : detail?.kind === "order"
    ? `${detail.item.supplier} · ${detail.item.project}`
    : detail?.kind === "supplier"
    ? `${detail.item.category} · ${detail.item.orders} sipariş`
    : "";

  const req = detail?.kind === "request" ? detail.item : null;

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={title}
      description={subtitle}
      size="md"
    >
      {missingRequest && (
        <div className="py-6 text-center">
          <div className="text-fs-sm text-foreground">Bu talep artık mevcut değil</div>
          <div className="text-fs-xs text-muted-foreground mt-1">
            Kayıt silinmiş veya bağlantı geçersiz olabilir.
          </div>
        </div>
      )}

      {req && (
        <div className="space-y-4">
          <div className="space-y-1">
            <Row
              label="Durum"
              value={
                <StatusPill
                  status={req.status}
                  label={approvalStatusLabel({
                    status: req.status,
                    approverName: req.approverName,
                    approverRoleLabel: req.approverRole,
                  })}
                />
              }
            />
            <Row label="Proje" value={req.project} />
            <Row label="Talep Eden" value={req.requester} />
            <Row label="Öncelik" value={req.priority} />
            <Row label="Bütçe" value={fmtTRY(req.budget)} />
            <Row
              label="İhtiyaç Tarihi"
              value={req.needBy < 0 ? `${-req.needBy}g gecikme` : daysFromNow(req.needBy)}
            />
            <Row label="Teslim Yeri" value={req.deliveryLocation ?? "—"} />
            <Row label="Departman / Masraf Yeri" value={req.department ?? "—"} />
            <Row label="Açıklama" value={req.description ?? "—"} />
            <Row label="Notlar" value={req.notes ?? "—"} />
            {req.revisionOfNo && (
              <Row label="Kaynak Talep" value={`${req.revisionOfNo} · R${req.revisionNo}`} />
            )}
            {req.updatedAt && (
              <Row
                label="Son Güncelleme"
                value={`${fmtDate(req.updatedAt)}${req.updatedBy ? ` · ${req.updatedBy}` : ""}`}
              />
            )}
            {!!req.attachments?.length && (
              <Row
                label="Ekler"
                value={
                  <span className="flex flex-col items-end gap-0.5">
                    {req.attachments.map((a) =>
                      a.url ? (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-[#FF6B2B]"
                        >
                          {a.name}
                        </a>
                      ) : (
                        <span key={a.id}>{a.name}</span>
                      )
                    )}
                  </span>
                }
              />
            )}
          </div>

          <div>
            <div className="text-fs-xs uppercase text-muted-foreground mb-1.5">Kalemler</div>
            <div className="rounded-lg border border-border divide-y divide-border/60">
              {(req.items ?? []).map((it) => (
                <div key={it.name} className="p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-fs-sm text-foreground">{it.name}</div>
                    {it.spec && (
                      <div className="text-fs-xs text-muted-foreground">{it.spec}</div>
                    )}
                  </div>
                  <div className="text-fs-sm text-foreground whitespace-nowrap">
                    {it.qty} {it.unit}
                  </div>
                </div>
              ))}
              {!req.items?.length && (
                <div className="p-3 text-fs-xs text-muted-foreground">Kalem bilgisi yok</div>
              )}
            </div>
          </div>

          {(req.submittedForApprovalAt || req.approverName) && (
            <div>
              <div className="text-fs-xs uppercase text-muted-foreground mb-1.5">Onay</div>
              <div className="space-y-1">
                <Row label="Gönderen" value={req.submittedForApprovalBy ?? req.requester} />
                <Row label="Gönderim Tarihi" value={fmtDate(req.submittedForApprovalAt)} />
                <Row
                  label="Onaylayıcı"
                  value={
                    req.approverName
                      ? `${req.approverName}${req.approverRole ? ` · ${req.approverRole}` : ""}`
                      : req.approverRole ?? "—"
                  }
                />
                <Row
                  label="Onay Durumu"
                  value={approvalStatusLabel({
                    status: req.status,
                    approverName: req.approverName,
                    approverRoleLabel: req.approverRole,
                  })}
                />
                <Row
                  label="Son Tarih"
                  value={
                    req.approvalDueAt
                      ? new Date(req.approvalDueAt).toLocaleDateString("tr-TR")
                      : "—"
                  }
                />
                <Row label="Not" value={req.approvalNote ?? "—"} />
                {req.approvalWithdrawnAt && (
                  <Row
                    label="Onaydan Geri Çekildi"
                    value={`${fmtDate(req.approvalWithdrawnAt)}${
                      req.approvalWithdrawnBy ? ` · ${req.approvalWithdrawnBy}` : ""
                    }`}
                  />
                )}
              </div>
            </div>
          )}

          {(req.approvedAt || req.rejectedAt) && (
            <div className="space-y-1">
              {req.approvedAt && (
                <>
                  <Row label="Onaylayan" value={req.approvedBy ?? "—"} />
                  <Row label="Onay Tarihi" value={fmtDate(req.approvedAt)} />
                </>
              )}
              {req.rejectedAt && (
                <>
                  <Row label="Reddeden" value={req.rejectedBy ?? "—"} />
                  <Row label="Red Tarihi" value={fmtDate(req.rejectedAt)} />
                  <Row label="Red Nedeni" value={req.rejectionReason ?? "—"} />
                  {req.rejectionNote && <Row label="Red Notu" value={req.rejectionNote} />}
                </>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Row
              label="Bağlı RFQ"
              value={
                req.rfq
                  ? `${req.rfq.no} · ${req.rfq.suppliers.length} tedarikçi · son tarih ${req.rfq.deadline}${
                      req.rfq.sentAt ? " · iletildi" : " · hazırlandı"
                    }`
                  : "—"
              }
            />
            <Row label="Bağlı Sipariş" value={req.orderNo ?? "—"} />
          </div>

          <div>
            <div className="text-fs-xs uppercase text-muted-foreground mb-1.5">
              İşlem Geçmişi
            </div>
            <ol className="space-y-2">
              {(req.audit ?? []).map((a, i) => (
                <li key={`${a.at}-${i}`} className="text-fs-xs text-muted-foreground">
                  <span className="text-foreground">{a.event}</span>
                  {a.from && a.to && ` · ${a.from} → ${a.to}`}
                  {a.reason && ` · ${a.reason}`}
                  <div>
                    {a.actor} · {fmtDate(a.at)}
                  </div>
                </li>
              ))}
              {!req.audit?.length && <li className="text-fs-xs text-muted-foreground">—</li>}
            </ol>
          </div>

          {workflow && onAction && (
            <RequestActionBar request={req} workflow={workflow} onAction={onAction} />
          )}
        </div>
      )}

      {detail?.kind === "order" && (
        <div className="space-y-1">
          <Row label="Tutar" value={fmtTRY(detail.item.amount)} />
          <Row label="Ödeme" value={detail.item.paid ? "Ödendi" : "Bekliyor"} />
          <Row label="Teslim" value={<StatusPill status={detail.item.delivery} />} />
          <Row
            label="ETA"
            value={
              detail.item.eta < 0
                ? `${-detail.item.eta}g gecikme`
                : daysFromNow(detail.item.eta)
            }
          />
          <Row label="Kategori" value={detail.item.category} />
        </div>
      )}

      {detail?.kind === "supplier" && (
        <div className="space-y-1">
          <Row label="Genel Puan" value={detail.item.score} />
          <Row label="Teslimat" value={detail.item.delivery} />
          <Row label="Kalite" value={detail.item.quality} />
          <Row label="Fiyat" value={detail.item.price} />
          <Row label="Yanıt" value={detail.item.response} />
          <Row label="Ödeme" value={detail.item.payment} />
          <Row label="Toplam Ciro" value={fmtTRY(detail.item.totalSpend)} />
        </div>
      )}
    </ResponsiveSheet>
  );
};

export default ProcurementDetailSheet;
