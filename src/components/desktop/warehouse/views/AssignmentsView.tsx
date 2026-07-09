// Sprint M1.5 — Zimmet (assignments) — ResponsiveTable.
import { ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive";
import { daysFromNow, type Assignment } from "../warehouseConstants";
import type { WarehouseData } from "../useWarehouseData";

export const AssignmentsView = ({ data }: { data: WarehouseData }) => {
  const columns: ResponsiveColumn<Assignment>[] = [
    { key: "item", header: "Ekipman / Malzeme", primary: true, cell: a => <span className="text-foreground font-medium">{a.item}</span> },
    { key: "employee", header: "Personel", cell: a => <span className="text-foreground/80">{a.employee}</span> },
    { key: "department", header: "Departman", cell: a => <span className="text-muted-foreground">{a.department}</span> },
    { key: "project", header: "Proje", cell: a => <span className="text-muted-foreground">{a.project}</span> },
    { key: "assigned", header: "Verilme", align: "right", cell: a => <span className="text-muted-foreground">{-a.assignedDays}g önce</span> },
    {
      key: "return",
      header: "Beklenen İade",
      align: "right",
      cell: a => {
        const overdue = !a.returned && a.returnDays < 0;
        return (
          <span className={overdue ? "text-red-400" : "text-foreground/70"}>
            {a.returned ? "İade edildi" : daysFromNow(a.returnDays)}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Durum",
      align: "center",
      cell: a => {
        const overdue = !a.returned && a.returnDays < 0;
        if (a.returned) return <span className="text-fs-xs px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">İade Edildi</span>;
        if (overdue) return <span className="text-fs-xs px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20">Gecikti</span>;
        return <span className="text-fs-xs px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">Zimmetli</span>;
      },
    },
  ];

  return <ResponsiveTable columns={columns} rows={data.assignments} rowKey={a => a.id} />;
};

export default AssignmentsView;
