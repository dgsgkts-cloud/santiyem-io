import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useMeetingRecorder } from "@/hooks/useMeetingRecorder";
import { generateMeetingPdf } from "@/lib/meetingPdf";
import MeetingDetailSheet from "@/components/meetings/MeetingDetailSheet";
import { PRIORITY_LABEL, confidenceTone, toTaskPriority } from "@/lib/meetings/meetingModel";
import { toast } from "sonner";
import {
  Mic, Square, Pause, Play, Loader2, Calendar, Users, ListChecks, FileText,
  Search, ChevronRight, AlertTriangle, CheckCircle2, Sparkles, Trash2, X,
  Plus, Download, MessageSquare, Clock, HardHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  OpsStatStrip, OpsListShell, OpsRow, OpsRowAction, OpsSectionHeader, OpsEmpty, OpsSkeletonRows, OpsFilterBar,
} from "@/components/operations/opsUi";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

type Meeting = {
  id: string;
  title: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  project_id: string | null;
  meeting_type: string;
  location: string | null;
  tags: string[];
};

type ActionItem = {
  id: string;
  meeting_id: string;
  title: string;
  assignee_name: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  description: string | null;
  source_quote: string | null;
  speaker_label: string | null;
  confidence: number | null;
  assignee_user_id: string | null;
  created_task_id: string | null;
};

type Analysis = {
  summary: string | null;
  decisions: any[];
  risks: any[];
  action_items: any[];
  questions: string[];
  numbers: any[];
  next_meeting: any;
};

type Participant = {
  id?: string;
  display_name: string;
  company?: string | null;
  role?: string | null;
};

const fmtTime = (s: number) => {
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
};

const prioColor: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-500 border-red-500/30",
  high: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  low: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
};

