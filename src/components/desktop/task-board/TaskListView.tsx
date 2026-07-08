import { Task } from "@/hooks/useTasks";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive";
import { STATUS_COLS, PRIORITY_LABELS } from "./useTaskBoardState";

interface Props {
  rows: Task[];
  onOpen: (t: Task) => void;
}

export const TaskListView = ({ rows, onOpen }: Props) => {
  const columns: ResponsiveColumn<Task>[] = [
    {
      key: "title",
      header: "Görev",
      primary: true,
      cell: (t) => <span className="text-fs-sm text-foreground">{t.title}</span>,
    },
    {
      key: "status",
      header: "Durum",
      cell: (t) => {
        const col = STATUS_COLS.find((c) => c.key === t.status)!;
        return (
          <span style={{ color: col.color }} className="text-fs-xs">
            {col.label}
          </span>
        );
      },
    },
    {
      key: "priority",
      header: "Öncelik",
      cell: (t) => {
        const pri = PRIORITY_LABELS[t.priority];
        return (
          <span style={{ color: pri.color }} className="text-fs-xs">
            {pri.label}
          </span>
        );
      },
    },
    {
      key: "assignee",
      header: "Atanan",
      cell: (t) => (
        <span className="text-fs-xs text-muted-foreground">{t.assignee_name || "—"}</span>
      ),
    },
    {
      key: "due",
      header: "Bitiş",
      cell: (t) => (
        <span className="text-fs-xs text-muted-foreground">
          {t.due_date ? new Date(t.due_date).toLocaleDateString("tr-TR") : "—"}
        </span>
      ),
    },
  ];

  return (
    <ResponsiveTable<Task>
      columns={columns}
      rows={rows}
      rowKey={(t) => t.id}
      onRowClick={onOpen}
      empty={
        <p className="text-fs-sm text-muted-foreground text-center py-6">Görev bulunamadı</p>
      }
    />
  );
};

export default TaskListView;
