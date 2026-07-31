// ============================================================
// src/components/auth/LoginHero.tsx
// Login hero showcase panel — premium, calm, Turkish-only.
// Presentation only: no auth, no routing, no data access.
// ============================================================

import {
  Building2,
  Wallet,
  HardHat,
  Bot,
  type LucideIcon,
} from "lucide-react";
import "@/styles/login-hero.css";

type Feature = { icon: LucideIcon; title: string; line: string };

const FEATURES: Feature[] = [
  {
    icon: Building2,
    title: "Proje ve Saha Yönetimi",
    line: "Planları, ilerlemeyi ve gecikmeleri tek merkezden takip edin.",
  },
  {
    icon: Wallet,
    title: "Finans ve Hakediş",
    line: "Nakit akışını, ödemeleri ve hakedişleri anlık izleyin.",
  },
  {
    icon: HardHat,
    title: "Personel ve Kaynaklar",
    line: "Ekipleri, puantajı ve kaynak kullanımını yönetin.",
  },
  {
    icon: Bot,
    title: "Yapay Zekâ Destekli Kararlar",
    line: "Riskleri erken görün ve önerilen aksiyonları uygulayın.",
  },
];

const STATUS_BADGES = ["Canlı AI", "Proje verileriyle çalışır"];

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
    <div className="login-hero flex h-full w-full flex-col justify-center px-5 py-10 sm:px-8 lg:overflow-y-auto xl:px-14">
      <HeroBackdrop />

      <div className="relative z-10 mx-auto w-full max-w-[520px]">
        {/* Headline */}
        <h2
          className="login-hero__reveal text-[28px] font-bold leading-[1.16] tracking-[-0.02em] md:text-[32px] xl:text-[36px]"
          style={{
            ...reveal(0),
            color: "#F8FAFC",
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Tüm inşaat operasyonunuzu{" "}
          <span
            style={{
              background: "linear-gradient(100deg, #FF6B2B 0%, #FF9F6B 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            yapay zekâyla
          </span>{" "}
          yönetin.
        </h2>

        {/* Description */}
        <p
          className="login-hero__reveal mt-6 max-w-[520px] text-[14px] leading-[1.65] xl:text-[15px]"
          style={{ ...reveal(80), color: "#94A3B8" }}
        >
          Projelerinizi, hakedişlerinizi, nakit akışınızı, personelinizi ve
          satın alma süreçlerinizi tek merkezden yönetin. Şantiyem AI riskleri
          erkenden fark eder, öncelikleri belirler ve uygulanabilir aksiyonlar
          sunar.
        </p>

        {/* Feature grid — 2×2 on desktop, compact cards */}
        <div className="login-hero__reveal mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2"
          style={reveal(160)}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="login-hero__card login-hero__reveal flex items-start gap-3 rounded-xl border p-3"
                style={{
                  ...reveal(240 + i * 60),
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
                  <p className="text-[12.5px] font-semibold" style={{ color: "#E2E8F0" }}>
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
          className="login-hero__reveal mt-7 rounded-xl border p-3.5"
          style={{
            ...reveal(520),
            borderColor: "rgba(255,255,255,0.08)",
            backgroundColor: "rgba(15,20,25,0.55)",
          }}
          aria-label="Şantiyem AI örnek analizi"
        >
          <div className="mb-2.5 flex items-center gap-2">
            <Bot className="h-3.5 w-3.5" style={{ color: "#FF6B2B" }} />
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "#64748B" }}
            >
              Örnek AI Analizi
            </span>
          </div>

          {/* User turn */}
          <div className="flex justify-end">
            <div
              className="max-w-[90%] rounded-xl rounded-br-sm px-3 py-1.5 text-[12.5px]"
              style={{ backgroundColor: "#FF6B2B", color: "#FFFFFF" }}
            >
              Bugün en büyük riskimiz ne?
            </div>
          </div>

          {/* AI turn */}
          <div className="mt-2.5 flex gap-2.5">
            <div
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(255,107,43,0.14)" }}
            >
              <Bot className="h-3.5 w-3.5" style={{ color: "#FF6B2B" }} />
            </div>
            <div className="min-w-0">
              <p className="text-[12.5px] leading-relaxed" style={{ color: "#CBD5E1" }}>
                İzmir Panorama Villaları planın 9 gün gerisinde. Üç personelin
                aktarılması teslim riskini azaltabilir.
              </p>
              <p
                className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium"
                style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#4ADE80" }}
              >
                Tahmini kazanım: 5 gün
                <span className="login-hero__caret" />
              </p>
            </div>
          </div>
        </div>

        {/* Live status ribbon */}
        <div
          className="login-hero__reveal mt-7 flex flex-wrap items-center gap-2.5"
          style={reveal(620)}
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
              Çevrimiçi
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
