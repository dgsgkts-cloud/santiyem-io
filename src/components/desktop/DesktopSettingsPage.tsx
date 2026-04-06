import { useState, useEffect } from "react";
import { useUser, PlanType } from "@/contexts/UserContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TeamManagement from "./TeamManagement";
import { User, Bell, CreditCard, Users, Shield, Building2, Upload, X, Camera, Sun, Moon, Palette } from "lucide-react";
import { toast } from "sonner";
import { getCompanyProfile, saveCompanyProfile, CompanyProfile } from "@/lib/companyProfile";
import { supabase } from "@/integrations/supabase/client";

const TABS = [
  { id: "profile", label: "Profil", icon: User },
  { id: "appearance", label: "Görünüm", icon: Palette },
  { id: "company", label: "Firma Profili", icon: Building2 },
  { id: "notifications", label: "Bildirimler", icon: Bell },
  { id: "subscription", label: "Abonelik", icon: CreditCard },
  { id: "team", label: "Ekip", icon: Users },
  { id: "security", label: "Güvenlik", icon: Shield },
];

const DesktopSettingsPage = () => {
  const { profile, plan } = useUser();
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col lg:grid lg:grid-cols-[240px_1fr] gap-4 lg:gap-5">
        {/* Tabs */}
        <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-3 rounded-lg transition-all duration-150 relative whitespace-nowrap shrink-0"
                style={{
                  height: 40,
                  backgroundColor: isActive ? "#161C23" : "transparent",
                  color: isActive ? "#F1F5F9" : "#64748B",
                }}
              >
                {isActive && <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r" style={{ backgroundColor: "#FF6B2B" }} />}
                {isActive && <div className="lg:hidden absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-t" style={{ backgroundColor: "#FF6B2B" }} />}
                <Icon className="w-4 h-4" />
                <span className="text-[12px] lg:text-[13px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="rounded-xl p-4 lg:p-6 bg-card border border-border">
          {activeTab === "profile" && (
            <div className="space-y-5 lg:space-y-6">
              <div>
                <h3 className="text-[15px] lg:text-[16px] font-semibold mb-1 text-foreground">Profil Bilgileri</h3>
                <p className="text-[11px] lg:text-[12px] text-muted-foreground">Kişisel bilgilerinizi güncelleyin</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                <FormField label="Ad Soyad" value={profile?.full_name || ""} />
                <FormField label="Unvan" value={profile?.title || ""} />
                <FormField label="İl" value={profile?.city || ""} />
                <FormField label="E-posta" value="kullanici@email.com" />
              </div>
              <div className="flex justify-end pt-4" style={{ borderTop: "1px solid #1E2732" }}>
                <button className="px-4 rounded-lg text-[13px] font-semibold text-white" style={{ height: 36, backgroundColor: "#FF6B2B" }}>
                  Kaydet
                </button>
              </div>
            </div>
          )}
          {activeTab === "appearance" && <AppearanceTab />}
          {activeTab === "company" && <CompanyProfileTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "subscription" && <SubscriptionTab plan={plan} />}
          {activeTab === "team" && <TeamManagement />}
          {activeTab === "security" && (
            <div className="text-center py-8 lg:py-12">
              <p className="text-[13px] lg:text-[14px] text-muted-foreground">Bu bölüm yakında aktif olacaktır.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Appearance Tab ───
const AppearanceTab = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] lg:text-[16px] font-semibold mb-1 text-foreground">Görünüm</h3>
        <p className="text-[11px] lg:text-[12px] text-muted-foreground">Uygulama temasını seçin</p>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-sm">
        <button
          onClick={() => setTheme("dark")}
          className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all"
          style={{
            borderColor: theme === "dark" ? "#FF6B2B" : "hsl(var(--border))",
            backgroundColor: theme === "dark" ? "rgba(255,107,43,0.06)" : "transparent",
          }}
        >
          <Moon className="w-6 h-6" style={{ color: theme === "dark" ? "#FF6B2B" : "hsl(var(--muted-foreground))" }} />
          <span className="text-[13px] font-medium text-foreground">🌙 Koyu</span>
          {theme === "dark" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FF6B2B", color: "#fff" }}>Aktif</span>
          )}
        </button>
        <button
          onClick={() => setTheme("light")}
          className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all"
          style={{
            borderColor: theme === "light" ? "#FF6B2B" : "hsl(var(--border))",
            backgroundColor: theme === "light" ? "rgba(255,107,43,0.06)" : "transparent",
          }}
        >
          <Sun className="w-6 h-6" style={{ color: theme === "light" ? "#FF6B2B" : "hsl(var(--muted-foreground))" }} />
          <span className="text-[13px] font-medium text-foreground">☀️ Açık</span>
          {theme === "light" && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FF6B2B", color: "#fff" }}>Aktif</span>
          )}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">Tema tercihiniz hesabınıza kaydedilir ve her girişte hatırlanır.</p>
    </div>
  );
};

