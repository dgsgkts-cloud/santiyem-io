import { useState } from "react";
import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Check, X, User, Building2, Send } from "lucide-react";
import { toast } from "sonner";

type TabType = "bireysel" | "kurumsal";

const BIREYSEL_PLANS = [
  {
    name: "Başlangıç", price: "0₺", period: "/ ay", popular: false,
    features: ["AI Asistan — günde 5 soru", "Fotoğraf Analizi — günde 2", "Hesap Araçları — sınırsız", "Günlük Bilgi & Haberler", "Hava Durumu & Etkinlikler"],
    cta: "Ücretsiz Başla", ctaStyle: { background: "transparent", border: "1px solid #1E2732", color: "#fff" },
  },
  {
    name: "Plus", price: "199₺", period: "/ ay", popular: false,
    features: ["AI Asistan — sınırsız", "Fotoğraf Analizi — günde 10", "AI Mimari Render — günde 2", "Hatırlatıcılar — aynı anda 3", "İndirme (PDF/Excel)"],
    cta: "14 Gün Ücretsiz Dene", ctaStyle: { background: "transparent", border: "1px solid #1E2732", color: "#fff" },
  },
  {
    name: "Pro", price: "399₺", period: "/ ay", popular: true,
    features: ["Plus'taki her şey", "Tüm özellikler sınırsız", "AI Mimari Render — sınırsız", "Hatırlatıcılar — sınırsız", "Öncelikli destek"],
    cta: "14 Gün Ücretsiz Dene", ctaStyle: { background: "#FF6B2B", border: "none", color: "#fff" },
  },
];

const KURUMSAL_PLANS = [
  {
    name: "Ücretsiz", price: "0₺", period: "/ ay", popular: false,
    features: ["1 kişi davet", "1 proje yönetimi", "1 hakediş yönetimi", "Temel ekip özellikleri"],
    cta: "Ücretsiz Başla", ctaStyle: { background: "transparent", border: "1px solid #1E2732", color: "#fff" },
  },
  {
    name: "Kurumsal Pro", price: "2.499₺", period: "/ ay", popular: true,
    features: ["Toplam 5 kullanıcı", "Sınırsız proje yönetimi", "Sınırsız hakediş yönetimi", "Kanban görev yönetimi", "Gelişmiş yetki rolleri", "Öncelikli destek"],
    cta: "Hemen Başla", ctaStyle: { background: "#FF6B2B", border: "none", color: "#fff" },
  },
  {
    name: "Özel Kurumsal", price: "Özel", period: "", popular: false, isCustom: true,
    features: [],
    cta: "İletişime Geç", ctaStyle: { background: "transparent", border: "1px solid #1E2732", color: "#fff" },
  },
];

const PricingSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const [activeTab, setActiveTab] = useState<TabType>("bireysel");
  const plans = activeTab === "bireysel" ? BIREYSEL_PLANS : KURUMSAL_PLANS;

  return (
    <section id="pricing" className="py-24 px-6" style={{ background: "#0F1419" }}>
      <div ref={ref} className={`max-w-5xl mx-auto transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-widest mb-3 block" style={{ color: "#FF6B2B" }}>FİYATLANDIRMA</span>
          <h2 className="text-3xl md:text-[40px] font-bold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Şeffaf Fiyatlandırma</h2>
          <p style={{ color: "#94A3B8" }}>İhtiyacınıza göre bireysel veya kurumsal planlardan birini tercih edin</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <button
            onClick={() => setActiveTab("bireysel")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              backgroundColor: activeTab === "bireysel" ? "#FF6B2B" : "transparent",
              color: activeTab === "bireysel" ? "#fff" : "#94A3B8",
              border: activeTab === "bireysel" ? "none" : "1px solid #1E2732",
            }}
          >
            <User className="w-4 h-4" /> Bireysel
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
            <Building2 className="w-4 h-4" /> Kurumsal
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map(p => {
            const isCustom = "isCustom" in p && p.isCustom;
            return (
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
                  {p.period && <span className="text-sm" style={{ color: "#64748B" }}>{p.period}</span>}
                </div>

                {isCustom ? (
                  <div className="mb-8">
                    <p className="text-sm leading-relaxed mb-3" style={{ color: "#94A3B8" }}>
                      Mevcut paketlerimiz ekibinize uygun değilse, size özel çözümler için bizimle iletişime geçin.
                    </p>
                    {["Sınırsız kullanıcı", "Özel SLA", "Kurulum desteği"].map(f => (
                      <div key={f} className="flex items-center gap-2 text-sm mb-2" style={{ color: "#94A3B8" }}>
                        <Check size={14} style={{ color: "#FF6B2B" }} /> {f}
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className="space-y-3 mb-8">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "#94A3B8" }}>
                        <Check size={14} style={{ color: "#FF6B2B" }} /> {f}
                      </li>
                    ))}
                  </ul>
                )}

                <Link to="/register" className="block text-center py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90" style={p.ctaStyle}>
                  {p.cta}
                </Link>
              </div>
            );
          })}
        </div>

        {activeTab === "bireysel" && (
          <div className="text-center mt-6">
            <p className="text-sm" style={{ color: "#94A3B8" }}>
              <Building2 className="w-4 h-4 inline-block mr-1 -mt-0.5" />
              Proje ve Hakediş Yönetimi yalnızca <strong className="text-white">Kurumsal planlarda</strong> kullanılabilir.
              <button onClick={() => setActiveTab("kurumsal")} className="ml-1 font-semibold underline" style={{ color: "#FF6B2B" }}>
                Kurumsal planları incele →
              </button>
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default PricingSection;
