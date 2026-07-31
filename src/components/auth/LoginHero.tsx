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
      <div className="login-hero__vignette" />
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
    <div className="login-hero flex h-full w-full flex-col lg:overflow-y-auto">
      <HeroBackdrop />

      <div className="login-hero__content relative z-10 mx-auto flex w-full min-h-full flex-col justify-center px-5 py-12 sm:px-8 xl:px-14">
        <div className="w-full max-w-[640px] mx-auto">
          {/* Headline */}
          <h2
            className="login-hero__reveal text-[32px] font-bold leading-[1.12] tracking-[-0.02em] md:text-[40px] lg:text-[46px]"
            style={{
              ...reveal(0),
              color: "#F8FAFC",
              fontFamily: "'Space Grotesk', sans-serif",
              marginBottom: "20px",
            }}
          >
            Tüm inşaat operasyonunuzu{" "}
            <span style={{ color: "#FF6B2B" }}>yapay zekâyla</span>{" "}
            yönetin.
          </h2>

          {/* Description */}
          <p
            className="login-hero__reveal text-[15px] leading-[1.65] md:text-[16px]"
            style={{
              ...reveal(80),
              color: "#CBD5E1",
              maxWidth: "600px",
              marginBottom: "28px",
            }}
          >
            Projelerinizi, hakedişlerinizi, nakit akışınızı, personelinizi ve
            satın alma süreçlerinizi tek merkezden yönetin. Şantiyem AI riskleri
            erkenden fark eder, öncelikleri belirler ve uygulanabilir aksiyonlar
            sunar.
          </p>

          {/* Feature grid — 2×2 on desktop, compact cards */}
          <div
            className="login-hero__reveal grid grid-cols-1 gap-3.5 sm:grid-cols-2"
            style={{
              ...reveal(160),
              marginBottom: "26px",
            }}
          >
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="login-hero__card login-hero__reveal flex items-start gap-3 rounded-[14px] border p-4"
                  style={{
                    ...reveal(240 + i * 60),
                    minHeight: "96px",
                    borderColor: "rgba(255,255,255,0.10)",
                    backgroundColor: "rgba(255,255,255,0.035)",
                  }}
                >
                  <div
                    className="login-hero__card-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: "rgba(255,107,43,0.12)", color: "#FF6B2B" }}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold" style={{ color: "#E2E8F0" }}>
                      {f.title}
                    </p>
                    <p className="mt-1 text-[13px] leading-[1.45]" style={{ color: "#A9B5C4" }}>
                      {f.line}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI preview — static showcase, deliberately not interactive */}
          <div
            className="login-hero__reveal w-full rounded-[16px] border p-5"
            style={{
              ...reveal(520),
              marginBottom: "20px",
              borderColor: "rgba(255,255,255,0.10)",
              backgroundColor: "rgba(15,20,25,0.65)",
            }}
            aria-label="Şantiyem AI örnek analizi"
          >
            <div className="mb-3 flex items-center gap-2">
              <Bot className="h-4 w-4" style={{ color: "#FF6B2B" }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "#8A98A8" }}
              >
                Örnek AI Analizi
              </span>
            </div>

            {/* Question */}
            <div
              className="mb-3 w-fit rounded-[12px] rounded-bl-sm px-3.5 py-2 text-[13.5px]"
              style={{ backgroundColor: "rgba(255,107,43,0.16)", color: "#FDBA8C" }}
            >
              Bugün en büyük riskimiz ne?
            </div>

            {/* Answer */}
            <p className="text-[14px] leading-[1.55]" style={{ color: "#E2E8F0" }}>
              İzmir Panorama Villaları planın 9 gün gerisinde. Üç personelin
              aktarılması teslim riskini azaltabilir.
            </p>

            {/* Result badge */}
            <div className="mt-3.5">
              <span
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium"
                style={{ backgroundColor: "rgba(34,197,94,0.10)", color: "#4ADE80" }}
              >
                Tahmini kazanım: 5 gün
              </span>
            </div>
          </div>

          {/* Trust badges */}
          <div
            className="login-hero__reveal flex flex-wrap items-center gap-2"
            style={reveal(620)}
          >
            {STATUS_BADGES.map((b, i) => (
              <span
                key={b}
                className="login-hero__badge rounded-full border px-3 py-1.5 text-[12px]"
                style={{
                  animationDelay: `${i * 700}ms`,
                  borderColor: "rgba(255,255,255,0.10)",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  color: "#A9B5C4",
                }}
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginHero;
