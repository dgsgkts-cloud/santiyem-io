import { useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Check, Loader2 } from "lucide-react";
import { PaymentLogos } from "@/components/PaymentLogos";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { cleanupIyzicoOverlay, listenForIyzicoClose } from "@/lib/iyzicoCleanup";

const PLANS = [
  {
    name: "Başlangıç", monthlyPrice: 0, yearlyPrice: 0, popular: false,
    features: ["1 kullanıcı hesabı · 1 proje", "1 hakediş/ay", "AI Asistan — günde 3 soru", "Hesap araçları — sınırsız", "Şantiye günlüğü — günde 1 kayıt"],
    cta: "Ücretsiz Başla", ctaStyle: { background: "transparent", border: "1px solid #1E2732", color: "#fff" },
  },
  {
    name: "Profesyonel", monthlyPrice: 499, yearlyPrice: 399, popular: false,
    features: ["1 kullanıcı hesabı · Sınırsız aktif proje", "3 hakediş/ay + AI analizi", "AI Asistan — sınırsız", "Şantiye günlüğü + fotoğraf rapor", "PDF — sınırsız + firma başlığı"],
    cta: "14 Gün Ücretsiz Dene", ctaStyle: { background: "#FF6B2B", border: "none", color: "#fff" },
  },
  {
    name: "Ekip", monthlyPrice: 1499, yearlyPrice: 1199, popular: true,
    features: ["5 kullanıcı hesabı · Sınırsız aktif proje", "Profesyonel'deki her şey", "Ekip görevi atama + takip", "Ortak proje ve hakediş", "Öncelikli e-posta desteği"],
    cta: "14 Gün Ücretsiz Dene", ctaStyle: { background: "#FF6B2B", border: "none", color: "#fff" },
  },
  {
    name: "Kurumsal", monthlyPrice: 4999, yearlyPrice: 3999, popular: false, isPremium: true,
    features: ["Sınırsız kullanıcı hesabı · Sınırsız aktif proje", "Ekip'teki her şey", "Gelişmiş yetki rolleri", "AI Bütçe Sapma Analizi", "Tel + WhatsApp + özel onboarding"],
    cta: "14 Gün Ücretsiz Dene", ctaStyle: { background: "#FF6B2B", border: "none", color: "#fff" },
  },
];

