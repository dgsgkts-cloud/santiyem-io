// Sprint M1.4 — Procurement shared UI atoms (pills, dots, score chip).
// Semantic tokens only; brand ember + status colors preserved per rules.
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  Taslak: "bg-muted/60 text-muted-foreground border-border",
  "Onay Bekliyor":
    "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Onaylandı: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Sipariş Verildi":
    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  İptal: "bg-red-500/10 text-red-400 border-red-500/20",
  "Teslim Edildi":
    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Yolda: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Şantiyede: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Hazırlanıyor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Sipariş: "bg-muted/60 text-muted-foreground border-border",
  Gecikti: "bg-red-500/10 text-red-400 border-red-500/20",
};

export const StatusPill = ({
  status,
  label,
}: {
  status: string;
  /** optional display override (e.g. "Doğuş Göktaş'ın Onayında") */
  label?: string;
}) => (
  <span
    className={cn(
      "text-fs-xs px-2 py-0.5 rounded-full border whitespace-nowrap",
      STATUS_CLASS[status] ||
        "bg-muted/60 text-muted-foreground border-border"
    )}
  >
    {label || status}
  </span>
);


export const PriorityDot = ({ p }: { p: string }) => {
  const color =
    p === "Yüksek"
      ? "bg-red-400"
      : p === "Orta"
      ? "bg-amber-400"
      : "bg-emerald-400";
  return <span className={cn("inline-block w-1.5 h-1.5 rounded-full", color)} />;
};

export const ScoreRing = ({ score }: { score: number }) => {
  const color =
    score >= 85
      ? "text-emerald-400"
      : score >= 70
      ? "text-amber-400"
      : "text-red-400";
  return <span className={cn("text-fs-sm font-semibold", color)}>{score}</span>;
};
