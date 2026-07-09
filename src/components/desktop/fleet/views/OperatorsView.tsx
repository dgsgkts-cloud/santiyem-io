// Sprint M1.6 — Operators as ResponsiveTable (cards on mobile).
import { ResponsiveTable, SectionCard, type ResponsiveColumn } from "@/components/ui/responsive";
import { fmtNum, type OperatorAssignment } from "../fleetConstants";
import { HealthDot } from "../fleetUi";

export const OperatorsView = ({ items }: { items: OperatorAssignment[] }) => {
  const columns: ResponsiveColumn<OperatorAssignment>[] = [
    {
      key: "operator", header: "Operatör", primary: true,
      cell: a => (
        <span className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-fs-xs text-foreground/70 shrink-0">
            {a.operator.split(" ").map(p => p[0]).join("").slice(0, 2)}
          </span>
          <span className="text-foreground">{a.operator}</span>
        </span>
      ),
    },
    { key: "license", header: "Ehliyet", cell: a => <span className="text-fs-xs text-muted-foreground">{a.license}</span> },
    {
      key: "equipment", header: "Ekipman",
      cell: a => <span>{a.equipmentName} <span className="text-fs-xs text-muted-foreground ml-1">{a.equipmentCode}</span></span>,
    },
    { key: "project", header: "Proje", cell: a => <span className="text-fs-xs text-muted-foreground">{a.project}</span> },
    { key: "assigned", header: "Atama", align: "right", cell: a => <span className="text-fs-xs text-muted-foreground">{a.assignedDays}g önce</span> },
    { key: "hours", header: "Çalışma Saati", align: "right", cell: a => <span className="tabular-nums">{fmtNum(a.hoursWorked)} sa</span> },
    { key: "perf", header: "Performans", cell: a => <HealthDot score={a.performance} /> },
  ];
  return (
    <SectionCard title="Operatör Atamaları">
      <ResponsiveTable columns={columns} rows={items} rowKey={a => a.id} />
    </SectionCard>
  );
};

export default OperatorsView;