// ─── Company Profile Tab ───
const CompanyProfileTab = () => {
  const [cp, setCp] = useState<CompanyProfile>(() => getCompanyProfile());

  const updateField = (key: keyof CompanyProfile, value: string) => {
    setCp(prev => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo dosyası maksimum 2MB olabilir");
      return;
    }
    if (!["image/png", "image/jpeg", "image/svg+xml"].includes(file.type)) {
      toast.error("PNG, JPG veya SVG dosyası seçin");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateField("logoDataUrl", reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    saveCompanyProfile(cp);
    toast.success("Firma bilgileriniz güncellendi");
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] lg:text-[16px] font-semibold mb-1 text-foreground">🏢 Firma Profili</h3>
        <p className="text-[11px] lg:text-[12px] text-muted-foreground">PDF çıktılarınızda kullanılacak firma bilgileri</p>
      </div>

      {/* Logo Upload */}
      <div>
        <label className="text-[12px] font-semibold mb-2 block text-muted-foreground">Firma Logosu</label>
        {cp.logoDataUrl ? (
          <div className="space-y-2">
            <div className="rounded-xl p-4 flex items-center justify-center" style={{ backgroundColor: "#FFF", minHeight: 80 }}>
              <img src={cp.logoDataUrl} alt="Logo" style={{ maxHeight: 60, maxWidth: "100%" }} />
            </div>
            <button
              onClick={() => updateField("logoDataUrl", "")}
              className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg transition-colors hover:bg-red-500/10"
              style={{ color: "#EF4444" }}
            >
              <X className="w-3 h-3" /> Logoyu Kaldır
            </button>
          </div>
        ) : (
          <div
            className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors hover:border-[#FF6B2B]/50"
            style={{ borderColor: "#1E2732" }}
            onClick={() => document.getElementById("logo-upload")?.click()}
          >
            <Camera className="w-8 h-8 mx-auto mb-2" style={{ color: "#475569" }} />
            <p className="text-xs font-medium text-muted-foreground">Logo Yükle</p>
            <p className="text-[10px] mt-1" style={{ color: "#475569" }}>PNG, JPG, SVG — max 2MB</p>
            <p className="text-[10px]" style={{ color: "#475569" }}>Önerilen: 300×100px veya 400×150px</p>
          </div>
        )}
        <input id="logo-upload" type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
      </div>

      {/* Company Info */}
      <div>
        <label className="text-[12px] font-semibold mb-3 block text-muted-foreground">Firma Bilgileri</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <CompanyField label="Firma / Şahıs Adı *" value={cp.companyName} onChange={v => updateField("companyName", v)} />
          </div>
          <CompanyField label="Vergi Dairesi" value={cp.taxOffice} onChange={v => updateField("taxOffice", v)} />
          <CompanyField label="Vergi Numarası" value={cp.taxNumber} onChange={v => updateField("taxNumber", v)} />
          <CompanyField label="MERSİS No" value={cp.mersisNo} onChange={v => updateField("mersisNo", v)} />
          <CompanyField label="KEP Adresi" value={cp.kepAddress} onChange={v => updateField("kepAddress", v)} />
        </div>
      </div>

      {/* Contact Info */}
      <div>
        <label className="text-[12px] font-semibold mb-3 block text-muted-foreground">İletişim Bilgileri</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <CompanyField label="Adres" value={cp.address} onChange={v => updateField("address", v)} multiline />
          </div>
          <CompanyField label="İlçe" value={cp.district} onChange={v => updateField("district", v)} />
          <CompanyField label="İl" value={cp.city} onChange={v => updateField("city", v)} />
          <CompanyField label="Telefon" value={cp.phone} onChange={v => updateField("phone", v)} />
          <CompanyField label="E-posta" value={cp.email} onChange={v => updateField("email", v)} />
          <CompanyField label="Web Sitesi (opsiyonel)" value={cp.website} onChange={v => updateField("website", v)} />
        </div>
      </div>

      {/* Signature settings */}
      <div>
        <label className="text-[12px] font-semibold mb-3 block text-muted-foreground">İmza Alanı Ayarları</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CompanyField label="Yetkili Kişi Adı Soyadı" value={cp.authorizedPerson} onChange={v => updateField("authorizedPerson", v)} placeholder="PDF'deki Hazırlayan alanına gelir" />
          <CompanyField label="Ünvanı" value={cp.authorizedTitle} onChange={v => updateField("authorizedTitle", v)} placeholder="İnşaat Mühendisi, Mimar vb." />
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className="w-full h-10 rounded-xl text-sm font-semibold text-white transition-colors"
        style={{ backgroundColor: "#FF6B2B" }}
      >
        Kaydet
      </button>

      {/* Info box */}
      <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
        <p className="text-[11px]" style={{ color: "#F59E0B" }}>
          💡 Bu bilgiler tüm PDF çıktılarınızda (hakediş, şantiye raporu, fotoğraf raporu) otomatik olarak kullanılacaktır.
        </p>
      </div>
    </div>
  );
};

const CompanyField = ({ label, value, onChange, multiline, placeholder }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string }) => (
  <div>
    <label className="text-[11px] font-medium mb-1.5 block text-muted-foreground">{label}</label>
    {multiline ? (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full rounded-lg px-3 py-2 text-[13px] outline-none transition-colors resize-none"
        onFocus={e => { e.currentTarget.style.borderColor = "#FF6B2B"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "#1E2732"; }}
      />
    ) : (
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 text-[13px] outline-none transition-colors"
        style={{ height: 36 }}
        onFocus={e => { e.currentTarget.style.borderColor = "#FF6B2B"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "#1E2732"; }}
      />
    )}
  </div>
);

const FormField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <label className="text-[11px] lg:text-[12px] font-semibold mb-1.5 block text-muted-foreground">{label}</label>
    <input
      defaultValue={value}
      className="w-full rounded-lg px-3 text-[13px] outline-none transition-colors duration-150"
      style={{ height: 36 }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "#FF6B2B"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(255,107,43,0.15)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "#1E2732"; e.currentTarget.style.boxShadow = "none"; }}
    />
  </div>
);

