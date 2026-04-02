import { Link } from "react-router-dom";
import { ChevronDown, Play } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const HeroSection = () => {
  const { ref, isVisible } = useScrollAnimation(0.1);

  return (
    <section
      className="relative min-h-screen flex items-center justify-center pt-20 pb-16 px-6 overflow-hidden"
      style={{ background: "#0F1419" }}
    >
      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(255,107,43,0.04) 0%, transparent 70%)"
      }} />

      <div ref={ref} className={`relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center gap-8 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        {/* Badge */}
        <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium overflow-hidden"
          style={{ border: "1px solid rgba(255,107,43,0.4)", background: "rgba(255,107,43,0.1)", color: "#FF6B2B" }}>
          <div className="absolute inset-0 animate-[shimmer_2s_infinite]" style={{
            background: "linear-gradient(90deg, transparent, rgba(255,107,43,0.15), transparent)",
            animation: "shimmer 2.5s infinite"
          }} />
          <span>🏗️</span>
          <span className="relative">Türkiye'nin İnşaat Yönetim Platformu</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl lg:text-[64px] font-bold text-white leading-[1.1]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Mühendisliğin Zor İşlerini{" "}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #FF6B2B, #FFB347)" }}>
            Yapay Zekaya
          </span>{" "}
          Bırak
        </h1>

        {/* Subtitle */}
        <p className="text-base md:text-lg max-w-[560px]" style={{ color: "#94A3B8" }}>
          TBDY, İmar Yönetmeliği, hakediş takibi, şantiye analizi — hepsi bir arada. Türk mühendis, mimar ve müteahhitler için tasarlandı.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link to="/register" className="px-8 py-3 rounded-lg text-white font-semibold text-base transition-all hover:opacity-90"
            style={{ background: "#FF6B2B", boxShadow: "0 0 30px rgba(255,107,43,0.3)" }}>
            14 Gün Ücretsiz Dene
          </Link>
          <button onClick={() => document.querySelector("#demo")?.scrollIntoView({ behavior: "smooth" })}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium border transition-all hover:bg-white hover:text-[#0F1419]"
            style={{ borderColor: "rgba(255,255,255,0.2)", color: "#fff" }}>
            <Play size={16} /> Demo İzle
          </button>
        </div>

        {/* Trust text */}
        <p className="text-xs" style={{ color: "#64748B" }}>
          Kurulum yok · Anında başla · 14 gün ücretsiz dene
        </p>

        {/* Dashboard mock */}
        <div className="w-full max-w-[900px] mt-4 rounded-xl overflow-hidden border"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "#161C23",
            boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 60px rgba(255,107,43,0.05)",
            transform: "perspective(1200px) rotateX(4deg)",
          }}>
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b" style={{ borderColor: "#1E2732" }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF5F57" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#FEBC2E" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#28C840" }} />
            <span className="ml-3 text-xs" style={{ color: "#475569" }}>muhendisai.com — Dashboard</span>
          </div>
          <div className="p-6 grid grid-cols-3 gap-4">
            {[
              { label: "Aktif Projeler", value: "12", color: "#FF6B2B" },
              { label: "AI Yanıtları", value: "1.2K", color: "#3B82F6" },
              { label: "Hakediş", value: "₺2.4M", color: "#10B981" },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-4 border" style={{ background: "#0F1419", borderColor: "#1E2732" }}>
                <p className="text-xs mb-1" style={{ color: "#64748B" }}>{s.label}</p>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bounce arrow */}
        <button onClick={() => document.querySelector("#social-proof")?.scrollIntoView({ behavior: "smooth" })}
          className="mt-4 animate-bounce" style={{ color: "#475569" }}>
          <ChevronDown size={28} />
        </button>
      </div>

      <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
    </section>
  );
};

export default HeroSection;
