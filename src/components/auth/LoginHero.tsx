// ============================================================
// src/components/auth/LoginHero.tsx
// Sprint 32.3 — Login hero showcase panel.
// Presentation only: no auth, no routing, no data access.
// ============================================================

import {
  Building2,
  Wallet,
  HardHat,
  PackageSearch,
  Bot,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import logo from "@/assets/muhendis-logo.png";
import "@/styles/login-hero.css";

type Feature = { icon: LucideIcon; title: string; line: string };

const FEATURES: Feature[] = [
  {
    icon: Building2,
    title: "Proje Yönetimi",
    line: "Projeleri, ilerlemeyi ve gecikmeleri gerçek zamanlı takip edin.",
  },
  {
    icon: Wallet,
    title: "Nakit Yönetimi",
    line: "Gelir, gider ve 30 günlük nakit projeksiyonunu görün.",
  },
  {
    icon: HardHat,
    title: "Personel Takibi",
    line: "Puantaj, ekipler ve maliyetleri tek ekranda yönetin.",
  },
  {
    icon: PackageSearch,
    title: "Satın Alma",
    line: "Malzeme ihtiyaçlarını AI ile önceden tahmin edin.",
  },
  {
    icon: Bot,
    title: "Şantiyem AI",
    line: "Sorular sorun, analiz alın, aksiyon oluşturun.",
  },
  {
    icon: LayoutDashboard,
    title: "Yönetici Paneli",
    line: "Riskleri, fırsatları ve öncelikleri anında görün.",
  },
];

const STATUS_BADGES = ["Realtime AI", "Construction Brain", "OpenAI Powered"];

/** Staggered entrance — keeps the reveal order readable top to bottom. */
const reveal = (delay: number) => ({
  animationDelay: `${delay}ms`,
});

/**
 * Blueprint-inspired background: a faint building elevation drawn in
 * orange hairlines. Purely decorative, hidden from assistive tech.
 */
function HeroBackdrop() {
  return (
    <div className="login-hero__bg" aria-hidden="true">
      <div className="login-hero__glow" />
      <div className="login-hero__grid" />
      <div className="login-hero__bloom" />
      <svg
        className="login-hero__wire"
        viewBox="0 0 600 800"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Tower elevation */}
        <polyline points="90,700 90,300 200,240 310,300 310,700" />
        <line x1="90" y1="380" x2="310" y2="380" />
        <line x1="90" y1="460" x2="310" y2="460" />
        <line x1="90" y1="540" x2="310" y2="540" />
        <line x1="90" y1="620" x2="310" y2="620" />
        <line x1="200" y1="240" x2="200" y2="700" />
        {/* Crane */}
        <polyline points="400,700 400,160 380,190 400,160 420,190" />
        <line x1="300" y1="160" x2="540" y2="160" />
        <line x1="400" y1="160" x2="330" y2="205" />
        <line x1="400" y1="160" x2="500" y2="205" />
        <line x1="500" y1="160" x2="500" y2="250" />
        {/* Ground line */}
        <line x1="40" y1="700" x2="580" y2="700" />
      </svg>
    </div>
  );
}

