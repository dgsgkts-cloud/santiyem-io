import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const STEPS = [
  { num: "1", title: "Kayıt Ol", sub: "30 saniye", desc: "E-posta adresinizle ücretsiz hesap oluşturun. Kredi kartı gerekmez." },
  { num: "2", title: "Projenizi Ekleyin", sub: "", desc: "Şantiyenizi, müşterinizi ve iş kalemlerinizi sisteme girin. Varsayılan şablonlar hazır bekliyor." },
  { num: "3", title: "AI'yi Çalıştırın", sub: "", desc: "Soru sorun, dosya yükleyin, hakediş hazırlayın. AI her adımda yanınızda." },
];

const HowItWorksSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  return (
    <section id="how-it-works" className="py-24 px-6 border-t" style={{ background: "#0A0E13", borderColor: "#1E2732" }}>
      <div ref={ref} className={`max-w-5xl mx-auto transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest mb-3 block" style={{ color: "#FF6B2B" }}>NASIL ÇALIŞIR</span>
          <h2 className="text-3xl md:text-[40px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>3 Adımda Başlayın</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px" style={{ background: "linear-gradient(90deg, transparent, #1E2732 20%, #1E2732 80%, transparent)" }} />
          {STEPS.map((s, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white relative z-10" style={{ background: "linear-gradient(135deg, #FF6B2B, #FFB347)" }}>
                {s.num}
              </div>
              <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {s.title} {s.sub && <span className="text-sm font-normal" style={{ color: "#64748B" }}>({s.sub})</span>}
              </h3>
              <p className="text-sm" style={{ color: "#94A3B8" }}>{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-14">
          <Link to="/register" className="inline-block px-8 py-3.5 rounded-lg text-white font-semibold transition-all hover:opacity-90" style={{ background: "#FF6B2B", boxShadow: "0 0 30px rgba(255,107,43,0.25)" }}>
            Hemen Ücretsiz Başla →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
