import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, MessageCircle, Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWhatsAppSummary, type WhatsAppRecipient } from "@/hooks/useWhatsAppSummary";
import { useProjects } from "@/hooks/useProjects";
import WhatsAppConnectionCard from "./WhatsAppConnectionCard";

/**
 * WhatsApp Yönetici Özeti ayarları — kasıtlı olarak sade.
 * Kullanıcı token/telefon id gibi teknik değerlerle uğraşmaz; bağlantı
 * kimlik bilgileri yalnızca sunucuda tutulur.
 */

const FREQ: { id: WhatsAppRecipient["summary_frequency"]; label: string }[] = [
  { id: "daily", label: "Her Sabah" },
  { id: "weekly", label: "Haftalık" },
  { id: "off", label: "Kapalı" },
];

const WEEKDAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

const CONNECTION_META = {
  connected: { label: "Bağlı", color: "#22C55E" },
  not_connected: { label: "Bağlı Değil", color: "#64748B" },
  error: { label: "Bağlantı Hatası", color: "#EF4444" },
} as const;

type Draft = Partial<WhatsAppRecipient> & { display_name: string };

const emptyDraft = (): Draft => ({
  display_name: "",
  phone_number: "",
  opt_in: true,
  is_active: true,
  summary_frequency: "daily",
  preferred_time: "08:00",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Istanbul",
  weekday: 1,
  summary_scope: "all_projects",
  project_ids: [],
});

