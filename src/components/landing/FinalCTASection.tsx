import { Link } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const FinalCTASection = () => {
  const { ref, isVisible } = useScrollAnimation();
  return (
    <section className="py-24 px-6 border-y" style={{
      background: "linear-gradient(180deg, rgba(255,107,43,0.06) 0%, rgba(255,107,43,0.02) 100%)",
      borderColor: "#1E2732",
    }}>
      <div ref={ref} className={`max-w-3xl mx-auto text-center transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <h2 className="text-3xl md:text-[48px] font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Bugün Başlayın
        </h2>
        <p className="mb-8" style={{ color: "#94A3B8" }}>500'den fazla mühendis, mimar ve müteahhit zaten kullanıyor.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <Link to="/register" className="px-8 py-3.5 rounded-lg text-white font-semibold transition-all hover:opacity-90"
            style={{ background: "#FF6B2B", boxShadow: "0 0 40px rgba(255,107,43,0.3)" }}>
            14 Gün Ücretsiz Dene →
          </Link>
          <button onClick={() => document.querySelector("#demo")?.scrollIntoView({ behavior: "smooth" })}
            className="px-6 py-3 rounded-lg text-sm font-medium border transition-all hover:bg-white hover:text-[#0F1419]"
            style={{ borderColor: "rgba(255,255,255,0.2)", color: "#fff" }}>
            Demo İzle
          </button>
        </div>
        <p className="text-xs" style={{ color: "#64748B" }}>Kurulum yok · 14 gün ücretsiz · İstediğin zaman iptal et</p>
      </div>
    </section>
  );
};

export default FinalCTASection;
