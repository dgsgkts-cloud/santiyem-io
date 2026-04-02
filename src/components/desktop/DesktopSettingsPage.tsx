import { useState } from "react";
import { useUser, PlanType } from "@/contexts/UserContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TeamManagement from "./TeamManagement";
import { User, Bell, CreditCard, Users, Shield, Building2, Upload, X, Camera } from "lucide-react";
import { toast } from "sonner";
import { getCompanyProfile, saveCompanyProfile, CompanyProfile } from "@/lib/companyProfile";

const TABS = [
  { id: "profile", label: "Profil", icon: User },
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
          {activeTab === "notifications" && (
            <div className="space-y-5 lg:space-y-6">
              <div>
                <h3 className="text-[15px] lg:text-[16px] font-semibold mb-1" style={{ color: "#F1F5F9" }}>Bildirim Tercihleri</h3>
                <p className="text-[11px] lg:text-[12px]" style={{ color: "#64748B" }}>Hangi bildirimleri almak istediğinizi seçin</p>
              </div>
              <div className="space-y-3 lg:space-y-4">
                <ToggleRow label="E-posta Bildirimleri" desc="Günlük özet ve önemli güncellemeler" defaultOn />
                <ToggleRow label="Proje Güncellemeleri" desc="Proje durumu değişikliklerinde bildir" defaultOn />
                <ToggleRow label="Hakediş Bildirimleri" desc="Hakediş onay ve ödeme bildirimleri" defaultOn />
                <ToggleRow label="Pazarlama E-postaları" desc="Yeni özellik ve kampanya haberleri" />
              </div>
            </div>
          )}
          {activeTab === "subscription" && (
            <div className="space-y-5 lg:space-y-6">
              <div>
                <h3 className="text-[15px] lg:text-[16px] font-semibold mb-1" style={{ color: "#F1F5F9" }}>Abonelik Yönetimi</h3>
                <p className="text-[11px] lg:text-[12px]" style={{ color: "#64748B" }}>Mevcut planınız ve faturalama bilgileri</p>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[13px] lg:text-[14px] font-semibold" style={{ color: "#F1F5F9" }}>
                      {plan === "pro" ? "Profesyonel Plan" : plan === "team" ? "Ekip Planı" : plan === "enterprise" ? "Kurumsal Plan" : plan === "plus" ? "Plus Plan" : plan === "office_pro" ? "Kurumsal Pro" : plan === "office_free" ? "Kurumsal Ücretsiz" : plan === "office_custom" ? "Özel Kurumsal" : "Başlangıç Planı"}
                    </span>
                    <p className="text-[11px] lg:text-[12px] mt-0.5" style={{ color: "#64748B" }}>
                      {plan === "free" ? "Temel özellikler" : plan === "pro" ? "399₺/ay" : plan === "team" ? "1.499₺/ay · 5 kullanıcı" : plan === "enterprise" ? "4.999₺/ay · Sınırsız" : "Tüm özellikler aktif"}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md self-start" style={{
                    backgroundColor: plan === "pro" || plan === "plus" ? "rgba(255,107,43,0.15)" : plan === "office_pro" || plan === "office_free" || plan === "office_custom" ? "rgba(59,130,246,0.15)" : "rgba(100,116,139,0.15)",
                    color: plan === "pro" || plan === "plus" ? "#FF6B2B" : plan === "office_pro" || plan === "office_free" || plan === "office_custom" ? "#60A5FA" : "#64748B",
                  }}>
                    {plan === "pro" ? "Profesyonel" : plan === "team" ? "Ekip" : plan === "enterprise" ? "Kurumsal" : plan === "plus" ? "Plus" : plan === "office_pro" ? "Kurumsal Pro" : plan === "office_free" ? "Kurumsal" : plan === "office_custom" ? "Özel" : "Başlangıç"}
                  </span>
                </div>
              </div>
            </div>
          )}
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

const ToggleRow = ({ label, desc, defaultOn }: { label: string; desc: string; defaultOn?: boolean }) => {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <div className="flex items-center justify-between py-2 gap-3" style={{ borderBottom: "1px solid #1E2732" }}>
      <div className="min-w-0">
        <p className="text-[12px] lg:text-[13px] font-medium" style={{ color: "#F1F5F9" }}>{label}</p>
        <p className="text-[10px] lg:text-[11px]" style={{ color: "#64748B" }}>{desc}</p>
      </div>
      <button
        onClick={() => setOn(!on)}
        className="relative w-10 h-5 rounded-full transition-colors duration-150 shrink-0"
        style={{ backgroundColor: on ? "#FF6B2B" : "#1E2732" }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-150"
          style={{ transform: on ? "translateX(20px)" : "translateX(2px)" }}
        />
      </button>
    </div>
  );
};

export default DesktopSettingsPage;
