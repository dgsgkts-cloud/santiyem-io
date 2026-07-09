// Sprint M1.5 — Counts (sayımlar) — ResponsiveTable with variance highlighting.
import { ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive";
import { fmtNum, type Count } from "../warehouseConstants";
import type { WarehouseData } from "../useWarehouseData";

export const CountsView = ({ data }: { data: WarehouseData }) => {
  const columns: ResponsiveColumn<Count>[] = [
    { key: "material", header: "Malzeme", primary: true, cell: c => <span className="text-foreground font-medium">{c.material}</span> },
    { key: "warehouse", header: "Depo", cell: c => <span className="text-muted-foreground">{c.warehouse}</span> },
    {
      key: "expected",
      header: "Beklenen",
      align: "right",
      cell: c => (
        <span className="text-foreground/70 tabular-nums">
          {fmtNum(c.expected)} <span className="text-fs-xs text-muted-foreground">{c.unit}</span>
        </span>
      ),
    },
    { key: "counted", header: "Sayılan", align: "right", cell: c => <span className="text-foreground tabular-nums">{fmtNum(c.counted)}</span> },
    {
      key: "diff",
      header: "Fark",
      align: "right",
      cell: c => {
        const diff = c.counted - c.expected;
        const negative = diff < 0;
        return (
          <span className={`font-medium tabular-nums ${negative ? "text-red-400" : diff === 0 ? "text-muted-foreground" : "text-emerald-400"}`}>
            {diff > 0 ? "+" : ""}{diff}
          </span>
        );
      },
    },
    {
      key: "variance",
      header: "Sapma %",
      align: "right",
      cell: c => {
        const diff = c.counted - c.expected;
        const variance = Math.round((diff / c.expected) * 1000) / 10;
        const negative = diff < 0;
        const big = Math.abs(variance) > 3;
        return (
          <span className={`tabular-nums ${big ? (negative ? "text-red-400" : "text-amber-400") : "text-muted-foreground"}`}>
            {variance > 0 ? "+" : ""}{variance}%
          </span>
        );
      },
    },
    {
      key: "action",
      header: "Düzeltme",
      align: "right",
      cell: () => (
        <button className="px-3 h-9 min-h-[44px] sm:min-h-0 text-fs-xs rounded-md bg-card border border-border text-foreground/80 hover:bg-muted transition-colors duration-[220ms]">
          Uygula
        </button>
      ),
    },
  ];

  return <ResponsiveTable columns={columns} rows={data.counts} rowKey={c => c.id} />;
};

export default CountsView;
