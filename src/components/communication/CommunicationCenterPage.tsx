import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, MessageCircle, Phone, Bell, Send, Clock, CheckCircle2, CheckCheck, XCircle, RefreshCw, Eye, Ban, Loader2, Copy, Settings2, Search, ExternalLink, History } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import EmailAccountsPanel from "./EmailAccountsPanel";
import {
  OpsStatStrip, OpsListShell, OpsRow, OpsRowAction, OpsFilterBar, OpsEmpty, OpsSkeletonRows, OpsSectionHeader,
} from "@/components/operations/opsUi";
import { ChevronDown } from "lucide-react";

type Status = "draft" | "pending_approval" | "scheduled" | "queued" | "processing" | "retrying" | "sending" | "sent" | "delivered" | "read" | "failed" | "cancelled" | "manual_action_required";
type Channel = "whatsapp" | "email" | "sms" | "push" | "teams" | "slack";

interface CommMessage {
  id: string;
  channel: Channel;
  recipient: string;
  recipient_name: string | null;
  subject: string | null;
  body: string;
  status: Status;
  scheduled_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  provider: string | null;
  error: string | null;
  error_code?: string | null;
  next_retry_at?: string | null;
  retry_count: number;
  max_retries?: number | null;
  metadata?: Record<string, unknown> | null;
  created_from: string | null;
  created_at: string;
  message_type: string | null;
  template_name: string | null;
  project_id: string | null;
  related_action: string | null;
}

interface DeliveryAttempt {
  id: string;
  attempted_at: string;
  attempt_number: number | null;
  provider: string | null;
  status: string;
  error: string | null;
  error_code: string | null;
  retryable: boolean | null;
  next_retry_at: string | null;
  completed_at: string | null;
}

const CHANNEL_ICON: Record<Channel, React.ElementType> = {
  whatsapp: MessageCircle, email: Mail, sms: Phone, push: Bell, teams: MessageCircle, slack: MessageCircle,
};
const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: "WhatsApp", email: "E-posta", sms: "SMS", push: "Push", teams: "Teams", slack: "Slack",
};

