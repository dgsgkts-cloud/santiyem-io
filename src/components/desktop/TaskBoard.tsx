import { useMemo, useState } from "react";
import { useTasks, Task } from "@/hooks/useTasks";
import { useTeam } from "@/hooks/useTeam";
import { useUser } from "@/contexts/UserContext";
import {
  Plus, X, Trash2, User, Calendar, Flag, ChevronRight, GripVertical,
  ChevronDown, ChevronUp, Search, Sparkles, LayoutGrid, List, CalendarDays, GanttChart,
  Paperclip, MessageSquare, CheckSquare, AlertTriangle, Clock, Users,
} from "lucide-react";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const STATUS_COLS = [
  { key: "todo" as const, label: "Yapılacak", color: "#64748B", bg: "rgba(100,116,139,0.08)" },
  { key: "in_progress" as const, label: "Devam Ediyor", color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  { key: "done" as const, label: "Tamamlandı", color: "#22C55E", bg: "rgba(34,197,94,0.08)" },
];

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "Düşük", color: "#64748B" },
  normal: { label: "Normal", color: "#3B82F6" },
  high: { label: "Yüksek", color: "#F59E0B" },
  urgent: { label: "Acil", color: "#EF4444" },
};

const PAGE_SIZE = 10;
const VIEWS = [
  { key: "kanban", label: "Kanban", Icon: LayoutGrid },
  { key: "list", label: "Liste", Icon: List },
  { key: "calendar", label: "Takvim", Icon: CalendarDays },
  { key: "timeline", label: "Timeline", Icon: GanttChart },
] as const;
type ViewKey = typeof VIEWS[number]["key"];

interface TaskBoardProps { projectId: string; }

const initials = (name?: string) =>
  (name || "?").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

const isToday = (d?: string | null) => {
  if (!d) return false;
  const x = new Date(d), n = new Date();
  return x.getFullYear() === n.getFullYear() && x.getMonth() === n.getMonth() && x.getDate() === n.getDate();
};
const isOverdue = (t: Task) => t.status !== "done" && !!t.due_date && new Date(t.due_date) < new Date(new Date().toDateString());

