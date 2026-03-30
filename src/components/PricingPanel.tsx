import { useState } from "react";
import { Check, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentLogoBand, TrustBadges } from "@/components/PaymentLogos";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const PricingPanel = () => {
  const [yearly, setYearly] = useState(false);

  const plans = [
    {
      id: "free",
      name: "Başlangıç",
      price: "0₺",
      period: "/ay",
      subtitle: "Sonsuza kadar ücretsiz",
      badge: null,
      featured: false,
      button: { text: "Ücretsiz Başla", style: "outline" as const },
      features: [
        { text: "AI Asistan — günde 3 soru", included: true },
        { text: "Proje Analizi — ayda 2 dosya", included: true },
        { text: "Fotoğraf Analizi — ayda 2 fotoğraf", included: true },
        { text: "EKB Hesaplama — ayda 2 hesaplama", included: true },
        { text: "Maliyet Hesaplama — ayda 1 hesaplama", included: true },
        { text: "Hesap Araçları — sınırsız", included: true },
        { text: "Mevzuat Arama — sınırsız", included: true },
        { text: "Günlük Bilgi — sınırsız", included: true },
        { text: "Belge Arşivi PDF indirme", included: false },
        { text: "Maliyet Hesaplama PDF/Excel", included: false },
        
      ],
    },
    {
      id: "pro",
      name: "Profesyonel",
      price: yearly ? "239₺" : "299₺",
      period: "/ay",
      subtitle: "Serbest mimar, mühendis ve müteahhitler için",
      yearlyNote: yearly ? "Yıllık 2.868₺ (720₺ tasarruf)" : null,
      badge: "EN POPÜLER",
      featured: true,
      button: { text: "14 Gün Ücretsiz Dene", style: "primary" as const },
      buttonNote: "Kredi kartı gerekmez",
      features: [
        { text: "AI Asistan — sınırsız", included: true },
        { text: "Proje Analizi — sınırsız", included: true },
        { text: "Fotoğraf Analizi — sınırsız", included: true },
        { text: "EKB Hesaplama — sınırsız", included: true },
        { text: "Maliyet Hesaplama — sınırsız", included: true },
        { text: "Maliyet Hesaplama PDF ve Excel indirme", included: true },
        { text: "Hesap Araçları — sınırsız", included: true },
        { text: "Belge Arşivi — tüm şablonlar", included: true },
        { text: "Belge PDF ve Word indirme", included: true },
        { text: "Mevzuat Arama — sınırsız", included: true },
        { text: "Günlük Bilgi — sınırsız", included: true },
        
        
        { text: "1 kullanıcı", included: true },
      ],
    },
    {
      id: "office",
      name: "Ofis",
      price: yearly ? "639₺" : "799₺",
      period: "/ay",
      subtitle: "Mühendislik ve mimarlık ofisleri için",
      yearlyNote: yearly ? "Yıllık 7.668₺ (1.920₺ tasarruf)" : null,
      badge: null,
      featured: false,
      button: { text: "Hemen Başla", style: "outline" as const },
      features: [
        { text: "Pro'daki tüm özellikler", included: true },
        { text: "3 kullanıcı hesabı", included: true },
        { text: "Ekip proje paylaşımı", included: true },
        { text: "Kullanıcı yetki yönetimi", included: true },
        { text: "Aylık kullanım raporu", included: true },
        { text: "Öncelikli müşteri desteği", included: true },
        { text: "Özel onboarding", included: true },
      ],
    },
  ];

  const faqs = [
    { q: "Ücretsiz planda kredi kartı gerekiyor mu?", a: "Hayır, ücretsiz plan için hiçbir ödeme bilgisi gerekmez." },
    { q: "14 günlük deneme bittikten sonra ne olur?", a: "Otomatik ücretlendirme yapılmaz. İstediğiniz planı seçebilir veya ücretsiz plana geçebilirsiniz." },
    { q: "İstediğim zaman iptal edebilir miyim?", a: "Evet, istediğiniz zaman kolayca iptal edebilirsiniz. İptal sonrası dönem sonuna kadar erişiminiz devam eder." },
    { q: "Fatura kesiliyor mu?", a: "Evet, her ödeme için e-fatura otomatik olarak gönderilir." },
    { q: "Ofis planında 3'ten fazla kullanıcı ekleyebilir miyim?", a: "3'ten fazla kullanıcı için bizimle iletişime geçin, özel fiyat sunabiliriz." },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Size En Uygun Planı Seçin</h1>
        <p className="text-muted-foreground">İlk 14 gün tüm Pro özellikleri ücretsiz deneyin</p>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <span className={`text-sm font-medium ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>Aylık</span>
        <button
          onClick={() => setYearly(!yearly)}
          className={`relative w-14 h-7 rounded-full transition-colors ${yearly ? "bg-[#FF6B2B]" : "bg-muted"}`}
        >
          <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${yearly ? "translate-x-7" : "translate-x-0.5"}`} />
        </button>
        <span className={`text-sm font-medium ${yearly ? "text-foreground" : "text-muted-foreground"}`}>
          Yıllık
        </span>
        {yearly && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FF6B2B]/20 text-[#FF6B2B]">
            %20 İndirim
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {plans.map((plan) => (
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
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>
              {plan.yearlyNote && (
                <p className="text-xs text-[#FF6B2B] mt-1">{plan.yearlyNote}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{plan.subtitle}</p>
            </div>

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

            <div className="space-y-2">
              <Button
                className={`w-full h-11 font-semibold ${
                  plan.button.style === "primary"
                    ? "text-white"
                    : "bg-transparent border border-border text-foreground hover:bg-secondary"
                }`}
                style={plan.button.style === "primary" ? { backgroundColor: "#FF6B2B" } : undefined}
              >
                {plan.button.text}
              </Button>
              {plan.id === "pro" && (
                <Button
                  className="w-full h-11 font-semibold bg-transparent border border-[#FF6B2B] text-[#FF6B2B] hover:bg-[#FF6B2B]/10"
                >
                  Hemen Başla
                </Button>
              )}
              {plan.buttonNote && (
                <p className="text-center text-xs text-muted-foreground mt-1">{plan.buttonNote}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Trust badges */}
      <div className="mb-6">
        <TrustBadges />
      </div>

      {/* Payment logos */}
      <div className="mb-12">
        <PaymentLogoBand />
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-foreground text-center mb-6">Sıkça Sorulan Sorular</h2>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-xl px-4">
              <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default PricingPanel;