const STATUS_META: Record<Status, { label: string; cls: string; icon: React.ElementType }> = {
  draft: { label: "Taslak", cls: "bg-muted text-muted-foreground", icon: Clock },
  pending_approval: { label: "Onay bekliyor", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: Eye },
  scheduled: { label: "Planlandı", cls: "bg-sky-500/15 text-sky-600 border-sky-500/30", icon: Clock },
  queued: { label: "Kuyrukta", cls: "bg-sky-500/15 text-sky-600 border-sky-500/30", icon: Clock },
  processing: { label: "İşleniyor", cls: "bg-primary/15 text-primary border-primary/30", icon: Loader2 },
  retrying: { label: "Yeniden denenecek", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: RefreshCw },
  sending: { label: "Gönderiliyor", cls: "bg-primary/15 text-primary border-primary/30", icon: Loader2 },
  sent: { label: "Gönderildi", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  delivered: { label: "İletildi", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", icon: CheckCheck },
  read: { label: "Okundu", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: CheckCheck },
  failed: { label: "Başarısız", cls: "bg-red-500/15 text-red-600 border-red-500/30", icon: XCircle },
  cancelled: { label: "İptal", cls: "bg-muted text-muted-foreground", icon: Ban },
  manual_action_required: { label: "Manuel işlem gerekli", cls: "bg-orange-500/15 text-orange-600 border-orange-500/30", icon: ExternalLink },
};

type Bucket = "pending" | "sent" | "failed" | "scheduled";

const bucketOf = (s: Status): Bucket | null => {
  if (s === "pending_approval" || s === "queued" || s === "sending" || s === "draft" || s === "processing") return "pending";
  if (s === "sent" || s === "delivered" || s === "read") return "sent";
  if (s === "failed" || s === "manual_action_required") return "failed";
  if (s === "scheduled" || s === "retrying") return "scheduled";
  return null;
};


const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
const WHATSAPP_WEBHOOK_URL = SUPABASE_PROJECT_ID
  ? `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/whatsapp-webhook`
  : "";

function WhatsAppSetupCard() {
  const [open, setOpen] = useState(false);
  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Kopyalandı"); };
  return (
    <div className="rounded-lg border bg-card p-4">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">WhatsApp Business Cloud API Kurulumu</span>
        </div>
        <span className="text-xs text-muted-foreground">{open ? "Gizle" : "Göster"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            Resmi Meta WhatsApp Business API'sini kullanmak için Meta Business Suite'te bir uygulama oluşturun ve aşağıdaki bilgileri Şantiyem'e ekleyin:
            <br /><b>WHATSAPP_PHONE_NUMBER_ID</b>, <b>WHATSAPP_BUSINESS_ACCOUNT_ID</b>, <b>WHATSAPP_ACCESS_TOKEN</b> (Kalıcı), <b>WHATSAPP_VERIFY_TOKEN</b> (siz belirlersiniz), opsiyonel <b>WHATSAPP_APP_SECRET</b> (imza doğrulama için).
          </p>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Webhook Callback URL</Label>
            <div className="flex gap-1 mt-1">
              <Input readOnly value={WHATSAPP_WEBHOOK_URL} className="text-xs font-mono h-8" />
              <Button size="sm" variant="outline" onClick={() => copy(WHATSAPP_WEBHOOK_URL)}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Meta → WhatsApp → Configuration → Webhook alanına yapıştırın. Verify Token'ı da orada girin. Abone olun: <code>messages</code>.
            </p>
          </div>
          <p className="text-muted-foreground">
            Kimlik bilgileri yapılandırılmadığında sistem otomatik olarak <code>wa.me</code> bağlantısına düşer — mevcut akış çalışmaya devam eder.
          </p>
        </div>
      )}
    </div>
  );
}

export default function CommunicationCenterPage() {
  const [messages, setMessages] = useState<CommMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<CommMessage | null>(null);
  const [channelFilter, setChannelFilter] = useState<"all" | Channel>("all");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [recipientFilter, setRecipientFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("communication_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error("Mesajlar yüklenemedi");
    setMessages((data || []) as CommMessage[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const invoke = async (action: string, payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("communication-hub", {
      body: { action, ...payload },
    });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  };

  const handleSend = async (m: CommMessage) => {
    setBusy(m.id);
    try {
      const res: any = await invoke("send", { id: m.id });
      if (res?.result?.external_url) {
        window.open(res.result.external_url, "_blank", "noopener");
        toast.success("WhatsApp açıldı — göndermeyi tamamlayın");
      } else if (res?.message?.status === "sent") {
        toast.success("Mesaj gönderildi");
      } else {
        toast.error(res?.message?.error || "Gönderim başarısız");
      }
      await load();
    } catch (e: any) {
      toast.error(e.message || "Gönderim hatası");
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async (m: CommMessage) => {
    setBusy(m.id);
    try { await invoke("cancel", { id: m.id }); toast.success("İptal edildi"); await load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  // Sprint 34.1 — manual retry requeues the message; the dispatcher sends it.
  const handleRetry = async (m: CommMessage) => {
    setBusy(m.id);
    try {
      await invoke("requeue", { id: m.id });
      toast.success("Mesaj tekrar kuyruğa alındı — dağıtıcı kısa süre içinde gönderecek");
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const [bucket, setBucket] = useState<Bucket>("pending");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [attemptsFor, setAttemptsFor] = useState<CommMessage | null>(null);
  const [attempts, setAttempts] = useState<DeliveryAttempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);

  const handleAttempts = async (m: CommMessage) => {
    setAttemptsFor(m);
    setAttemptsLoading(true);
    try {
      const res: any = await invoke("attempts", { id: m.id });
      setAttempts((res?.attempts || []) as DeliveryAttempt[]);
    } catch (e: any) { toast.error(e.message); setAttempts([]); }
    finally { setAttemptsLoading(false); }
  };


  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const pf = projectFilter.trim().toLowerCase();
    const rf = recipientFilter.trim().toLowerCase();
    return messages.filter((m) => {
      if (channelFilter !== "all" && m.channel !== channelFilter) return false;
      if (pf && (m.project_id || "").toLowerCase().indexOf(pf) === -1) return false;
      if (rf) {
        const hay = `${m.recipient} ${m.recipient_name || ""}`.toLowerCase();
        if (hay.indexOf(rf) === -1) return false;
      }
      if (s) {
        const hay = `${m.subject || ""} ${m.body || ""} ${m.recipient} ${m.recipient_name || ""}`.toLowerCase();
        if (hay.indexOf(s) === -1) return false;
      }
      return true;
    });
  }, [messages, channelFilter, projectFilter, recipientFilter, search]);

  const buckets: Record<Bucket, CommMessage[]> = {
    pending: [], sent: [], failed: [], scheduled: [],
  };
  filtered.forEach((m) => {
    const b = bucketOf(m.status);
    if (b) buckets[b].push(m);
  });

  const statusTone = (st: Status) =>
    st === "failed" || st === "manual_action_required" ? "overdue"
    : st === "sent" || st === "delivered" || st === "read" ? "positive"
    : st === "scheduled" ? "info"
    : "attention";

  const BUCKET_META: { key: Bucket; label: string; tone: "attention" | "info" | "positive" | "overdue"; empty: { title: string; description: string } }[] = [
    { key: "pending",   label: "Bekleyen",   tone: "attention", empty: { title: "Onay bekleyen mesaj yok", description: "AI bir mesaj taslağı ürettiğinde önce burada onayınıza düşer; onayladığınızda dağıtıcı gönderir." } },
    { key: "scheduled", label: "Planlı",     tone: "info",      empty: { title: "Planlı gönderim yok", description: "İleri tarihli mesajlar burada bekler ve zamanı geldiğinde otomatik gönderilir." } },
    { key: "sent",      label: "Gönderilen", tone: "positive",  empty: { title: "Henüz gönderilmiş mesaj yok", description: "Gönderilen, iletilen ve okunan tüm mesajların geçmişi burada listelenir." } },
    { key: "failed",    label: "Başarısız",  tone: "overdue",   empty: { title: "Başarısız gönderim yok", description: "Bir gönderim başarısız olursa hatası ve deneme geçmişiyle birlikte burada görünür." } },
  ];

  return (
    <div className="px-5 pt-5 pb-6 space-y-4 max-w-7xl mx-auto">
      {/* SPRINT 38G — calm header, one line of intent */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="ds-heading text-foreground flex items-center gap-2">
            <Send className="w-5 h-5 text-primary shrink-0" /> İletişim Merkezi
          </h1>
          <p className="ds-caption text-muted-foreground mt-0.5">
            WhatsApp ve e-posta gönderimleri; onay, planlama ve teslim durumu tek akışta.
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-10 shrink-0" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 sm:mr-2 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Yenile</span>
        </Button>
      </header>

      {/* What needs attention, at a glance */}
      <OpsStatStrip
        stats={BUCKET_META.map((b) => ({
          label: b.label,
          value: buckets[b.key].length,
          tone: b.key === "failed" && buckets.failed.length === 0 ? "neutral" : b.tone,
          onClick: () => setBucket(b.key),
          active: bucket === b.key,
        }))}
      />

      <OpsFilterBar
        query={search}
        onQuery={setSearch}
        placeholder="Konu, içerik veya alıcı ara…"
        chips={[
          { value: "all", label: "Tüm kanallar" },
          { value: "whatsapp", label: "WhatsApp" },
          { value: "email", label: "E-posta" },
          { value: "sms", label: "SMS" },
          { value: "push", label: "Push" },
        ]}
        active={channelFilter}
        onChip={(v) => setChannelFilter(v as "all" | Channel)}
        right={
          <Button
            variant="outline"
            size="sm"
            className="h-11 shrink-0 gap-1.5"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            <Settings2 className="w-4 h-4" />
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          </Button>
        }
      />

      {showAdvanced && (
        <div className="rounded-card border border-border/80 bg-card p-3 grid gap-3 sm:grid-cols-2 animate-fade-in">
          <div>
            <Label className="ds-label">Proje ID</Label>
            <Input value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} placeholder="proje…" className="h-10 mt-1" />
          </div>
          <div>
            <Label className="ds-label">Alıcı</Label>
            <Input value={recipientFilter} onChange={(e) => setRecipientFilter(e.target.value)} placeholder="e-posta / telefon" className="h-10 mt-1" />
          </div>
          <div className="sm:col-span-2 space-y-3">
            <WhatsAppSetupCard />
            <EmailAccountsPanel />
          </div>
        </div>
      )}

      {/* One conversation list at a time — no competing tab chrome */}
      <section className="space-y-2">
        <OpsSectionHeader
          title={BUCKET_META.find((b) => b.key === bucket)!.label}
          count={buckets[bucket].length}
        />
        {loading ? (
          <OpsSkeletonRows rows={5} />
        ) : buckets[bucket].length === 0 ? (
          <OpsEmpty
            icon="📨"
            title={BUCKET_META.find((b) => b.key === bucket)!.empty.title}
            description={BUCKET_META.find((b) => b.key === bucket)!.empty.description}
          />
        ) : (
          <OpsListShell>
            {buckets[bucket].map((m) => (
              <MessageRow
                key={m.id}
                m={m}
                busy={busy === m.id}
                tone={statusTone(m.status)}
                onPreview={() => setPreview(m)}
                onSend={() => handleSend(m)}
                onCancel={() => handleCancel(m)}
                onRetry={() => handleRetry(m)}
                onAttempts={() => handleAttempts(m)}
              />
            ))}
          </OpsListShell>
        )}
      </section>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mesaj Önizleme</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3 text-sm">
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>{CHANNEL_LABEL[preview.channel]}</span>
                <span>·</span>
                <span>{preview.recipient_name || preview.recipient}</span>
              </div>
              {preview.subject && (
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Konu</div>
                  <div className="font-medium">{preview.subject}</div>
                </div>
              )}
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">İçerik</div>
                <div className="rounded-md border p-3 whitespace-pre-wrap">{preview.body}</div>
              </div>
              {preview.error && (
                <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-600">
                  Hata: {preview.error}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {preview && (preview.status === "pending_approval" || preview.status === "queued") && (
              <Button onClick={() => { handleSend(preview); setPreview(null); }}>
                <Send className="w-4 h-4 mr-2" /> Onayla ve Gönder
              </Button>
            )}
            <Button variant="outline" onClick={() => setPreview(null)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!attemptsFor} onOpenChange={(o) => !o && setAttemptsFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gönderim Denemeleri</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {attemptsLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Yükleniyor…
              </div>
            ) : attempts.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Henüz deneme kaydı yok.</div>
            ) : attempts.map((a) => (
              <div key={a.id} className="rounded-md border p-3 text-xs space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">Deneme #{a.attempt_number ?? "—"}</Badge>
                  <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                  {a.provider && <Badge variant="outline" className="text-[10px]">{a.provider}</Badge>}
                  {a.retryable === true && <Badge variant="outline" className="text-[10px]">Yeniden denenebilir</Badge>}
                </div>
                <div className="text-muted-foreground">
                  {format(new Date(a.attempted_at), "d MMM yyyy HH:mm:ss", { locale: tr })}
                  {a.completed_at && ` → ${format(new Date(a.completed_at), "HH:mm:ss", { locale: tr })}`}
                </div>
                {a.error && (
                  <div className="text-red-600">
                    {a.error_code ? `[${a.error_code}] ` : ""}{a.error}
                  </div>
                )}
                {a.next_retry_at && (
                  <div className="text-muted-foreground">
                    Sonraki deneme: {format(new Date(a.next_retry_at), "d MMM HH:mm", { locale: tr })}
                  </div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttemptsFor(null)}>Kapat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageRow({
  m, busy, tone, onPreview, onSend, onCancel, onRetry, onAttempts,
}: {
  m: CommMessage;
  busy: boolean;
  tone: "positive" | "neutral" | "info" | "attention" | "overdue";
  onPreview: () => void;
  onSend: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onAttempts: () => void;
}) {
  const meta = STATUS_META[m.status] ?? STATUS_META.draft;
  const canSend = m.status === "pending_approval" || m.status === "queued";
  const canRetry = m.status === "failed" || m.status === "retrying" || m.status === "manual_action_required";
  const canCancel = ["pending_approval", "queued", "scheduled", "failed", "draft", "retrying", "manual_action_required"].includes(m.status);
  const manualUrl = (m.metadata as Record<string, unknown> | null)?.manual_action_url as string | undefined;
  const needsAction = canSend || canRetry;

  const when = m.sent_at || m.scheduled_at || m.created_at;
  const preview = (m.subject ? `${m.subject} — ` : "") + (m.body || "").replace(/\s+/g, " ").trim();

  return (
    <div className="relative">
      <OpsRow
        onClick={onPreview}
        rail={needsAction ? tone : undefined}
        title={
          <span className="flex items-center gap-1.5 min-w-0">
            {needsAction && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tone === "overdue" ? "bg-rose-400" : "bg-amber-400"}`} aria-hidden />}
            <span className={needsAction ? "font-semibold" : undefined}>{m.recipient_name || m.recipient}</span>
          </span>
        }
        status={
          <span className="inline-flex items-center gap-1">
            {CHANNEL_LABEL[m.channel]} · {meta.label}
          </span>
        }
        statusTone={tone}
        subtitle={preview || "İçerik yok"}
        amount={
          <span className="text-muted-foreground">
            {format(new Date(when), "d MMM", { locale: tr })}
          </span>
        }
        meta={format(new Date(when), "HH:mm", { locale: tr })}
        actions={
          <>
            {canSend && (
              <OpsRowAction
                label="Onayla ve gönder"
                icon={busy ? Loader2 : Send}
                onClick={onSend}
                tone="text-primary hover:text-primary"
              />
            )}
            {canRetry && (
              <OpsRowAction label="Tekrar dene" icon={RefreshCw} onClick={onRetry} tone="hover:text-primary" />
            )}
            <OpsRowAction
              label="Denemeleri gör"
              icon={History}
              onClick={onAttempts}
              tone="hidden sm:flex sm:opacity-0 sm:group-hover:opacity-100"
            />
            {canCancel && (
              <OpsRowAction
                label="İptal et"
                icon={Ban}
                onClick={onCancel}
                tone="sm:opacity-0 sm:group-hover:opacity-100 hover:text-destructive"
              />
            )}
          </>
        }
      />
      {(m.error || (m.status === "manual_action_required" && manualUrl) || (m.status === "retrying" && m.next_retry_at)) && (
        <div className="px-3 pb-2.5 -mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {m.error && (
            <span className="ds-caption text-rose-400 truncate max-w-full">
              {m.error_code ? `[${m.error_code}] ` : ""}{m.error}
            </span>
          )}
          {m.status === "retrying" && m.next_retry_at && (
            <span className="ds-caption text-amber-400">
              Sonraki deneme: {format(new Date(m.next_retry_at), "d MMM HH:mm", { locale: tr })}
            </span>
          )}
          {m.retry_count > 0 && (
            <span className="ds-caption text-muted-foreground">{m.retry_count}/{m.max_retries ?? 5} deneme</span>
          )}
          {manualUrl && (
            <a href={manualUrl} target="_blank" rel="noopener noreferrer"
               className="ds-caption text-primary inline-flex items-center gap-1 hover:underline">
              <ExternalLink className="w-3 h-3" /> WhatsApp'ta aç
            </a>
          )}
        </div>
      )}
    </div>
  );
}
