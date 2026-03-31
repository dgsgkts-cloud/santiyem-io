import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Başlangıç", price: "0₺", period: "/ ay", popular: false,
    features: ["3 AI soru / gün", "2 proje", "Temel hesap araçları", "Topluluk desteği"],
    cta: "Ücretsiz Başla", ctaStyle: { background: "transparent", border: "1px solid #1E2732", color: "#fff" },
  },
  {
    name: "Profesyonel", price: "499₺", period: "/ ay", popular: true,
    features: ["Sınırsız AI soru", "Sınırsız proje", "Hakediş yönetimi", "Fotoğraf analizi", "EKB hesaplama", "Öncelikli destek"],
    cta: "14 Gün Ücretsiz Dene", ctaStyle: { background: "#FF6B2B", border: "none", color: "#fff" },
  },
  {
    name: "Ofis", price: "999₺", period: "/ ay", popular: false,
    features: ["Profesyonel'deki her şey", "5 kullanıcı", "Ekip yönetimi", "API erişimi", "Özel destek hattı"],
    cta: "İletişime Geç", ctaStyle: { background: "transparent", border: "1px solid #1E2732", color: "#fff" },
  },
];

const PricingSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  return (
    <section id="pricing" className="py-24 px-6" style={{ background: "#0F1419" }}>
      <div ref={ref} className={`max-w-5xl mx-auto transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest mb-3 block" style={{ color: "#FF6B2B" }}>FİYATLANDIRMA</span>
          <h2 className="text-3xl md:text-[40px] font-bold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Şeffaf Fiyatlandırma</h2>
          <p style={{ color: "#94A3B8" }}>İlk 14 gün ücretsiz, istediğin zaman iptal</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map(p => (
            <div key={p.name} className={`rounded-xl p-6 border relative ${p.popular ? "ring-1 ring-[#FF6B2B]/50" : ""}`}
              style={{ background: "#161C23", borderColor: p.popular ? "rgba(255,107,43,0.3)" : "#1E2732" }}>
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-0.5 rounded-full font-medium text-white" style={{ background: "#FF6B2B" }}>
                  En Popüler
                </span>
              )}
              <h3 className="text-lg font-semibold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{p.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-bold text-white">{p.price}</span>
                <span className="text-sm" style={{ color: "#64748B" }}>{p.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "#94A3B8" }}>
                    <Check size={14} style={{ color: "#FF6B2B" }} /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="block text-center py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90" style={p.ctaStyle}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
