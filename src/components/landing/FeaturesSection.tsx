import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const FEATURES = [
  { emoji: "🧾", title: "Hakedişi Dakikada Hazırla", desc: "KDV ve stopaj otomatik hesaplanır. AI hata kontrolü yapar. PDF ve Excel olarak indir.", sub: "→ Saatlik iş 10 dakikaya iner" },
  { emoji: "📋", title: "Tüm Şantiyeni Tek Ekranda Gör", desc: "İş kalemleri, kişi atama, hatırlatıcılar ve fotoğraf belgeleme. Geciken işleri anında fark et.", sub: "→ Proje & Şantiye Takibi" },
  { emoji: "👥", title: "Ekibinle Ortak Çalış", desc: "Görev ata, not bırak, ilerlemeyi takip et. Ofis planında tüm ekip aynı panelde.", sub: "→ Ekip Koordinasyonu" },
  { emoji: "💬", title: "Mevzuat ve Teknik Sorulara Anında Cevap", desc: "TBDY 2018, İmar Yönetmeliği, TS standartları — madde numarasıyla kaynaklı yanıt.", sub: "→ AI Asistan" },
  { emoji: "🧮", title: "Mühendislik Hesaplarını Hızlandır", desc: "Zemin basıncı, rüzgar yükü, EKB, maliyet tahmini ve daha fazlası.", sub: "→ Hesap Araçları" },
  { emoji: "📸", title: "Şantiye Sorunlarını Fotoğraftan Tespit Et", desc: "Segregasyon, çatlak, donatı hatası — fotoğraf yükle, AI saniyeler içinde raporlar.", sub: "→ Fotoğraf Analizi" },
];

const FeatureCard = ({ f, i }: { f: typeof FEATURES[0]; i: number }) => {
  const { ref, isVisible } = useScrollAnimation(0.1);
  return (
    <div ref={ref} className={`group rounded-xl p-6 border transition-all duration-500 hover:border-[#FF6B2B]/50 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
      style={{ background: "#161C23", borderColor: "#1E2732", transitionDelay: `${i * 80}ms` }}>
      <span className="text-3xl mb-4 block">{f.emoji}</span>
      <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{f.title}</h3>
      <p className="text-sm leading-relaxed mb-3" style={{ color: "#94A3B8" }}>{f.desc}</p>
      <p className="text-xs font-medium" style={{ color: "#FF6B2B" }}>{f.sub}</p>
    </div>
  );
};

const FeaturesSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  return (
    <section id="features" className="py-24 px-6" style={{ background: "#0F1419" }}>
      <div ref={ref} className={`max-w-6xl mx-auto transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest mb-3 block" style={{ color: "#FF6B2B" }}>ÖZELLİKLER</span>
          <h2 className="text-3xl md:text-[40px] font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>TBDY 2018 ve İmar Mevzuatını Anında Sorgula</h2>
          <p style={{ color: "#94A3B8" }}>Saatlerce süren idari işleri dakikalara indirin</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => <FeatureCard key={i} f={f} i={i} />)}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
