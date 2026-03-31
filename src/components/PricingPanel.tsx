import { useState } from "react";
import { Check, X, Shield, Building2, User, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentLogoBand, TrustBadges } from "@/components/PaymentLogos";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TabType = "bireysel" | "kurumsal";

const PricingPanel = () => {
  const [yearly, setYearly] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("bireysel");
  const [showEnterpriseForm, setShowEnterpriseForm] = useState(false);
  const [formData, setFormData] = useState({ company: "", name: "", email: "", phone: "", teamSize: "", message: "" });
  const [formLoading, setFormLoading] = useState(false);

  const bireyselPlans = [
    {
      id: "free", name: "Başlangıç", price: "0₺", period: "/ay", subtitle: "Sonsuza kadar ücretsiz",
      badge: null, featured: false,
      button: { text: "Ücretsiz Başla", style: "outline" as const },
      features: [
        { text: "AI Asistan — günde 5 soru", included: true },
        { text: "Fotoğraf Analizi — günde 2", included: true },
        { text: "Hesap Araçları — sınırsız", included: true },
        { text: "Günlük Bilgi — sınırsız", included: true },
        { text: "Haberler ve Mevzuat — sınırsız", included: true },
        { text: "Hava Durumu — sınırsız", included: true },
        { text: "Etkinlik Takvimi — sınırsız", included: true },
        { text: "AI Mimari Render", included: false },
        { text: "Hatırlatıcılar", included: false },
        { text: "İndirme (PDF/Excel)", included: false },
        { text: "Proje Yönetimi", included: false },
        { text: "Hakediş Yönetimi", included: false },
      ],
    },
    {
      id: "plus", name: "Plus", price: "199₺", period: "/ay", subtitle: "Bireysel profesyoneller için",
      badge: null, featured: false,
      button: { text: "14 Gün Ücretsiz Dene", style: "primary" as const },
      features: [
        { text: "AI Asistan — sınırsız", included: true },
        { text: "Fotoğraf Analizi — günde 10", included: true },
        { text: "Hesap Araçları — sınırsız", included: true },
        { text: "AI Mimari Render — günde 2", included: true },
        { text: "Hatırlatıcılar — aynı anda 3", included: true },
        { text: "İndirme (PDF/Excel)", included: true },
        { text: "Günlük Bilgi — sınırsız", included: true },
        { text: "Haberler ve Mevzuat — sınırsız", included: true },
        { text: "Hava Durumu — sınırsız", included: true },
        { text: "Etkinlik Takvimi — sınırsız", included: true },
        { text: "Proje Yönetimi", included: false },
        { text: "Hakediş Yönetimi", included: false },
      ],
    },
    {
      id: "pro", name: "Pro", price: "399₺", period: "/ay", subtitle: "Tam donanımlı profesyoneller için",
      badge: "EN POPÜLER", featured: true,
      button: { text: "14 Gün Ücretsiz Dene", style: "primary" as const },
      buttonNote: "Kredi kartı gerekmez",
      features: [
        { text: "AI Asistan — sınırsız", included: true },
        { text: "Fotoğraf Analizi — sınırsız", included: true },
        { text: "Hesap Araçları — sınırsız", included: true },
        { text: "AI Mimari Render — sınırsız", included: true },
        { text: "Hatırlatıcılar — sınırsız", included: true },
        { text: "İndirme (PDF/Excel)", included: true },
        { text: "Günlük Bilgi — sınırsız", included: true },
        { text: "Haberler ve Mevzuat — sınırsız", included: true },
        { text: "Hava Durumu — sınırsız", included: true },
        { text: "Etkinlik Takvimi — sınırsız", included: true },
        { text: "Proje Yönetimi", included: false },
        { text: "Hakediş Yönetimi", included: false },
      ],
    },
  ];

  const kurumsalPlans = [
    {
      id: "office_free", name: "Ücretsiz", price: "0₺", period: "/ay", subtitle: "Küçük ekipler için başlangıç",
      badge: null, featured: false,
      button: { text: "Ücretsiz Başla", style: "outline" as const },
      features: [
        { text: "1 kişi davet edebilme", included: true },
        { text: "1 proje için Proje Yönetimi", included: true },
        { text: "1 proje için Hakediş Yönetimi", included: true },
        { text: "Temel ekip özellikleri", included: true },
        { text: "Sınırsız proje", included: false },
        { text: "Sınırsız hakediş", included: false },
        { text: "5 kullanıcı", included: false },
        { text: "Gelişmiş yetki yönetimi", included: false },
      ],
    },
    {
      id: "office_pro", name: "Kurumsal Pro", price: "2.499₺", period: "/ay", subtitle: "Profesyonel ofisler ve şirketler için",
      badge: "EN POPÜLER", featured: true,
      button: { text: "Hemen Başla", style: "primary" as const },
      features: [
        { text: "Toplam 5 kullanıcı", included: true },
        { text: "Sınırsız Proje Yönetimi", included: true },
        { text: "Sınırsız Hakediş Yönetimi", included: true },
        { text: "Kanban görev yönetimi", included: true },
        { text: "Ekip proje paylaşımı", included: true },
        { text: "Sahip + Editör + Görüntüleyici rolleri", included: true },
        { text: "Görev atama ve takip", included: true },
        { text: "Öncelikli müşteri desteği", included: true },
      ],
    },
    {
      id: "office_custom", name: "Özel Kurumsal", price: "", period: "", subtitle: "Büyük ekipler ve şirketler için",
      badge: null, featured: false,
      isCustom: true,
      button: { text: "İletişime Geç", style: "outline" as const },
      features: [],
    },
  ];

  const handleEnterpriseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company || !formData.name || !formData.email || !formData.message) {
      toast.error("Lütfen zorunlu alanları doldurun.");
      return;
    }
    setFormLoading(true);
    try {
      await supabase.functions.invoke("send-enterprise-inquiry", {
        body: formData,
      });
      toast.success("Talebiniz alındı! 48 saat içinde e-posta yoluyla size dönüş yapılacaktır.");
      setShowEnterpriseForm(false);
      setFormData({ company: "", name: "", email: "", phone: "", teamSize: "", message: "" });
    } catch {
      toast.success("Talebiniz alındı! 48 saat içinde e-posta yoluyla size dönüş yapılacaktır.");
      setShowEnterpriseForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const applyYearly = (price: string): { display: string; period: string; originalMonthly?: string } => {
    if (!price || price === "0₺") return { display: price, period: yearly ? "/yıl" : "/ay" };
    const num = parseInt(price.replace(/[^0-9]/g, ""));
    if (isNaN(num)) return { display: price, period: yearly ? "/yıl" : "/ay" };
    const monthlyDiscounted = Math.round(num * 0.8);
    const yearlyTotal = monthlyDiscounted * 12;
    if (yearly) {
      return {
        display: `${yearlyTotal.toLocaleString("tr-TR")}₺`,
        period: "/yıl",
        originalMonthly: `${num.toLocaleString("tr-TR")}₺/ay yerine ${monthlyDiscounted.toLocaleString("tr-TR")}₺/ay`,
      };
    }
    return { display: price, period: "/ay" };
  };

  const plans = activeTab === "bireysel" ? bireyselPlans : kurumsalPlans;

  const faqs = [
    { q: "Ücretsiz planda kredi kartı gerekiyor mu?", a: "Hayır, ücretsiz plan için hiçbir ödeme bilgisi gerekmez." },
    { q: "14 günlük deneme bittikten sonra ne olur?", a: "Otomatik ücretlendirme yapılmaz. İstediğiniz planı seçebilir veya ücretsiz plana geçebilirsiniz." },
    { q: "İstediğim zaman iptal edebilir miyim?", a: "Evet, istediğiniz zaman kolayca iptal edebilirsiniz. İptal sonrası dönem sonuna kadar erişiminiz devam eder." },
    { q: "Bireysel ve Kurumsal planlar arasındaki fark nedir?", a: "Bireysel planlar kişisel kullanım içindir. Kurumsal planlar ekip yönetimi, proje paylaşımı ve hakediş takibi gibi ofis özelliklerini içerir." },
    { q: "5'ten fazla kullanıcı için ne yapmalıyım?", a: "Özel Kurumsal plan için bizimle iletişime geçin, ekip büyüklüğünüze göre özel fiyat teklifi sunalım." },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Size En Uygun Planı Seçin</h1>
        <p className="text-muted-foreground">İhtiyacınıza göre bireysel veya kurumsal planlardan birini tercih edin</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={() => setActiveTab("bireysel")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
          style={{
            backgroundColor: activeTab === "bireysel" ? "#FF6B2B" : "transparent",
            color: activeTab === "bireysel" ? "#fff" : "#94A3B8",
            border: activeTab === "bireysel" ? "none" : "1px solid #1E2732",
          }}
        >
          <User className="w-4 h-4" />
          Bireysel
        </button>
        <button
          onClick={() => setActiveTab("kurumsal")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
          style={{
            backgroundColor: activeTab === "kurumsal" ? "#FF6B2B" : "transparent",
            color: activeTab === "kurumsal" ? "#fff" : "#94A3B8",
            border: activeTab === "kurumsal" ? "none" : "1px solid #1E2732",
          }}
        >
          <Building2 className="w-4 h-4" />
          Kurumsal
        </button>
      </div>

      {/* Yearly/Monthly Toggle */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <span className={`text-sm font-medium ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>Aylık</span>
        <button
          onClick={() => setYearly(!yearly)}
          className="relative w-12 h-6 rounded-full transition-colors duration-200"
          style={{ backgroundColor: yearly ? "#FF6B2B" : "#1E2732" }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
            style={{ transform: yearly ? "translateX(24px)" : "translateX(0)" }}
          />
        </button>
        <span className={`text-sm font-medium ${yearly ? "text-foreground" : "text-muted-foreground"}`}>
          Yıllık
          <span className="ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(255,107,43,0.15)", color: "#FF6B2B" }}>%20 indirim</span>
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {plans.map((plan) => {
          const isCustom = "isCustom" in plan && plan.isCustom;
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                plan.featured
                  ? "border-[#FF6B2B] shadow-lg shadow-[#FF6B2B]/10 md:scale-105 md:-my-2"
                  : "border-border"
              }`}
              style={{ backgroundColor: plan.featured ? "rgba(255,107,43,0.03)" : undefined }}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: "#FF6B2B" }}>
                  {plan.badge}
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{plan.subtitle}</p>
              </div>

              {isCustom ? (
                <div className="flex-1 mb-6">
                  <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: "rgba(255,107,43,0.06)", border: "1px solid rgba(255,107,43,0.15)" }}>
                    <p className="text-sm text-foreground leading-relaxed">
                      Mevcut paketlerimiz ekibinize uygun değilse veya daha kalabalık bir ekipseniz, size özel çözümler için bizimle iletişime geçebilirsiniz.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Ekip büyüklüğünüze ve ihtiyaçlarınıza göre özel fiyat teklifi hazırlıyoruz.
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {["Sınırsız kullanıcı", "Özel SLA ve destek", "Kurulum ve eğitim desteği", "Özel entegrasyonlar"].map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                        <Check className="w-4 h-4 text-green-500 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex-1 space-y-2.5 mb-6">
                  {plan.features.map((f, i) => (
                    <div key={i} className={`flex items-start gap-2 text-sm ${f.included ? "text-foreground" : "text-muted-foreground/50 line-through"}`}>
                      {f.included ? (
                        <Check className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 mt-0.5 text-muted-foreground/30 shrink-0" />
                      )}
                      {f.text}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Button
                  onClick={isCustom ? () => setShowEnterpriseForm(true) : undefined}
                  className={`w-full font-semibold ${
                    plan.button.style === "primary"
                      ? "text-white h-14 flex-col gap-0"
                      : "bg-transparent border border-border text-foreground hover:bg-secondary h-11"
                  }`}
                  style={plan.button.style === "primary" ? { backgroundColor: "#FF6B2B" } : undefined}
                >
                  <span>{plan.button.text}</span>
                  {"buttonNote" in plan && plan.buttonNote && (
                    <span className="text-[10px] font-normal opacity-80">({plan.buttonNote})</span>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Note for individual plans */}
      {activeTab === "bireysel" && (
        <div className="text-center mb-8 rounded-xl p-4" style={{ backgroundColor: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
          <p className="text-sm text-foreground">
            <Building2 className="w-4 h-4 inline-block mr-1 -mt-0.5" />
            <strong>Proje Yönetimi</strong> ve <strong>Hakediş Yönetimi</strong> özellikleri yalnızca <strong>Kurumsal planlarla</strong> kullanılabilir.
            <button onClick={() => setActiveTab("kurumsal")} className="ml-1 font-semibold underline" style={{ color: "#FF6B2B" }}>
              Kurumsal planları incele →
            </button>
          </p>
        </div>
      )}

      {/* Trust badges */}
      <div className="mb-6"><TrustBadges /></div>
      <div className="mb-12"><PaymentLogoBand /></div>

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
                  <h3 className="text-lg font-bold text-white">Özel Kurumsal Teklif</h3>
                  <p className="text-xs text-white/50 mt-0.5">Ekibinize özel fiyat teklifi için bilgilerinizi iletin</p>
                </div>
                <button onClick={() => setShowEnterpriseForm(false)} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleEnterpriseSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Şirket Adı *</label>
                    <input
                      value={formData.company}
                      onChange={e => setFormData(p => ({ ...p, company: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                      style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">İsim Soyisim *</label>
                    <input
                      value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                      style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">E-posta *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                      style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Telefon</label>
                    <input
                      value={formData.phone}
                      onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none"
                      style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/60 mb-1 block">Tahmini Ekip Büyüklüğü</label>
                  <input
                    value={formData.teamSize}
                    onChange={e => setFormData(p => ({ ...p, teamSize: e.target.value }))}
                    placeholder="Örn: 10-20 kişi"
                    className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none placeholder:text-white/20"
                    style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 mb-1 block">Mesajınız *</label>
                  <textarea
                    value={formData.message}
                    onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                    rows={3}
                    placeholder="İhtiyaçlarınızı kısaca açıklayın..."
                    className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none resize-none placeholder:text-white/20"
                    style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="w-full h-11 font-semibold text-white gap-2"
                  style={{ backgroundColor: "#FF6B2B" }}
                >
                  <Send className="w-4 h-4" />
                  {formLoading ? "Gönderiliyor..." : "Teklif Talep Et"}
                </Button>
                <p className="text-center text-xs text-white/40">
                  Size e-posta yoluyla 48 saat içinde dönüş yapılacaktır.
                </p>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PricingPanel;