const PricingSection = () => {
  const { ref, isVisible } = useScrollAnimation();
  const [yearly, setYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { user } = useUser();
  const navigate = useNavigate();

  const openCheckoutForm = (data: any) => {
    const checkoutDiv = document.getElementById("iyzico-checkout-container");
    if (checkoutDiv) {
      checkoutDiv.innerHTML = data.checkoutFormContent;
      checkoutDiv.style.display = "block";
      const scripts = checkoutDiv.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        if (oldScript.src) newScript.src = oldScript.src;
        else newScript.textContent = oldScript.textContent;
        document.body.appendChild(newScript);
      });
    }
  };

  const handleTrial = useCallback(async (planKey: string) => {
    if (!user) { navigate("/register"); return; }
    setLoadingPlan(`trial-${planKey}`);
    try {
      const { data, error } = await supabase.functions.invoke("create-trial-payment", {
        body: { planKey, yearly },
      });
      if (error || data?.error) { toast.error(data?.error || "İşlem başlatılamadı"); return; }
      openCheckoutForm(data);
    } catch (err) {
      console.error(err);
      toast.error("İşlem başlatılırken bir hata oluştu");
    } finally { setLoadingPlan(null); }
  }, [user, yearly, navigate]);

  const handleDirectPurchase = useCallback(async (planKey: string) => {
    if (!user) { navigate("/register"); return; }
    setLoadingPlan(`direct-${planKey}`);
    try {
      const { data, error } = await supabase.functions.invoke("create-iyzico-payment", {
        body: { planKey, yearly },
      });
      if (error || data?.error) { toast.error(data?.error || "Ödeme başlatılamadı"); return; }
      openCheckoutForm(data);
    } catch (err) {
      console.error(err);
      toast.error("Ödeme başlatılırken bir hata oluştu");
    } finally { setLoadingPlan(null); }
  }, [user, yearly, navigate]);

  return (
    <section id="pricing" className="py-24 px-6" style={{ background: "#0F1419" }}>
      <div ref={ref} className={`max-w-6xl mx-auto transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <div className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-widest mb-3 block" style={{ color: "#FF6B2B" }}>FİYATLANDIRMA</span>
          <h2 className="text-3xl md:text-[40px] font-bold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Şantiyeniz İçin Doğru Plan</h2>
          <p style={{ color: "#94A3B8" }}>İlk 14 gün ücretsiz.</p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm font-medium ${!yearly ? "text-white" : "text-white/40"}`}>Aylık</span>
          <button onClick={() => setYearly(!yearly)} className="relative w-12 h-6 rounded-full transition-colors duration-200" style={{ backgroundColor: yearly ? "#FF6B2B" : "#1E2732" }}>
            <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200" style={{ transform: yearly ? "translateX(24px)" : "translateX(0)" }} />
          </button>
          <span className={`text-sm font-medium ${yearly ? "text-white" : "text-white/40"}`}>
            Yıllık
            <span className="ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(255,107,43,0.15)", color: "#FF6B2B" }}>%20 indirim</span>
          </span>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
          {PLANS.map(p => {
            const price = p.monthlyPrice === 0
              ? { display: "0₺", period: "/ay", sub: null }
              : yearly
                ? { display: `${p.yearlyPrice.toLocaleString("tr-TR")}₺`, period: "/ay", sub: `Yıllık ${(p.yearlyPrice * 12).toLocaleString("tr-TR")}₺` }
                : { display: `${p.monthlyPrice.toLocaleString("tr-TR")}₺`, period: "/ay", sub: null };
            return (
              <div key={p.name} className={`rounded-xl p-6 border relative ${p.popular ? "ring-1 ring-[#FF6B2B]/50" : ""}`}
                style={{ background: "#161C23", borderColor: p.popular ? "rgba(255,107,43,0.3)" : "#1E2732" }}>
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-0.5 rounded-full font-medium text-white" style={{ background: "#FF6B2B" }}>
                    En Popüler
                  </span>
                )}
                <h3 className="text-lg font-semibold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{p.name}</h3>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{price.display}</span>
                    <span className="text-sm" style={{ color: "#64748B" }}>{price.period}</span>
                  </div>
                  {price.sub && <p className="text-xs mt-1" style={{ color: "#FF6B2B" }}>{price.sub}</p>}
                </div>

                <ul className="space-y-3 mb-8">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "#94A3B8" }}>
                      <Check size={14} style={{ color: "#FF6B2B" }} /> {f}
                    </li>
                  ))}
                </ul>

                {p.monthlyPrice === 0 ? (
                  <Link to="/register" className="block text-center py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90" style={p.ctaStyle}>
                    {p.cta}
                  </Link>
                ) : (
                  <>
                    {(() => {
                      const planKey = p.monthlyPrice === 499 ? "pro" : p.monthlyPrice === 1499 ? "team" : "enterprise";
                      return (
                        <>
                          <button
                            onClick={() => handleTrial(planKey)}
                            disabled={loadingPlan !== null}
                            className="w-full text-center py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                            style={{ background: "#FF6B2B", border: "none", color: "#fff" }}
                          >
                            {loadingPlan === `trial-${planKey}` && <Loader2 size={16} className="animate-spin inline mr-1" />}
                            14 Gün Ücretsiz Dene
                          </button>
                          <button
                            onClick={() => handleDirectPurchase(planKey)}
                            disabled={loadingPlan !== null}
                            className="w-full text-center py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 mt-2"
                            style={{ background: "transparent", border: "1px solid #1E2732", color: "#fff" }}
                          >
                            {loadingPlan === `direct-${planKey}` && <Loader2 size={16} className="animate-spin inline mr-1" />}
                            Hemen Başla — {(yearly ? p.yearlyPrice : p.monthlyPrice).toLocaleString("tr-TR")}₺/ay
                          </button>
                          <p className="text-[10px] text-center mt-2 leading-relaxed" style={{ color: "#64748B" }}>
                            14 gün boyunca ücret alınmaz. 15. günden itibaren aylık ₺{(yearly ? p.yearlyPrice : p.monthlyPrice).toLocaleString("tr-TR")} otomatik tahsil edilir.
                          </p>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Trust Band */}
        <div className="flex flex-col items-center gap-3 mt-10 pt-8" style={{ borderTop: "1px solid #1E2732" }}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium" style={{ color: "#22C55E" }}>🔒 SSL Güvenli</span>
            <PaymentLogos />
          </div>
          <p className="text-[11px] text-center" style={{ color: "#475569" }}>
            Tüm ödemeler iyzico güvencesiyle 256-bit SSL ile korunmaktadır.
          </p>
        </div>
      </div>
      {/* iyzico checkout form container */}
      <div id="iyzico-checkout-container" style={{ display: "none" }} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      </div>
    </section>
  );
};

export default PricingSection;
