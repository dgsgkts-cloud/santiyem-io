// DEPO — Hareketler: canonical posted movement ledger (receipts / issues).
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive";
import { cn } from "@/lib/utils";
import type { Movement } from "../warehouseConstants";
import type { WarehouseData } from "../useWarehouseData";
import { MoveBadge, NEGATIVE_KINDS, InsufficientData } from "../warehouseUi";
import { TRUTH_COPY, fmtQty, fmtMoney, fmtDate } from "../inventoryTruth";

interface Props {
  data: WarehouseData;
  onOpen?: (m: Movement) => void;
}

const KIND_CHIPS: [string, string][] = [
  ["all", "Tümü"],
  ["in", "Mal Kabulü"],
  ["out", "Malzeme Çıkışı"],
];

export const MovementsView = ({ data, onOpen }: Props) => {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");

  const rows = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    return data.movements.filter((m) => {
      if (kind !== "all" && m.kind !== kind) return false;
      if (!needle) return true;
      return (
        m.material.toLocaleLowerCase("tr").includes(needle) ||
        m.reason.toLocaleLowerCase("tr").includes(needle) ||
        (m.document ?? "").toLocaleLowerCase("tr").includes(needle)
      );
    });
  }, [data.movements, q, kind]);

  const columns: ResponsiveColumn<Movement>[] = [
    { key: "kind", header: "Tür", cell: (m) => <MoveBadge kind={m.kind} /> },
    {
      key: "material", header: "Malzeme", primary: true,
      cell: (m) => <span className="text-foreground font-medium">{m.material}</span>,
    },
    {
      key: "qty", header: "Miktar", align: "right",
      cell: (m) => {
        const negative = NEGATIVE_KINDS.includes(m.kind);
        return (
          <span className={cn("font-medium ds-numeric", negative ? "text-rose-300/90" : "text-emerald-300/90")}>
            {negative ? "−" : "+"}{fmtQty(m.qty)}{" "}
            <span className="text-fs-xs text-muted-foreground">{m.unit}</span>
          </span>
        );
      },
    },
    {
      key: "unitCost", header: "Birim Maliyet", align: "right",
      cell: (m) => (
        <span className="text-foreground/70 ds-numeric">
          {m.unitCost === null || m.unitCost === undefined ? "—" : fmtMoney(m.unitCost)}
        </span>
      ),
    },
    { key: "reason", header: "İşlem", cell: (m) => <span className="text-muted-foreground">{m.reason}</span> },
    {
      key: "document", header: "Belge",
      cell: (m) => <span className="text-muted-foreground">{m.document || "—"}</span>,
    },
    {
      key: "date", header: "Tarih", align: "right",
      cell: (m) => <span className="text-muted-foreground">{fmtDate(m.date)}</span>,
    },
  ];

  if (!data.loading && data.movements.length === 0)
    return (
      <InsufficientData
        title={TRUTH_COPY.noMovements}
        hint="Mal kabulü veya malzeme çıkışı kaydedildiğinde hareketler burada listelenir."
      />
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Malzeme, işlem veya irsaliye ara…"
            aria-label="Hareket ara"
            className="w-full pl-9 pr-9 h-11 text-fs-sm rounded-control bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Aramayı temizle"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {KIND_CHIPS.map(([v, l]) => (
            <button
              key={v}
              onClick={() => setKind(v)}
              className={cn(
                "px-3 h-9 rounded-pill ds-caption whitespace-nowrap border transition-colors duration-200",
                kind === v
                  ? "bg-primary/[0.08] text-foreground border-primary/40"
                  : "bg-card text-muted-foreground border-border/70 hover:text-foreground",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveTable columns={columns} rows={rows} rowKey={(m) => m.id} onRowClick={onOpen} />
      <p className="ds-caption text-muted-foreground px-1">{rows.length} hareket</p>
    </div>
  );
};

export default MovementsView;
