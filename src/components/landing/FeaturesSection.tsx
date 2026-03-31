import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const FEATURES = [
  { emoji: "💬", title: "Sektöre Özel AI Asistan", desc: "TBDY 2018, İmar Yönetmeliği ve TS standartlarına göre anında Türkçe yanıt. ChatGPT'nin yapamadığı sektöre özel cevaplar.", sub: "→ Mevzuat sorgula, hesap yaptır, belge analiz et" },
  { emoji: "📋", title: "Şantiye Takip Sistemi", desc: "Villa 1'den Arsuz Apt.'a kadar tüm projelerinizi takip edin. İş kalemleri, alt kalemler, hatırlatıcılar, fotoğraf belgeleme.", sub: "→ Geciken işleri anında görün" },
  { emoji: "🧾", title: "Akıllı Hakediş Hazırlama", desc: "Poz girişinden KDV-stopaj hesabına, PDF çıktısına kadar tek akışta. AI hataları tespit eder, siz onaylarsınız.", sub: "→ Saatlik iş 10 dakikaya iner" },
  { emoji: "📸", title: "Şantiye AI Analizi", desc: "Segregasyon, çatlak, donatı sorunu — fotoğraf yükleyin, AI tespit etsin. Sebep, risk seviyesi ve çözüm önerisiyle.", sub: "→ Sahada anlık kontrol" },
  { emoji: "⚡", title: "EKB Ön Hesaplama", desc: "Bina bilgilerini girin, enerji sınıfını görün. BEP-TR'ye gitmeden önce A'dan G'ye tahmini sınıfınızı öğrenin.", sub: "→ Resmi başvuru öncesi hazırlık" },
  { emoji: "🧮", title: "Mühendislik Hesap Kütüphanesi", desc: "TAKS/KAKS, beton hacmi, demir miktarı, ısı kaybı, inşaat maliyeti — tüm hesaplar bir tıkla, PDF çıktısıyla.", sub: "→ Excel'e veda edin" },
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
          <h2 className="text-3xl md:text-[40px] font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Tek Platformda Her Şey</h2>
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
