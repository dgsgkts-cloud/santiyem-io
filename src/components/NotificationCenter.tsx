// Sprint 25 — Global Notification & Workflow Center (frontend only).
// Combines: Notifications, Approval Center, Global Activity, My Work,
// Pinned Items, Smart Reminders. Reuses existing data via hooks.
import { useEffect, useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Bell, CheckCircle2, Clock, AlertTriangle, DollarSign, FileText, Users,
  Sparkles, Pin, PinOff, ClipboardCheck, X, Check, MessageSquare, Package,
  Shield, Calendar, FolderOpen, History, ChevronRight, Search as SearchIcon,
} from "lucide-react";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { useProjects } from "@/hooks/useProjects";
import { useCashPayments } from "@/hooks/useCashPayments";
import { useCashCollections } from "@/hooks/useCashCollections";
import { useReminders } from "@/hooks/useReminders";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { formatNumber0 } from "@/lib/formatCurrency";
import { getPinned, togglePin, getRecent, type PinnedItem, type RecentItem } from "@/lib/workspaceStore";
import { toast } from "sonner";
import { OpsSectionHeader, OpsEmpty, OpsSkeletonRows } from "@/components/operations/opsUi";

type TabKey = "notifications" | "approvals" | "activity" | "mywork" | "pinned" | "reminders";
type NotifFilter = "all" | "unread" | "finance" | "projects" | "personnel" | "ai";
type PriorityKey = "critical" | "today" | "earlier" | "completed";

/** Priority is communicated with a calm dot + label, never with loud fills. */
const PRIORITY_GROUPS: { key: PriorityKey; label: string; tone: "overdue" | "attention" | "info" | "positive" }[] = [
  { key: "critical",  label: "Kritik",       tone: "overdue" },
  { key: "today",     label: "Bugün",        tone: "attention" },
  { key: "earlier",   label: "Yaklaşan",     tone: "info" },
  { key: "completed", label: "Tamamlanan",   tone: "positive" },
];

const DOT_TONE: Record<string, string> = {
  overdue: "bg-rose-400", attention: "bg-amber-400", info: "bg-sky-400", positive: "bg-emerald-400",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate?: (tab: string, projectId?: string) => void;
}

const TAB_META: { key: TabKey; label: string; Icon: any }[] = [
  { key: "notifications", label: "Bildirimler", Icon: Bell },
  { key: "approvals",     label: "Onaylar",     Icon: ClipboardCheck },
  { key: "activity",      label: "Aktivite",    Icon: History },
  { key: "mywork",        label: "İşlerim",     Icon: CheckCircle2 },
  { key: "pinned",        label: "Sabit",       Icon: Pin },
  { key: "reminders",     label: "Hatırlatıcı", Icon: Sparkles },
];

