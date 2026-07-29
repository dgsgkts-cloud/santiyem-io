// SPRINT 38D — One shared stock-status language for Materials & Warehouse.
// Presentation only: derives a status from already-computed stock numbers and
// maps it to premium, low-saturation visual tokens. No backend logic here.

export type StockStatus = "healthy" | "low" | "critical" | "out";

export interface StatusMeta {
  key: StockStatus;
  label: string;
  /** Small dot / progress fill. */
  dot: string;
  /** Subtle pill: soft tint, soft border, readable text. */
  pill: string;
  /** Text-only accent for numbers. */
  text: string;
}

export const STOCK_STATUS_META: Record<StockStatus, StatusMeta> = {
  healthy: {
    key: "healthy",
    label: "Sağlıklı",
    dot: "bg-emerald-400/80",
    pill: "bg-emerald-500/[0.08] text-emerald-300/90 border-emerald-500/20",
    text: "text-foreground",
  },
  low: {
    key: "low",
    label: "Düşük",
    dot: "bg-amber-400/80",
    pill: "bg-amber-500/[0.08] text-amber-300/90 border-amber-500/20",
    text: "text-amber-300/90",
  },
  critical: {
    key: "critical",
    label: "Kritik",
    dot: "bg-rose-400/80",
    pill: "bg-rose-500/[0.08] text-rose-300/90 border-rose-500/20",
    text: "text-rose-300/90",
  },
  out: {
    key: "out",
    label: "Stok Yok",
    dot: "bg-muted-foreground/50",
    pill: "bg-muted/60 text-muted-foreground border-border/70",
    text: "text-muted-foreground",
  },
};

/** Derive status from current stock vs. its minimum threshold. */
export const getStockStatus = (current: number, min: number): StockStatus => {
  if (current <= 0) return "out";
  if (min > 0 && current <= min * 0.5) return "critical";
  if (min > 0 && current < min) return "low";
  return "healthy";
};

/** 0–100 fill for the thin stock bar (min level = 50% of the track). */
export const getStockFill = (current: number, min: number): number => {
  if (current <= 0) return 0;
  const target = min > 0 ? min * 2 : current;
  return Math.max(4, Math.min(100, (current / target) * 100));
};
