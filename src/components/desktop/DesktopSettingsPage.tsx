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
        <div className="rounded-xl p-4 lg:p-6" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
          {activeTab === "profile" && (
            <div className="space-y-5 lg:space-y-6">
              <div>
                <h3 className="text-[15px] lg:text-[16px] font-semibold mb-1" style={{ color: "#F1F5F9" }}>Profil Bilgileri</h3>
                <p className="text-[11px] lg:text-[12px]" style={{ color: "#64748B" }}>Kişisel bilgilerinizi güncelleyin</p>
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
          {activeTab === "company" && <CompanyProfileTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "subscription" && <SubscriptionTab plan={plan} />}
          {activeTab === "team" && <TeamManagement />}
          {activeTab === "security" && (
            <div className="text-center py-8 lg:py-12">
              <p className="text-[13px] lg:text-[14px]" style={{ color: "#64748B" }}>Bu bölüm yakında aktif olacaktır.</p>
            </div>
          )}
        </div>
      </div>
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
        <h3 className="text-[15px] lg:text-[16px] font-semibold mb-1" style={{ color: "#F1F5F9" }}>🏢 Firma Profili</h3>
        <p className="text-[11px] lg:text-[12px]" style={{ color: "#64748B" }}>PDF çıktılarınızda kullanılacak firma bilgileri</p>
      </div>

      {/* Logo Upload */}
      <div>
        <label className="text-[12px] font-semibold mb-2 block" style={{ color: "#94A3B8" }}>Firma Logosu</label>
        {cp.logoDataUrl ? (
          <div className="space-y-2">
            <div className="rounded-xl p-4 flex items-center justify-center" style={{ backgroundColor: "#FFF", border: "1px solid #1E2732", minHeight: 80 }}>
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
            <p className="text-xs font-medium" style={{ color: "#94A3B8" }}>Logo Yükle</p>
            <p className="text-[10px] mt-1" style={{ color: "#475569" }}>PNG, JPG, SVG — max 2MB</p>
            <p className="text-[10px]" style={{ color: "#475569" }}>Önerilen: 300×100px veya 400×150px</p>
          </div>
        )}
        <input id="logo-upload" type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
      </div>

      {/* Company Info */}
      <div>
        <label className="text-[12px] font-semibold mb-3 block" style={{ color: "#94A3B8" }}>Firma Bilgileri</label>
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
        <label className="text-[12px] font-semibold mb-3 block" style={{ color: "#94A3B8" }}>İletişim Bilgileri</label>
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
        <label className="text-[12px] font-semibold mb-3 block" style={{ color: "#94A3B8" }}>İmza Alanı Ayarları</label>
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
    <label className="text-[11px] font-medium mb-1.5 block" style={{ color: "#64748B" }}>{label}</label>
    {multiline ? (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full rounded-lg px-3 py-2 text-[13px] outline-none transition-colors resize-none"
        style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
        onFocus={e => { e.currentTarget.style.borderColor = "#FF6B2B"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "#1E2732"; }}
      />
    ) : (
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 text-[13px] outline-none transition-colors"
        style={{ height: 36, backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
        onFocus={e => { e.currentTarget.style.borderColor = "#FF6B2B"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "#1E2732"; }}
      />
    )}
  </div>
);

const FormField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <label className="text-[11px] lg:text-[12px] font-semibold mb-1.5 block" style={{ color: "#94A3B8" }}>{label}</label>
    <input
      defaultValue={value}
      className="w-full rounded-lg px-3 text-[13px] outline-none transition-colors duration-150"
      style={{ height: 36, backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "#FF6B2B"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(255,107,43,0.15)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "#1E2732"; e.currentTarget.style.boxShadow = "none"; }}
    />
  </div>
);

const ToggleRow = ({ label, desc, on, onChange, disabled }: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => {
  return (
    <div className="flex items-center justify-between py-2 gap-3" style={{ borderBottom: "1px solid #1E2732", opacity: disabled ? 0.6 : 1 }}>
      <div className="min-w-0">
        <p className="text-[12px] lg:text-[13px] font-medium" style={{ color: "#F1F5F9" }}>{label}</p>
        <p className="text-[10px] lg:text-[11px]" style={{ color: "#64748B" }}>{desc}</p>
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

  if (loading) return <p className="text-[13px] py-8 text-center" style={{ color: "#64748B" }}>Yükleniyor...</p>;

  return (
    <div className="space-y-5 lg:space-y-6">
      <div>
        <h3 className="text-[15px] lg:text-[16px] font-semibold mb-1" style={{ color: "#F1F5F9" }}>Bildirim Tercihleri</h3>
        <p className="text-[11px] lg:text-[12px]" style={{ color: "#64748B" }}>Hangi bildirimleri almak istediğinizi seçin</p>
      </div>

      <div>
        <p className="text-[11px] font-semibold mb-2" style={{ color: "#94A3B8" }}>ZORUNLU BİLDİRİMLER</p>
        <ToggleRow label="Kayıt Onay E-postası" desc="Hesap doğrulama e-postası (kapatılamaz)" on={true} onChange={() => {}} disabled />
        <ToggleRow label="Şifre Sıfırlama" desc="Şifre sıfırlama bağlantısı (kapatılamaz)" on={true} onChange={() => {}} disabled />
      </div>

      <div>
        <p className="text-[11px] font-semibold mb-2" style={{ color: "#94A3B8" }}>E-POSTA BİLDİRİMLERİ</p>
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
        <p className="text-[11px] font-semibold mb-2" style={{ color: "#94A3B8" }}>WHATSAPP BİLDİRİMLERİ</p>
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
              style={{ height: 36, backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }}
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

const MOCK_INVOICES = [
  { date: "15 Nisan 2025", plan: "Profesyonel", amount: "₺399", status: "Ödendi" },
  { date: "15 Mart 2025", plan: "Profesyonel", amount: "₺399", status: "Ödendi" },
  { date: "15 Şubat 2025", plan: "Profesyonel", amount: "₺399", status: "Ödendi" },
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

  const info = PLAN_INFO[plan] || PLAN_INFO.free;
  const isFree = plan === "free";
  const isPaid = ["pro", "plus", "team", "enterprise", "office_pro", "office_custom"].includes(plan);

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

  const getSmartResponse = () => {
    if (cancelReason === "expensive") return {
      msg: "Anladık. Yıllık plana geçersen %20 tasarruf edersin — aylık 319₺'ye düşer. Devam etmek ister misin?",
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
      msg: "Aboneliğinizi iptal etmek istediğinize emin misiniz?",
      primary: "Vazgeç", secondary: "Onayla ve İptal Et"
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[15px] lg:text-[16px] font-semibold mb-1" style={{ color: "#F1F5F9" }}>Abonelik Yönetimi</h3>
        <p className="text-[11px] lg:text-[12px]" style={{ color: "#64748B" }}>Mevcut planınız ve faturalama bilgileri</p>
      </div>

      {/* Current Plan Card */}
      <div className="rounded-xl p-5" style={{ backgroundColor: "#0F1419", border: isPaid ? "1px solid #FF6B2B40" : "1px solid #1E2732" }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{info.emoji}</span>
              <span className="text-[16px] font-bold" style={{ color: "#F1F5F9" }}>{info.name}</span>
            </div>
            <p className="text-sm font-semibold" style={{ color: isPaid ? "#FF6B2B" : "#64748B" }}>{info.price}</p>
            {isPaid && (
              <>
                <p className="text-[11px] mt-1" style={{ color: "#64748B" }}>Sonraki fatura: 15 Mayıs 2025</p>
                <p className="text-[11px] mt-0.5" style={{ color: "#22C55E" }}>✅ Aktif</p>
                {plan === "team" && <p className="text-[11px] mt-0.5" style={{ color: "#94A3B8" }}>Kullanıcılar: 3/5</p>}
              </>
            )}
            {isFree && <p className="text-[11px] mt-1" style={{ color: "#64748B" }}>{info.sub}</p>}
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
            <p className="text-[11px] font-semibold" style={{ color: "#94A3B8" }}>Kullanım Limitlerin</p>
            <UsageBar label="AI Soruları" used={usage.aiQuestions.used} max={usage.aiQuestions.max} suffix="bugün" />
            <UsageBar label="Aktif Proje" used={1} max={1} suffix="" />
            <UsageBar label="Hakediş" used={1} max={1} suffix="bu ay" />
            <UsageBar label="PDF Çıktı" used={0} max={3} suffix="bu ay" />
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 space-y-2">
          {isFree && !isAdmin && (
            <>
              <button className="w-full py-3 rounded-xl text-sm font-bold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: "#FF6B2B" }}>
                🚀 Planını Yükselt
              </button>
              <p className="text-center text-[11px]" style={{ color: "#64748B" }}>14 gün ücretsiz dene</p>
            </>
          )}
          {plan === "pro" && (
            <button className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: "#FF6B2B" }}>
              📈 Ekip Planına Geç
            </button>
          )}
          {plan === "team" && (
            <button className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: "#FF6B2B" }}>
              🏢 Kurumsal Plana Geç
            </button>
          )}
          {isPaid && (
            <button onClick={handleCancelClick} className="text-[11px] hover:underline" style={{ color: "#475569" }}>
              ❌ Aboneliği İptal Et
            </button>
          )}
        </div>
      </div>

      {/* Upgrade Cards */}
      {visibleUpgrades.length > 0 && !isAdmin && (
        <div>
          <h4 className="text-sm font-semibold mb-3" style={{ color: "#F1F5F9" }}>Daha Fazlası İçin</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleUpgrades.map(card => (
              <div key={card.plan} className="rounded-xl p-4 flex flex-col" style={{
                backgroundColor: "#0F1419",
                border: card.highlight ? "1px solid #FF6B2B60" : "1px solid #1E2732",
              }}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{card.emoji}</span>
                  <span className="text-sm font-bold" style={{ color: "#F1F5F9" }}>{card.name}</span>
                </div>
                <p className="text-xs font-semibold mb-3" style={{ color: "#FF6B2B" }}>{card.price}</p>
                <div className="space-y-1.5 flex-1 mb-4">
                  {card.features.map((f, i) => (
                    <p key={i} className="text-[11px] flex items-center gap-1.5" style={{ color: "#94A3B8" }}>
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
      {isPaid && (
        <div>
          <h4 className="text-sm font-semibold mb-3" style={{ color: "#F1F5F9" }}>Fatura Geçmişi</h4>
          {/* Desktop table */}
          <div className="hidden sm:block rounded-xl overflow-hidden" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid #1E2732" }}>
                  {["Tarih", "Plan", "Tutar", "Durum", ""].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 font-medium" style={{ color: "#64748B" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_INVOICES.map((inv, i) => (
                  <tr key={i} style={{ borderBottom: i < MOCK_INVOICES.length - 1 ? "1px solid #1E2732" : undefined }}>
                    <td className="px-4 py-3" style={{ color: "#F1F5F9" }}>{inv.date}</td>
                    <td className="px-4 py-3" style={{ color: "#94A3B8" }}>{inv.plan}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: "#F1F5F9" }}>{inv.amount}</td>
                    <td className="px-4 py-3"><span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "#22C55E20", color: "#22C55E" }}>✅ {inv.status}</span></td>
                    <td className="px-4 py-3"><button className="text-[11px] hover:underline" style={{ color: "#FF6B2B" }}>📄 İndir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {MOCK_INVOICES.map((inv, i) => (
              <div key={i} className="rounded-lg p-3 flex items-center justify-between" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
                <div>
                  <p className="text-xs font-medium" style={{ color: "#F1F5F9" }}>{inv.date}</p>
                  <p className="text-[10px]" style={{ color: "#64748B" }}>{inv.plan} • {inv.amount}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#22C55E20", color: "#22C55E" }}>✅</span>
                  <button className="text-[11px]" style={{ color: "#FF6B2B" }}>📄</button>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-2 text-[11px] hover:underline" style={{ color: "#FF6B2B" }}>Tüm Faturaları Gör →</button>
        </div>
      )}

      {/* Cancel Modal */}
      <Dialog open={cancelModal} onOpenChange={setCancelModal}>
        <DialogContent className="max-w-md" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", color: "#F1F5F9" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#F1F5F9" }}>
              {cancelStep === "done" ? "Abonelik İptal Edildi" : "Aboneliğini İptal Etmek İstediğine Emin Misin?"}
            </DialogTitle>
          </DialogHeader>

          {cancelStep === "reason" && (
            <div className="space-y-3 mt-2">
              <p className="text-xs" style={{ color: "#94A3B8" }}>İptal nedeninizi öğrenmek isteriz:</p>
              {CANCEL_REASONS.map(r => (
                <label key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors"
                  style={{ backgroundColor: cancelReason === r.id ? "#FF6B2B10" : "transparent", border: cancelReason === r.id ? "1px solid #FF6B2B40" : "1px solid transparent" }}>
                  <input type="radio" name="cancel" value={r.id} checked={cancelReason === r.id}
                    onChange={() => setCancelReason(r.id)}
                    className="accent-[#FF6B2B]" />
                  <span className="text-xs" style={{ color: "#F1F5F9" }}>{r.label}</span>
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
                    rows={2} className="w-full rounded-lg px-3 py-2 text-xs resize-none"
                    style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", color: "#F1F5F9" }} />
                )}
                <div className="flex gap-2">
                  <button onClick={() => setCancelModal(false)}
                    className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-colors"
                    style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}>
                    {resp.primary}
                  </button>
                  <button onClick={async () => {
                    setCancelling(true);
                    try {
                      if (user) {
                        // Cancel active subscriptions
                        await supabase.from('user_subscriptions' as any).update({
                          status: 'cancelled',
                          cancelled_at: new Date().toISOString(),
                        } as any).eq('user_id', user.id).in('status', ['trial', 'active']);
                        // Downgrade plan at end of period (keep access until trial_end/next_payment_date)
                      }
                    } catch (err) {
                      console.error('Cancel error:', err);
                    }
                    setCancelling(false);
                    setCancelStep("done");
                  }}
                    disabled={cancelling}
                    className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-colors"
                    style={{ backgroundColor: "#1E2732", color: "#94A3B8" }}>
                    {resp.secondary}
                  </button>
                </div>
              </div>
            );
          })()}

          {cancelStep === "done" && (
            <div className="space-y-4 mt-2">
              <div className="rounded-lg p-4 text-center" style={{ backgroundColor: "#22C55E10", border: "1px solid #22C55E30" }}>
                <p className="text-sm font-semibold" style={{ color: "#22C55E" }}>✅ Aboneliğin iptal edildi.</p>
                <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>
                  15 Mayıs 2025'e kadar {info.name} özelliklerine erişmeye devam edebilirsin.
                </p>
              </div>
              <button onClick={() => setCancelModal(false)}
                className="w-full py-2.5 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: "#FF6B2B", color: "#FFF" }}>
                Tamam
              </button>
            </div>
          )}
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
        <span className="text-[11px]" style={{ color: "#94A3B8" }}>{label}</span>
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