const NotificationCenter = ({ open, onClose, onNavigate }: Props) => {
  const { user } = useUser();
  const [tab, setTab] = useState<TabKey>("notifications");
  const [filter, setFilter] = useState<NotifFilter>("all");
  const [query, setQuery] = useState("");

  const { notifications, unreadCount, markAsRead, markAllAsRead, isRead, hasValidDestination, bulkRunning, loading: notifLoading } = useNotifications();
  const { projects } = useProjects();
  const { payments = [] } = useCashPayments();
  const { collections = [] } = useCashCollections();
  const { reminders } = useReminders();

  // Cross-project tasks (frontend fetch — reuses tasks table only, no schema change)
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [allHakedis, setAllHakedis] = useState<any[]>([]);
  const [allFiles, setAllFiles] = useState<any[]>([]);
  const [allNotes, setAllNotes] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !open) return;
    (async () => {
      const [t, h, f, n] = await Promise.all([
        supabase.from("tasks").select("id, title, status, priority, due_date, project_id, assigned_to, created_at").limit(200),
        supabase.from("project_hakedis").select("id, project_id, period, net, status, created_at").limit(100),
        supabase.from("project_files").select("id, project_id, file_name, created_at").order("created_at", { ascending: false }).limit(30),
        supabase.from("project_notes").select("id, project_id, content, created_at").order("created_at", { ascending: false }).limit(30),
      ]);
      setAllTasks(t.data || []);
      setAllHakedis(h.data || []);
      setAllFiles(f.data || []);
      setAllNotes(n.data || []);
    })();
  }, [user, open]);

  const [pinned, setPinned] = useState<PinnedItem[]>(getPinned());
  const [recent, setRecent] = useState<RecentItem[]>(getRecent());
  useEffect(() => {
    const p = () => setPinned(getPinned());
    const r = () => setRecent(getRecent());
    window.addEventListener("santiyem-pinned-changed", p);
    window.addEventListener("santiyem-recent-changed", r);
    return () => { window.removeEventListener("santiyem-pinned-changed", p); window.removeEventListener("santiyem-recent-changed", r); };
  }, []);

  const projectName = (id?: string | null) => projects.find(p => p.id === id)?.name || "—";

  /* ================ NOTIFICATIONS (categorized) ================ */
  const categorized = useMemo(() => {
    return notifications.map(n => {
      const cat: NotifFilter = /ödem|tahsil|fatura|hakediş/i.test(n.title + n.message) ? "finance"
        : /personel|işçi|puantaj/i.test(n.title + n.message) ? "personnel"
        : "projects";
      return { ...n, cat };
    });
  }, [notifications]);

  const filteredNotifs = useMemo(() => {
    return categorized.filter(n => {
      if (filter === "unread" && isRead(n.id)) return false;
      if (filter === "finance" && n.cat !== "finance") return false;
      if (filter === "projects" && n.cat !== "projects") return false;
      if (filter === "personnel" && n.cat !== "personnel") return false;
      if (filter === "ai") return false; // AI items are rendered from smartReminders below
      if (query && !(`${n.title} ${n.message}`).toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [categorized, filter, isRead, query]);


  /* SPRINT 38G — priority first: Kritik → Bugün → Daha Önce → Tamamlandı */
  const priorityGroups = useMemo(() => {
    const g: Record<PriorityKey, typeof filteredNotifs> = { critical: [], today: [], earlier: [], completed: [] };
    filteredNotifs.forEach(n => {
      if (n.completed) g.completed.push(n);
      else if (n.daysLeft < 0) g.critical.push(n);
      else if (n.daysLeft === 0) g.today.push(n);
      else g.earlier.push(n);
    });
    g.critical.sort((a, b) => a.daysLeft - b.daysLeft);
    g.earlier.sort((a, b) => a.daysLeft - b.daysLeft);
    return g;
  }, [filteredNotifs]);

  /* ================ APPROVALS ================ */
  const approvals = useMemo(() => {
    const items: { id: string; kind: string; title: string; sub: string; date: string; }[] = [];
    allHakedis.filter(h => /bekli|hazırla/i.test(h.status || "")).forEach(h => items.push({
      id: `h-${h.id}`, kind: "Hakediş", title: `${h.period} — ${projectName(h.project_id)}`,
      sub: `₺${formatNumber0(h.net)} • Onay bekliyor`, date: h.created_at,
    }));
    payments.filter(p => /bekli|plan/i.test(p.status || "")).forEach(p => items.push({
      id: `p-${p.id}`, kind: "Ödeme", title: `${p.recipient} — ${projectName(p.project_id)}`,
      sub: `₺${formatNumber0(p.amount)} • ${p.payment_date}`, date: p.created_at,
    }));
    allTasks.filter(t => t.status === "in_progress" && (t.priority === "high" || t.priority === "urgent")).slice(0, 8).forEach(t => items.push({
      id: `t-${t.id}`, kind: "Görev Onayı", title: t.title, sub: projectName(t.project_id), date: t.created_at,
    }));
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allHakedis, payments, allTasks, projects]);

  /* ================ ACTIVITY ================ */
  const activity = useMemo(() => {
    const arr: { id: string; text: string; date: Date; project: string; color: string; }[] = [];
    allFiles.forEach(f => arr.push({ id: `af-${f.id}`, text: `Dosya yüklendi: ${f.file_name}`, date: new Date(f.created_at), project: projectName(f.project_id), color: "#A855F7" }));
    allNotes.forEach(n => arr.push({ id: `an-${n.id}`, text: `Not: ${(n.content || "").slice(0, 60)}`, date: new Date(n.created_at), project: projectName(n.project_id), color: "#3B82F6" }));
    allHakedis.forEach(h => arr.push({ id: `ah-${h.id}`, text: `Hakediş ${h.period} — ₺${formatNumber0(h.net)}`, date: new Date(h.created_at), project: projectName(h.project_id), color: "#22C55E" }));
    allTasks.slice(0, 20).forEach(t => arr.push({ id: `at-${t.id}`, text: `Görev: ${t.title}`, date: new Date(t.created_at), project: projectName(t.project_id), color: "#FF6B2B" }));
    return arr.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 40);
  }, [allFiles, allNotes, allHakedis, allTasks, projects]);
  const activityGroups = useMemo(() => groupByDate(activity, i => i.date), [activity]);

  /* ================ MY WORK ================ */
  const myWork = useMemo(() => {
    const uid = user?.id;
    const mine = allTasks.filter(t => t.assigned_to === uid);
    const today = new Date(new Date().toDateString());
    const todayTasks = mine.filter(t => t.due_date && new Date(t.due_date).toDateString() === today.toDateString() && t.status !== "done");
    const lateTasks = mine.filter(t => t.due_date && new Date(t.due_date) < today && t.status !== "done");
    const pendingPayments = payments.filter(p => /bekli|plan/i.test(p.status || "")).slice(0, 5);
    return { todayTasks, lateTasks, approvals: approvals.slice(0, 5), pendingPayments };
  }, [allTasks, user, payments, approvals]);

  /* ================ REMINDERS ================ */
  const smartReminders = useMemo(() => {
    const arr: { id: string; text: string; when: string; tone: "warn" | "danger" | "info" }[] = [];
    reminders?.forEach(r => {
      const d = new Date(r.reminder_date);
      const diff = Math.round((d.getTime() - Date.now()) / 86400000);
      if (diff <= 7 && !r.done) arr.push({ id: `r-${r.id}`, text: r.title, when: diff <= 0 ? "Bugün / gecikmiş" : `${diff} gün`, tone: diff <= 0 ? "danger" : "warn" });
    });
    allHakedis.filter(h => /bekli|hazırla/i.test(h.status || "")).slice(0, 5).forEach(h =>
      arr.push({ id: `hr-${h.id}`, text: `Hakediş: ${h.period}`, when: "Onay bekliyor", tone: "warn" })
    );
    payments.filter(p => /bekli|plan/i.test(p.status || "")).slice(0, 5).forEach(p =>
      arr.push({ id: `pr-${p.id}`, text: `Ödeme: ${p.recipient}`, when: p.payment_date, tone: "info" })
    );
    return arr;
  }, [reminders, allHakedis, payments]);

  const aiSuggestions = useMemo(() => (filter === "all" || filter === "ai" ? smartReminders.slice(0, 4) : []), [smartReminders, filter]);

  const handleNotifClick = (n: AppNotification) => {
    markAsRead([n.id]);
    if (n.targetTab === "projects" && n.targetProjectId) onNavigate?.("projects", n.targetProjectId);
    else onNavigate?.(n.targetTab);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[440px] sm:max-w-[460px] p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <Bell className="w-4 h-4 text-[#FF6B2B]" />
            İş Merkezi
            {unreadCount > 0 && (
              <span className="ml-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 bg-red-500">
                {unreadCount}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-2 pt-2 border-b border-border overflow-x-auto">
          {TAB_META.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11.5px] font-medium transition-colors ${tab === t.key ? "bg-[#FF6B2B]/15 text-[#FF6B2B]" : "text-muted-foreground hover:bg-muted/40"}`}>
              <t.Icon className="w-3 h-3" /> {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3 animate-fade-in">
          {tab === "notifications" && (
            <>
              {/* SPRINT 38G — search + a short chip row; everything else lives in the groups */}
              <div className="flex items-center gap-1.5 rounded-control border border-border bg-background px-2.5 h-10 mb-2">
                <SearchIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Bildirimlerde ara…" className="bg-transparent outline-none text-fs-sm flex-1 min-w-0" />
                {query && <button onClick={() => setQuery("")} className="text-muted-foreground"><X className="w-3.5 h-3.5" /></button>}
              </div>
              <div className="flex items-center gap-1.5 mb-3 overflow-x-auto no-scrollbar">
                {(["all", "unread", "finance", "projects", "personnel"] as NotifFilter[]).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-2.5 h-7 rounded-pill ds-caption whitespace-nowrap border shrink-0 transition-colors ${filter === f ? "bg-primary/[0.08] text-foreground border-primary/40" : "border-border/70 text-muted-foreground hover:text-foreground"}`}>
                    {f === "all" ? "Tümü" : f === "unread" ? "Okunmamış" : f === "finance" ? "Finans" : f === "projects" ? "Projeler" : "Personel"}
                  </button>
                ))}
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="ml-auto shrink-0 ds-caption font-medium text-primary flex items-center gap-1 h-7 px-2">
                    <Check className="w-3.5 h-3.5" /> Tümünü okundu
                  </button>
                )}
              </div>

              {notifLoading ? (
                <OpsSkeletonRows rows={5} />
              ) : filteredNotifs.length === 0 ? (
                <OpsEmpty
                  icon="🔔"
                  title={notifications.length === 0 ? "Şu an dikkat isteyen bir şey yok" : "Bu filtrede bildirim yok"}
                  description={
                    notifications.length === 0
                      ? "Yaklaşan hatırlatıcılar, kilometre taşları ve gecikmeler burada otomatik toplanır. Bir hatırlatıcı ekleyin ya da projeye kilometre taşı tanımlayın."
                      : "Filtreyi veya aramayı temizleyip tekrar deneyin."
                  }
                />
              ) : (
                <div className="space-y-4">
                  {PRIORITY_GROUPS.map(g => {
                    const list = priorityGroups[g.key];
                    if (!list.length) return null;
                    return (
                      <section key={g.key} className="space-y-1.5">
                        <OpsSectionHeader title={g.label} count={list.length} />
                        <div className="rounded-card border border-border/80 bg-card overflow-hidden divide-y divide-border/60">
                          {list.map(n => (
                            <NotifRow
                              key={n.id}
                              n={n}
                              read={isRead(n.id)}
                              tone={g.tone}
                              onOpen={() => handleNotifClick(n)}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}


                  {aiSuggestions.length > 0 && (
                    <section className="space-y-1.5">
                      <OpsSectionHeader title="AI Önerileri" count={aiSuggestions.length} icon={Sparkles} />
                      <div className="rounded-card border border-border/80 bg-card overflow-hidden divide-y divide-border/60">
                        {aiSuggestions.map(r => (
                          <div key={r.id} className="flex items-center gap-2.5 px-3" style={{ minHeight: 56 }}>
                            <PriorityDot tone={r.tone === "danger" ? "overdue" : r.tone === "warn" ? "attention" : "info"} />
                            <div className="flex-1 min-w-0">
                              <p className="ds-body font-medium text-foreground truncate">{r.text}</p>
                              <p className="ds-caption text-muted-foreground truncate">{r.when}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </>
          )}

          {tab === "approvals" && (
            approvals.length === 0 ? <OpsEmpty icon="✅" title="Onay kuyruğu temiz" description="Hakediş, ödeme ve yüksek öncelikli görevler onay beklediğinde burada listelenir." /> : (
              <div className="space-y-2">
                <div className="rounded-lg border border-[#FF6B2B]/20 p-2.5 flex items-center gap-2"
                     style={{ background: "linear-gradient(135deg, rgba(255,107,43,0.07), transparent)" }}>
                  <Sparkles className="w-3.5 h-3.5 text-[#FF6B2B]" />
                  <p className="text-[11.5px] text-foreground/90"><b>{approvals.length}</b> kayıt onayınızı bekliyor.</p>
                </div>
                {approvals.map(a => (
                  <div key={a.id} className="rounded-lg border border-border bg-background p-3 animate-fade-in">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#FF6B2B]/15 text-[#FF6B2B] uppercase">{a.kind}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{new Date(a.date).toLocaleDateString("tr-TR")}</span>
                    </div>
                    <p className="text-[12.5px] font-medium text-foreground">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground mb-2">{a.sub}</p>
                    <div className="flex items-center gap-1.5">
                      <ApprovalBtn tone="approve" onClick={() => toast.success("Onaylandı")}>Onayla</ApprovalBtn>
                      <ApprovalBtn tone="reject" onClick={() => toast.error("Reddedildi")}>Reddet</ApprovalBtn>
                      <ApprovalBtn tone="ghost" onClick={() => toast.info("Revizyon istendi")}>Revizyon İste</ApprovalBtn>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === "activity" && (
            activity.length === 0 ? <OpsEmpty icon="🧭" title="Bugün kayda değer bir hareket yok" description="Dosya, not, hakediş ve görev hareketleri işlendikçe bu akış otomatik dolar." /> : (
              <div className="space-y-3">
                {(["Bugün", "Dün", "Bu Hafta", "Daha Önce"] as const).map(section => {
                  const list = (activityGroups as any)[section] || [];
                  if (list.length === 0) return null;
                  return (
                    <div key={section}>
                      <SectionLabel>{section}</SectionLabel>
                      <div className="space-y-1.5">
                        {list.map((i: any) => (
                          <div key={i.id} className="rounded-md bg-background border border-border p-2 flex items-start gap-2 animate-fade-in">
                            <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: i.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11.5px] text-foreground truncate">{i.text}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{i.project} · {i.date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {tab === "mywork" && (
            <div className="space-y-3">
              <MyWorkGroup title="Bugünkü Görevler" Icon={Clock} items={myWork.todayTasks.map(t => ({ label: t.title, sub: projectName(t.project_id) }))} />
              <MyWorkGroup title="Geciken Görevler" Icon={AlertTriangle} tone="danger" items={myWork.lateTasks.map(t => ({ label: t.title, sub: `${projectName(t.project_id)} · ${t.due_date}` }))} />
              <MyWorkGroup title="Bekleyen Onaylar" Icon={ClipboardCheck} items={myWork.approvals.map(a => ({ label: a.title, sub: a.sub }))} />
              <MyWorkGroup title="Sıradaki Ödemeler" Icon={DollarSign} items={myWork.pendingPayments.map(p => ({ label: p.recipient, sub: `₺${formatNumber0(p.amount)} · ${p.payment_date}` }))} />
              <MyWorkGroup title="Son Görüntülenen" Icon={History} items={recent.slice(0, 6).map(r => ({ label: r.label, sub: r.sub }))} />
              <MyWorkGroup title="Sabitlenen Projeler" Icon={Pin} items={pinned.filter(p => p.kind === "project").map(p => ({ label: p.label, sub: p.sub }))} />
            </div>
          )}

          {tab === "pinned" && (
            pinned.length === 0 ? <OpsEmpty icon="📌" title="Sabitlenmiş öğe yok" description="Sık kullandığınız proje ve kayıtları kartlardaki iğne ikonuyla sabitleyin; buradan tek dokunuşla açılır." /> : (
              <div className="space-y-1.5">
                {pinned.map(p => (
                  <div key={`${p.kind}-${p.id}`} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5 animate-fade-in">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">{p.kind}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground truncate">{p.label}</p>
                      {p.sub && <p className="text-[10.5px] text-muted-foreground truncate">{p.sub}</p>}
                    </div>
                    <button onClick={() => { togglePin({ ...p }); }} className="text-muted-foreground hover:text-red-500">
                      <PinOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === "reminders" && (
            smartReminders.length === 0 ? <OpsEmpty icon="✨" title="AI şu an bir risk görmüyor" description="Yaklaşan hatırlatıcılar, onay bekleyen hakedişler ve planlı ödemeler oluştukça AI burada uyarır." /> : (
              <div className="space-y-1.5">
                <div className="rounded-lg border border-[#FF6B2B]/20 p-2.5 flex items-center gap-2 mb-2"
                     style={{ background: "linear-gradient(135deg, rgba(255,107,43,0.07), transparent)" }}>
                  <Sparkles className="w-3.5 h-3.5 text-[#FF6B2B]" />
                  <p className="text-[11.5px] text-foreground/90">AI, iş akışınızdan {smartReminders.length} akıllı hatırlatıcı çıkardı.</p>
                </div>
                {smartReminders.map(r => {
                  const color = r.tone === "danger" ? "#EF4444" : r.tone === "warn" ? "#F59E0B" : "#3B82F6";
                  return (
                    <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5 animate-fade-in">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
                        <Clock className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-foreground truncate">{r.text}</p>
                        <p className="text-[10.5px] text-muted-foreground">{r.when}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

/* ---------- Helpers ---------- */
const PriorityDot = ({ tone }: { tone: string }) => (
  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_TONE[tone] || "bg-muted-foreground/50"}`} aria-hidden />
);

/** Compact notification row: title → description → time → quick action. */
const NotifRow = ({ n, read, tone, onOpen }: {
  n: AppNotification & { cat?: string };
  read: boolean;
  tone: string;
  onOpen: () => void;
}) => {
  const when = n.completed
    ? "Tamamlandı"
    : n.daysLeft < 0 ? `${Math.abs(n.daysLeft)} gün gecikti`
    : n.daysLeft === 0 ? "Bugün"
    : n.daysLeft === 1 ? "Yarın" : `${n.daysLeft} gün`;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${read ? "Okunmuş bildirim" : "Okunmamış bildirim"}: ${n.title}. ${n.message}. ${when}`}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className={`group relative flex items-center gap-2.5 px-3 cursor-pointer transition-colors ${read ? "bg-transparent hover:bg-muted/25" : "bg-primary/[0.05] hover:bg-primary/[0.09]"}`}
      style={{ minHeight: 56 }}
    >
      <PriorityDot tone={tone} />
      <div className="flex-1 min-w-0">
        <p className={`ds-body truncate ${read ? "font-normal text-foreground/80" : "font-semibold text-foreground"}`}>{n.title}</p>
        <p className="ds-caption text-muted-foreground truncate">{n.message}</p>
      </div>
      <span className={`ds-caption shrink-0 tabular-nums ${tone === "overdue" ? "text-rose-400" : "text-muted-foreground"}`}>{when}</span>
      <span
        aria-hidden
        className={`w-2 h-2 rounded-full shrink-0 ${read ? "opacity-0" : "bg-primary"}`}
      />
    </div>
  );
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{children}</p>
);
const ApprovalBtn = ({ tone, onClick, children }: { tone: "approve" | "reject" | "ghost"; onClick: () => void; children: React.ReactNode }) => {
  const c = tone === "approve" ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
          : tone === "reject" ? "bg-red-500/15 text-red-500 hover:bg-red-500/25"
          : "text-muted-foreground hover:bg-muted/60";
  return <button onClick={onClick} className={`flex-1 text-[11px] font-medium px-2 py-1.5 rounded-md ${c}`}>{children}</button>;
};
const MyWorkGroup = ({ title, Icon, items, tone }: { title: string; Icon: any; items: { label: string; sub?: string }[]; tone?: "danger" }) => (
  <div>
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon className={`w-3.5 h-3.5 ${tone === "danger" ? "text-red-500" : "text-[#FF6B2B]"}`} />
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <span className="ml-auto text-[10px] text-muted-foreground">{items.length}</span>
    </div>
    {items.length === 0 ? (
      <p className="text-[11px] text-muted-foreground pl-5">Kayıt yok.</p>
    ) : (
      <div className="space-y-1">
        {items.slice(0, 5).map((it, i) => (
          <div key={i} className="rounded-md bg-background border border-border px-2.5 py-1.5 animate-fade-in">
            <p className="text-[11.5px] font-medium text-foreground truncate">{it.label}</p>
            {it.sub && <p className="text-[10px] text-muted-foreground truncate">{it.sub}</p>}
          </div>
        ))}
      </div>
    )}
  </div>
);

const groupByDate = <T,>(list: T[], pick: (t: T) => Date) => {
  const now = new Date();
  const t0 = new Date(now.toDateString()).getTime();
  const y0 = t0 - 86400000; const w0 = t0 - 7 * 86400000;
  const buckets: Record<string, T[]> = { "Bugün": [], "Dün": [], "Bu Hafta": [], "Daha Önce": [] };
  list.forEach(x => {
    const ts = pick(x).getTime();
    if (ts >= t0) buckets["Bugün"].push(x);
    else if (ts >= y0) buckets["Dün"].push(x);
    else if (ts >= w0) buckets["Bu Hafta"].push(x);
    else buckets["Daha Önce"].push(x);
  });
  return buckets;
};

export default NotificationCenter;
