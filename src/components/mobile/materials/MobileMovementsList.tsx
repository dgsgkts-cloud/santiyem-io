import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MobileMovement {
  id: string;
  kind: "in" | "out";
  date: string;
  materialName: string;
  unit: string;
  qty: number;
  detail?: string;
  actor?: string;
  amount?: number;
  note?: string | null;
  document?: string | null;
  sourceType?: string | null;
  rawId: string;
}

const toDayKey = (iso: string) => iso.slice(0, 10);

const groupLabel = (key: string) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  const k = (d: Date) => d.toISOString().slice(0, 10);
  if (key === k(today)) return "Bugün";
  if (key === k(yest)) return "Dün";
  const d = new Date(key);
  return isNaN(d.getTime())
    ? key
    : d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
};

/**
 * SPRINT 41B — mobile movement timeline grouped by Bugün / Dün / date.
 * Semantic accents live in the small icon container, never on the row.
 */
export function MobileMovementsList({
  movements, fmt, onOpen,
}: {
  movements: MobileMovement[];
  fmt: (n: number) => string;
  onOpen: (m: MobileMovement) => void;
}) {
  const groups: { key: string; items: MobileMovement[] }[] = [];
  movements.forEach(m => {
    const key = toDayKey(m.date);
    const g = groups.find(x => x.key === key);
    if (g) g.items.push(m);
    else groups.push({ key, items: [m] });
  });

  return (
    <div className="flex flex-col gap-4">
      {groups.map(g => (
        <section key={g.key}>
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {groupLabel(g.key)}
          </h3>
          <div className="rounded-[16px] border border-border/70 bg-card overflow-hidden divide-y divide-border/60">
            {g.items.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => onOpen(m)}
                className="w-full flex items-center gap-3 px-3.5 py-3 min-h-[64px] text-left active:bg-muted/50"
              >
                <span
                  className={cn(
                    "h-9 w-9 rounded-[11px] flex items-center justify-center shrink-0",
                    m.kind === "in" ? "bg-emerald-500/12 text-emerald-400" : "bg-amber-500/12 text-amber-400",
                  )}
                >
                  {m.kind === "in"
                    ? <ArrowDownLeft className="w-[18px] h-[18px]" />
                    : <ArrowUpRight className="w-[18px] h-[18px]" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-medium text-foreground leading-tight truncate">
                    {m.materialName}
                  </span>
                  <span className="block text-[12.5px] text-muted-foreground mt-0.5 truncate">
                    {m.kind === "in" ? "Stok girişi" : "Stok çıkışı"}
                    {m.detail ? ` · ${m.detail}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span
                    className={cn(
                      "block text-[14.5px] font-semibold tabular-nums",
                      m.kind === "in" ? "text-emerald-400" : "text-amber-400",
                    )}
                  >
                    {m.kind === "in" ? "+" : "−"}{fmt(m.qty)}
                  </span>
                  <span className="block text-[11.5px] text-muted-foreground">{m.unit}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default MobileMovementsList;