const TaskBoard = ({ projectId }: TaskBoardProps) => {
  const { user } = useUser();
  const { tasks, loading, addTask, updateTaskStatus, updateTask, deleteTask } = useTasks(projectId);
  const { members, team } = useTeam();

  // UI state
  const [collapsed, setCollapsed] = useState(false);
  const [view, setView] = useState<ViewKey>("kanban");
  const [showAddForm, setShowAddForm] = useState(false);
  const [query, setQuery] = useState("");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fPriority, setFPriority] = useState<string>("all");
  const [fAssignee, setFAssignee] = useState<string>("all");
  const [onlyMine, setOnlyMine] = useState(false);
  const [onlyToday, setOnlyToday] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [visibleCount, setVisibleCount] = useState<Record<string, number>>({ todo: PAGE_SIZE, in_progress: PAGE_SIZE, done: PAGE_SIZE });

  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("normal");
  const [newDueDate, setNewDueDate] = useState("");
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [drawerTask, setDrawerTask] = useState<Task | null>(null);

  // Filter tasks
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (query && !t.title.toLowerCase().includes(query.toLowerCase())) return false;
      if (fStatus !== "all" && t.status !== fStatus) return false;
      if (fPriority !== "all" && t.priority !== fPriority) return false;
      if (fAssignee !== "all" && t.assigned_to !== fAssignee) return false;
      if (onlyMine && user && t.assigned_to !== user.id) return false;
      if (onlyToday && !isToday(t.due_date)) return false;
      if (onlyOverdue && !isOverdue(t)) return false;
      return true;
    });
  }, [tasks, query, fStatus, fPriority, fAssignee, onlyMine, onlyToday, onlyOverdue, user]);

  const grouped = {
    todo: filtered.filter(t => t.status === "todo"),
    in_progress: filtered.filter(t => t.status === "in_progress"),
    done: filtered.filter(t => t.status === "done"),
  };

  // Summary metrics (from ALL tasks, not filtered — enterprise summary)
  const summary = useMemo(() => {
    const total = tasks.length;
    const dueToday = tasks.filter(t => isToday(t.due_date) && t.status !== "done").length;
    const overdue = tasks.filter(isOverdue).length;
    const high = tasks.filter(t => (t.priority === "high" || t.priority === "urgent") && t.status !== "done").length;
    const unassigned = tasks.filter(t => !t.assigned_to && t.status !== "done").length;
    return { total, dueToday, overdue, high, unassigned };
  }, [tasks]);

  // AI insights (contextual, derived from data)
  const insights = useMemo(() => {
    const out: string[] = [];
    if (summary.overdue > 0) out.push(`${summary.overdue} görev son teslim tarihini geçti.`);
    if (summary.dueToday > 0) out.push(`Bugün tamamlanması gereken ${summary.dueToday} görev var.`);
    if (summary.high > 0) out.push(`${summary.high} yüksek öncelikli görev bekliyor.`);
    if (summary.unassigned > 0) out.push(`${summary.unassigned} görev henüz atanmamış.`);
    if (out.length === 0 && summary.total > 0) out.push("Görevler planlandığı gibi ilerliyor.");
    return out.slice(0, 4);
  }, [summary]);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addTask(newTitle.trim(), {
      assigned_to: newAssignee || null,
      priority: newPriority,
      due_date: newDueDate || null,
      team_id: team?.id || null,
    });
    setNewTitle(""); setNewAssignee(""); setNewPriority("normal"); setNewDueDate("");
    setShowAddForm(false);
  };

  const handleDrop = (status: Task["status"]) => {
    if (draggedTask) { updateTaskStatus(draggedTask, status); setDraggedTask(null); }
  };

  if (loading) return <p className="text-[12px] text-muted-foreground">Yükleniyor...</p>;

  const clearFilters = () => {
    setQuery(""); setFStatus("all"); setFPriority("all"); setFAssignee("all");
    setOnlyMine(false); setOnlyToday(false); setOnlyOverdue(false);
  };
  const filtersActive = query || fStatus !== "all" || fPriority !== "all" || fAssignee !== "all" || onlyMine || onlyToday || onlyOverdue;

  return (
    <div className="space-y-3">
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { if (deleteTarget) await deleteTask(deleteTarget.id); }}
        title="Görevi Sil"
        itemName={deleteTarget?.name}
      />

      {/* Section Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Görev Yönetimi</h3>
          {collapsed && (
            <div className="flex items-center gap-2 ml-2">
              {STATUS_COLS.map(c => (
                <span key={c.key} className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${c.color}15`, color: c.color }}>
                  {c.label} ({grouped[c.key].length})
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!collapsed && user && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 rounded-lg text-[12px] font-semibold text-white"
              style={{ height: 30, backgroundColor: showAddForm ? "#EF4444" : "#FF6B2B" }}
            >
              {showAddForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {showAddForm ? "İptal" : "Yeni Görev"}
            </button>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground hover:bg-muted/40 border border-border"
          >
            {collapsed ? <><ChevronDown className="w-3 h-3" /> Genişlet</> : <><ChevronUp className="w-3 h-3" /> Daralt</>}
          </button>
        </div>
      </div>

      {collapsed ? null : (
        <>
          {/* Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {[
              { label: "Toplam Görev", value: summary.total, Icon: LayoutGrid, color: "#3B82F6" },
              { label: "Bugün Bitecek", value: summary.dueToday, Icon: Clock, color: "#F59E0B" },
              { label: "Geciken", value: summary.overdue, Icon: AlertTriangle, color: "#EF4444" },
              { label: "Yüksek Öncelik", value: summary.high, Icon: Flag, color: "#F97316" },
              { label: "Atanmamış", value: summary.unassigned, Icon: Users, color: "#64748B" },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-border bg-card/60 p-2.5">
                <div className="flex items-center gap-1.5">
                  <s.Icon className="w-3 h-3" style={{ color: s.color }} />
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{s.label}</span>
                </div>
                <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-foreground">{s.value}</div>
              </div>
            ))}
          </div>

          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="rounded-xl border border-[#FF6B2B]/20 p-3"
              style={{ background: "linear-gradient(135deg, rgba(255,107,43,0.07), rgba(255,143,90,0.02))" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FF6B2B]" strokeWidth={2.2} />
                <span className="text-[11px] font-semibold text-[#FF6B2B] uppercase tracking-wide">AI Görev Analizi</span>
              </div>
              <ul className="space-y-0.5">
                {insights.map((t, i) => (<li key={i} className="text-[12.5px] leading-snug text-foreground/90">• {t}</li>))}
              </ul>
            </div>
          )}

          {/* Filters + View Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1 flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Ara görev..."
                className="bg-transparent outline-none text-[12px] flex-1"
              />
            </div>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-[12px] text-muted-foreground">
              <option value="all">Tüm Durumlar</option>
              <option value="todo">Yapılacak</option>
              <option value="in_progress">Devam Eden</option>
              <option value="done">Tamamlandı</option>
            </select>
            <select value={fPriority} onChange={(e) => setFPriority(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-[12px] text-muted-foreground">
              <option value="all">Tüm Öncelikler</option>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
            </select>
            <select value={fAssignee} onChange={(e) => setFAssignee(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1 text-[12px] text-muted-foreground">
              <option value="all">Tüm Kişiler</option>
              {members.map(m => (<option key={m.user_id} value={m.user_id}>{m.profile?.full_name || "Bilinmiyor"}</option>))}
            </select>
            <button onClick={() => setOnlyMine(v => !v)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium border ${onlyMine ? "bg-[#FF6B2B]/15 text-[#FF6B2B] border-[#FF6B2B]/30" : "border-border text-muted-foreground"}`}>
              Görevlerim
            </button>
            <button onClick={() => setOnlyToday(v => !v)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium border ${onlyToday ? "bg-amber-500/15 text-amber-500 border-amber-500/30" : "border-border text-muted-foreground"}`}>
              Bugün
            </button>
            <button onClick={() => setOnlyOverdue(v => !v)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium border ${onlyOverdue ? "bg-red-500/15 text-red-500 border-red-500/30" : "border-border text-muted-foreground"}`}>
              Geciken
            </button>
            {filtersActive && (
              <button onClick={clearFilters} className="text-[11px] text-muted-foreground hover:text-foreground underline">
                Temizle
              </button>
            )}
            <div className="ml-auto flex items-center rounded-lg border border-border p-0.5 bg-background">
              {VIEWS.map(v => (
                <button key={v.key} onClick={() => setView(v.key)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${view === v.key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <v.Icon className="w-3 h-3" /> {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="rounded-lg p-3 space-y-2 bg-background border border-border">
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Görev başlığı" className="w-full rounded-lg px-3 py-2 text-[13px] outline-none border border-border bg-card" />
              <div className="flex flex-wrap gap-2">
                {members.length > 0 && (
                  <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)}
                    className="rounded-lg px-2 py-1.5 text-[12px] outline-none text-muted-foreground border border-border bg-card">
                    <option value="">Atanmamış</option>
                    {members.map(m => (<option key={m.user_id} value={m.user_id}>{m.profile?.full_name || "Bilinmiyor"}</option>))}
                  </select>
                )}
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as Task["priority"])}
                  className="rounded-lg px-2 py-1.5 text-[12px] outline-none text-muted-foreground border border-border bg-card">
                  <option value="low">Düşük</option><option value="normal">Normal</option>
                  <option value="high">Yüksek</option><option value="urgent">Acil</option>
                </select>
                <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)}
                  className="rounded-lg px-2 py-1.5 text-[12px] outline-none text-muted-foreground border border-border bg-card" />
                <button onClick={handleAdd} className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-white" style={{ backgroundColor: "#22C55E" }}>
                  Ekle
                </button>
              </div>
            </div>
          )}

          {/* Views */}
          {view === "kanban" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3" style={{ height: 680 }}>
              {STATUS_COLS.map((col) => {
                const items = grouped[col.key];
                const shown = items.slice(0, visibleCount[col.key]);
                return (
                  <div key={col.key}
                    className="rounded-xl flex flex-col min-h-0"
                    style={{ backgroundColor: col.bg, border: `1px solid ${col.color}20` }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(col.key)}
                  >
                    {/* Sticky header */}
                    <div className="flex items-center gap-2 p-3 border-b sticky top-0 z-10 rounded-t-xl"
                      style={{ borderColor: `${col.color}20`, backgroundColor: col.bg, backdropFilter: "blur(4px)" }}>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                      <span className="text-[12px] font-semibold" style={{ color: col.color }}>{col.label}</span>
                      <span className="text-[10px] font-mono ml-auto px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${col.color}15`, color: col.color }}>{items.length}</span>
                    </div>
                    {/* Scrollable cards */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                      {shown.map((task) => (
                        <TaskCard key={task.id} task={task} col={col}
                          onDragStart={() => setDraggedTask(task.id)}
                          onDelete={() => setDeleteTarget({ id: task.id, name: task.title })}
                          onMove={(s) => updateTaskStatus(task.id, s)}
                          onOpen={() => setDrawerTask(task)}
                        />
                      ))}
                      {items.length === 0 && (
                        <p className="text-center text-[11px] text-muted-foreground py-6">Görev yok</p>
                      )}
                      {items.length > shown.length && (
                        <button
                          onClick={() => setVisibleCount(v => ({ ...v, [col.key]: v[col.key] + PAGE_SIZE }))}
                          className="w-full text-[11px] font-medium text-muted-foreground hover:text-foreground py-1.5 rounded-md border border-dashed border-border">
                          Daha Fazla ({items.length - shown.length})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === "list" && (
            <div className="rounded-xl border border-border overflow-hidden" style={{ maxHeight: 680 }}>
              <div className="overflow-y-auto max-h-[680px]">
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Görev</th>
                      <th className="px-3 py-2 font-medium">Durum</th>
                      <th className="px-3 py-2 font-medium">Öncelik</th>
                      <th className="px-3 py-2 font-medium">Atanan</th>
                      <th className="px-3 py-2 font-medium">Bitiş</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => {
                      const col = STATUS_COLS.find(c => c.key === t.status)!;
                      const pri = PRIORITY_LABELS[t.priority];
                      return (
                        <tr key={t.id} onClick={() => setDrawerTask(t)}
                          className="border-t border-border hover:bg-muted/30 cursor-pointer">
                          <td className="px-3 py-2 text-foreground">{t.title}</td>
                          <td className="px-3 py-2"><span style={{ color: col.color }}>{col.label}</span></td>
                          <td className="px-3 py-2"><span style={{ color: pri.color }}>{pri.label}</span></td>
                          <td className="px-3 py-2 text-muted-foreground">{t.assignee_name || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {t.due_date ? new Date(t.due_date).toLocaleDateString("tr-TR") : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Görev bulunamadı</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(view === "calendar" || view === "timeline") && (
            <div className="rounded-xl border border-border bg-card/40 flex items-center justify-center" style={{ height: 400 }}>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">{view === "calendar" ? "Takvim" : "Timeline"} görünümü</p>
                <p className="text-[12px] text-muted-foreground mt-1">Yakında</p>
              </div>
            </div>
          )}

          {tasks.length === 0 && !showAddForm && (
            <div className="text-center py-6">
              <p className="text-[12px] text-muted-foreground">Henüz görev eklenmemiş. "Yeni Görev" ile başlayın.</p>
            </div>
          )}
        </>
      )}

      {/* Right-side Drawer */}
      <Sheet open={!!drawerTask} onOpenChange={(o) => !o && setDrawerTask(null)}>
        <SheetContent className="w-[420px] sm:max-w-[440px] overflow-y-auto">
          {drawerTask && (() => {
            const t = drawerTask;
            const col = STATUS_COLS.find(c => c.key === t.status)!;
            const pri = PRIORITY_LABELS[t.priority];
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="text-base pr-6">{t.title}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-medium px-2 py-1 rounded-md" style={{ backgroundColor: `${col.color}15`, color: col.color }}>{col.label}</span>
                    <span className="text-[11px] font-medium px-2 py-1 rounded-md" style={{ backgroundColor: `${pri.color}15`, color: pri.color }}>
                      <Flag className="w-3 h-3 inline mr-1" />{pri.label}
                    </span>
                  </div>
                  <section>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Açıklama</div>
                    <p className="text-[13px] text-foreground/90 whitespace-pre-wrap">{t.description || <span className="text-muted-foreground">Açıklama eklenmemiş.</span>}</p>
                  </section>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Atanan</div>
                      <div className="text-[13px] text-foreground flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />{t.assignee_name || "Atanmamış"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Bitiş</div>
                      <div className="text-[13px] text-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {t.due_date ? new Date(t.due_date).toLocaleDateString("tr-TR") : "—"}
                      </div>
                    </div>
                  </div>
                  <section>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Durumu Değiştir</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {STATUS_COLS.map(s => (
                        <button key={s.key}
                          onClick={() => { updateTaskStatus(t.id, s.key); setDrawerTask({ ...t, status: s.key }); }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${t.status === s.key ? "opacity-60" : ""}`}
                          style={{ backgroundColor: `${s.color}10`, color: s.color, borderColor: `${s.color}30` }}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </section>
                  {[
                    { title: "Kontrol Listesi", empty: "Henüz kontrol maddesi yok.", Icon: CheckSquare },
                    { title: "Ekler", empty: "Ek dosya yok.", Icon: Paperclip },
                    { title: "Yorumlar", empty: "Henüz yorum yok.", Icon: MessageSquare },
                    { title: "Geçmiş", empty: `Oluşturuldu: ${new Date(t.created_at).toLocaleString("tr-TR")}`, Icon: Clock },
                  ].map(s => (
                    <section key={s.title}>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                        <s.Icon className="w-3 h-3" />{s.title}
                      </div>
                      <p className="text-[12px] text-muted-foreground">{s.empty}</p>
                    </section>
                  ))}
                  <div className="pt-2 border-t border-border flex justify-end">
                    <button onClick={() => { setDeleteTarget({ id: t.id, name: t.title }); setDrawerTask(null); }}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-red-500 hover:bg-red-500/10 px-2 py-1 rounded-md">
                      <Trash2 className="w-3 h-3" /> Görevi Sil
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
};

/* ---------- Task Card ---------- */
const TaskCard = ({
  task, col, onDragStart, onDelete, onMove, onOpen,
}: {
  task: Task; col: typeof STATUS_COLS[number];
  onDragStart: () => void; onDelete: () => void;
  onMove: (s: Task["status"]) => void; onOpen: () => void;
}) => {
  const pri = PRIORITY_LABELS[task.priority];
  const overdue = isOverdue(task);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className="rounded-lg p-3 cursor-pointer group bg-card border border-border hover:border-[#FF6B2B]/40 transition-colors"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-30 group-hover:opacity-60 text-muted-foreground cursor-grab" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] font-medium text-foreground line-clamp-2">{task.title}</p>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0"
              style={{ backgroundColor: `${pri.color}15`, color: pri.color }}>
              <Flag className="w-2.5 h-2.5 inline mr-0.5" />{pri.label}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {task.assignee_name && (
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-semibold text-foreground">
                  {initials(task.assignee_name)}
                </div>
                <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{task.assignee_name}</span>
              </div>
            )}
            {task.due_date && (
              <span className={`text-[10px] flex items-center gap-0.5 ${overdue ? "text-red-500" : "text-muted-foreground"}`}>
                <Calendar className="w-2.5 h-2.5" />
                {new Date(task.due_date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                {overdue && <AlertTriangle className="w-2.5 h-2.5 ml-0.5" />}
              </span>
            )}
            <span className="text-[10px] flex items-center gap-0.5 text-muted-foreground opacity-60">
              <Paperclip className="w-2.5 h-2.5" />0
            </span>
            <span className="text-[10px] flex items-center gap-0.5 text-muted-foreground opacity-60">
              <MessageSquare className="w-2.5 h-2.5" />0
            </span>
            <span className="text-[10px] flex items-center gap-0.5 text-muted-foreground opacity-60">
              <CheckSquare className="w-2.5 h-2.5" />0/0
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full" style={{
              width: `${task.status === "done" ? 100 : task.status === "in_progress" ? 50 : 0}%`,
              backgroundColor: col.color,
            }} />
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity text-red-500"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      {/* Quick status change */}
      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        {STATUS_COLS.filter(s => s.key !== col.key).map((s) => (
          <button key={s.key} onClick={() => onMove(s.key)}
            className="flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-medium"
            style={{ backgroundColor: `${s.color}10`, color: s.color, border: `1px solid ${s.color}30` }}>
            <ChevronRight className="w-2.5 h-2.5" />{s.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TaskBoard;
