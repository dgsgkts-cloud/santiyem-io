import { useState, useMemo } from "react";
import { CalendarClock, Plus, Trash2, CheckCircle2, Clock, AlertTriangle, User } from "lucide-react";
import { useReminders } from "@/hooks/useReminders";
import { useUser } from "@/contexts/UserContext";
import { useTeam } from "@/hooks/useTeam";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  });
}

function getDaysDiff(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function getStatusInfo(dateStr: string, done: boolean) {
  if (done) return { label: "Tamamlandı", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 };
  const diff = getDaysDiff(dateStr);
  if (diff < 0) return { label: "Gecikmiş", color: "text-destructive bg-destructive/10 border-destructive/20", icon: AlertTriangle };
  if (diff === 0) return { label: "Bugün", color: "text-accent bg-accent/10 border-accent/20", icon: AlertTriangle };
  if (diff <= 3) return { label: `${diff} gün kaldı`, color: "text-amber-600 bg-amber-500/10 border-amber-500/20", icon: Clock };
  return { label: `${diff} gün kaldı`, color: "text-primary bg-primary/10 border-primary/20", icon: Clock };
}

const RemindersPanel = () => {
  const { user, plan } = useUser();
  const { reminders, loading, addReminder, toggleDone, deleteReminder } = useReminders();
  const { members } = useTeam();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [filter, setFilter] = useState<"all" | "upcoming" | "done" | "overdue">("all");

  const handleAdd = async () => {
    if (!title.trim() || !date) return;
    const ok = await addReminder(title.trim(), date, note.trim(), assignedTo || null);
    if (ok) {
      setTitle("");
      setDate("");
      setNote("");
      setAssignedTo("");
      setShowForm(false);
    }
  };

  const filtered = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    switch (filter) {
      case "upcoming":
        return reminders.filter((r) => !r.done && new Date(r.reminder_date) >= now);
      case "done":
        return reminders.filter((r) => r.done);
      case "overdue":
        return reminders.filter((r) => !r.done && new Date(r.reminder_date) < now);
      default:
        return reminders;
    }
  }, [reminders, filter]);

  const overdue = reminders.filter((r) => !r.done && getDaysDiff(r.reminder_date) < 0).length;
  const today = reminders.filter((r) => !r.done && getDaysDiff(r.reminder_date) === 0).length;
  const upcoming = reminders.filter((r) => !r.done && getDaysDiff(r.reminder_date) > 0).length;

  const showTeamFeatures = plan === "office" && members.length > 1;

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Hatırlatıcılar
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {user ? "Hatırlatıcılarınız hesabınıza kaydedilir (maks 20)" : "Giriş yaparak hatırlatıcılarınızı kaydedin"}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg chat-gradient text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Yeni Hatırlatıcı
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Gecikmiş", count: overdue, color: "text-destructive", bg: "bg-destructive/5 border-destructive/20" },
          { label: "Bugün", count: today, color: "text-accent", bg: "bg-accent/5 border-accent/20" },
          { label: "Yaklaşan", count: upcoming, color: "text-primary", bg: "bg-primary/5 border-primary/20" },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg border p-3 text-center ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="glass-card rounded-xl p-4 mb-5 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Hatırlatıcı başlığı"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <div className="flex gap-3 flex-wrap">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 min-w-[140px] rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
            />
            {showTeamFeatures && (
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="flex-1 min-w-[140px] rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              >
                <option value="">Kişi ata (opsiyonel)</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profile?.full_name || "Bilinmiyor"}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleAdd}
              className="px-4 py-2.5 rounded-lg chat-gradient text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Ekle
            </button>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Not (opsiyonel)"
            rows={2}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        {(["all", "upcoming", "overdue", "done"] as const).map((f) => {
          const labels = { all: "Tümü", upcoming: "Yaklaşan", overdue: "Gecikmiş", done: "Tamamlanan" };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Reminders list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-2/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <CalendarClock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {reminders.length === 0 ? "Henüz hatırlatıcı eklenmemiş" : "Bu filtrede hatırlatıcı yok"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const status = getStatusInfo(r.reminder_date, r.done);
            const StatusIcon = status.icon;
            return (
              <div
                key={r.id}
                className={`glass-card rounded-lg p-4 flex items-start gap-3 transition-all ${r.done ? "opacity-60" : ""}`}
              >
                <button
                  onClick={() => toggleDone(r.id)}
                  className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    r.done
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-border hover:border-primary"
                  }`}
                >
                  {r.done && <CheckCircle2 className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className={`text-sm font-medium ${r.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {r.title}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${status.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                    {r.assignee_name && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <User className="w-3 h-3" />
                        {r.assignee_name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(r.reminder_date)}</p>
                  {r.note && <p className="text-xs text-muted-foreground mt-1">{r.note}</p>}
                </div>
                <button
                  onClick={() => deleteReminder(r.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RemindersPanel;
