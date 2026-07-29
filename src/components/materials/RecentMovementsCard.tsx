// SPRINT 38D — Unified "recent movements" feed.
// Replaces the two side-by-side entry/exit panels with one chronological list,
// so the first screen answers "what moved lately?" in a single glance.

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MovementItem {
  id: string;
  kind: "in" | "out";
  date: string;
  materialName: string;
  unit: string;
  qty: number;
  detail?: string;
  amount?: number;
  onClick?: () => void;
}

interface Props {
  items: MovementItem[];
  fmt: (n: number) => string;
  fmtMoney: (n: number) => string;
}

export const RecentMovementsCard = ({ items, fmt, fmtMoney }: Props) => {
  if (items.length === 0) return null;

  return (
    <section className="rounded-card border border-border/80 bg-card shadow-soft overflow-hidden">
      <header className="px-4 py-3 border-b border-border/60">
        <h3 className="ds-title text-foreground">Son Hareketler</h3>
        <p className="ds-caption text-muted-foreground">Giriş ve çıkışlar, en yeniden eskiye</p>
      </header>
      <div className="divide-y divide-border/60">
        {items.map(m => (
          <div
            key={m.id}
            onClick={m.onClick}
            className={cn(
              "flex items-center justify-between gap-3 px-4 py-2.5 min-w-0",
              m.onClick && "cursor-pointer hover:bg-muted/30 transition-colors"
            )}
            style={{ minHeight: 56 }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {m.kind === "in"
                ? <ArrowDownLeft className="w-4 h-4 shrink-0 text-emerald-300/90" />
                : <ArrowUpRight className="w-4 h-4 shrink-0 text-rose-300/90" />}
              <div className="min-w-0">
                <div className="ds-body text-foreground truncate">{m.materialName}</div>
                <div className="ds-caption text-muted-foreground truncate">
                  {[m.date, m.detail].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={cn("ds-body ds-numeric font-medium", m.kind === "in" ? "text-emerald-300/90" : "text-rose-300/90")}>
                {m.kind === "in" ? "+" : "−"}{fmt(m.qty)} <span className="ds-caption text-muted-foreground">{m.unit}</span>
              </div>
              {!!m.amount && m.amount > 0 && (
                <div className="ds-caption text-muted-foreground">{fmtMoney(m.amount)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecentMovementsCard;
