import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, MessageCircle, Phone, Bell, Send, Clock, CheckCircle2, CheckCheck, XCircle, RefreshCw, Eye, Ban, Loader2, Copy, Settings2, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import EmailAccountsPanel from "./EmailAccountsPanel";

type Status = "draft" | "pending_approval" | "scheduled" | "queued" | "sending" | "sent" | "delivered" | "read" | "failed" | "cancelled";
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
  retry_count: number;
  created_from: string | null;
  created_at: string;
  message_type: string | null;
  template_name: string | null;
  project_id: string | null;
  related_action: string | null;
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
  sending: { label: "Gönderiliyor", cls: "bg-primary/15 text-primary border-primary/30", icon: Loader2 },
  sent: { label: "Gönderildi", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  delivered: { label: "İletildi", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", icon: CheckCheck },
  read: { label: "Okundu", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: CheckCheck },
  failed: { label: "Başarısız", cls: "bg-red-500/15 text-red-600 border-red-500/30", icon: XCircle },
  cancelled: { label: "İptal", cls: "bg-muted text-muted-foreground", icon: Ban },
};

type Bucket = "pending" | "sent" | "failed" | "scheduled";

const bucketOf = (s: Status): Bucket | null => {
  if (s === "pending_approval" || s === "queued" || s === "sending" || s === "draft") return "pending";
  if (s === "sent" || s === "delivered" || s === "read") return "sent";
  if (s === "failed") return "failed";
  if (s === "scheduled") return "scheduled";
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

  const handleRetry = async (m: CommMessage) => {
    setBusy(m.id);
    try {
      const res: any = await invoke("retry", { id: m.id });
      if (res?.result?.external_url) window.open(res.result.external_url, "_blank", "noopener");
      toast.success("Tekrar denendi");
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Send className="w-6 h-6 text-primary" />
            İletişim Merkezi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tüm AI kaynaklı mesajlar (WhatsApp, E-posta, gelecekte SMS/Push/Teams/Slack) buradan geçer.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </Button>
      </header>

      <WhatsAppSetupCard />

      <Tabs defaultValue="pending">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="pending">Bekleyen ({buckets.pending.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Planlı ({buckets.scheduled.length})</TabsTrigger>
          <TabsTrigger value="sent">Gönderilen ({buckets.sent.length})</TabsTrigger>
          <TabsTrigger value="failed">Başarısız ({buckets.failed.length})</TabsTrigger>
        </TabsList>
        {(["pending", "scheduled", "sent", "failed"] as Bucket[]).map((b) => (
          <TabsContent key={b} value={b} className="space-y-2 mt-4">
            {buckets[b].length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm border rounded-lg">
                Bu kategoride mesaj yok.
              </div>
            ) : (
              buckets[b].map((m) => (
                <MessageRow
                  key={m.id}
                  m={m}
                  busy={busy === m.id}
                  onPreview={() => setPreview(m)}
                  onSend={() => handleSend(m)}
                  onCancel={() => handleCancel(m)}
                  onRetry={() => handleRetry(m)}
                />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>

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
    </div>
  );
}

function MessageRow({
  m, busy, onPreview, onSend, onCancel, onRetry,
}: {
  m: CommMessage;
  busy: boolean;
  onPreview: () => void;
  onSend: () => void;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const Icon = CHANNEL_ICON[m.channel];
  const meta = STATUS_META[m.status];
  const StIcon = meta.icon;
  const canSend = m.status === "pending_approval" || m.status === "queued";
  const canRetry = m.status === "failed";
  const canCancel = ["pending_approval", "queued", "scheduled", "failed", "draft"].includes(m.status);

  return (
    <div className="rounded-lg border bg-card p-3 flex items-start gap-3">
      <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">
            {m.recipient_name || m.recipient}
          </span>
          <Badge variant="outline" className={`${meta.cls} text-[10px] gap-1`}>
            <StIcon className={`w-3 h-3 ${m.status === "sending" ? "animate-spin" : ""}`} />
            {meta.label}
          </Badge>
          {m.retry_count > 0 && (
            <Badge variant="outline" className="text-[10px]">×{m.retry_count} deneme</Badge>
          )}
          {m.created_from && (
            <Badge variant="outline" className="text-[10px]">{m.created_from}</Badge>
          )}
        </div>
        {m.subject && <div className="text-xs text-muted-foreground mt-0.5 truncate">{m.subject}</div>}
        <div className="text-xs text-foreground/80 mt-1 line-clamp-2">{m.body}</div>
        <div className="text-[10px] text-muted-foreground mt-1.5 flex gap-2 flex-wrap">
          <span>{format(new Date(m.created_at), "d MMM HH:mm", { locale: tr })}</span>
          {m.scheduled_at && <span>· Planlı: {format(new Date(m.scheduled_at), "d MMM HH:mm", { locale: tr })}</span>}
          {m.sent_at && <span>· Gönderim: {format(new Date(m.sent_at), "d MMM HH:mm", { locale: tr })}</span>}
          {m.error && <span className="text-red-600">· {m.error}</span>}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button size="sm" variant="ghost" onClick={onPreview}>
          <Eye className="w-3.5 h-3.5" />
        </Button>
        {canSend && (
          <Button size="sm" onClick={onSend} disabled={busy}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        )}
        {canRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} disabled={busy}>
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} />
          </Button>
        )}
        {canCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
            <Ban className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
