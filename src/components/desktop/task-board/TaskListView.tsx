import { Task } from "@/hooks/useTasks";
import { STATUS_COLS, PRIORITY_LABELS, isOverdue } from "./useTaskBoardState";
import { OpsListShell, OpsRow, OpsEmpty } from "@/components/operations/opsUi";

interface Props {
  rows: Task[];
  onOpen: (t: Task) => void;
}

/**
 * SPRINT 38F — dense list rows instead of a table.
 * Same hierarchy as the card: name → priority → assignee → due date.
 */
export const TaskListView = ({ rows, onOpen }: Props) => {
  if (rows.length === 0) {
    return <OpsEmpty icon="🔍" title="Görev bulunamadı" description="Aramayı veya filtreleri değiştirip tekrar deneyin." />;
  }

  return (
    <OpsListShell>
      {rows.map((t) => {
        const col = STATUS_COLS.find((c) => c.key === t.status)!;
        const pri = PRIORITY_LABELS[t.priority];
        const overdue = isOverdue(t);
        return (
          <OpsRow
            key={t.id}
            onClick={() => onOpen(t)}
            rail={overdue ? "overdue" : t.status === "done" ? "positive" : t.status === "in_progress" ? "attention" : undefined}
            title={t.title}
            status={<span style={{ color: col.color }}>{col.label}</span>}
            statusTone={t.status === "done" ? "positive" : t.status === "in_progress" ? "attention" : "neutral"}
            subtitle={
              <span className="flex items-center gap-2 flex-wrap">
                <span style={{ color: pri.color }}>{pri.label}</span>
                <span>{t.assignee_name || "Atanmamış"}</span>
              </span>
            }
            amount={
              <span className={overdue ? "text-rose-400" : "text-muted-foreground"}>
                {t.due_date ? new Date(t.due_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "—"}
              </span>
            }
            meta={overdue ? <span className="text-rose-400">Gecikti</span> : undefined}
          />
        );
      })}
    </OpsListShell>
  );
};

export default TaskListView;
