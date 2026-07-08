import { Search } from "lucide-react";
import { PRIORITY_LABELS } from "./useTaskBoardState";

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
  "rounded-lg border border-border bg-background px-2 py-1 text-fs-xs text-muted-foreground";

export const TaskBoardFilters = (p: Props) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1 flex-1 min-w-[180px]">
      <Search className="w-3.5 h-3.5 text-muted-foreground" />
      <input
        value={p.query}
        onChange={(e) => p.setQuery(e.target.value)}
        placeholder="Ara görev..."
        className="bg-transparent outline-none text-fs-xs flex-1"
      />
    </div>
    <select value={p.fStatus} onChange={(e) => p.setFStatus(e.target.value)} className={selCls}>
      <option value="all">Tüm Durumlar</option>
      <option value="todo">Yapılacak</option>
      <option value="in_progress">Devam Eden</option>
      <option value="done">Tamamlandı</option>
    </select>
    <select value={p.fPriority} onChange={(e) => p.setFPriority(e.target.value)} className={selCls}>
      <option value="all">Tüm Öncelikler</option>
      {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
        <option key={k} value={k}>
          {v.label}
        </option>
      ))}
    </select>
    <select value={p.fAssignee} onChange={(e) => p.setFAssignee(e.target.value)} className={selCls}>
      <option value="all">Tüm Kişiler</option>
      {p.members.map((m) => (
        <option key={m.user_id} value={m.user_id}>
          {m.profile?.full_name || "Bilinmiyor"}
        </option>
      ))}
    </select>
    <button
      onClick={() => p.setOnlyMine(!p.onlyMine)}
      className={`px-2 py-1 rounded-lg text-fs-xs font-medium border ${
        p.onlyMine
          ? "bg-[#FF6B2B]/15 text-[#FF6B2B] border-[#FF6B2B]/30"
          : "border-border text-muted-foreground"
      }`}
    >
      Görevlerim
    </button>
    <button
      onClick={() => p.setOnlyToday(!p.onlyToday)}
      className={`px-2 py-1 rounded-lg text-fs-xs font-medium border ${
        p.onlyToday
          ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
          : "border-border text-muted-foreground"
      }`}
    >
      Bugün
    </button>
    <button
      onClick={() => p.setOnlyOverdue(!p.onlyOverdue)}
      className={`px-2 py-1 rounded-lg text-fs-xs font-medium border ${
        p.onlyOverdue
          ? "bg-red-500/15 text-red-500 border-red-500/30"
          : "border-border text-muted-foreground"
      }`}
    >
      Geciken
    </button>
    {p.filtersActive && (
      <button
        onClick={p.clearFilters}
        className="text-fs-xs text-muted-foreground hover:text-foreground underline"
      >
        Temizle
      </button>
    )}
    {p.rightSlot && <div className="ml-auto">{p.rightSlot}</div>}
  </div>
);

export default TaskBoardFilters;