const ToggleRow = ({ label, desc, on, onChange, disabled }: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => {
  return (
    <div className="flex items-center justify-between py-2 gap-3" style={{ borderBottom: "1px solid #1E2732", opacity: disabled ? 0.6 : 1 }}>
      <div className="min-w-0">
        <p className="text-[12px] lg:text-[13px] font-medium text-foreground">{label}</p>
        <p className="text-[10px] lg:text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <button
        onClick={() => !disabled && onChange(!on)}
        className="relative w-10 h-5 rounded-full transition-colors duration-150 shrink-0"
        style={{ backgroundColor: on ? "#FF6B2B" : "#1E2732", cursor: disabled ? "not-allowed" : "pointer" }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-150"
          style={{ transform: on ? "translateX(20px)" : "translateX(2px)" }}
        />
      </button>
    </div>
  );
};

// ─── Notifications Tab ───
const NotificationsTab = () => {
  const { user } = useUser();
  const [prefs, setPrefs] = useState({
    payment_due_reminder: true,
    payment_overdue_reminder: true,
    weekly_summary: true,
    whatsapp_enabled: false,
    whatsapp_number: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setPrefs({
          payment_due_reminder: data.payment_due_reminder,
          payment_overdue_reminder: data.payment_overdue_reminder,
          weekly_summary: data.weekly_summary,
          whatsapp_enabled: data.whatsapp_enabled,
          whatsapp_number: data.whatsapp_number || "",
        });
      } else {
        await supabase.from("notification_preferences").insert({ user_id: user.id });
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async (updates: Partial<typeof prefs>) => {
    if (!user) return;
    const newPrefs = { ...prefs, ...updates };
    setPrefs(newPrefs);
    setSaving(true);
    const { error } = await supabase
      .from("notification_preferences")
      .update({
        payment_due_reminder: newPrefs.payment_due_reminder,
        payment_overdue_reminder: newPrefs.payment_overdue_reminder,
        weekly_summary: newPrefs.weekly_summary,
        whatsapp_enabled: newPrefs.whatsapp_enabled,
        whatsapp_number: newPrefs.whatsapp_number || null,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error("Tercihler kaydedilemedi");
    else toast.success("Bildirim tercihleri güncellendi");
  };

  if (loading) return <p className="text-[13px] py-8 text-center text-muted-foreground">Yükleniyor...</p>;

  return (
    <div className="space-y-5 lg:space-y-6">
      <div>
        <h3 className="text-[15px] lg:text-[16px] font-semibold mb-1 text-foreground">Bildirim Tercihleri</h3>
        <p className="text-[11px] lg:text-[12px] text-muted-foreground">Hangi bildirimleri almak istediğinizi seçin</p>
      </div>

      <div>
        <p className="text-[11px] font-semibold mb-2 text-muted-foreground">ZORUNLU BİLDİRİMLER</p>
        <ToggleRow label="Kayıt Onay E-postası" desc="Hesap doğrulama e-postası (kapatılamaz)" on={true} onChange={() => {}} disabled />
        <ToggleRow label="Şifre Sıfırlama" desc="Şifre sıfırlama bağlantısı (kapatılamaz)" on={true} onChange={() => {}} disabled />
      </div>

      <div>
        <p className="text-[11px] font-semibold mb-2 text-muted-foreground">E-POSTA BİLDİRİMLERİ</p>
        <ToggleRow
          label="Gecikmiş Ödeme Bildirimi"
          desc="Hakediş vade günü gelince otomatik e-posta"
          on={prefs.payment_due_reminder}
          onChange={v => save({ payment_due_reminder: v })}
        />
        <ToggleRow
          label="30+ Gün Gecikme Uyarısı"
          desc="30 gün ödenmemiş hakedişler için uyarı"
          on={prefs.payment_overdue_reminder}
          onChange={v => save({ payment_overdue_reminder: v })}
        />
        <ToggleRow
          label="Haftalık Özet (Pazartesi 08:00)"
          desc="Haftalık proje ve hakediş durumu özeti"
          on={prefs.weekly_summary}
          onChange={v => save({ weekly_summary: v })}
        />
      </div>

      <div>
        <p className="text-[11px] font-semibold mb-2 text-muted-foreground">WHATSAPP BİLDİRİMLERİ</p>
        <ToggleRow
          label="WhatsApp Bildirimi"
          desc="Numara girilince aktif olur"
          on={prefs.whatsapp_enabled}
          onChange={v => save({ whatsapp_enabled: v })}
        />
        {prefs.whatsapp_enabled && (
          <div className="mt-2">
            <input
              value={prefs.whatsapp_number}
              onChange={e => setPrefs(p => ({ ...p, whatsapp_number: e.target.value }))}
              onBlur={() => save({ whatsapp_number: prefs.whatsapp_number })}
              placeholder="+90 5XX XXX XX XX"
              className="w-full rounded-lg px-3 text-[13px] outline-none"
              style={{ height: 36 }}
            />
          </div>
        )}
      </div>

      <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
        <p className="text-[11px]" style={{ color: "#22C55E" }}>
          📧 Gönderen adres: <strong>noreply@santiyem.io</strong>
        </p>
      </div>
    </div>
  );
};

// ─── Subscription Tab ───
const PLAN_INFO: Record<string, { emoji: string; name: string; price: string; sub: string }> = {
  free: { emoji: "🆓", name: "Başlangıç Planı", price: "Ücretsiz", sub: "Sonsuza kadar ücretsiz" },
  pro: { emoji: "⭐", name: "Profesyonel Plan", price: "499₺/ay", sub: "Serbest mühendis ve mimarlar için" },
  plus: { emoji: "⭐", name: "Plus Plan", price: "199₺/ay", sub: "Bireysel kullanıcılar için" },
  team: { emoji: "👥", name: "Ekip Planı", price: "1.499₺/ay", sub: "Küçük mühendislik ofisleri için" },
  enterprise: { emoji: "🏢", name: "Kurumsal Plan", price: "4.999₺/ay", sub: "Büyük firmalar için" },
  office_free: { emoji: "🏢", name: "Kurumsal Ücretsiz", price: "Ücretsiz", sub: "" },
  office_pro: { emoji: "🏢", name: "Kurumsal Pro", price: "2.499₺/ay", sub: "" },
  office_custom: { emoji: "🏢", name: "Özel Kurumsal", price: "Özel", sub: "" },
};

const UPGRADE_CARDS = [
  { plan: "pro", emoji: "⭐", name: "Profesyonel", price: "499₺/ay", features: ["1 proje · 3 hakediş/ay", "AI Asistan sınırsız", "Şantiye günlüğü sınırsız", "Firma başlıklı PDF"], cta: "14 Gün Ücretsiz Dene →", highlight: true },
  { plan: "team", emoji: "👥", name: "Ekip", price: "1.499₺/ay", features: ["5 kullanıcı hesabı", "Ekip görevi atama", "Ortak proje takibi", "Öncelikli destek"], cta: "Planı İncele →", highlight: false },
  { plan: "enterprise", emoji: "🏢", name: "Kurumsal", price: "4.999₺/ay", features: ["Sınırsız kullanıcı", "Yetki rolleri", "Öncelikli telefon + WhatsApp desteği", "Özel onboarding"], cta: "Teklif Al →", highlight: false },
];

const CANCEL_REASONS = [
  { id: "expensive", label: "Çok pahalı" },
  { id: "no-feature", label: "İhtiyacım olan özellik yok" },
  { id: "other-platform", label: "Başka bir platform kullanıyorum" },
  { id: "temporary", label: "Geçici olarak kullanmıyorum" },
  { id: "other", label: "Diğer" },
];

const SubscriptionTab = ({ plan }: { plan: PlanType }) => {
  const { usage, isAdmin, user } = useUser();
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelStep, setCancelStep] = useState<"reason" | "response" | "done">("reason");
  const [otherText, setOtherText] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [accessEndDate, setAccessEndDate] = useState<string | null>(null);

  // Fetch real subscription and invoice data
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingSub, setLoadingSub] = useState(true);

  // Saved cards state
  const [cards, setCards] = useState<any[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [deleteConfirmCard, setDeleteConfirmCard] = useState<any>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const fetchCards = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('manage-cards', {
        body: { action: 'list' },
      });
      if (!error && data?.cards) setCards(data.cards);
    } catch (e) {
      console.error('Failed to fetch cards:', e);
    }
    setLoadingCards(false);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Fetch active subscription
      const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['trial', 'active', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setSubscription(sub);

      // Fetch invoices from invoices table
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      // Fallback to payment_transactions if no invoices yet
      if (invoiceData && invoiceData.length > 0) {
        setInvoices(invoiceData);
      } else {
        const { data: payments } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'success')
          .order('created_at', { ascending: false })
          .limit(10);
        setInvoices(payments || []);
      }

      setLoadingSub(false);
    })();
    fetchCards();
  }, [user]);

  const handleDeleteCard = async (card: any) => {
    setDeleteConfirmCard(card);
  };

  const confirmDeleteCard = async () => {
    if (!deleteConfirmCard) return;
    setDeletingCardId(deleteConfirmCard.id);
    try {
      const { data, error } = await supabase.functions.invoke('manage-cards', {
        body: { action: 'delete', cardId: deleteConfirmCard.id },
      });
      if (error || data?.error) {
        toast.error(data?.error || 'Kart silinemedi');
      } else {
        toast.success('Kart silindi');
        setCards(prev => prev.filter(c => c.id !== deleteConfirmCard.id));
      }
    } catch (e) {
      toast.error('Kart silinirken hata oluştu');
    }
    setDeletingCardId(null);
    setDeleteConfirmCard(null);
  };

  const handleSetDefault = async (cardId: string) => {
    setSettingDefaultId(cardId);
    try {
      const { data, error } = await supabase.functions.invoke('manage-cards', {
        body: { action: 'setDefault', cardId },
      });
      if (error || data?.error) {
        toast.error(data?.error || 'Varsayılan kart değiştirilemedi');
      } else {
        toast.success('Varsayılan kart güncellendi');
        setCards(prev => prev.map(c => ({ ...c, is_default: c.id === cardId })));
      }
    } catch (e) {
      toast.error('Hata oluştu');
    }
    setSettingDefaultId(null);
  };

  const getCardIcon = (association: string) => {
    const a = (association || '').toUpperCase();
    if (a.includes('VISA')) return '💳 Visa';
    if (a.includes('MASTER')) return '💳 Mastercard';
    if (a.includes('TROY')) return '💳 Troy';
    if (a.includes('AMEX')) return '💳 Amex';
    return '💳';
  };

  const info = PLAN_INFO[plan] || PLAN_INFO.free;
  const isFree = plan === "free";
  const isPaid = ["pro", "plus", "team", "enterprise", "office_pro", "office_custom"].includes(plan);

  const downloadInvoicePDF = (inv: any) => {
    import('jspdf').then(({ default: jsPDF }) => {
      const doc = new jsPDF();
      const planName = PLAN_INFO[inv.plan_name]?.name || inv.plan_name;
      const dateStr = new Date(inv.created_at || inv.invoice_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
      
      doc.setFontSize(20);
      doc.setTextColor(255, 107, 43);
      doc.text('Şantiyem', 20, 25);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('Şantiyenizi Tek Panelden Yönetin', 20, 32);
      
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text('FATURA', 150, 25);
      
      doc.setDrawColor(200);
      doc.line(20, 38, 190, 38);
      
      doc.setFontSize(11);
      doc.setTextColor(60);
      doc.text(`Fatura Tarihi: ${dateStr}`, 20, 50);
      doc.text(`Fatura No: INV-${inv.id?.substring(0, 8)?.toUpperCase() || '000'}`, 20, 58);
      if (inv.iyzico_payment_id) doc.text(`Odeme ID: ${inv.iyzico_payment_id}`, 20, 66);
      
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('Plan:', 20, 82);
      doc.text(planName, 80, 82);
      doc.text('Tutar:', 20, 92);
      doc.setTextColor(255, 107, 43);
      const amountStr = `${inv.amount?.toLocaleString('tr-TR')} TL`;
      doc.text(amountStr, 80, 92);
      doc.setTextColor(0);
      doc.text('Durum:', 20, 102);
      doc.setTextColor(34, 197, 94);
      doc.text('Odendi', 80, 102);
      
      doc.setTextColor(150);
      doc.setFontSize(9);
      doc.text('Bu fatura Santiyem platformu tarafindan otomatik olusturulmustur.', 20, 270);
      doc.text('www.santiyem.io', 20, 278);
      
      doc.save(`santiyem-fatura-${dateStr.replace(/\s/g, '-')}.pdf`);
    });
  };

  const visibleUpgrades = UPGRADE_CARDS.filter(c => {
    if (plan === "free" || plan === "plus") return true;
    if (plan === "pro") return c.plan !== "pro";
    if (plan === "team") return c.plan === "enterprise";
    return false;
  });

  const handleCancelClick = () => {
    setCancelModal(true);
    setCancelStep("reason");
    setCancelReason("");
    setOtherText("");
  };

  const handleConfirmCancel = async () => {
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        body: { reason: cancelReason || "other" },
      });
      if (error || data?.error) {
        toast.error(data?.error || "İptal işlemi başarısız");
        setCancelling(false);
        return;
      }
      setAccessEndDate(data.accessEndDate);
      // Update local subscription state
      if (subscription) {
        setSubscription({ ...subscription, status: 'cancelled', cancelled_at: new Date().toISOString() });
      }
      setCancelStep("done");
      toast.success("Aboneliğiniz iptal edildi");
    } catch (err) {
      console.error("Cancel error:", err);
      toast.error("İptal işlemi sırasında bir hata oluştu");
    }
    setCancelling(false);
  };

  const getSmartResponse = () => {
    if (cancelReason === "expensive") return {
      msg: "Anladık. Yıllık plana geçersen %20 tasarruf edersin — aylık fiyatın düşer. Devam etmek ister misin?",
      primary: "Yıllık Plana Geç", secondary: "Yine de İptal Et"
    };
    if (cancelReason === "other-platform") return {
      msg: "Hangi platformu kullanıyorsun? Geri bildiriminiz bize çok değerli.",
      primary: "Gönder ve İptal Et", secondary: "Vazgeç", showInput: true
    };
    if (cancelReason === "temporary") return {
      msg: "Aboneliğini durdurmak yerine 1 ay bekletebiliriz. Hesabın ve tüm verilerin korunur.",
      primary: "1 Ay Beklet", secondary: "Yine de İptal Et"
    };
    return {
      msg: "Aboneliğinizi iptal etmek istediğinize emin misiniz? Dönem sonuna kadar erişiminiz devam eder.",
      primary: "Vazgeç", secondary: "Onayla ve İptal Et"
    };
  };

  // Calculate subscription status display
  const getSubStatusDisplay = () => {
    if (!subscription) return null;
    if (subscription.status === 'trial') {
      const endDate = new Date(subscription.trial_end).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
      return { label: '🧪 Deneme Süresi', color: '#F59E0B', detail: `Deneme bitiş: ${endDate}` };
    }
    if (subscription.status === 'active') {
      const nextDate = new Date(subscription.next_payment_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
      return { label: '✅ Aktif', color: '#22C55E', detail: `Sonraki ödeme: ${nextDate}` };
    }
    if (subscription.status === 'cancelled') {
      const endDate = subscription.trial_end && new Date(subscription.trial_end) > new Date(subscription.next_payment_date || '2000-01-01')
        ? new Date(subscription.trial_end) : new Date(subscription.next_payment_date || subscription.trial_end);
      return { label: '❌ İptal Edildi', color: '#EF4444', detail: `Erişim bitiş: ${endDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}` };
    }
    return null;
  };

  const subStatus = getSubStatusDisplay();
  const canCancel = subscription && ['trial', 'active'].includes(subscription.status);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] lg:text-[16px] font-semibold mb-1 text-foreground">Abonelik Yönetimi</h3>
        <p className="text-[11px] lg:text-[12px] text-muted-foreground">Mevcut planınız ve faturalama bilgileri</p>
      </div>

      {/* Current Plan Card */}
      <div className="rounded-xl p-5" style={{ border: isPaid ? "1px solid #FF6B2B40" : "1px solid #1E2732" }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{info.emoji}</span>
              <span className="text-[16px] font-bold text-foreground">{info.name}</span>
            </div>
            <p className="text-sm font-semibold" style={{ color: isPaid ? "#FF6B2B" : "#64748B" }}>{info.price}</p>
            {subStatus && (
              <>
                <p className="text-[11px] mt-1" style={{ color: subStatus.color }}>{subStatus.label}</p>
                <p className="text-[11px] mt-0.5 text-muted-foreground">{subStatus.detail}</p>
              </>
            )}
            {isFree && !subscription && <p className="text-[11px] mt-1 text-muted-foreground">{info.sub}</p>}
          </div>
          {isAdmin && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ backgroundColor: "rgba(139,92,246,0.2)", color: "#A78BFA" }}>
              Admin 🔧
            </span>
          )}
        </div>

        {/* Usage bars for free plan */}
        {isFree && !isAdmin && (
          <div className="space-y-3 mt-4 pt-4" style={{ borderTop: "1px solid #1E2732" }}>
            <p className="text-[11px] font-semibold text-muted-foreground">Kullanım Limitlerin</p>
            <UsageBar label="AI Soruları" used={usage.aiQuestions.used} max={usage.aiQuestions.max} suffix="bugün" />
            <UsageBar label="Aktif Proje" used={1} max={1} suffix="" />
            <UsageBar label="Hakediş" used={1} max={1} suffix="bu ay" />
            <UsageBar label="PDF Çıktı" used={0} max={3} suffix="bu ay" />
          </div>
        )}

        {/* Saved Cards Section */}
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid #1E2732" }}>
          <p className="text-[11px] font-semibold text-muted-foreground mb-3">💳 Kayıtlı Kartlar</p>
          {loadingCards ? (
            <p className="text-xs text-muted-foreground">Yükleniyor...</p>
          ) : cards.length === 0 ? (
            <p className="text-xs text-muted-foreground">Kayıtlı kart bulunmuyor.</p>
          ) : (
            <div className="space-y-2">
              {cards.map(card => (
                <div key={card.id} className="flex items-center justify-between rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{getCardIcon(card.card_association)}</span>
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        **** **** **** {card.last_four_digits}
                        {card.is_default && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#22C55E20", color: "#22C55E" }}>Varsayılan</span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {card.card_bank_name || card.card_association}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!card.is_default && cards.length > 1 && (
                      <button
                        onClick={() => handleSetDefault(card.id)}
                        disabled={settingDefaultId === card.id}
                        className="text-[10px] px-2 py-1 rounded transition-colors hover:opacity-80 disabled:opacity-50"
                        style={{ color: "#FF6B2B", border: "1px solid #FF6B2B40" }}
                      >
                        {settingDefaultId === card.id ? '...' : 'Varsayılan Yap'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteCard(card)}
                      className="text-[10px] px-2 py-1 rounded transition-colors hover:opacity-80"
                      style={{ color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Subscription Details */}
        {subscription && (
          <div className="mt-4 pt-4 space-y-2" style={{ borderTop: "1px solid #1E2732" }}>
            <p className="text-[11px] font-semibold text-muted-foreground">Abonelik Detayları</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg p-2.5 bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Plan</p>
                <p className="text-[13px] font-semibold text-foreground">
                  {PLAN_INFO[subscription.plan_name]?.name || subscription.plan_name}
                </p>
              </div>
              <div className="rounded-lg p-2.5 bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Durum</p>
                <p className="text-[13px] font-semibold" style={{ color: subStatus?.color || '#64748B' }}>
                  {subscription.status === 'trial' ? 'Deneme' : subscription.status === 'active' ? 'Aktif' : subscription.status === 'cancelled' ? 'İptal Edildi' : subscription.status}
                </p>
              </div>
              <div className="rounded-lg p-2.5 bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Abonelik Türü</p>
                <p className="text-[13px] font-semibold text-foreground">
                  {subscription.subscription_type === 'yearly' ? '📅 Yıllık' : '📅 Aylık'}
                </p>
              </div>
              <div className="rounded-lg p-2.5 bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Başlangıç Tarihi</p>
                <p className="text-[13px] font-semibold text-foreground">
                  {new Date(subscription.trial_start || subscription.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="rounded-lg p-2.5 bg-muted/30 col-span-2">
                <p className="text-[10px] text-muted-foreground">Sonraki Ödeme</p>
                <p className="text-[13px] font-semibold text-foreground">
                  {subscription.next_payment_date
                    ? `${new Date(subscription.next_payment_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} — ₺${subscription.amount?.toLocaleString('tr-TR')}`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 space-y-2">
          {isFree && !isAdmin && (
            <>
              <button className="w-full py-3 rounded-xl text-sm font-bold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: "#FF6B2B" }}
                onClick={() => window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "pricing" }))}>
                🚀 Planını Yükselt
              </button>
              <p className="text-center text-[11px] text-muted-foreground">14 gün ücretsiz dene</p>
            </>
          )}
          {plan === "pro" && (
            <button className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: "#FF6B2B" }}
              onClick={() => window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "pricing" }))}>
              📈 Ekip Planına Geç
            </button>
          )}
          {plan === "team" && (
            <button className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: "#FF6B2B" }}
              onClick={() => window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "pricing" }))}>
              🏢 Kurumsal Plana Geç
            </button>
          )}
        </div>
      </div>

      {/* Upgrade Cards */}
      {visibleUpgrades.length > 0 && !isAdmin && (
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground">Daha Fazlası İçin</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleUpgrades.map(card => (
              <div key={card.plan} className="rounded-xl p-4 flex flex-col bg-card border" style={{
                borderColor: card.highlight ? "#FF6B2B60" : undefined,
              }}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{card.emoji}</span>
                  <span className="text-sm font-bold text-foreground">{card.name}</span>
                </div>
                <p className="text-xs font-semibold mb-3" style={{ color: "#FF6B2B" }}>{card.price}</p>
                <div className="space-y-1.5 flex-1 mb-4">
                  {card.features.map((f, i) => (
                    <p key={i} className="text-[11px] flex items-center gap-1.5 text-muted-foreground">
                      <span style={{ color: "#22C55E" }}>✓</span> {f}
                    </p>
                  ))}
                </div>
                <button className="w-full py-2 rounded-lg text-xs font-semibold transition-colors hover:opacity-90" style={{
                  backgroundColor: card.highlight ? "#FF6B2B" : "transparent",
                  color: card.highlight ? "#FFF" : "#FF6B2B",
                  border: card.highlight ? "none" : "1px solid #FF6B2B40",
                }}>
                  {card.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice History */}
      {invoices.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 text-foreground">Faturalar / Ödeme Geçmişi</h4>
          <div className="hidden sm:block rounded-xl overflow-hidden bg-background border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid #1E2732" }}>
                  {["Tarih", "Plan", "Tutar", "Durum", ""].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id} style={{ borderBottom: i < invoices.length - 1 ? "1px solid #1E2732" : undefined }}>
                    <td className="px-4 py-3 text-foreground">{new Date(inv.created_at || inv.invoice_date).toLocaleDateString('tr-TR')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{PLAN_INFO[inv.plan_name]?.name || inv.plan_name}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">₺{inv.amount?.toLocaleString('tr-TR')}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "#22C55E20", color: "#22C55E" }}>✅ Ödendi</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => downloadInvoicePDF(inv)} className="text-[10px] px-2 py-1 rounded transition-colors hover:opacity-80" style={{ color: "#FF6B2B", border: "1px solid #FF6B2B40" }}>
                        📄 PDF İndir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sm:hidden space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="rounded-lg p-3 flex items-center justify-between bg-background border border-border">
                <div>
                  <p className="text-xs font-medium text-foreground">{new Date(inv.created_at || inv.invoice_date).toLocaleDateString('tr-TR')}</p>
                  <p className="text-[10px] text-muted-foreground">{PLAN_INFO[inv.plan_name]?.name || inv.plan_name} • ₺{inv.amount?.toLocaleString('tr-TR')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#22C55E20", color: "#22C55E" }}>✅</span>
                  <button onClick={() => downloadInvoicePDF(inv)} className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: "#FF6B2B" }}>📄</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel Subscription Button */}
      {canCancel && (
        <div className="pt-4" style={{ borderTop: "1px solid #1E2732" }}>
          <button
            onClick={handleCancelClick}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-colors hover:opacity-90"
            style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            ❌ Aboneliği İptal Et
          </button>
          <p className="text-center text-[10px] mt-1.5 text-muted-foreground">
            İptal sonrası dönem sonuna kadar erişiminiz devam eder.
          </p>
        </div>
      )}

      {/* Cancel Modal */}
      <Dialog open={cancelModal} onOpenChange={setCancelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {cancelStep === "done" ? "Abonelik İptal Edildi" : "Aboneliğini İptal Etmek İstediğine Emin Misin?"}
            </DialogTitle>
          </DialogHeader>

          {cancelStep === "reason" && (
            <div className="space-y-3 mt-2">
              <p className="text-xs text-muted-foreground">İptal nedeninizi öğrenmek isteriz:</p>
              {CANCEL_REASONS.map(r => (
                <label key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors"
                  style={{ backgroundColor: cancelReason === r.id ? "#FF6B2B10" : "transparent", border: cancelReason === r.id ? "1px solid #FF6B2B40" : "1px solid transparent" }}>
                  <input type="radio" name="cancel" value={r.id} checked={cancelReason === r.id}
                    onChange={() => setCancelReason(r.id)}
                    className="accent-[#FF6B2B]" />
                  <span className="text-xs text-foreground">{r.label}</span>
                </label>
              ))}
              <button disabled={!cancelReason} onClick={() => setCancelStep("response")}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
                style={{ backgroundColor: "#EF4444", color: "#FFF" }}>
                Devam Et
              </button>
            </div>
          )}

          {cancelStep === "response" && (() => {
            const resp = getSmartResponse();
            return (
              <div className="space-y-4 mt-2">
                <p className="text-xs leading-relaxed" style={{ color: "#CBD5E1" }}>{resp.msg}</p>
                {(resp as any).showInput && (
                  <textarea value={otherText} onChange={e => setOtherText(e.target.value)}
                    placeholder="Platform adını yazın..."
                    rows={2} className="w-full rounded-lg px-3 py-2 text-xs resize-none" />
                )}
                <div className="flex gap-2">
                  <button onClick={() => setCancelModal(false)}
                    className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-colors"
                    style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}>
                    {resp.primary}
                  </button>
                  <button onClick={handleConfirmCancel}
                    disabled={cancelling}
                    className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    style={{ backgroundColor: "#1E2732", color: "#94A3B8" }}>
                    {cancelling ? "İptal ediliyor..." : resp.secondary}
                  </button>
                </div>
              </div>
            );
          })()}

          {cancelStep === "done" && (
            <div className="space-y-4 mt-2">
              <div className="rounded-lg p-4 text-center" style={{ backgroundColor: "#22C55E10", border: "1px solid #22C55E30" }}>
                <p className="text-sm font-semibold" style={{ color: "#22C55E" }}>✅ Aboneliğin iptal edildi.</p>
                <p className="text-xs mt-1 text-muted-foreground">
                  {accessEndDate
                    ? `${new Date(accessEndDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} tarihine kadar ${info.name} özelliklerine erişmeye devam edebilirsin.`
                    : `Dönem sonuna kadar ${info.name} özelliklerine erişmeye devam edebilirsin.`
                  }
                </p>
              </div>
              <p className="text-[11px] text-center text-muted-foreground">
                Tekrar abone olmak istersen dilediğin zaman Planlar sayfasından yeniden başlayabilirsin.
              </p>
              <button onClick={() => { setCancelModal(false); window.location.reload(); }}
                className="w-full py-2.5 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}>
                Tamam
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Card Confirm Modal */}
      <Dialog open={!!deleteConfirmCard} onOpenChange={(open) => !open && setDeleteConfirmCard(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Kartı Sil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-xs text-muted-foreground">
              Bu kartı silmek istediğinize emin misiniz?{' '}
              <span className="font-semibold text-foreground">**** {deleteConfirmCard?.last_four_digits}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmCard(null)}
                className="flex-1 py-2.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: "#1E2732", color: "#94A3B8" }}
              >
                Vazgeç
              </button>
              <button
                onClick={confirmDeleteCard}
                disabled={deletingCardId === deleteConfirmCard?.id}
                className="flex-1 py-2.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ backgroundColor: "#EF4444", color: "#FFF" }}
              >
                {deletingCardId === deleteConfirmCard?.id ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const UsageBar = ({ label, used, max, suffix }: { label: string; used: number; max: number; suffix: string }) => {
  const pct = Math.min((used / max) * 100, 100);
  const isHigh = pct >= 80;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-[11px] font-medium" style={{ color: isHigh ? "#EF4444" : "#F1F5F9" }}>
          {used}/{max}{suffix ? ` (${suffix})` : ""}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#1E2732" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: isHigh ? "#EF4444" : "#FF6B2B" }} />
      </div>
    </div>
  );
};

export default DesktopSettingsPage;
