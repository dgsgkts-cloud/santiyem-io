// Sprint M1.4 — Detail drawer for requests / orders / suppliers using ResponsiveSheet.
import { ResponsiveSheet } from "@/components/ui/responsive";
import {
  daysFromNow,
  fmtTRY,
  type Order,
  type Request,
  type Supplier,
} from "./procurementConstants";
import { StatusPill } from "./procurementUi";

export type ProcurementDetail =
  | { kind: "request"; item: Request }
  | { kind: "order"; item: Order }
  | { kind: "supplier"; item: Supplier }
  | null;

interface Props {
  detail: ProcurementDetail;
  onClose: () => void;
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 py-2 border-b border-border/60 last:border-0">
    <span className="text-fs-xs uppercase text-muted-foreground tracking-wide">
      {label}
    </span>
    <span className="text-fs-sm text-foreground text-right min-w-0 truncate">
      {value}
    </span>
  </div>
);

export const ProcurementDetailSheet = ({ detail, onClose }: Props) => {
  const open = !!detail;

  const title =
    detail?.kind === "request"
      ? detail.item.no
      : detail?.kind === "order"
      ? detail.item.no
      : detail?.kind === "supplier"
      ? detail.item.name
      : "";

  const subtitle =
    detail?.kind === "request"
      ? `${detail.item.category} · ${detail.item.project}`
      : detail?.kind === "order"
      ? `${detail.item.supplier} · ${detail.item.project}`
      : detail?.kind === "supplier"
      ? `${detail.item.category} · ${detail.item.orders} sipariş`
      : "";

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={title}
      description={subtitle}
      size="md"
    >
      {detail?.kind === "request" && (
        <div className="space-y-1">
          <Row label="Durum" value={<StatusPill status={detail.item.status} />} />
          <Row label="Öncelik" value={detail.item.priority} />
          <Row label="Bütçe" value={fmtTRY(detail.item.budget)} />
          <Row
            label="İhtiyaç"
            value={
              detail.item.needBy < 0
                ? `${-detail.item.needBy}g gecikme`
                : daysFromNow(detail.item.needBy)
            }
          />
          <Row label="Talep Eden" value={detail.item.requester} />
        </div>
      )}

      {detail?.kind === "order" && (
        <div className="space-y-1">
          <Row label="Tutar" value={fmtTRY(detail.item.amount)} />
          <Row
            label="Ödeme"
            value={detail.item.paid ? "Ödendi" : "Bekliyor"}
          />
          <Row
            label="Teslim"
            value={<StatusPill status={detail.item.delivery} />}
          />
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
