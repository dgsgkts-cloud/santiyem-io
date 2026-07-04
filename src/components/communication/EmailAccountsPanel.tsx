import { useCallback, useEffect, useState } from "react";
import { communicationHub, type EmailProviderName, type EmailAccountInput } from "@/lib/communicationHub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Mail, Plus, Trash2, ShieldCheck, Star, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface EmailAccount {
  id: string;
  display_name: string;
  from_email: string;
  reply_to: string | null;
  signature: string | null;
  provider: EmailProviderName;
  status: "active" | "disabled" | "error" | "unverified";
  is_default: boolean;
  config: Record<string, unknown>;
  last_sync_at: string | null;
  last_error: string | null;
}

const PROVIDER_LABEL: Record<EmailProviderName, string> = {
  smtp: "SMTP",
  microsoft_graph: "Microsoft 365 (Graph)",
  gmail: "Gmail API",
  sendgrid: "SendGrid",
  ses: "Amazon SES",
  mailgun: "Mailgun",
  lovable: "Lovable Cloud (yerleşik)",
};

const STATUS_META: Record<EmailAccount["status"], { label: string; cls: string }> = {
  active:      { label: "Aktif",       cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  unverified:  { label: "Doğrulanmadı", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  error:       { label: "Hata",         cls: "bg-red-500/15 text-red-600 border-red-500/30" },
  disabled:    { label: "Devre dışı",   cls: "bg-muted text-muted-foreground" },
};

const emptyForm = (): EmailAccountInput => ({
  display_name: "",
  from_email: "",
  reply_to: "",
  signature: "",
  provider: "smtp",
  is_default: false,
  config: { host: "", port: 587, secure: false, username: "", password_secret: "" },
});

export default function EmailAccountsPanel() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<EmailAccountInput | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await communicationHub.emailAccounts.list();
      setAccounts(((data as { accounts?: EmailAccount[] }).accounts) || []);
    } catch (e) {
      toast.error((e as Error).message || "E-posta hesapları yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing) return;
    if (!editing.display_name || !editing.from_email) {
      toast.error("Görünen ad ve e-posta zorunlu");
      return;
    }
    try {
      await communicationHub.emailAccounts.upsert(editing);
      toast.success("Hesap kaydedildi");
      setEditing(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Bu e-posta hesabı silinsin mi?")) return;
    setBusy(id);
    try {
      await communicationHub.emailAccounts.remove(id);
      toast.success("Silindi");
      await load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  const setDefault = async (id: string) => {
    setBusy(id);
    try {
      await communicationHub.emailAccounts.setDefault(id);
      toast.success("Varsayılan olarak ayarlandı");
      await load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  const verify = async (id: string) => {
    setBusy(id);
    try {
      const res = await communicationHub.emailAccounts.verify(id) as { ok: boolean; error?: string };
      if (res.ok) toast.success("Bağlantı doğrulandı");
      else toast.error(res.error || "Doğrulanamadı");
      await load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">E-posta Hesapları</div>
            <div className="text-xs text-muted-foreground">
              Kendi SMTP veya kurumsal e-posta hesabınızı ekleyin. Şifreler asla veritabanında tutulmaz —
              Supabase Secrets üzerinden okunur.
            </div>
          </div>
        </div>
        <Button size="sm" onClick={() => setEditing(emptyForm())}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Yeni Hesap
        </Button>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground py-4 flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" /> Yükleniyor…
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-xs text-muted-foreground border rounded-md p-4 text-center">
          Henüz e-posta hesabı yok. Eklemezseniz sistem yerleşik Lovable Cloud gönderim kullanır.
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((a) => (
            <div key={a.id} className="rounded-md border p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">{a.display_name}</span>
                  <Badge variant="outline" className={`${STATUS_META[a.status].cls} text-[10px]`}>
                    {STATUS_META[a.status].label}
                  </Badge>
                  {a.is_default && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Star className="w-3 h-3" /> Varsayılan
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px]">{PROVIDER_LABEL[a.provider]}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{a.from_email}</div>
                {a.last_error && (
                  <div className="text-[11px] text-red-600 mt-1 flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {a.last_error}
                  </div>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => verify(a.id)} disabled={busy === a.id}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                </Button>
                {!a.is_default && (
                  <Button size="sm" variant="ghost" onClick={() => setDefault(a.id)} disabled={busy === a.id}>
                    <Star className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setEditing({
                  id: a.id,
                  display_name: a.display_name,
                  from_email: a.from_email,
                  reply_to: a.reply_to || "",
                  signature: a.signature || "",
                  provider: a.provider,
                  is_default: a.is_default,
                  config: a.config || {},
                })}>Düzenle</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(a.id)} disabled={busy === a.id}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Hesabı Düzenle" : "Yeni E-posta Hesabı"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Görünen Ad</Label>
                  <Input value={editing.display_name}
                    onChange={(e) => setEditing({ ...editing, display_name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Sağlayıcı</Label>
                  <Select value={editing.provider}
                    onValueChange={(v) => setEditing({ ...editing, provider: v as EmailProviderName })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PROVIDER_LABEL) as EmailProviderName[]).map(p => (
                        <SelectItem key={p} value={p}>{PROVIDER_LABEL[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Gönderici E-posta</Label>
                  <Input type="email" value={editing.from_email}
                    onChange={(e) => setEditing({ ...editing, from_email: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Reply-To</Label>
                  <Input type="email" value={editing.reply_to || ""}
                    onChange={(e) => setEditing({ ...editing, reply_to: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">İmza (opsiyonel)</Label>
                <Textarea rows={3} value={editing.signature || ""}
                  onChange={(e) => setEditing({ ...editing, signature: e.target.value })} />
              </div>

              {editing.provider === "smtp" && (
                <div className="rounded-md border p-3 space-y-2 bg-muted/30">
                  <div className="text-xs font-semibold">SMTP Yapılandırması</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Host</Label>
                      <Input value={(editing.config.host as string) || ""}
                        onChange={(e) => setEditing({ ...editing, config: { ...editing.config, host: e.target.value } })} />
                    </div>
                    <div>
                      <Label className="text-xs">Port</Label>
                      <Input type="number" value={(editing.config.port as number) || 587}
                        onChange={(e) => setEditing({ ...editing, config: { ...editing.config, port: Number(e.target.value) } })} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Kullanıcı Adı</Label>
                    <Input value={(editing.config.username as string) || ""}
                      onChange={(e) => setEditing({ ...editing, config: { ...editing.config, username: e.target.value } })} />
                  </div>
                  <div>
                    <Label className="text-xs">Şifre Secret Adı</Label>
                    <Input placeholder="örn. SMTP_MAIN_PASSWORD"
                      value={(editing.config.password_secret as string) || ""}
                      onChange={(e) => setEditing({ ...editing, config: { ...editing.config, password_secret: e.target.value } })} />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Şifreyi Ayarlar → Secrets bölümünde bu adla ekleyin. Değer hiçbir zaman veritabanına yazılmaz.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={!!editing.config.secure}
                      onCheckedChange={(v) => setEditing({ ...editing, config: { ...editing.config, secure: v } })} />
                    <Label className="text-xs">TLS (port 465 için)</Label>
                  </div>
                </div>
              )}

              {editing.provider !== "smtp" && editing.provider !== "lovable" && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700">
                  {PROVIDER_LABEL[editing.provider]} sağlayıcısı bu sürümde henüz aktif değil.
                  Hesabı kaydedebilirsiniz — entegrasyon açıldığında otomatik çalışacak.
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch checked={!!editing.is_default}
                  onCheckedChange={(v) => setEditing({ ...editing, is_default: v })} />
                <Label className="text-xs">Varsayılan hesap</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>İptal</Button>
            <Button onClick={save}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
