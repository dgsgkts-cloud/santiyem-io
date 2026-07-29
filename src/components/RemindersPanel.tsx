import { useState, useMemo } from "react";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import {
  CalendarClock, Plus, Trash2, CheckCircle2, Circle, Sparkles,
  FileSignature, FileText, Banknote, X,
} from "lucide-react";
import { useReminders } from "@/hooks/useReminders";
import { useUser } from "@/contexts/UserContext";
import { useTeam } from "@/hooks/useTeam";
import { useAutoReminders, AutoReminder, AutoReminderSeverity } from "@/hooks/useAutoReminders";
import {
  OpsStatStrip, OpsFilterBar, OpsListShell, OpsRow, OpsRowAction,
  OpsSectionHeader, OpsEmpty, OpsSkeletonRows, type OpsTone,
} from "@/components/operations/opsUi";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "short" });
}

function getDaysDiff(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function relativeLabel(dateStr: string) {
  const d = getDaysDiff(dateStr);
  if (d < 0) return `${Math.abs(d)} gün gecikti`;
  if (d === 0) return "Bugün";
  if (d === 1) return "Yarın";
  return `${d} gün kaldı`;
}

const severityTone = (sev: AutoReminderSeverity): OpsTone => {
  switch (sev) {
    case "critical":
    case "danger": return "overdue";
    case "orange":
    case "warning": return "attention";
    default: return "info";
  }
};

const KIND_META = {
  check: { label: "Çek Vadesi", icon: Banknote },
  hakedis: { label: "Hakediş", icon: FileText },
  contract: { label: "Sözleşme", icon: FileSignature },
} as const;

type TypeFilter = "all" | "check" | "hakedis" | "contract" | "manual";
type Bucket = "overdue" | "today" | "upcoming" | "done";

const BUCKET_META: { key: Bucket; label: string; tone: OpsTone }[] = [
  { key: "overdue", label: "Gecikmiş", tone: "overdue" },
  { key: "today", label: "Bugün", tone: "attention" },
  { key: "upcoming", label: "Yaklaşan", tone: "info" },
  { key: "done", label: "Tamamlanan", tone: "positive" },
];

/**
 * SPRINT 38F — reminders as four clear time buckets:
 * Gecikmiş → Bugün → Yaklaşan → Tamamlanan.
 * One search + one chip row; automatic reminders live inline with an "Otomatik" pill.
 */
const RemindersPanel = () => {
  const { user, plan } = useUser();
  const { reminders, loading, addReminder, toggleDone, deleteReminder } = useReminders();
  const auto = useAutoReminders();
  const { members } = useTeam();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: string } | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");

  const handleAdd = async () => {
    if (!title.trim() || !date) return;
    const ok = await addReminder(title.trim(), date, note.trim(), assignedTo || null);
    if (ok) { setTitle(""); setDate(""); setNote(""); setAssignedTo(""); setShowForm(false); }
  };

  const goTo = (tab: string) => window.dispatchEvent(new CustomEvent("navigate-tab", { detail: tab }));

  const q = query.trim().toLowerCase();
  const matches = (t: string, n?: string | null) => !q || `${t} ${n || ""}`.toLowerCase().includes(q);

  const manual = useMemo(
    () => (typeFilter === "all" || typeFilter === "manual" ? reminders.filter(r => matches(r.title, r.note)) : []),
    [reminders, typeFilter, q]
  );

  const visibleAuto = useMemo<AutoReminder[]>(() => {
    if (typeFilter === "manual") return [];
    const list = typeFilter === "all" ? auto : auto.filter(a => a.kind === typeFilter);
    return list.filter(a => matches(a.title, a.note));
  }, [auto, typeFilter, q]);

  const bucketOf = (dateStr: string, done: boolean): Bucket => {
    if (done) return "done";
    const d = getDaysDiff(dateStr);
    return d < 0 ? "overdue" : d === 0 ? "today" : "upcoming";
  };

  const buckets = useMemo(() => {
    const map: Record<Bucket, { id: string; kind: "manual" | "auto"; date: string; item: any }[]> =
      { overdue: [], today: [], upcoming: [], done: [] };
    manual.forEach(r => map[bucketOf(r.reminder_date, r.done)].push({ id: r.id, kind: "manual", date: r.reminder_date, item: r }));
    visibleAuto.forEach(a => map[bucketOf(a.reminder_date, false)].push({ id: a.id, kind: "auto", date: a.reminder_date, item: a }));
    (Object.keys(map) as Bucket[]).forEach(k =>
      map[k].sort((a, b) => (k === "done" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)))
    );
    return map;
  }, [manual, visibleAuto]);

  const showTeamFeatures =
    (plan === "office_free" || plan === "office_pro" || plan === "office_custom") && members.length > 1;

  const typeChips: { value: TypeFilter; label: string; count: number }[] = [
    { value: "all", label: "Tümü", count: auto.length + reminders.length },
    { value: "check", label: "Çek", count: auto.filter(a => a.kind === "check").length },
    { value: "hakedis", label: "Hakediş", count: auto.filter(a => a.kind === "hakedis").length },
    { value: "contract", label: "Sözleşme", count: auto.filter(a => a.kind === "contract").length },
    { value: "manual", label: "Kendi Kayıtlarım", count: reminders.length },
  ];

  const totalVisible = manual.length + visibleAuto.length;

  return (
    <div className="max-w-3xl mx-auto px-5 pt-5 pb-6 space-y-4 animate-fade-in">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ds-heading text-foreground flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" /> Hatırlatıcılar
          </h1>
          <p className="ds-caption text-muted-foreground mt-0.5">
            {user ? "Gecikenler en üstte; çek, hakediş ve sözleşme uyarıları otomatik eklenir." : "Giriş yaparak hatırlatıcılarınızı kaydedin"}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="shrink-0 h-10 px-3.5 rounded-control chat-gradient text-primary-foreground ds-caption font-semibold flex items-center gap-1.5"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span className="hidden sm:inline">{showForm ? "İptal" : "Yeni Hatırlatıcı"}</span>
        </button>
      </header>

      {/* Summary — same order as the sections below */}
      <OpsStatStrip
        stats={BUCKET_META.map(b => ({
          label: b.label,
          value: buckets[b.key].length,
          tone: b.tone,
        }))}
      />

      {showForm && (
        <div className="rounded-card border border-border/80 bg-card shadow-soft p-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Hatırlatıcı başlığı"
            className="w-full h-11 rounded-control border border-input bg-background px-3 text-fs-sm focus:outline-none focus:border-primary/50"
          />
          <div className="flex gap-2 flex-wrap">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 min-w-[140px] h-11 rounded-control border border-input bg-background px-3 text-fs-sm focus:outline-none focus:border-primary/50"
            />
            {showTeamFeatures && (
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="flex-1 min-w-[140px] h-11 rounded-control border border-input bg-background px-3 text-fs-sm"
              >
                <option value="">Kişi ata (opsiyonel)</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>{m.profile?.full_name || "Bilinmiyor"}</option>
                ))}
              </select>
            )}
            <button
              onClick={handleAdd}
              className="h-11 px-4 rounded-control chat-gradient text-primary-foreground text-fs-sm font-semibold"
            >
              Ekle
            </button>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Not (opsiyonel)"
            rows={2}
            className="w-full resize-none rounded-control border border-input bg-background px-3 py-2.5 text-fs-sm focus:outline-none focus:border-primary/50"
          />
        </div>
      )}

      {/* One filter line only */}
      <OpsFilterBar
        query={query}
        onQuery={setQuery}
        placeholder="Hatırlatıcı ara…"
        chips={typeChips}
        active={typeFilter}
        onChip={(v) => setTypeFilter(v as TypeFilter)}
      />

      {loading ? (
        <OpsSkeletonRows rows={5} />
      ) : totalVisible === 0 ? (
        <OpsEmpty
          icon="⏰"
          title={reminders.length === 0 && auto.length === 0 ? "Henüz hatırlatıcı yok" : "Bu filtrede hatırlatıcı yok"}
          description={
            reminders.length === 0 && auto.length === 0
              ? "Bir hatırlatıcı ekleyin; ayrıca çek vadeleri, hakediş ödemeleri ve sözleşme bitişleri otomatik olarak burada listelenir."
              : "Aramayı veya filtreyi temizleyip tekrar deneyin."
          }
          action={
            <button
              onClick={() => setShowForm(true)}
              className="h-10 px-4 rounded-control chat-gradient text-primary-foreground text-fs-sm font-semibold"
            >
              Hatırlatıcı ekle
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {BUCKET_META.map(b => {
            const items = buckets[b.key];
            if (items.length === 0) return null;
            return (
              <section key={b.key} className="space-y-2">
                <OpsSectionHeader title={b.label} count={items.length} />
                <OpsListShell>
                  {items.map(({ id, kind, item }) =>
                    kind === "auto" ? (
                      <OpsRow
                        key={id}
                        onClick={() => goTo(item.navigateTab)}
                        rail={severityTone(item.severity)}
                        title={item.title}
                        status={<span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3" />{KIND_META[item.kind as keyof typeof KIND_META].label}</span>}
                        statusTone={severityTone(item.severity)}
                        subtitle={item.note || formatDate(item.reminder_date)}
                        amount={<span className="text-muted-foreground">{formatDate(item.reminder_date)}</span>}
                        meta={relativeLabel(item.reminder_date)}
                      />
                    ) : (
                      <OpsRow
                        key={id}
                        rail={b.key === "overdue" ? "overdue" : b.key === "today" ? "attention" : undefined}
                        title={
                          <span className={item.done ? "line-through text-muted-foreground" : undefined}>{item.title}</span>
                        }
                        status={item.assignee_name || undefined}
                        statusTone="neutral"
                        subtitle={
                          <span className="flex items-center gap-2 flex-wrap">
                            <span>{formatDate(item.reminder_date)}</span>
                            {item.note && <span className="truncate">{item.note}</span>}
                          </span>
                        }
                        amount={
                          <span className={b.key === "overdue" ? "text-rose-400" : "text-muted-foreground"}>
                            {item.done ? "Tamamlandı" : relativeLabel(item.reminder_date)}
                          </span>
                        }
                        actions={
                          <>
                            <OpsRowAction
                              label={item.done ? "Geri al" : "Tamamla"}
                              icon={item.done ? CheckCircle2 : Circle}
                              onClick={() => toggleDone(item.id)}
                              tone={item.done ? "text-emerald-400" : "hover:text-emerald-400"}
                            />
                            <OpsRowAction
                              label="Sil"
                              icon={Trash2}
                              onClick={() => setDeleteTarget({ id: item.id, name: item.title, type: "Hatırlatıcıyı" })}
                              tone="sm:opacity-0 sm:group-hover:opacity-100 hover:text-destructive"
                            />
                          </>
                        }
                      />
                    )
                  )}
                </OpsListShell>
              </section>
            );
          })}
        </div>
      )}

      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { if (deleteTarget) deleteReminder(deleteTarget.id); }}
        title={`${deleteTarget?.type || "Hatırlatıcıyı"} Sil`}
        itemName={deleteTarget?.name}
      />
    </div>
  );
};

export default RemindersPanel;
