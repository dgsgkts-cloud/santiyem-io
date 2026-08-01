// DEPO — Zimmet. No assignment table is deployed yet; the module reports that
// truthfully instead of listing demo personnel.
import { Wrench } from "lucide-react";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive";
import type { Assignment } from "../warehouseConstants";
import type { WarehouseData } from "../useWarehouseData";
import { InsufficientData } from "../warehouseUi";
import { TRUTH_COPY } from "../inventoryTruth";

export const AssignmentsView = ({ data }: { data: WarehouseData }) => {
  if (data.assignments.length === 0)
    return (
      <InsufficientData
        icon={Wrench}
        title={TRUTH_COPY.noAssignments}
        hint="Ekipman zimmeti kaydedildiğinde personel, teslim tarihi ve beklenen iade burada izlenir."
      />
    );

  const columns: ResponsiveColumn<Assignment>[] = [
    {
      key: "item", header: "Ekipman / Malzeme", primary: true,
      cell: (a) => <span className="text-foreground font-medium">{a.item}</span>,
    },
    { key: "employee", header: "Personel", cell: (a) => <span className="text-foreground/80">{a.employee}</span> },
    { key: "project", header: "Proje", cell: (a) => <span className="text-muted-foreground">{a.project}</span> },
    {
      key: "status", header: "Durum", align: "center",
      cell: (a) => (
        <span className="text-fs-xs px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">
          {a.returned ? "İade Edildi" : "Zimmetli"}
        </span>
      ),
    },
  ];

  return <ResponsiveTable columns={columns} rows={data.assignments} rowKey={(a) => a.id} />;
};

export default AssignmentsView;
