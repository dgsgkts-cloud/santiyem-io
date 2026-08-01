// RFQ shared UI atoms: status pills, badges, score chip, skeletons.
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuotationStatus, RfqStatus } from "./rfqModel";

const RFQ_STATUS_CLASS: Record<RfqStatus, string> = {
  Taslak: "bg-muted/60 text-muted-foreground border-border",
  "Tedarikçilere Gönderildi": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Teklifler Bekleniyor": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Karşılaştırma Aşamasında": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Tedarikçi Seçildi": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Siparişe Dönüştürüldü": "bg-[#FF6B2B]/15 text-[#FF6B2B] border-[#FF6B2B]/30",
  İptal: "bg-red-500/10 text-red-400 border-red-500/20",
};

const QUOTE_STATUS_CLASS: Record<QuotationStatus, string> = {
  "Davet Edildi": "bg-muted/60 text-muted-foreground border-border",
  Görüntülendi: "bg-muted/60 text-foreground/70 border-border",
  "Teklif Bekleniyor": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Teklif Geldi": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Revizyon İstendi": "bg-purple-500/10 text-purple-300 border-purple-500/20",
  "Revize Teklif Geldi": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "Süresi Geçti": "bg-red-500/10 text-red-400 border-red-500/20",
  Reddedildi: "bg-red-500/10 text-red-400 border-red-500/20",
  Seçildi: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export const RfqStatusPill = ({ status }: { status: RfqStatus }) => (
  <span
    className={cn(
      "text-fs-xs px-2 py-0.5 rounded-full border whitespace-nowrap",
      RFQ_STATUS_CLASS[status]
    )}
  >
    {status}
  </span>
);

export const QuoteStatusPill = ({ status }: { status: QuotationStatus }) => (
  <span
    className={cn(
      "text-fs-xs px-2 py-0.5 rounded-full border whitespace-nowrap",
      QUOTE_STATUS_CLASS[status]
    )}
  >
    {status}
  </span>
);

/** Restrained "best of" marker — text label, never colour alone. */
export const BestBadge = ({ label }: { label: string }) => (
  <span className="text-fs-xs px-1.5 py-0.5 rounded border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 whitespace-nowrap">
    {label}
  </span>
);

export const ScoreChip = ({
  score,
  onExplain,
  supplierName,
}: {
  score: number | null;
  onExplain?: () => void;
  supplierName?: string;
}) => {
  if (score === null) return <span className="text-muted-foreground">—</span>;
  const tone =
    score >= 85 ? "text-emerald-400" : score >= 70 ? "text-amber-400" : "text-red-400";
  if (!onExplain)
    return <span className={cn("text-fs-sm font-semibold", tone)}>{score}</span>;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onExplain();
      }}
      aria-label={`${supplierName ?? "Tedarikçi"} puan dökümünü aç. Toplam puan ${score}.`}
      className="inline-flex items-center gap-1 min-h-[32px] px-1.5 rounded-md hover:bg-muted/60"
    >
      <span className={cn("text-fs-sm font-semibold", tone)}>{score}</span>
      <Info className="w-3 h-3 text-muted-foreground" aria-hidden />
    </button>
  );
};

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-2" role="status" aria-label="Teklifler yükleniyor">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="h-11 rounded-lg bg-muted/40 animate-pulse border border-border/40"
      />
    ))}
  </div>
);

export const MetaItem = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="min-w-0">
    <div className="text-fs-xs uppercase tracking-wide text-muted-foreground truncate">
      {label}
    </div>
    <div className="text-fs-sm text-foreground truncate">{value}</div>
  </div>
);
