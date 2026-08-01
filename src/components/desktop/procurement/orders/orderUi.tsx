// Satın Alma → Siparişler: shared UI atoms.
import { cn } from "@/lib/utils";
import {
  fmtMoney,
  type DeliveryStatus,
  type InvoiceStatus,
  type OrderStatus,
  type PaymentStatus,
} from "./orderModel";

const TONE = {
  neutral: "bg-muted/60 text-muted-foreground border-border",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
  ember: "bg-[#FF6B2B]/10 text-[#FF6B2B] border-[#FF6B2B]/25",
} as const;

type Tone = keyof typeof TONE;

const ORDER_TONE: Record<OrderStatus, Tone> = {
  Taslak: "neutral",
  "Onay Bekliyor": "amber",
  Onaylandı: "green",
  "Tedarikçiye Gönderildi": "blue",
  Hazırlanıyor: "ember",
  "Kısmi Teslimat": "cyan",
  Tamamlandı: "green",
  İptal: "red",
};

const PAYMENT_TONE: Record<PaymentStatus, Tone> = {
  Planlanmadı: "neutral",
  "Ödeme Planlandı": "blue",
  "Kısmen Ödendi": "amber",
  Ödendi: "green",
  Gecikmiş: "red",
  İptal: "neutral",
};

const DELIVERY_TONE: Record<DeliveryStatus, Tone> = {
  Planlanmadı: "neutral",
  Hazırlanıyor: "amber",
  Yolda: "blue",
  "Kısmi Teslim": "cyan",
  Şantiyede: "cyan",
  "Teslim Edildi": "green",
  İade: "red",
  İptal: "neutral",
};

const INVOICE_TONE: Record<InvoiceStatus, Tone> = {
  "Fatura Bekleniyor": "neutral",
  "Fatura Geldi": "blue",
  "Kontrol Ediliyor": "amber",
  Eşleştirildi: "green",
  İtirazlı: "red",
  Ödendi: "green",
};

const Pill = ({
  tone,
  children,
  prefix,
}: {
  tone: Tone;
  children: React.ReactNode;
  prefix?: string;
}) => (
  <span
    className={cn(
      "text-fs-xs px-2 py-0.5 rounded-full border whitespace-nowrap inline-flex items-center gap-1",
      TONE[tone]
    )}
  >
    {prefix && <span className="opacity-60">{prefix}</span>}
    {children}
  </span>
);

export const OrderStatusPill = ({ status }: { status: OrderStatus }) => (
  <Pill tone={ORDER_TONE[status] ?? "neutral"}>{status}</Pill>
);
export const PaymentStatusPill = ({ status }: { status: PaymentStatus }) => (
  <Pill tone={PAYMENT_TONE[status] ?? "neutral"} prefix="Ödeme">
    {status}
  </Pill>
);
export const DeliveryStatusPill = ({ status }: { status: DeliveryStatus }) => (
  <Pill tone={DELIVERY_TONE[status] ?? "neutral"} prefix="Teslimat">
    {status}
  </Pill>
);
export const InvoiceStatusPill = ({ status }: { status: InvoiceStatus }) => (
  <Pill tone={INVOICE_TONE[status] ?? "neutral"} prefix="Fatura">
    {status}
  </Pill>
);

/** Paid / remaining bar — 4px, calm, color coded. */
export const PaymentProgress = ({
  paid,
  total,
  currency = "TRY",
  overdue,
}: {
  paid: number;
  total: number;
  currency?: string;
  overdue?: boolean;
}) => {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-fs-xs">
        <span className="text-muted-foreground">
          Ödenen{" "}
          <span className="text-foreground font-medium">
            {fmtMoney(paid, currency)}
          </span>
        </span>
        <span className={overdue ? "text-red-400" : "text-muted-foreground"}>
          Kalan{" "}
          <span
            className={cn(
              "font-medium",
              overdue ? "text-red-400" : "text-foreground"
            )}
          >
            {fmtMoney(Math.max(total - paid, 0), currency)}
          </span>
        </span>
      </div>
      <div
        className="h-1 rounded-full bg-muted/60 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Ödeme oranı"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            overdue ? "bg-red-500" : pct >= 100 ? "bg-emerald-500" : "bg-[#FF6B2B]"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export const MetaRow = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "danger" | "success";
}) => (
  <div className="flex items-center justify-between gap-3 text-fs-xs py-1">
    <span className="text-muted-foreground">{label}</span>
    <span
      className={cn(
        "font-medium text-right",
        tone === "danger"
          ? "text-red-400"
          : tone === "success"
          ? "text-emerald-400"
          : "text-foreground"
      )}
    >
      {value}
    </span>
  </div>
);

export const OrderCardSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-pulse">
    <div className="h-3 w-24 bg-muted/70 rounded" />
    <div className="h-4 w-40 bg-muted/60 rounded" />
    <div className="h-1 w-full bg-muted/50 rounded" />
    <div className="flex gap-2">
      <div className="h-8 flex-1 bg-muted/50 rounded-md" />
      <div className="h-8 flex-1 bg-muted/40 rounded-md" />
    </div>
  </div>
);
