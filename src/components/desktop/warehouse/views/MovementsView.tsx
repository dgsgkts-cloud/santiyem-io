// Sprint M1.5 — Movements: ResponsiveTable (desktop rows / mobile cards).
import { ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive";
import { fmtNum, type Movement } from "../warehouseConstants";
import type { WarehouseData } from "../useWarehouseData";
import { MoveBadge } from "../warehouseUi";

interface Props {
  data: WarehouseData;
  onOpen?: (m: Movement) => void;
}

export const MovementsView = ({ data, onOpen }: Props) => {
  const columns: ResponsiveColumn<Movement>[] = [
    { key: "kind", header: "Tür", cell: m => <MoveBadge kind={m.kind} /> },
    { key: "material", header: "Malzeme", primary: true, cell: m => <span className="text-foreground">{m.material}</span> },
    {
      key: "qty",
      header: "Miktar",
      align: "right",
      cell: m => (
        <span className="text-foreground font-medium tabular-nums">
          {m.kind === "out" || m.kind === "consume" ? "-" : "+"}{fmtNum(m.qty)}{" "}
          <span className="text-fs-xs text-muted-foreground">{m.unit}</span>
        </span>
      ),
    },
    { key: "warehouse", header: "Depo", cell: m => <span className="text-foreground/70">{m.warehouse}</span> },
    { key: "project", header: "Proje", cell: m => <span className="text-foreground/70">{m.project}</span> },
    { key: "reason", header: "İşlem", cell: m => <span className="text-muted-foreground">{m.reason}</span> },
    { key: "actor", header: "Kim", cell: m => <span className="text-muted-foreground">{m.actor}</span> },
    {
      key: "when",
      header: "Ne Zaman",
      align: "right",
      cell: m => (
        <span className="text-muted-foreground">
          {m.whenDays === 0 ? "Bugün" : `${-m.whenDays}g önce`}
        </span>
      ),
    },
  ];

  return (
    <ResponsiveTable
      columns={columns}
      rows={data.movements}
      rowKey={m => m.id}
      onRowClick={onOpen}
    />
  );
};

export default MovementsView;