export default function WhatsAppSummaryPanel() {
  const { status, isLoading, save, remove, sendTest } = useWhatsAppSummary();
  const { projects } = useProjects();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const recipients = status?.recipients ?? [];
  const conn = CONNECTION_META[status?.connection ?? "not_connected"];

  const activeProjects = useMemo(
    () => projects.filter((p: any) => (p.status ?? "") !== "Tamamlandı"),
    [projects],
  );

  useEffect(() => {
    if (draft && draft.summary_scope !== "selected_projects" && (draft.project_ids?.length ?? 0) > 0) {
      setDraft({ ...draft, project_ids: [] });
    }
  }, [draft?.summary_scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = async (r: WhatsAppRecipient, changes: Partial<WhatsAppRecipient>) => {
    setBusyId(r.id);
    try {
      await save.mutateAsync({ ...r, ...changes });
    } catch (e) {
      toast.error((e as Error).message || "Kaydedilemedi");
    } finally {
      setBusyId(null);
    }
  };

  const submitDraft = async () => {
    if (!draft) return;
    if (!draft.display_name.trim()) return toast.error("İsim girin");
    if (!draft.id && String(draft.phone_number ?? "").replace(/\D/g, "").length < 10)
      return toast.error("Ülke koduyla telefon numarası girin (örn. +90 533 ...)");
    try {
      await save.mutateAsync(draft);
      toast.success(draft.id ? "Alıcı güncellendi" : "Alıcı eklendi");
      setDraft(null);
    } catch (e) {
      toast.error((e as Error).message || "Kaydedilemedi");
    }
  };

  const test = async (r: WhatsAppRecipient) => {
    setBusyId(r.id);
    try {
      const res = await sendTest.mutateAsync(r.id);
      if (res.not_connected) {
        toast.error("Önce WhatsApp hesabınızı bağlayın.");
        if (res.fallback_url) window.open(res.fallback_url, "_blank", "noopener");
      } else if (res.ok) toast.success(`Deneme özeti ${r.display_name} kişisine gönderildi`);
      else toast.error(res.error || "Deneme özeti gönderilemedi");
    } catch (e) {
      toast.error((e as Error).message || "Deneme özeti gönderilemedi");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Durum */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <MessageCircle className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-foreground">WhatsApp Yönetici Özeti</div>
          <div className="text-[12.5px] text-muted-foreground">
            Kâr durumunuz ve en önemli konular belirlediğiniz saatte WhatsApp'a gelir.
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold shrink-0" style={{ color: conn.color }}>
          <span className="w-2 h-2 rounded-full" style={{ background: conn.color }} />
          {conn.label}
        </span>
      </div>

      {/* Kendi WhatsApp hesabınızı bağlama */}
      <WhatsAppConnectionCard />

      {/* Alıcılar */}
      <div className="space-y-2">
        <div className="text-[11.5px] uppercase tracking-wider font-semibold text-muted-foreground">Alıcılar</div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground py-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…
          </div>
        ) : recipients.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            Henüz alıcı yok. Özet almak isteyen yöneticileri ekleyin.
          </p>
        ) : (
          recipients.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => setDraft({ ...r })}
                    className="text-left text-[14.5px] font-semibold text-foreground truncate block"
                  >
                    {r.display_name}
                  </button>
                  <div className="text-[12.5px] text-muted-foreground">
                    {r.phone_number || "—"} ·{" "}
                    {r.summary_frequency === "off"
                      ? "Özet kapalı"
                      : r.summary_frequency === "weekly"
                        ? `${WEEKDAYS[r.weekday]} ${r.preferred_time?.slice(0, 5)}`
                        : `Her sabah ${r.preferred_time?.slice(0, 5)}`}
                    {r.summary_scope === "selected_projects" ? ` · ${r.project_ids.length} proje` : ""}
                  </div>
                  {!r.opt_in && (
                    <div className="mt-1 text-[12px] text-amber-600">Onay bekliyor — özet gönderilmiyor.</div>
                  )}
                </div>
                <Switch
                  checked={r.is_active && r.opt_in}
                  disabled={busyId === r.id}
                  onCheckedChange={(v) => patch(r, { is_active: v, opt_in: v })}
                  aria-label="Yönetici özeti"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm" variant="outline" className="h-10 min-h-[40px] text-[13px]"
                  disabled={busyId === r.id} onClick={() => test(r)}
                >
                  {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                  Deneme Özeti Gönder
                </Button>
                <Button size="sm" variant="ghost" className="h-10 min-h-[40px] text-[13px]" onClick={() => setDraft({ ...r })}>
                  Düzenle
                </Button>
                <Button
                  size="sm" variant="ghost"
                  className="h-10 min-h-[40px] text-[13px] text-rose-500 hover:text-rose-600"
                  onClick={async () => {
                    if (!window.confirm(`${r.display_name} artık WhatsApp özeti almayacak. Silinsin mi?`)) return;
                    setBusyId(r.id);
                    try { await remove.mutateAsync(r.id); toast.success("Alıcı silindi"); }
                    catch (e) { toast.error((e as Error).message); }
                    finally { setBusyId(null); }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Sil
                </Button>
              </div>
            </div>
          ))
        )}

        <Button variant="outline" className="w-full h-11 text-[13.5px]" onClick={() => setDraft(emptyDraft())}>
          <Plus className="w-4 h-4 mr-1.5" /> Alıcı Ekle
        </Button>
      </div>

      {/* Son gönderimler */}
      {(status?.logs?.length ?? 0) > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11.5px] uppercase tracking-wider font-semibold text-muted-foreground">Son gönderimler</div>
          {status!.logs.slice(0, 3).map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2 text-[12.5px]">
              <span className="truncate text-muted-foreground">
                {l.recipient_label ?? "Alıcı"} ·{" "}
                {new Date(l.created_at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              <span
                className="shrink-0 font-semibold"
                style={{ color: l.status === "failed" ? "#EF4444" : l.status === "queued" ? "#F59E0B" : "#22C55E" }}
              >
                {l.status === "failed" ? "Gönderilemedi" : l.status === "queued" ? "Sırada" : "Gönderildi"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Alıcı formu */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-[440px] max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[17px]">{draft?.id ? "Alıcıyı Düzenle" : "Alıcı Ekle"}</DialogTitle>
            <DialogDescription className="text-[13px]">
              Özet yalnızca onay verilen numaralara gönderilir.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-3.5">
              <div>
                <label className="text-[12.5px] font-medium text-muted-foreground">Ad Soyad</label>
                <Input
                  className="mt-1 h-11 text-[16px]" value={draft.display_name}
                  onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
                  placeholder="Doğuş Göktaş"
                />
              </div>
              <div>
                <label className="text-[12.5px] font-medium text-muted-foreground">WhatsApp numarası</label>
                <Input
                  className="mt-1 h-11 text-[16px]" inputMode="tel" value={draft.phone_number ?? ""}
                  onChange={(e) => setDraft({ ...draft, phone_number: e.target.value })}
                  placeholder="+90 533 377 11 56"
                />
              </div>

              <div>
                <label className="text-[12.5px] font-medium text-muted-foreground">Özet gönder</label>
                <div className="mt-1.5 flex gap-2">
                  {FREQ.map((f) => (
                    <button
                      key={f.id} type="button"
                      onClick={() => setDraft({ ...draft, summary_frequency: f.id })}
                      className={`flex-1 h-11 rounded-[11px] border text-[13px] font-medium ${
                        draft.summary_frequency === f.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {draft.summary_frequency !== "off" && (
                <div className="flex gap-2">
                  {draft.summary_frequency === "weekly" && (
                    <div className="flex-1">
                      <label className="text-[12.5px] font-medium text-muted-foreground">Gün</label>
                      <select
                        className="mt-1 w-full h-11 rounded-[11px] border border-border bg-background px-3 text-[16px] text-foreground"
                        value={draft.weekday ?? 1}
                        onChange={(e) => setDraft({ ...draft, weekday: Number(e.target.value) })}
                      >
                        {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="text-[12.5px] font-medium text-muted-foreground">Saat</label>
                    <Input
                      type="time" className="mt-1 h-11 text-[16px]"
                      value={(draft.preferred_time ?? "08:00").slice(0, 5)}
                      onChange={(e) => setDraft({ ...draft, preferred_time: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[12.5px] font-medium text-muted-foreground">Kapsam</label>
                <div className="mt-1.5 flex gap-2">
                  {[
                    { id: "all_projects", label: "Tüm Projeler" },
                    { id: "selected_projects", label: "Seçili Projeler" },
                  ].map((s) => (
                    <button
                      key={s.id} type="button"
                      onClick={() => setDraft({ ...draft, summary_scope: s.id as WhatsAppRecipient["summary_scope"] })}
                      className={`flex-1 h-11 rounded-[11px] border text-[13px] font-medium ${
                        (draft.summary_scope ?? "all_projects") === s.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {draft.summary_scope === "selected_projects" && (
                <div className="max-h-[180px] overflow-y-auto rounded-[11px] border border-border divide-y divide-border">
                  {activeProjects.length === 0 ? (
                    <div className="p-3 text-[13px] text-muted-foreground">Aktif proje bulunmuyor.</div>
                  ) : activeProjects.map((p: any) => {
                    const on = (draft.project_ids ?? []).includes(String(p.id));
                    return (
                      <button
                        key={p.id} type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            project_ids: on
                              ? (draft.project_ids ?? []).filter((x) => x !== String(p.id))
                              : [...(draft.project_ids ?? []), String(p.id)],
                          })
                        }
                        className="w-full min-h-[48px] px-3 flex items-center justify-between text-left text-[14px] text-foreground"
                      >
                        <span className="truncate">{p.name}</span>
                        <span className={`w-4 h-4 rounded border shrink-0 ${on ? "bg-primary border-primary" : "border-border"}`} />
                      </button>
                    );
                  })}
                </div>
              )}

              <label className="flex items-start gap-2.5 rounded-[11px] border border-border p-3">
                <Switch
                  checked={draft.opt_in !== false}
                  onCheckedChange={(v) => setDraft({ ...draft, opt_in: v })}
                />
                <span className="text-[13px] leading-relaxed text-foreground">
                  WhatsApp'tan yönetici özeti almak istiyorum.
                </span>
              </label>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 h-11" onClick={() => setDraft(null)}>Vazgeç</Button>
                <Button className="flex-1 h-11" disabled={save.isPending} onClick={submitDraft}>
                  {save.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />} Kaydet
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