export function LoginHero() {
  return (
    <div className="login-hero flex h-full w-full flex-col justify-center overflow-y-auto px-8 py-10 xl:px-14">
      <HeroBackdrop />

      <div className="relative z-10 mx-auto w-full max-w-[560px]">
        {/* Eyebrow */}
        <div
          className="login-hero__reveal mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
          style={{
            ...reveal(0),
            borderColor: "rgba(255,107,43,0.28)",
            backgroundColor: "rgba(255,107,43,0.08)",
          }}
        >
          <img src={logo} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "#FF8F5A" }}
          >
            Construction Operating System
          </span>
        </div>

        {/* Headline */}
        <h2
          className="login-hero__reveal text-[30px] font-bold leading-[1.12] tracking-[-0.02em] xl:text-[38px]"
          style={{
            ...reveal(80),
            color: "#F8FAFC",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Şantiyenizi{" "}
          <span
            style={{
              background: "linear-gradient(100deg, #FF6B2B 0%, #FF9F6B 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Yapay Zekâ
          </span>{" "}
          ile Yönetin.
        </h2>

        {/* Subtitle */}
        <p
          className="login-hero__reveal mt-3.5 max-w-[520px] text-[14px] leading-relaxed xl:text-[15px]"
          style={{ ...reveal(150), color: "#94A3B8" }}
        >
          Şantiyem AI; projelerinizi, hakedişlerinizi, nakit akışınızı, personelinizi ve
          satın alma süreçlerinizi tek merkezden yöneten yapay zekâ destekli Construction
          Operating System'dir.
        </p>

        {/* Feature grid */}
        <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="login-hero__card login-hero__reveal flex items-start gap-2.5 rounded-xl border p-3"
                style={{
                  ...reveal(220 + i * 60),
                  borderColor: "rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(255,255,255,0.025)",
                }}
              >
                <div
                  className="login-hero__card-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: "rgba(255,107,43,0.12)", color: "#FF6B2B" }}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: "#E2E8F0" }}>
                    {f.title}
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: "#7C8A9C" }}>
                    {f.line}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI preview — static showcase, deliberately not interactive */}
        <div
          className="login-hero__reveal mt-5 rounded-2xl border p-4 backdrop-blur-xl"
          style={{
            ...reveal(620),
            borderColor: "rgba(255,255,255,0.08)",
            backgroundColor: "rgba(15,20,25,0.62)",
            boxShadow: "0 24px 60px -32px rgba(0,0,0,0.9)",
          }}
          aria-label="Şantiyem AI örnek konuşması"
        >
          <div className="mb-3 flex items-center gap-2">
            <Bot className="h-3.5 w-3.5" style={{ color: "#FF6B2B" }} />
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "#64748B" }}
            >
              Örnek Konuşma
            </span>
          </div>

          {/* User turn */}
          <div className="flex justify-end">
            <div
              className="max-w-[85%] rounded-xl rounded-br-sm px-3 py-2 text-[13px]"
              style={{ backgroundColor: "#FF6B2B", color: "#FFFFFF" }}
            >
              Bugün en büyük riskimiz ne?
            </div>
          </div>

          {/* AI turn */}
          <div className="mt-3 flex gap-2.5">
            <div
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(255,107,43,0.14)" }}
            >
              <Bot className="h-3.5 w-3.5" style={{ color: "#FF6B2B" }} />
            </div>
            <div className="text-[13px] leading-relaxed" style={{ color: "#CBD5E1" }}>
              <p>
                <span style={{ color: "#F1F5F9", fontWeight: 600 }}>
                  İzmir Panorama Villaları
                </span>{" "}
                projesi planın 9 gün gerisinde.
              </p>
              <p className="mt-2 text-[12px]" style={{ color: "#94A3B8" }}>
                Önerim:
              </p>
              <ul className="mt-1 space-y-1 text-[12.5px]" style={{ color: "#94A3B8" }}>
                <li className="flex gap-2">
                  <span style={{ color: "#FF6B2B" }}>•</span>
                  <span>3 personeli bu projeye aktarın.</span>
                </li>
                <li className="flex gap-2">
                  <span style={{ color: "#FF6B2B" }}>•</span>
                  <span>Cephe satın almasını bugün tamamlayın.</span>
                </li>
              </ul>
              <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium"
                style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#4ADE80" }}>
                Beklenen kazanım: +5 gün zaman tasarrufu
                <span className="login-hero__caret" />
              </p>
            </div>
          </div>
        </div>

        {/* Live status ribbon */}
        <div
          className="login-hero__reveal mt-4 flex flex-wrap items-center gap-2"
          style={reveal(720)}
        >
          <div
            className="flex items-center gap-2 rounded-full border px-3 py-1.5"
            style={{
              borderColor: "rgba(34,197,94,0.25)",
              backgroundColor: "rgba(34,197,94,0.07)",
            }}
          >
            <span
              className="login-hero__dot h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: "#22C55E" }}
            />
            <span className="text-[11.5px] font-medium" style={{ color: "#CBD5E1" }}>
              Şantiyem AI
            </span>
            <span className="text-[11.5px]" style={{ color: "#4ADE80" }}>
              Online
            </span>
          </div>

          {STATUS_BADGES.map((b, i) => (
            <span
              key={b}
              className="login-hero__badge rounded-full border px-3 py-1.5 text-[11.5px]"
              style={{
                animationDelay: `${i * 700}ms`,
                borderColor: "rgba(255,255,255,0.08)",
                backgroundColor: "rgba(255,255,255,0.03)",
                color: "#8A98A8",
              }}
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoginHero;
