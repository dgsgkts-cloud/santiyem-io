import { useState } from "react";
import { Check, X, Shield, Lock, RefreshCw, FileText, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PaymentLogos } from "@/components/PaymentLogos";

const PricingPanel = () => {
  const [yearly, setYearly] = useState(false);
  const [showEnterpriseForm, setShowEnterpriseForm] = useState(false);
  const [formData, setFormData] = useState({ company: "", name: "", email: "", phone: "", teamSize: "", message: "" });
  const [formLoading, setFormLoading] = useState(false);

  const plans = [
    {
      id: "free",
      name: "Başlangıç",
      monthlyPrice: 0,
      yearlyPrice: 0,
      subtitle: "Sonsuza kadar ücretsiz",
      users: "1",
      projects: "1",
      featured: false,
      badge: null,
      btnText: "Ücretsiz Başla",
      btnStyle: "outline" as const,
      color: null,
      features: [
        "1 kullanıcı",
        "1 aktif proje",
        "3 hakediş/ay",
        "Şantiye günlüğü — günde 1 kayıt",
        "Hesap araçları — sınırsız",
        "AI Asistan — günde 3 soru",
        "PDF çıktı — aylık 3 adet",
      ],
    },
    {
      id: "pro",
      name: "Profesyonel",
      monthlyPrice: 399,
      yearlyPrice: 319,
      subtitle: "Serbest mühendis ve mimarlar için",
      users: "1",
      projects: "Sınırsız",
      featured: true,
      badge: "EN POPÜLER",
      btnText: "14 Gün Ücretsiz Dene",
      btnStyle: "primary" as const,
      
      color: "#FF6B2B",
      features: [
        "1 kullanıcı",
        "Sınırsız proje",
        "Sınırsız hakediş",
        "Gecikmiş ödeme uyarısı + yasal faiz hesabı",
        "Şantiye günlüğü — sınırsız kayıt",
        "Fotoğraf raporlama — aylık PDF rapor",
        "Hesap araçları — sınırsız",
        "AI Asistan — sınırsız",
        "AI Hakediş Analizi",
        "PDF çıktı — sınırsız + firma başlığı + imza alanı",
      ],
    },
    {
      id: "team",
      name: "Ekip",
      monthlyPrice: 1499,
      yearlyPrice: 1199,
      subtitle: "Küçük mühendislik ofisleri için",
      users: "5",
      projects: "Sınırsız",
      featured: false,
      badge: null,
      btnText: "14 Gün Ücretsiz Dene",
      btnStyle: "outline" as const,
      color: "#94A3B8",
      features: [
        "5 kullanıcı hesabı",
        "Sınırsız proje",
        "Profesyonel plandaki her şey",
        "Ekip görevi atama + kişiye özel not",
        "Ortak proje ve hakediş takibi",
        "Ekip aktivite akışı",
        "AI Proje Analizi",
        "Öncelikli e-posta desteği",
      ],
    },
    {
      id: "enterprise",
      name: "Kurumsal",
      monthlyPrice: 4999,
      yearlyPrice: 3999,
      subtitle: "Büyük mühendislik firmaları ve müteahhitler için",
      users: "Sınırsız",
      projects: "Sınırsız",
      featured: false,
      badge: null,
      btnText: "Teklif Al",
      btnStyle: "outline" as const,
      color: null,
      isPremium: true,
      features: [
        "Sınırsız kullanıcı",
        "Sınırsız proje",
        "Ekip planındaki her şey",
        "Gelişmiş yetki rolleri (yönetici / editör / görüntüleyici)",
        "AI Bütçe Sapma Analizi",
        "Aylık kullanım raporu",
        "Öncelikli telefon + WhatsApp desteği",
        "Özel onboarding",
      ],
    },
  ];

  const formatPrice = (p: { monthlyPrice: number; yearlyPrice: number }) => {
    if (p.monthlyPrice === 0) return { display: "0₺", period: "/ay", sub: null };
    if (yearly) {
      return {
        display: `${p.yearlyPrice.toLocaleString("tr-TR")}₺`,
        period: "/ay",
        sub: `Yıllık ${(p.yearlyPrice * 12).toLocaleString("tr-TR")}₺ · %20 tasarruf`,
      };
    }
    return { display: `${p.monthlyPrice.toLocaleString("tr-TR")}₺`, period: "/ay", sub: null };
  };

  const handleEnterpriseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company || !formData.name || !formData.email || !formData.message) {
      toast.error("Lütfen zorunlu alanları doldurun.");
      return;
    }
    setFormLoading(true);
    try {
      await supabase.functions.invoke("send-enterprise-inquiry", { body: formData });
      toast.success("Talebiniz alındı! 48 saat içinde size dönüş yapılacaktır.");
      setShowEnterpriseForm(false);
      setFormData({ company: "", name: "", email: "", phone: "", teamSize: "", message: "" });
    } catch {
      toast.success("Talebiniz alındı!");
      setShowEnterpriseForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  // Comparison table data
  const comparisonSections = [
    {
      title: "KULLANICI & PROJE",
      rows: [
        { label: "Kullanıcı sayısı", values: ["1", "1", "5", "Sınırsız"] },
        { label: "Aktif proje", values: ["1", "Sınırsız", "Sınırsız", "Sınırsız"] },
        { label: "Hakediş/ay", values: ["3", "Sınırsız", "Sınırsız", "Sınırsız"] },
      ],
    },
    {
      title: "HAKEDİŞ YÖNETİMİ",
      rows: [
        { label: "Gecikmiş Ödeme Uyarısı", values: [false, true, true, true] },
        { label: "Yasal Faiz Hesabı", values: [false, true, true, true] },
        { label: "AI Hakediş Analizi", values: [false, true, true, true] },
        { label: "AI Bütçe Sapma Analizi", values: [false, false, false, true] },
      ],
    },
    {
      title: "ŞANTİYE GÜNLÜĞÜ",
      rows: [
        { label: "Günlük Kayıt", values: ["1/gün", "Sınırsız", "Sınırsız", "Sınırsız"] },
        { label: "Fotoğraf Yükleme", values: [false, true, true, true] },
        { label: "Haftalık AI Özeti", values: [false, true, true, true] },
      ],
    },
    {
      title: "RAPORLAMA",
      rows: [
        { label: "PDF Çıktı", values: ["3/ay", "Sınırsız", "Sınırsız", "Sınırsız"] },
        { label: "Firma Logosu + Kaşe", values: [false, true, true, true] },
        { label: "Fotoğraf Raporu", values: [false, true, true, true] },
      ],
    },
    {
      title: "AI ASİSTAN",
      rows: [
        { label: "Günlük Soru Limiti", values: ["3", "Sınırsız", "Sınırsız", "Sınırsız"] },
        { label: "AI Proje Analizi", values: [false, "Temel", "Gelişmiş", "Tam"] },
      ],
    },
    {
      title: "EKİP",
      rows: [
        { label: "Görev Atama", values: [false, false, true, true] },
        { label: "Ortak Proje Takibi", values: [false, false, true, true] },
        { label: "Yetki Rolleri", values: [false, false, false, true] },
        { label: "Aktivite Akışı", values: [false, false, true, true] },
      ],
    },
    {
      title: "DESTEK",
      rows: [
        { label: "Destek Kanalı", values: ["Email", "Email", "Öncelikli", "Tel + WA"] },
        { label: "Özel Onboarding", values: [false, false, false, true] },
      ],
    },
    {
      title: "HESAP ARAÇLARI",
      rows: [
        { label: "Tüm araçlar", values: [true, true, true, true] },
      ],
    },
  ];

  const renderCellValue = (val: string | boolean) => {
    if (val === true) return <Check className="w-4 h-4 text-green-500 mx-auto" />;
    if (val === false) return <span className="text-muted-foreground/40">—</span>;
    if (typeof val === "string" && ["Temel", "Gelişmiş", "Tam"].includes(val)) {
      return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(255,107,43,0.15)", color: "#FF6B2B" }}>{val}</span>;
    }
    return <span className="text-[12px] text-foreground">{val}</span>;
  };

  const planHeaders = ["Başlangıç", "Profesyonel", "Ekip", "Kurumsal"];

  const faqs = [
    { q: "14 günlük deneme gerçekten ücretsiz mi?", a: "Evet. Kredi kartı bilgisi gerekmez. Süre sonunda otomatik ücretlendirme yapılmaz." },
    { q: "Ekip planında 5 kişiden fazla kullanıcı ekleyebilir miyim?", a: "Daha fazla kullanıcı için Kurumsal planı değerlendirebilir veya bizimle iletişime geçebilirsiniz." },
    { q: "Bireysel mi kurumsal mı fatura kesiliyor?", a: "Her ikisi de mümkün. Kayıt sırasında tercih edebilirsiniz." },
    { q: "Verilerim güvende mi?", a: "Tüm veriler 256-bit SSL şifreleme ile korunur. KVKK kapsamında işlenir." },
    { q: "İptal etmek istersem ne yapmalıyım?", a: "Ayarlar sayfasından tek tıkla iptal edebilirsiniz. Dönem sonuna kadar erişiminiz devam eder." },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Şantiyeniz İçin Doğru Plan</h1>
        <p className="text-muted-foreground">İlk 14 gün ücretsiz.</p>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <span className={`text-sm font-medium ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>Aylık</span>
        <button
          onClick={() => setYearly(!yearly)}
          className="relative w-12 h-6 rounded-full transition-colors duration-200"
          style={{ backgroundColor: yearly ? "#FF6B2B" : "#1E2732" }}
        >
          <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200" style={{ transform: yearly ? "translateX(24px)" : "translateX(0)" }} />
        </button>
        <span className={`text-sm font-medium ${yearly ? "text-foreground" : "text-muted-foreground"}`}>
          Yıllık
          <span className="ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(255,107,43,0.15)", color: "#FF6B2B" }}>%20 indirim</span>
        </span>
      </div>

      {/* 4 Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-14">
        {plans.map((plan) => {
          const price = formatPrice(plan);
          const isPremium = "isPremium" in plan && plan.isPremium;
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-5 flex flex-col ${plan.featured ? "border-[#FF6B2B] shadow-lg shadow-[#FF6B2B]/10 md:scale-[1.02]" : "border-border"}`}
              style={{
                backgroundColor: isPremium ? "rgba(15,20,25,0.8)" : plan.featured ? "rgba(255,107,43,0.03)" : undefined,
                borderColor: isPremium ? "#2A3441" : undefined,
              }}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: "#FF6B2B" }}>
                  {plan.badge}
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold text-foreground">{price.display}</span>
                  <span className="text-muted-foreground text-sm">{price.period}</span>
                </div>
                {price.sub && <p className="text-xs mt-1" style={{ color: "#FF6B2B" }}>{price.sub}</p>}
                <p className="text-xs text-muted-foreground mt-1">{plan.subtitle}</p>
              </div>

              <div className="flex-1 space-y-2.5 mb-6">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Button
                  onClick={plan.id === "enterprise" ? () => setShowEnterpriseForm(true) : undefined}
                  className={`w-full font-semibold h-11 ${plan.btnStyle === "primary" ? "text-white" : "bg-transparent border border-border text-foreground hover:bg-secondary"}`}
                  style={plan.btnStyle === "primary" ? { backgroundColor: "#FF6B2B" } : undefined}
                >
                  {plan.btnText}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      <div className="mb-14">
        <h2 className="text-xl font-bold text-foreground text-center mb-6">Planları Karşılaştır</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm" style={{ minWidth: 700 }}>
            <thead>
              <tr style={{ backgroundColor: "#0F1419" }}>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium w-[200px]">Özellik</th>
                {planHeaders.map((h, i) => (
                  <th key={h} className="py-3 px-3 text-center font-semibold text-foreground" style={{ backgroundColor: i === 1 ? "rgba(255,107,43,0.05)" : undefined }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonSections.map((section) => (
                <>
                  <tr key={section.title}>
                    <td colSpan={5} className="py-2 px-4 text-[11px] font-bold tracking-wider uppercase" style={{ color: "#FF6B2B", backgroundColor: "rgba(255,107,43,0.04)" }}>
                      {section.title}
                    </td>
                  </tr>
                  {section.rows.map((row, ri) => (
                    <tr key={`${section.title}-${ri}`} className="border-t border-border hover:bg-[#1C242D]/50 transition-colors">
                      <td className="py-2.5 px-4 text-foreground text-[13px]">{row.label}</td>
                      {row.values.map((val, vi) => (
                        <td key={vi} className="py-2.5 px-3 text-center" style={{ backgroundColor: vi === 1 ? "rgba(255,107,43,0.03)" : undefined }}>
                          {renderCellValue(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: "🔒", title: "SSL Güvenli Ödeme" },
          { icon: "🔄", title: "İstediğin Zaman İptal" },
          { icon: "📄", title: "E-Fatura Otomatik" },
          { icon: "💬", title: "WhatsApp Destek" },
        ].map((t) => (
          <div key={t.title} className="flex items-center gap-3 rounded-xl p-4 border border-border" style={{ backgroundColor: "#161C23" }}>
            <span className="text-2xl">{t.icon}</span>
            <span className="text-sm font-medium text-foreground">{t.title}</span>
          </div>
        ))}
      </div>

      {/* iyzico Logo Band */}
      <div className="flex flex-col items-center gap-3 mb-14 pt-6" style={{ borderTop: "1px solid #1E2732" }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium" style={{ color: "#22C55E" }}>🔒 SSL Güvenli</span>
          <PaymentLogos />
        </div>
        <p className="text-[11px] text-center" style={{ color: "#475569" }}>
          Tüm ödemeler iyzico güvencesiyle 256-bit SSL ile korunmaktadır.
        </p>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-foreground text-center mb-6">Sıkça Sorulan Sorular</h2>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-xl px-4">
              <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Enterprise Form Modal */}
      {showEnterpriseForm && (
        <>
          <div className="fixed inset-0 z-[200] bg-black/60" onClick={() => setShowEnterpriseForm(false)} />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border p-6" style={{ backgroundColor: "#1A1F2E", borderColor: "#2A3441" }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white">Kurumsal Teklif Al</h3>
                  <p className="text-xs text-white/50 mt-0.5">Size özel fiyat teklifi için bilgilerinizi iletin</p>
                </div>
                <button onClick={() => setShowEnterpriseForm(false)} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleEnterpriseSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Şirket Adı *</label>
                    <input value={formData.company} onChange={e => setFormData(p => ({ ...p, company: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }} required />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">İsim Soyisim *</label>
                    <input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">E-posta *</label>
                    <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }} required />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Telefon</label>
                    <input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/60 mb-1 block">Tahmini Ekip Büyüklüğü</label>
                  <input value={formData.teamSize} onChange={e => setFormData(p => ({ ...p, teamSize: e.target.value }))} placeholder="Örn: 10-20 kişi" className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none placeholder:text-white/20" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }} />
                </div>
                <div>
                  <label className="text-xs text-white/60 mb-1 block">Mesajınız *</label>
                  <textarea value={formData.message} onChange={e => setFormData(p => ({ ...p, message: e.target.value }))} rows={3} placeholder="İhtiyaçlarınızı kısaca açıklayın..." className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none resize-none placeholder:text-white/20" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }} required />
                </div>
                <Button type="submit" disabled={formLoading} className="w-full h-11 font-semibold text-white gap-2" style={{ backgroundColor: "#FF6B2B" }}>
                  <Send className="w-4 h-4" />
                  {formLoading ? "Gönderiliyor..." : "Teklif Talep Et"}
                </Button>
                <p className="text-center text-xs text-white/40">Size e-posta yoluyla 48 saat içinde dönüş yapılacaktır.</p>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PricingPanel;
