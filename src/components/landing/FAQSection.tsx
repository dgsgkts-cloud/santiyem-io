import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
  { q: "ChatGPT'den farkı ne?", a: "ChatGPT genel bir asistan. MühendisAI ise TBDY 2018, İmar Kanunu, TS standartları gibi Türk mühendislik mevzuatına özel eğitilmiş ve hakediş, proje takibi, EKB hesaplama gibi sektöre özel araçlara sahip." },
  { q: "Teknik bilgi gerekiyor mu?", a: "Hayır. Kurulum yok, kod yok. E-posta ile kayıt olup 5 dakika içinde kullanmaya başlayabilirsiniz." },
  { q: "Verilerim güvende mi?", a: "Tüm veriler 256-bit SSL şifreleme ile korunur. Verileriniz üçüncü taraflarla paylaşılmaz." },
  { q: "14 günlük deneme bittikten sonra ne olur?", a: "Otomatik ücretlendirme yapılmaz. Ücretsiz plana geçer veya istediğiniz planı seçersiniz." },
  { q: "Fatura alabilir miyim?", a: "Evet, her ödeme için otomatik e-fatura gönderilir." },
  { q: "Ofis planında kaç kişi kullanabilir?", a: "Ofis planında 5 kullanıcıya kadar ekip kurabilirsiniz. Hesabı alan kişi dahil toplam 5 kişi ayrı hesapla giriş yapar." },
  { q: "İptal etmek zor mu?", a: "Hiç zor değil. Ayarlar sayfasından tek tıkla iptal edebilirsiniz." },
  { q: "Mobilde çalışıyor mu?", a: "Evet, tam mobil uyumlu. Telefon tarayıcısından kullanabilirsiniz." },
];

const FAQSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  return (
    <section id="faq" className="py-24 px-6 border-t" style={{ background: "#0A0E13", borderColor: "#1E2732" }}>
      <div ref={ref} className={`max-w-5xl mx-auto transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest mb-3 block" style={{ color: "#FF6B2B" }}>SSS</span>
          <h2 className="text-3xl md:text-[40px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Sık Sorulan Sorular</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-x-8 gap-y-0">
          {[FAQS.slice(0, 4), FAQS.slice(4)].map((col, ci) => (
            <Accordion key={ci} type="single" collapsible>
              {col.map((faq, i) => (
                <AccordionItem key={i} value={`${ci}-${i}`} className="border-b" style={{ borderColor: "#1E2732" }}>
                  <AccordionTrigger className="text-sm text-left text-white hover:no-underline py-5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
