import { ArrowDownLeft, ArrowUpRight, FileText, Trash2 } from "lucide-react";
import { MobileSheet } from "@/components/mobile/sheets/MobileSheet";
import { cn } from "@/lib/utils";
import type { MobileMovement } from "./MobileMovementsList";

interface Props {
  movement: MobileMovement | null;
  onClose: () => void;
  fmt: (n: number) => string;
  fmtMoney: (n: number) => string;
  projectName: string;
  canDelete: boolean;
  onDelete: (m: MobileMovement) => void;
  onOpenDocument?: (m: MobileMovement) => void;
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-3 py-2 border-b border-border/50 last:border-0">
    <span className="text-[13px] text-muted-foreground shrink-0">{label}</span>
    <span className="text-[14px] text-foreground text-right">{value}</span>
  </div>
);

/** SPRINT 41B — read-only movement detail sheet, content-driven height. */
export function MovementDetailSheet({
  movement, onClose, fmt, fmtMoney, projectName, canDelete, onDelete, onOpenDocument,
}: Props) {
  const m = movement;
  const isIn = m?.kind === "in";
  return (
    <MobileSheet
      open={!!m}
      onOpenChange={(v) => { if (!v) onClose(); }}
      title={isIn ? "Stok Girişi" : "Stok Çıkışı"}
      description={m ? m.materialName : undefined}
      variant="detail"
    >
      {m && (
        <div className="flex flex-col gap-4 pb-2">
          <div className="rounded-[16px] border border-border/70 bg-background/40 p-4 flex items-center gap-3">
            <span
              className={cn(
                "h-11 w-11 rounded-[13px] flex items-center justify-center shrink-0",
                isIn ? "bg-emerald-500/12 text-emerald-400" : "bg-amber-500/12 text-amber-400",
              )}
            >
              {isIn ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </span>
            <div className="min-w-0">
              <div className={cn("text-[24px] font-semibold leading-none tabular-nums", isIn ? "text-emerald-400" : "text-amber-400")}>
                {isIn ? "+" : "−"}{fmt(m.qty)} <span className="text-[14px] text-muted-foreground font-normal">{m.unit}</span>
              </div>
              <div className="text-[13px] text-muted-foreground mt-1 truncate">{m.materialName}</div>
            </div>
          </div>

          <div className="rounded-[16px] border border-border/70 bg-card px-3.5 py-1.5">
            <Row label="İşlem türü" value={isIn ? "Stok girişi" : "Stok çıkışı"} />
            <Row label={isIn ? "Hedef depo" : "Kaynak depo"} value={projectName} />
            {m.detail && <Row label={isIn ? "Tedarikçi" : "Kullanım yeri"} value={m.detail} />}
            <Row label="Tarih" value={new Date(m.date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })} />
            {typeof m.amount === "number" && m.amount > 0 && <Row label="Tutar" value={fmtMoney(m.amount)} />}
            {m.document && <Row label="İrsaliye no" value={m.document} />}
            {m.sourceType === "site_diary" && <Row label="Kaynak" value="Şantiye Günlüğü" />}
            {m.note && <Row label="Açıklama" value={m.note} />}
          </div>

          <div className="flex flex-col gap-2">
            {m.sourceType === "site_diary" && onOpenDocument && (
              <button
                type="button"
                onClick={() => onOpenDocument(m)}
                className="w-full h-12 rounded-[13px] border border-border text-[15px] font-medium text-foreground flex items-center justify-center gap-2 active:bg-muted"
              >
                <FileText className="w-4 h-4" /> Belgeyi Aç
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(m)}
                className="w-full h-12 rounded-[13px] border border-rose-500/40 text-[15px] font-medium text-rose-400 flex items-center justify-center gap-2 active:bg-rose-500/10"
              >
                <Trash2 className="w-4 h-4" /> Hareketi İptal Et
              </button>
            )}
          </div>
        </div>
      )}
    </MobileSheet>
  );
}

export default MovementDetailSheet;