export default function MeetingCenterPage() {
  const { user } = useUser();
  const [activeSection, setActiveSection] = useState<"dashboard" | "new" | "history" | "actions">("dashboard");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: m }, { data: a }, { data: p }] = await Promise.all([
      supabase.from("meetings").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("meeting_action_items").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("projects").select("id,name").order("created_at", { ascending: false }),
    ]);
    setMeetings((m as any) || []);
    setActions((a as any) || []);
    setProjects((p as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Voice Copilot integration — respond to "Toplantıyı başlat" events
  useEffect(() => {
    const openHandler = () => setActiveSection("new");
    window.addEventListener("meeting-center:start", openHandler);
    return () => window.removeEventListener("meeting-center:start", openHandler);
  }, []);

  const filteredMeetings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return meetings;
    return meetings.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        (m.location || "").toLowerCase().includes(q) ||
        (m.tags || []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [meetings, search]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todaysMeetings = meetings.filter((m) => (m.started_at || "").slice(0, 10) === today).length;
    const pending = actions.filter((a) => a.status === "pending").length;
    const overdue = actions.filter(
      (a) => a.due_date && a.due_date < today && !["done", "rejected"].includes(a.status),
    ).length;
    const completed = actions.filter((a) => a.status === "done").length;
    const rate = actions.length ? Math.round((completed / actions.length) * 100) : 0;
    return { todaysMeetings, pending, overdue, rate };
  }, [meetings, actions]);

  const projectName = (pid: string | null) => projects.find((p) => p.id === pid)?.name || null;

  return (
    <div className="bg-background">
      {/* Header — SPRINT 38G: one compact bar, thumb-reachable primary action */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 pt-4 pb-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="ds-heading text-foreground flex items-center gap-2">
              <Mic className="w-4 h-4 text-primary shrink-0" /> Toplantı Merkezi
            </h1>
            <p className="ds-caption text-muted-foreground mt-0.5 truncate">Kaydedin, AI özetlesin, aksiyonlar göreve dönüşsün</p>
          </div>
          <Button size="sm" onClick={() => setActiveSection("new")} className="gap-1.5 shrink-0 h-10">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Yeni Toplantı</span>
          </Button>
        </div>
        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-5 flex gap-1 overflow-x-auto no-scrollbar">
          {([
            ["dashboard", "Dashboard"],
            ["new", "Canlı Toplantı"],
            ["history", "Geçmiş"],
            ["actions", "Aksiyonlar"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeSection === id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 pt-5 pb-6">
        {loading ? (
          <div className="space-y-4"><OpsSkeletonRows rows={6} /></div>
        ) : activeSection === "dashboard" ? (
          <Dashboard
            stats={stats}
            meetings={meetings}
            onOpen={setSelectedMeeting}
            onNew={() => setActiveSection("new")}
            projectName={projectName}
          />
        ) : activeSection === "new" ? (
          <NewMeeting
            projects={projects}
            onDone={async (id) => {
              const { data } = await supabase.from("meetings").select("*").eq("id", id).maybeSingle();
              if (data) setSelectedMeeting(data as any);
              void load();
            }}
          />
        ) : activeSection === "history" ? (
          <History
            meetings={filteredMeetings}
            search={search}
            setSearch={setSearch}
            onOpen={setSelectedMeeting}
            projectName={projectName}
            onDelete={async (id) => {
              if (!confirm("Toplantıyı sil?")) return;
              await supabase.from("meetings").delete().eq("id", id);
              toast.success("Silindi");
              void load();
            }}
          />
        ) : (
          <Actions
            actions={actions}
            meetings={meetings}
            onRefresh={load}
          />
        )}
      </div>

      {selectedMeeting && (
        <MeetingDetailSheet
          meetingId={selectedMeeting.id}
          fallbackTitle={selectedMeeting.title}
          projectName={projectName(selectedMeeting.project_id)}
          onClose={() => { setSelectedMeeting(null); void load(); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────
function Dashboard({
  stats, meetings, onOpen, onNew, projectName,
}: {
  stats: { todaysMeetings: number; pending: number; overdue: number; rate: number };
  meetings: Meeting[];
  onOpen: (m: Meeting) => void;
  onNew: () => void;
  projectName: (id: string | null) => string | null;
}) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const today = meetings.filter((m) => (m.started_at || "").slice(0, 10) === todayKey);
  const live = meetings.filter((m) => m.status === "live");
  const recent = meetings.filter((m) => !today.includes(m)).slice(0, 6);

  const time = (m: Meeting) =>
    m.started_at ? new Date(m.started_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "—";

  const meetingRow = (m: Meeting, isToday: boolean) => (
    <OpsRow
      key={m.id}
      onClick={() => onOpen(m)}
      rail={m.status === "live" ? "overdue" : isToday ? "attention" : undefined}
      title={m.title}
      status={<StatusText status={m.status} />}
      statusTone={m.status === "live" ? "overdue" : m.status === "completed" ? "positive" : "neutral"}
      subtitle={
        [
          projectName(m.project_id),
          m.location,
          m.duration_seconds ? fmtTime(m.duration_seconds) : null,
        ].filter(Boolean).join(" · ") || "Detay yok"
      }
      amount={<span className="text-muted-foreground">{time(m)}</span>}
      meta={m.started_at ? new Date(m.started_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : undefined}
      actions={<OpsRowAction label="Toplantıyı aç" icon={ChevronRight} onClick={() => onOpen(m)} />}
    />
  );

  return (
    <div className="space-y-5">
      {/* Today's schedule always sits at the top — the calendar view of this module */}
      <section className="space-y-2">
        <OpsSectionHeader
          title={`Bugünün Programı · ${new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}`}
          count={today.length}
          icon={Calendar}
        />
        {today.length === 0 ? (
          <OpsEmpty
            icon="🗓️"
            title="Bugün planlı toplantı yok"
            description="Bir toplantı başlattığınızda konuşma canlı olarak yazıya döner; AI özet, karar ve aksiyonları çıkarır."
            action={<Button size="sm" className="gap-1.5 h-10" onClick={onNew}><Mic className="w-4 h-4" /> Toplantı Başlat</Button>}
          />
        ) : (
          <OpsListShell>{today.map((m) => meetingRow(m, true))}</OpsListShell>
        )}
      </section>

      {live.length > 0 && (
        <div className="rounded-card border border-rose-500/25 bg-rose-500/[0.06] px-3.5 py-3 flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
          <p className="ds-body text-foreground flex-1 min-w-0 truncate">{live[0].title} · şu an canlı</p>
          <Button size="sm" variant="secondary" className="h-9" onClick={() => onOpen(live[0])}>Katıl</Button>
        </div>
      )}

      <OpsStatStrip
        stats={[
          { label: "Bugünkü Toplantı", value: stats.todaysMeetings, icon: Calendar, tone: "info" },
          { label: "Bekleyen Aksiyon", value: stats.pending, icon: ListChecks, tone: "attention" },
          { label: "Geciken", value: stats.overdue, icon: AlertTriangle, tone: stats.overdue > 0 ? "overdue" : "neutral" },
          { label: "Tamamlanma", value: `%${stats.rate}`, icon: CheckCircle2, tone: "positive" },
        ]}
      />

      <section className="space-y-2">
        <OpsSectionHeader title="Son Toplantılar" count={recent.length} />
        {recent.length === 0 ? (
          <OpsEmpty
            icon="🎙️"
            title="Henüz kayıtlı toplantı yok"
            description="İlk toplantınızı kaydedin; özet, kararlar ve sorumlu bazlı aksiyonlar otomatik üretilir."
            action={<Button size="sm" className="gap-1.5 h-10" onClick={onNew}><Plus className="w-4 h-4" /> Yeni Toplantı</Button>}
          />
        ) : (
          <OpsListShell>{recent.map((m) => meetingRow(m, false))}</OpsListShell>
        )}
      </section>
    </div>
  );
}

const STATUS_TEXT: Record<string, string> = {
  live: "Canlı", processing: "İşleniyor", completed: "Tamamlandı", failed: "Hata", scheduled: "Planlandı",
};
const StatusText = ({ status }: { status: string }) => <>{STATUS_TEXT[status] || status}</>;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    live: { label: "Canlı", cls: "bg-red-500/15 text-red-500" },
    processing: { label: "İşleniyor", cls: "bg-blue-500/15 text-blue-500" },
    completed: { label: "Tamamlandı", cls: "bg-emerald-500/15 text-emerald-500" },
    failed: { label: "Hata", cls: "bg-red-500/15 text-red-500" },
    scheduled: { label: "Planlandı", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status] || { label: status, cls: "bg-muted" };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>;
}

// ─────────────────────────────────────────────────────────
// New / Live Meeting
// ─────────────────────────────────────────────────────────
function NewMeeting({
  projects, onDone,
}: {
  projects: Array<{ id: string; name: string }>;
  onDone: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [location, setLocation] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantDraft, setParticipantDraft] = useState("");
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [liveLines, setLiveLines] = useState<Array<{ seq: number; text: string }>>([]);

  const recorder = useMeetingRecorder({
    meetingId: meetingId || "",
    language: "tr",
    onTranscript: (text, seq) => setLiveLines((prev) => [...prev, { seq, text }]),
  });

  const addParticipant = () => {
    const raw = participantDraft.trim();
    if (!raw) return;
    setParticipants((p) => [...p, { display_name: raw }]);
    setParticipantDraft("");
  };

  const startMeeting = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const t = title.trim() || `Toplantı ${new Date().toLocaleString("tr-TR")}`;
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (!uid) throw new Error("Oturum bulunamadı");
      const { data, error } = await supabase
        .from("meetings")
        .insert({
          user_id: uid,
          title: t,
          project_id: projectId || null,
          location: location || null,
          status: "live",
          started_at: new Date().toISOString(),
          meeting_type: projectId ? "project" : "office",
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      const id = (data as any).id as string;
      setMeetingId(id);
      if (participants.length) {
        await supabase.from("meeting_participants").insert(
          participants.map((p) => ({
            meeting_id: id,
            user_id: uid,
            display_name: p.display_name,
          })) as any,
        );
      }
      await recorder.start();
    } catch (e: any) {
      toast.error(e?.message || "Toplantı başlatılamadı");
    } finally {
      setCreating(false);
    }
  };

  /**
   * Kaydı bitirir: ses saklanır, boru hattı arka planda çalışır ve kullanıcı
   * beklemek zorunda kalmadan detay ekranında aşamaları canlı izler.
   */
  const finish = async () => {
    if (!meetingId) return;
    const id = meetingId;
    setAnalyzing(true);
    try {
      const audioPrefix = await recorder.stop();
      await supabase
        .from("meetings")
        .update({
          status: "processing",
          pipeline_stage: "transcribing",
          pipeline_error: null,
          ended_at: new Date().toISOString(),
          duration_seconds: recorder.elapsed,
          ...(audioPrefix ? { audio_path: audioPrefix } : {}),
        } as any)
        .eq("id", id);

      const { data: sess } = await supabase.auth.getSession();
      const jwt = sess?.session?.access_token;
      // Beklemeden tetikle — durum takibi detay ekranında yapılır.
      void fetch(`${SUPABASE_URL}/functions/v1/meeting-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt ?? ""}` },
        body: JSON.stringify({ meeting_id: id }),
      }).catch(() => {});

      toast.success("Toplantı kaydedildi · AI analiz hazırlanıyor");
      onDone(id);
      setMeetingId(null);
      setLiveLines([]);
      setTitle(""); setLocation(""); setParticipants([]);
    } catch (e: any) {
      toast.error(e?.message || "Toplantı kapatılamadı");
    } finally {
      setAnalyzing(false);
    }
  };

  // Live view
  if (meetingId) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">{title || "Canlı Toplantı"}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {recorder.isPaused ? "Duraklatıldı" : recorder.isRecording ? "Kayıtta" : "Hazırlanıyor"}
              </p>
            </div>
            <div className="text-2xl font-mono tabular-nums text-primary">{fmtTime(recorder.elapsed)}</div>
          </div>

          {/* Level meter */}
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(6, recorder.level * 100))}%` }}
            />
          </div>

          <div className="flex items-center gap-2">
            {recorder.isPaused ? (
              <Button onClick={recorder.resume} variant="secondary" className="gap-2">
                <Play className="w-4 h-4" /> Devam Et
              </Button>
            ) : (
              <Button onClick={recorder.pause} variant="secondary" className="gap-2">
                <Pause className="w-4 h-4" /> Duraklat
              </Button>
            )}
            <Button onClick={finish} variant="destructive" className="gap-2" disabled={analyzing}>
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
              {analyzing ? "Analiz ediliyor..." : "Toplantıyı Bitir"}
            </Button>
          </div>
          {recorder.error && <p className="text-xs text-red-500 mt-3">{recorder.error}</p>}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Canlı Transkript</h3>
          </div>
          {liveLines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Konuşma bekleniyor...</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {liveLines.map((l) => (
                <div key={l.seq} className="text-sm leading-relaxed">
                  <span className="text-xs text-muted-foreground mr-2">#{l.seq + 1}</span>
                  {l.text}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Pre-start form
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Card className="p-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Toplantı Başlığı</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ör. Haftalık şantiye toplantısı" className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Proje (opsiyonel)</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— Proje seçin —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Konum</label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ör. Şantiye ofisi" className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Katılımcılar</label>
          <div className="flex gap-2 mt-1">
            <Input
              value={participantDraft}
              onChange={(e) => setParticipantDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addParticipant(); } }}
              placeholder="İsim yazıp Enter'a basın"
            />
            <Button variant="secondary" onClick={addParticipant}>Ekle</Button>
          </div>
          {participants.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {participants.map((p, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {p.display_name}
                  <button onClick={() => setParticipants((arr) => arr.filter((_, x) => x !== i))} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Button
          size="lg"
          className="w-full gap-2 h-14 text-base"
          onClick={startMeeting}
          disabled={creating}
        >
          {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
          {creating ? "Başlatılıyor..." : "Toplantıyı Başlat"}
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">
          Mikrofon erişimi istenecek. Konuşmanız canlı olarak metne dönüştürülür ve toplantı bittiğinde AI özet + aksiyon üretir.
        </p>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// History
// ─────────────────────────────────────────────────────────
function History({
  meetings, search, setSearch, onOpen, projectName, onDelete,
}: {
  meetings: Meeting[];
  search: string;
  setSearch: (s: string) => void;
  onOpen: (m: Meeting) => void;
  projectName: (id: string | null) => string | null;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <OpsFilterBar query={search} onQuery={setSearch} placeholder="Toplantı, etiket veya konum ara…" />
      {meetings.length === 0 ? (
        <OpsEmpty
          icon="🔍"
          title={search ? "Aramanızla eşleşen toplantı yok" : "Geçmiş toplantı yok"}
          description={search ? "Farklı bir başlık, etiket veya konum deneyin." : "Kaydedilen her toplantı özeti, kararları ve aksiyonlarıyla birlikte burada arşivlenir."}
        />
      ) : (
        <OpsListShell>
          {meetings.map((m) => (
            <OpsRow
              key={m.id}
              onClick={() => onOpen(m)}
              rail={m.status === "live" ? "overdue" : undefined}
              title={m.title}
              status={<StatusText status={m.status} />}
              statusTone={m.status === "live" ? "overdue" : m.status === "completed" ? "positive" : "neutral"}
              subtitle={
                [
                  projectName(m.project_id),
                  m.location,
                  m.duration_seconds ? fmtTime(m.duration_seconds) : null,
                ].filter(Boolean).join(" · ") || "Detay yok"
              }
              amount={
                <span className="text-muted-foreground">
                  {m.started_at ? new Date(m.started_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "—"}
                </span>
              }
              meta={m.started_at ? new Date(m.started_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : undefined}
              actions={
                <OpsRowAction
                  label="Sil"
                  icon={Trash2}
                  onClick={() => void onDelete(m.id)}
                  tone="sm:opacity-0 sm:group-hover:opacity-100 hover:text-destructive"
                />
              }
            />
          ))}
        </OpsListShell>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────
function Actions({
  actions, meetings, onRefresh,
}: {
  actions: ActionItem[];
  meetings: Meeting[];
  onRefresh: () => void | Promise<void>;
}) {
  const meetingTitle = (id: string) => meetings.find((m) => m.id === id)?.title || "—";

  /** Aksiyonu onaylar ve mevcut görev sistemine yazar (kaynak alıntı görev notuna işlenir). */
  const approve = async (a: ActionItem, notify: boolean) => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      const meeting = meetings.find((m) => m.id === a.meeting_id);
      let taskId: string | null = null;
      if (meeting?.project_id && uid) {
        const context = [
          `Toplantı: ${meeting.title}`,
          a.assignee_name ? `Sorumlu: ${a.assignee_name}` : null,
          a.source_quote ? `Toplantıdan: "${a.source_quote}"` : null,
        ].filter(Boolean).join("\n");
        const { data: task, error } = await supabase
          .from("tasks")
          .insert({
            created_by: uid,
            title: a.title,
            description: [a.description, context].filter(Boolean).join("\n\n"),
            project_id: meeting.project_id,
            due_date: a.due_date,
            priority: toTaskPriority(a.priority),
            status: "todo",
            assigned_to: a.assignee_user_id || null,
          } as any)
          .select("id")
          .single();
        if (error) throw error;
        taskId = (task as any).id;
      } else {
        toast.warning("Bu toplantıya proje bağlı değil — aksiyon onaylandı ama görev oluşturulmadı.");
      }
      await supabase
        .from("meeting_action_items")
        .update({ status: taskId ? "converted" : "approved", created_task_id: taskId, notified_at: notify ? new Date().toISOString() : null })
        .eq("id", a.id);
      if (notify && a.assignee_name) {
        // Best-effort WhatsApp link fallback (Communication Center dispatch TBD)
        const msg = encodeURIComponent(`🏗️ Toplantı aksiyonu\n\n${a.title}${a.due_date ? `\nSon tarih: ${a.due_date}` : ""}${a.assignee_name ? `\nSorumlu: ${a.assignee_name}` : ""}`);
        toast.info("Bildirim: WhatsApp bağlantısı hazırlandı", {
          action: { label: "WhatsApp Aç", onClick: () => window.open(`https://wa.me/?text=${msg}`, "_blank") },
        });
      }
      toast.success(taskId ? "Görev oluşturuldu" : "Aksiyon onaylandı");
      await onRefresh();
    } catch (e: any) {
      toast.error(e?.message || "Görev oluşturulamadı");
    }
  };

  const reject = async (a: ActionItem) => {
    await supabase.from("meeting_action_items").update({ status: "rejected" }).eq("id", a.id);
    await onRefresh();
  };

  const groups = {
    pending: actions.filter((a) => a.status === "pending"),
    converted: actions.filter((a) => a.status === "converted"),
    other: actions.filter((a) => !["pending", "converted"].includes(a.status)),
  };

  return (
    <div className="space-y-6">
      <Section title="Onay Bekleyen" count={groups.pending.length}>
        {groups.pending.length === 0 ? (
          <OpsEmpty icon="🧾" title="Bekleyen aksiyon yok" description="AI, toplantı kaydından aksiyon çıkardığında burada onayınıza sunar; onaylanan aksiyon otomatik göreve dönüşür." />
        ) : (
          groups.pending.map((a) => (
            <Card key={a.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {meetingTitle(a.meeting_id)}
                    {a.assignee_name ? ` · ${a.assignee_name}` : " · sorumlu belirtilmedi"}
                    {a.due_date ? ` · ${a.due_date}` : ""}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${prioColor[a.priority] || ""}`}>
                  {PRIORITY_LABEL[a.priority] || a.priority}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                  {confidenceTone(a.confidence).label}
                </span>
              </div>
              {a.source_quote && (
                <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">"{a.source_quote}"</p>
              )}
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => approve(a, true)} className="gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Onayla & Bildir</Button>
                <Button size="sm" variant="secondary" onClick={() => approve(a, false)}>Sadece Onayla</Button>
                <Button size="sm" variant="ghost" onClick={() => reject(a)}>Reddet</Button>
              </div>
            </Card>
          ))
        )}
      </Section>


      <Section title="Göreve Dönüştürüldü" count={groups.converted.length}>
        {groups.converted.length === 0 ? <OpsEmpty icon="✅" title="Henüz göreve dönüşen aksiyon yok" description="Onayladığınız aksiyonlar ilgili projenin görev panosunda açılır." /> : (
          groups.converted.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm">{a.title}</p>
                <p className="text-xs text-muted-foreground">{meetingTitle(a.meeting_id)}</p>
              </div>
              <Badge variant="secondary" className="gap-1"><CheckCircle2 className="w-3 h-3" /> Görev</Badge>
            </div>
          ))
        )}
      </Section>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <OpsSectionHeader title={title} count={count} />
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// Detay görünümü artık MeetingDetailSheet (AI aksiyon motoru) tarafından sağlanıyor.

