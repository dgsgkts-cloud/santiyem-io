import { PRIORITY_LABELS } from "./useTaskBoardState";
import { OpsFilterBar } from "@/components/operations/opsUi";

interface Props {
  query: string;
  setQuery: (v: string) => void;
  fStatus: string;
  setFStatus: (v: string) => void;
  fPriority: string;
  setFPriority: (v: string) => void;
  fAssignee: string;
  setFAssignee: (v: string) => void;
  onlyMine: boolean;
  setOnlyMine: (v: boolean) => void;
  onlyToday: boolean;
  setOnlyToday: (v: boolean) => void;
  onlyOverdue: boolean;
  setOnlyOverdue: (v: boolean) => void;
  filtersActive: boolean;
  clearFilters: () => void;
  members: { user_id: string; profile?: { full_name: string | null } }[];
  rightSlot?: React.ReactNode;
}

const selCls =
  "h-9 rounded-control border border-border bg-card px-2 text-fs-xs text-muted-foreground shrink-0";

/**
 * SPRINT 38F — one search field + one scrollable chip row.
 * The three selects moved into a secondary line that only shows advanced narrowing,
 * so the primary filter surface never stacks.
 */
export const TaskBoardFilters = (p: Props) => {
  const chips = [
    { value: "all", label: "Tümü" },
    { value: "todo", label: "Yapılacak" },
    { value: "in_progress", label: "Devam Eden" },
    { value: "done", label: "Tamamlandı" },
    { value: "mine", label: "Görevlerim" },
    { value: "today", label: "Bugün" },
    { value: "overdue", label: "Geciken" },
  ];

  const active = p.onlyOverdue ? "overdue" : p.onlyToday ? "today" : p.onlyMine ? "mine" : p.fStatus;

  const onChip = (v: string) => {
    if (v === "mine") { p.setOnlyMine(!p.onlyMine); p.setOnlyToday(false); p.setOnlyOverdue(false); return; }
    if (v === "today") { p.setOnlyToday(!p.onlyToday); p.setOnlyMine(false); p.setOnlyOverdue(false); return; }
    if (v === "overdue") { p.setOnlyOverdue(!p.onlyOverdue); p.setOnlyMine(false); p.setOnlyToday(false); return; }
    if (v === "all") { p.clearFilters(); return; }
    p.setFStatus(v);
  };

  return (
    <div className="space-y-2">
      <OpsFilterBar
        query={p.query}
        onQuery={p.setQuery}
        placeholder="Görev ara…"
        chips={chips}
        active={active}
        onChip={onChip}
        right={p.rightSlot}
        sticky={false}
      />
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <select value={p.fPriority} onChange={(e) => p.setFPriority(e.target.value)} className={selCls}>
          <option value="all">Tüm Öncelikler</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={p.fAssignee} onChange={(e) => p.setFAssignee(e.target.value)} className={selCls}>
          <option value="all">Tüm Kişiler</option>
          {p.members.map((m) => (
            <option key={m.user_id} value={m.user_id}>{m.profile?.full_name || "Bilinmiyor"}</option>
          ))}
        </select>
        {p.filtersActive && (
          <button onClick={p.clearFilters} className="ds-caption text-muted-foreground hover:text-foreground underline shrink-0">
            Temizle
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskBoardFilters;
