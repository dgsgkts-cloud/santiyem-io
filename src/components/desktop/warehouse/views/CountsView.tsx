// DEPO — Sayımlar. No count-session table is deployed yet; variance figures are
// never invented, so the module states the missing prerequisite instead.
import { ClipboardCheck } from "lucide-react";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive";
import type { Count } from "../warehouseConstants";
import type { WarehouseData } from "../useWarehouseData";
import { InsufficientData } from "../warehouseUi";
import { TRUTH_COPY, fmtQty } from "../inventoryTruth";

export const CountsView = ({ data }: { data: WarehouseData }) => {
  if (data.counts.length === 0)
    return (
      <InsufficientData
        icon={ClipboardCheck}
        title={TRUTH_COPY.noCounts}
        hint="Sayım oturumu başlatıldığında beklenen ve sayılan miktarlar karşılaştırılır, fark onayla stoklara işlenir."
      />
    );

  const columns: ResponsiveColumn<Count>[] = [
    {
      key: "material", header: "Malzeme", primary: true,
      cell: (c) => <span className="text-foreground font-medium">{c.material}</span>,
    },
    {
      key: "expected", header: "Beklenen", align: "right",
      cell: (c) => (
        <span className="text-foreground/70 ds-numeric">
          {fmtQty(c.expected)} <span className="text-fs-xs text-muted-foreground">{c.unit}</span>
        </span>
      ),
    },
    {
      key: "counted", header: "Sayılan", align: "right",
      cell: (c) => <span className="text-foreground ds-numeric">{fmtQty(c.counted)}</span>,
    },
    {
      key: "diff", header: "Fark", align: "right",
      cell: (c) => {
        const diff = c.counted - c.expected;
        return (
          <span
            className={`font-medium ds-numeric ${
              diff < 0 ? "text-rose-300/90" : diff === 0 ? "text-muted-foreground" : "text-emerald-300/90"
            }`}
          >
            {diff > 0 ? "+" : ""}{fmtQty(diff)}
          </span>
        );
      },
    },
  ];

  return <ResponsiveTable columns={columns} rows={data.counts} rowKey={(c) => c.id} />;
};

export default CountsView;
