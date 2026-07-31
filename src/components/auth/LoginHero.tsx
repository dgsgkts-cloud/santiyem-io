// ============================================================
// src/components/auth/LoginHero.tsx
// Login hero showcase panel — flagship premium AI experience.
// Presentation only: no auth, no routing, no data access.
// ============================================================

import { Mic, Users, MessageCircle, CalendarCheck, type LucideIcon } from "lucide-react";
import { SantiyemMark } from "@/components/brand/SantiyemLogo";
import "@/styles/login-hero.css";

const COMMAND =
  "Cuma günü A Şantiyesi’nde beton dökümü var. İlgili herkesi bilgilendir.";

const RESPONSE_TITLE = "Şantiyem AI hazır.";
const RESPONSE_BODY =
  "Şantiye şefi, saha mühendisi, beton tedarikçisi ve pompa ekibi belirlendi.";

const OUTCOMES: { icon: LucideIcon; label: string }[] = [
  { icon: Users, label: "7 kişi eşleştirildi" },
  { icon: MessageCircle, label: "WhatsApp mesajları hazırlandı" },
  { icon: CalendarCheck, label: "Teyit akışı planlandı" },
];

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
        <div className="mx-auto w-full max-w-[640px]">
          {/* Headline */}
          <h2
            className="login-hero__headline login-hero__reveal"
            style={reveal(0)}
          >
            Şantiyenizi değil,
            <br />
            <span className="login-hero__headline-accent">
              tüm operasyonunuzu
            </span>{" "}
            yönetin.
          </h2>

          {/* Value proposition */}
          <p
            className="login-hero__value login-hero__reveal"
            style={reveal(80)}
          >
            Şantiyem AI; projeleri, ekipleri, finansı ve saha iletişimini tek
            komutla harekete geçirir.
          </p>

          {/* Flagship AI command card */}
          <div
            className="login-hero__ai-card login-hero__reveal"
            style={reveal(180)}
            aria-label="AI komut örneği"
          >
            {/* User voice command */}
            <div
              className="login-hero__command login-hero__reveal"
              style={reveal(320)}
            >
              <div className="login-hero__command-label">
                <Mic className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Sesli komut</span>
              </div>
              <p className="login-hero__command-text">“{COMMAND}”</p>
            </div>

            {/* AI system response */}
            <div
              className="login-hero__response login-hero__reveal"
              style={reveal(520)}
            >
              <div className="login-hero__response-header">
                <SantiyemMark px={28} tone="light" />
                <span className="login-hero__response-title">Şantiyem AI</span>
              </div>
              <p className="login-hero__response-lead">{RESPONSE_TITLE}</p>
              <p className="login-hero__response-body">{RESPONSE_BODY}</p>
            </div>

            {/* Operational outcomes */}
            <div className="login-hero__outcomes">
              {OUTCOMES.map((o, i) => {
                const Icon = o.icon;
                return (
                  <div
                    key={o.label}
                    className="login-hero__outcome login-hero__reveal"
                    style={reveal(720 + i * 120)}
                  >
                    <div className="login-hero__outcome-icon">
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </div>
                    <span className="login-hero__outcome-label">
                      {o.label}
                    </span>
                    <span
                      className="login-hero__outcome-status"
                      aria-hidden="true"
                    />
                  </div>
                );
              })}
            </div>

            {/* Closing result statement */}
            <div
              className="login-hero__result login-hero__reveal"
              style={reveal(1100)}
            >
              <span className="login-hero__result-accent">Tek cümleyle</span>{" "}
              tüm operasyon hazır.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginHero;
