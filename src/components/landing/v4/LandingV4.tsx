// LandingV4 — Şantiyem AI · Construction Profit Intelligence konumlandırması.
// Ana vaat: projelerdeki kâr kaybını ve final maliyet sapmasını erken görmek.
// Sadece pazarlama katmanı: hiçbir uygulama/backend özelliği bu dosyadan etkilenmez.
// Animasyon minimum (tek hafif reveal), parallax/video yok, yatay scroll yok.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  FileSpreadsheet,
  LineChart,
  MessageCircle,
  Menu,
  Search,
  TrendingDown,
  X,
} from "lucide-react";
import { SantiyemWordmark } from "@/components/brand/SantiyemLogo";

/* ── Tokens ─────────────────────────────────────────────── */
const T = {
  bg: "#000000",
  elev: "#0A0A0A",
  surface: "#121212",
  border: "rgba(255,255,255,0.09)",
  borderStrong: "rgba(255,255,255,0.16)",
  text: "#FAFAFA",
  muted: "#A1A1AA",
  faint: "#71717A",
  ember: "#FF6B2B",
  emberGlow: "#FF8F5A",
  emberFaint: "rgba(255,107,43,0.09)",
  red: "#EF4444",
  green: "#22C55E",
};
const heading = { fontFamily: "'Space Grotesk', system-ui, sans-serif", letterSpacing: "-0.02em" };
const body = { fontFamily: "'DM Sans', system-ui, sans-serif" };

const NAV = [
  { l: "Ürün", h: "#urun" },
  { l: "Nasıl Çalışır", h: "#nasil-calisir" },
  { l: "Kimler İçin", h: "#kimler-icin" },
  { l: "SSS", h: "#sss" },
];

/* Hafif reveal — sadece opacity/translate, prefers-reduced-motion'a saygılı. */
const Reveal = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return setOn(true);
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setOn(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setOn(true), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: on ? 1 : 0,
        transform: on ? "none" : "translateY(14px)",
        transition: "opacity 500ms ease-out, transform 500ms ease-out",
      }}
    >
      {children}
    </div>
  );
};

const Section = ({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) => (
  <section id={id} className={`px-5 sm:px-7 lg:px-12 py-14 sm:py-20 ${className}`} style={{ scrollMarginTop: 84 }}>
    <div className="mx-auto max-w-6xl">{children}</div>
  </section>
);

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: T.ember, ...body }}>
    {children}
  </p>
);

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-2.5 text-[26px] sm:text-[34px] lg:text-[42px] font-semibold leading-[1.12]" style={{ color: T.text, ...heading }}>
    {children}
  </h2>
);

const Sub = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-[15px] sm:text-[16.5px] leading-relaxed ${className}`} style={{ color: T.muted, ...body }}>
    {children}
  </p>
);

const Primary = ({ to = "/register", children }: { to?: string; children: React.ReactNode }) => (
  <Link
    to={to}
    className="inline-flex items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold text-white transition-transform active:scale-[0.98]"
    style={{ background: T.ember, minHeight: 52, ...body }}
  >
    {children}
    <ArrowRight className="w-4 h-4" />
  </Link>
);

const Ghost = ({ to = "/iletisim", children }: { to?: string; children: React.ReactNode }) => (
  <Link
    to={to}
    className="inline-flex items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium transition-colors"
    style={{ border: `1px solid ${T.borderStrong}`, color: T.text, minHeight: 52, ...body }}
  >
    {children}
  </Link>
);

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl p-5 sm:p-6 ${className}`} style={{ background: T.elev, border: `1px solid ${T.border}` }}>
    {children}
  </div>
);

/* ── Ürün görseli: Proje Kârlılığı (uygulamadaki dille) ── */
const money = (n: number) => `₺${n.toLocaleString("tr-TR")}`;

const ProfitVisual = () => (
  <div className="rounded-[22px] p-4 sm:p-5" style={{ background: T.elev, border: `1px solid ${T.borderStrong}` }}>
    <div className="flex items-center gap-2 pb-3.5" style={{ borderBottom: `1px solid ${T.border}` }}>
      <LineChart className="w-4 h-4" style={{ color: T.ember }} />
      <span className="text-[13px] font-semibold" style={{ color: T.text, ...body }}>Proje Kârlılığı</span>
      <span className="ml-auto text-[11.5px]" style={{ color: T.faint, ...body }}>Arsuz Sahil Konutları</span>
    </div>

    <div className="grid grid-cols-2 gap-3 pt-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: T.faint, ...body }}>Tahmini Final Kâr</p>
        <p className="mt-1 text-[24px] sm:text-[30px] font-semibold leading-none" style={{ color: T.text, ...heading }}>
          {money(7500000)}
        </p>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: T.faint, ...body }}>Başlangıçta Beklenen</p>
        <p className="mt-1 text-[24px] sm:text-[30px] font-semibold leading-none" style={{ color: T.muted, ...heading }}>
          {money(12000000)}
        </p>
      </div>
    </div>

    <div
      className="mt-4 flex items-center gap-2 rounded-xl px-3.5 py-3"
      style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.28)" }}
    >
      <TrendingDown className="w-4 h-4 shrink-0" style={{ color: T.red }} />
      <span className="text-[12.5px]" style={{ color: T.muted, ...body }}>Başlangıca Göre Kâr Kaybı</span>
      <span className="ml-auto text-[15px] font-semibold" style={{ color: T.red, ...body }}>↓ {money(4500000)}</span>
    </div>

    <div className="mt-4 rounded-xl p-3.5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: T.ember }} />
        <span className="text-[12px] font-semibold" style={{ color: T.emberGlow, ...body }}>Şantiyem AI</span>
        <span className="text-[12px]" style={{ color: T.muted, ...body }}>3 konu dikkatinizi gerektiriyor</span>
      </div>
      <div className="mt-3 space-y-2">
        {[
          { k: "Beton", v: 1200000 },
          { k: "Mekanik", v: 1100000 },
          { k: "Elektrik", v: 620000 },
        ].map((r) => (
          <div key={r.k} className="flex items-center gap-3">
            <span className="text-[12.5px] w-20 shrink-0" style={{ color: T.text, ...body }}>{r.k}</span>
            <span className="h-1.5 rounded-full flex-1" style={{ background: "rgba(255,255,255,0.06)" }}>
              <span
                className="block h-1.5 rounded-full"
                style={{ width: `${(r.v / 1200000) * 100}%`, background: T.red, opacity: 0.75 }}
              />
            </span>
            <span className="text-[12.5px] font-semibold tabular-nums" style={{ color: T.red, ...body }}>+{money(r.v)}</span>
          </div>
        ))}
      </div>
    </div>
    <p className="mt-3 text-[11px]" style={{ color: T.faint, ...body }}>Örnek proje verisiyle gösterim.</p>
  </div>
);

/* ── Navbar ─────────────────────────────────────────────── */
const Nav = () => {
  const [open, setOpen] = useState(false);
  const go = (h: string) => {
    setOpen(false);
    document.querySelector(h)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur"
      style={{ background: "rgba(0,0,0,0.82)", borderBottom: `1px solid ${T.border}`, paddingTop: "env(safe-area-inset-top,0px)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 sm:px-7 lg:px-12" style={{ height: 66 }}>
        <Link to="/" aria-label="Şantiyem AI" className="flex items-center">
          <SantiyemWordmark px={28} tone="light" />
        </Link>
        <nav className="ml-4 hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <button
              key={n.h}
              onClick={() => go(n.h)}
              className="text-[14.5px] font-medium transition-colors hover:opacity-80"
              style={{ color: T.muted, minHeight: 44, ...body }}
            >
              {n.l}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link
            to="/login"
            className="hidden text-[14.5px] font-medium sm:inline-flex items-center"
            style={{ color: T.text, minHeight: 44, ...body }}
          >
            Giriş Yap
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center rounded-full px-4 text-[14px] font-semibold text-white"
            style={{ background: T.ember, minHeight: 44, ...body }}
          >
            Ücretsiz Deneyin
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menü"
            className="md:hidden inline-flex items-center justify-center rounded-lg"
            style={{ width: 44, height: 44, color: T.text }}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden px-5 pb-4" style={{ borderTop: `1px solid ${T.border}` }}>
          {NAV.map((n) => (
            <button
              key={n.h}
              onClick={() => go(n.h)}
              className="flex w-full items-center text-left text-[16px]"
              style={{ color: T.text, minHeight: 52, ...body }}
            >
              {n.l}
            </button>
          ))}
          <Link to="/login" className="flex items-center text-[16px]" style={{ color: T.muted, minHeight: 52, ...body }}>
            Giriş Yap
          </Link>
        </div>
      )}
    </header>
  );
};

/* ── 1. Hero ────────────────────────────────────────────── */
const Hero = () => (
  <Section className="pt-10 sm:pt-16">
    <div className="grid items-center gap-9 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
      <div>
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em]"
          style={{ background: T.emberFaint, color: T.emberGlow, border: `1px solid ${T.ember}33`, ...body }}
        >
          Kâr ve Final Maliyet Kontrolü
        </span>
        <h1
          className="mt-4 text-[32px] sm:text-[44px] lg:text-[56px] font-semibold leading-[1.06]"
          style={{ color: T.text, ...heading }}
        >
          Projeniz para kaybetmeden önce <span style={{ color: T.ember }}>Şantiyem AI</span> fark eder.
        </h1>
        <Sub className="mt-4 max-w-xl">
          Bütçe, gerçekleşen maliyet, satın alma ve proje verilerinizi analiz eder; final maliyetinizi ve kârınızı sürekli
          tahmin eder, kârı eriten riskleri siz sormadan gösterir.
        </Sub>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Primary>Ücretsiz Deneyin</Primary>
          <Ghost>Demo Talep Edin</Ghost>
        </div>
        <p className="mt-4 text-[12.5px]" style={{ color: T.faint, ...body }}>
          14 gün ücretsiz · Kurulum için mevcut Excel bütçeniz yeterli
        </p>
      </div>
      <ProfitVisual />
    </div>
  </Section>
);

/* ── 2. Problem ─────────────────────────────────────────── */
const Problem = () => (
  <Section className="border-t" >
    <Reveal>
      <Label>Problem</Label>
      <H2>Projenizin ne kadar kazandırdığını ne zaman öğreniyorsunuz?</H2>
      <Sub className="mt-4 max-w-2xl">
        İnşaat şirketlerinde maliyet bilgisi çoğu zaman farklı yerlere dağılır:
      </Sub>
      <div className="mt-5 flex flex-wrap gap-2">
        {["Excel", "Muhasebe", "Satın alma", "Hakediş", "Saha kayıtları", "WhatsApp"].map((x) => (
          <span
            key={x}
            className="rounded-full px-3.5 py-2 text-[13px]"
            style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.muted, ...body }}
          >
            {x}
          </span>
        ))}
      </div>
      <p className="mt-6 max-w-2xl text-[16px] sm:text-[19px] font-medium leading-snug" style={{ color: T.text, ...heading }}>
        Sonuç: bütçe aşımları ve kâr kayıpları çoğu zaman para harcandıktan sonra görülür.
      </p>
    </Reveal>
  </Section>
);

/* ── 3. Üç ana yetenek ──────────────────────────────────── */
const CAPS = [
  {
    icon: LineChart,
    t: "Final maliyetinizi görün",
    d: "Mevcut gerçekleşenler, bağlanmış maliyetler ve kalan iş tahminlerinden projenin nereye gittiğini görün.",
  },
  {
    icon: Search,
    t: "Kârı neyin erittiğini bulun",
    d: "Beton, mekanik, işçilik veya satın alma — hangi kalemin final kârınızı ne kadar etkilediğini görün.",
  },
  {
    icon: AlertTriangle,
    t: "Siz sormadan uyarı alın",
    d: "Şantiyem AI önemli değişiklikleri önceliklendirir ve bugün neye bakmanız gerektiğini söyler.",
  },
];

const Capabilities = () => (
  <Section id="urun">
    <Reveal>
      <Label>Çözüm</Label>
      <H2>Üç şeyi çok iyi yapar.</H2>
      <div className="mt-8 grid gap-3.5 md:grid-cols-3">
        {CAPS.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.t}>
              <span
                className="inline-flex items-center justify-center rounded-xl"
                style={{ width: 40, height: 40, background: T.emberFaint, border: `1px solid ${T.ember}33` }}
              >
                <Icon className="w-[18px] h-[18px]" style={{ color: T.ember }} />
              </span>
              <h3 className="mt-4 text-[17px] font-semibold" style={{ color: T.text, ...heading }}>{c.t}</h3>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: T.muted, ...body }}>{c.d}</p>
            </Card>
          );
        })}
      </div>
    </Reveal>
  </Section>
);

/* ── 4. Product showcase (4 gerçek ürün alanı) ──────────── */
const Showcase = () => (
  <Section>
    <Reveal>
      <Label>Ürün Alanları</Label>
      <H2>Dört ekranda kâr kontrolü.</H2>
      <div className="mt-8 grid gap-3.5 md:grid-cols-2">
        <Card>
          <h3 className="text-[16px] font-semibold" style={{ color: T.text, ...heading }}>Proje Kârlılığı</h3>
          <p className="mt-1.5 text-[14px]" style={{ color: T.muted, ...body }}>
            Tek projenin tahmini final kârı ve kâr kaybı.
          </p>
          <div className="mt-4 rounded-xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px]" style={{ color: T.faint, ...body }}>Tahmini Final Kâr</span>
              <span className="text-[18px] font-semibold" style={{ color: T.text, ...body }}>{money(7500000)}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-[12px]" style={{ color: T.faint, ...body }}>Kâr Kaybı</span>
              <span className="text-[14px] font-semibold" style={{ color: T.red, ...body }}>↓ {money(4500000)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-[16px] font-semibold" style={{ color: T.text, ...heading }}>Portföy Kârlılığı</h3>
          <p className="mt-1.5 text-[14px]" style={{ color: T.muted, ...body }}>
            Birden fazla projenin toplam kâr ve risk görünümü.
          </p>
          <div className="mt-4 space-y-2">
            {[
              { n: "Arsuz Sahil Konutları", v: -735000 },
              { n: "Defne Konut", v: -180000 },
              { n: "Antakya Ofis", v: 240000 },
            ].map((p) => (
              <div
                key={p.n}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.v < 0 ? T.red : T.green }} />
                <span className="text-[13px] truncate" style={{ color: T.text, ...body }}>{p.n}</span>
                <span
                  className="ml-auto text-[13px] font-semibold shrink-0"
                  style={{ color: p.v < 0 ? T.red : T.green, ...body }}
                >
                  {p.v < 0 ? "↓" : "↑"} {money(Math.abs(p.v))}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-[16px] font-semibold" style={{ color: T.text, ...heading }}>Şantiyem AI — Bugün</h3>
          <p className="mt-1.5 text-[14px]" style={{ color: T.muted, ...body }}>
            Bugün dikkatinizi gerektiren konular, önem sırasına göre.
          </p>
          <div className="mt-4 space-y-2">
            {[
              "Beton maliyeti Arsuz projesinde kârı baskılıyor.",
              "Mekanik işlerde bağlanmış maliyet bütçeyi aştı.",
              "Defne Konut'ta final kâr tahmini son dönemde düştü.",
            ].map((x) => (
              <div key={x} className="flex gap-2.5 rounded-xl px-3.5 py-2.5" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: T.ember }} />
                <span className="text-[13px] leading-snug" style={{ color: T.muted, ...body }}>{x}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-[16px] font-semibold" style={{ color: T.text, ...heading }}>WhatsApp Yönetici Özeti</h3>
          <p className="mt-1.5 text-[14px]" style={{ color: T.muted, ...body }}>
            Yönetici uygulamayı açmasa bile önemli konular kendisine ulaşır.
          </p>
          <div className="mt-4 flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <MessageCircle className="w-4 h-4 shrink-0" style={{ color: T.green }} />
            <span className="text-[13px]" style={{ color: T.muted, ...body }}>Günlük veya haftalık kısa özet</span>
          </div>
        </Card>
      </div>
    </Reveal>
  </Section>
);

/* ── 5. Nasıl çalışır ───────────────────────────────────── */
const STEPS = [
  { t: "Projenizi hazırlayın", d: "Mevcut Excel bütçenizi yükleyin veya birkaç dakikada hızlı kurulum yapın." },
  { t: "Şantiyem mevcut verilerinizi kullanır", d: "Gider, satın alma ve taşeron kayıtlarınızı yeniden girmeniz gerekmez." },
  { t: "Kâr ve riskleri takip edin", d: "Şantiyem final maliyetinizi takip eder ve önemli değişiklikleri size bildirir." },
];

const HowItWorks = () => (
  <Section id="nasil-calisir">
    <Reveal>
      <Label>Nasıl Çalışır</Label>
      <H2>Kurulum bir günlük iş değil.</H2>
      <div className="mt-8 grid gap-3.5 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <Card key={s.t}>
            <span className="text-[13px] font-semibold" style={{ color: T.ember, ...body }}>{`0${i + 1}`}</span>
            <h3 className="mt-2 text-[17px] font-semibold" style={{ color: T.text, ...heading }}>{s.t}</h3>
            <p className="mt-2 text-[14px] leading-relaxed" style={{ color: T.muted, ...body }}>{s.d}</p>
          </Card>
        ))}
      </div>
    </Reveal>
  </Section>
);

/* ── 6. Excel / kullanım kolaylığı ──────────────────────── */
const ExcelEase = () => (
  <Section>
    <Reveal>
      <Card className="md:flex md:items-center md:gap-8">
        <span
          className="inline-flex items-center justify-center rounded-2xl shrink-0"
          style={{ width: 52, height: 52, background: T.emberFaint, border: `1px solid ${T.ember}33` }}
        >
          <FileSpreadsheet className="w-6 h-6" style={{ color: T.ember }} />
        </span>
        <div className="mt-4 md:mt-0">
          <h3 className="text-[20px] sm:text-[24px] font-semibold" style={{ color: T.text, ...heading }}>
            Yeni bir ERP öğrenmek zorunda değilsiniz.
          </h3>
          <Sub className="mt-2.5 max-w-2xl">
            Mevcut Excel bütçenizle başlayın. Şantiyem mevcut proje kayıtlarınızı kullanır ve finansal analiz katmanını
            bunların üzerine kurar.
          </Sub>
        </div>
      </Card>
    </Reveal>
  </Section>
);

/* ── 7. WhatsApp ────────────────────────────────────────── */
const WhatsAppSection = () => (
  <Section>
    <div className="grid items-center gap-9 lg:grid-cols-[1fr_0.85fr] lg:gap-14">
      <Reveal>
        <Label>WhatsApp Özeti</Label>
        <H2>Uygulamayı açmasanız da Şantiyem sizi bulur.</H2>
        <Sub className="mt-4 max-w-xl">
          Önemli konular kısa bir özet olarak WhatsApp'a gelir. Detay gerektiğinde tek dokunuşla ilgili projeye geçersiniz.
        </Sub>
        <ul className="mt-5 space-y-2.5">
          {["Günlük veya haftalık özet", "En fazla üç önemli konu", "Doğrudan ilgili proje bağlantısı"].map((x) => (
            <li key={x} className="flex items-center gap-2.5 text-[14.5px]" style={{ color: T.muted, ...body }}>
              <Check className="w-4 h-4 shrink-0" style={{ color: T.ember }} />
              {x}
            </li>
          ))}
        </ul>
      </Reveal>

      {/* Mobil cihaz çerçevesi içinde örnek mesaj */}
      <div className="mx-auto w-full max-w-[320px]">
        <div className="rounded-[30px] p-2.5" style={{ background: T.surface, border: `1px solid ${T.borderStrong}` }}>
          <div className="rounded-[24px] p-4" style={{ background: "#0B141A" }}>
            <div className="flex items-center gap-2 pb-3" style={{ borderBottom: `1px solid ${T.border}` }}>
              <span className="inline-flex items-center justify-center rounded-full" style={{ width: 28, height: 28, background: T.ember }}>
                <span className="text-[12px] font-bold text-white" style={heading}>Ş</span>
              </span>
              <span className="text-[13px] font-semibold" style={{ color: T.text, ...body }}>Şantiyem AI</span>
            </div>
            <div className="mt-3 rounded-2xl rounded-tl-md px-3.5 py-3" style={{ background: "#1F2C34" }}>
              <p className="text-[12.5px] font-semibold" style={{ color: "#FFFFFF", ...body }}>Şantiyem AI | Günlük Özet</p>
              <p className="mt-2 text-[12.5px]" style={{ color: "#D1D7DB", ...body }}>
                6 aktif projede 3 konu dikkatinizi gerektiriyor.
              </p>
              <div className="mt-3 space-y-2.5">
                <div>
                  <p className="text-[12.5px] font-semibold" style={{ color: "#FFFFFF", ...body }}>Arsuz Konut</p>
                  <p className="text-[12px]" style={{ color: "#D1D7DB", ...body }}>Beton maliyeti kârı baskılıyor</p>
                  <p className="text-[12px]" style={{ color: "#F0A28A", ...body }}>₺735.000 tahmini etki</p>
                </div>
                <div>
                  <p className="text-[12.5px] font-semibold" style={{ color: "#FFFFFF", ...body }}>Defne Konut</p>
                  <p className="text-[12px]" style={{ color: "#D1D7DB", ...body }}>Final kâr tahmini son dönemde düştü</p>
                </div>
              </div>
              <p className="mt-3 text-[12.5px] font-semibold" style={{ color: "#53BDEB", ...body }}>Detayları Gör</p>
            </div>
            <p className="mt-3 text-[10.5px]" style={{ color: T.faint, ...body }}>Örnek mesaj görünümü.</p>
          </div>
        </div>
      </div>
    </div>
  </Section>
);

/* ── 8. Kimler için ─────────────────────────────────────── */
const AUDIENCE = [
  "Birden fazla aktif projesi olan müteahhitler",
  "Ana yükleniciler",
  "Gayrimenkul geliştiricileri",
  "Proje maliyetini kontrol etmek isteyen küçük ve orta ölçekli inşaat firmaları",
];

const Audience = () => (
  <Section id="kimler-icin">
    <Reveal>
      <Label>Kimler İçin</Label>
      <H2>Aynı anda birden fazla proje yürütenler için.</H2>
      <div className="mt-8 grid gap-3.5 sm:grid-cols-2">
        {AUDIENCE.map((a) => (
          <div key={a} className="flex items-start gap-3 rounded-2xl p-4" style={{ background: T.elev, border: `1px solid ${T.border}` }}>
            <Building2 className="mt-0.5 w-4 h-4 shrink-0" style={{ color: T.ember }} />
            <span className="text-[14.5px] leading-snug" style={{ color: T.text, ...body }}>{a}</span>
          </div>
        ))}
      </div>
      <Sub className="mt-6 max-w-2xl">
        Türkiye'deki inşaat şirketleri için tasarlandı: hakediş, Excel bütçe, taşeron ve satın alma kayıtları ile
        WhatsApp üzerinden yürüyen gerçek çalışma düzenine göre.
      </Sub>
    </Reveal>
  </Section>
);

/* ── 9. Plan (fiyat yerine demo) ────────────────────────── */
const PlanSection = () => (
  <Section>
    <Reveal>
      <Card className="text-center">
        <Label>Planlar</Label>
        <H2>Firmanızın proje sayısına ve ihtiyaçlarına uygun plan</H2>
        <Sub className="mx-auto mt-4 max-w-xl">
          Proje sayınıza ve ekip büyüklüğünüze göre birlikte belirliyoruz. 15 dakikalık bir görüşmede kendi projenizle
          nasıl çalıştığını gösterelim.
        </Sub>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Ghost>Demo Talep Edin</Ghost>
          <Primary>Ücretsiz Deneyin</Primary>
        </div>
      </Card>
    </Reveal>
  </Section>
);

/* ── 10. SSS ────────────────────────────────────────────── */
const FAQ_ITEMS = [
  {
    q: "Verilerimi yeniden girmem gerekiyor mu?",
    a: "Hayır. Mevcut Excel bütçenizi yükleyebilirsiniz; gider, satın alma ve taşeron kayıtlarınız uygulamada zaten varsa Şantiyem bunları kullanır.",
  },
  {
    q: "Kurulum ne kadar sürer?",
    a: "Tek projeyle başlamak birkaç dakika sürer. Bütçe kalemleriniz hazırsa ilk kâr görünümünüzü aynı gün alırsınız.",
  },
  {
    q: "Normal bir ERP'den farkı ne?",
    a: "ERP'ler kaydı tutar. Şantiyem kayıtların üzerine finansal analiz katmanı kurar: final maliyet tahmini, kâr kaybı ve risk uyarıları.",
  },
  {
    q: "Finansal rakamları yapay zekâ mı hesaplıyor?",
    a: "Hayır. Tüm finansal hesaplamalar sabit kurallarla yapılır. Yapay zekâ yalnızca önceliklendirir ve durumu açıklar.",
  },
  {
    q: "Ekibim de kullanabilir mi?",
    a: "Evet. Ekip üyelerini davet edebilir, kimin hangi projeyi göreceğini belirleyebilirsiniz.",
  },
];

const FAQ = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="sss">
      <Reveal>
        <Label>SSS</Label>
        <H2>Sık sorulanlar</H2>
        <div className="mt-7 space-y-2.5">
          {FAQ_ITEMS.map((f, i) => (
            <div key={f.q} className="rounded-2xl overflow-hidden" style={{ background: T.elev, border: `1px solid ${T.border}` }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center gap-3 px-5 text-left"
                style={{ minHeight: 60 }}
                aria-expanded={open === i}
              >
                <span className="text-[15px] font-medium" style={{ color: T.text, ...body }}>{f.q}</span>
                <ChevronDown
                  className="ml-auto w-4 h-4 shrink-0 transition-transform"
                  style={{ color: T.faint, transform: open === i ? "rotate(180deg)" : "none" }}
                />
              </button>
              {open === i && (
                <p className="px-5 pb-5 text-[14px] leading-relaxed" style={{ color: T.muted, ...body }}>{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
};

/* ── 11. Final CTA ──────────────────────────────────────── */
const FinalCTA = () => (
  <Section>
    <Reveal>
      <div
        className="rounded-[26px] px-6 py-12 text-center sm:px-10"
        style={{ background: `linear-gradient(180deg, ${T.emberFaint}, ${T.elev})`, border: `1px solid ${T.ember}33` }}
      >
        <h2 className="text-[26px] sm:text-[38px] font-semibold leading-tight" style={{ color: T.text, ...heading }}>
          İlk projenizin kâr durumunu görün.
        </h2>
        <Sub className="mx-auto mt-4 max-w-xl">
          Mevcut bütçenizi yükleyin. Şantiyem proje kayıtlarınızı kullanarak kârlılık analizini oluştursun.
        </Sub>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Primary>Ücretsiz Deneyin</Primary>
          <Ghost>Demo Talep Edin</Ghost>
        </div>
      </div>
    </Reveal>
  </Section>
);

/* ── 12. Footer ─────────────────────────────────────────── */
const Footer = () => (
  <footer className="px-5 sm:px-7 lg:px-12 py-12" style={{ borderTop: `1px solid ${T.border}` }}>
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <Link to="/" className="flex items-center">
          <SantiyemWordmark px={28} tone="light" />
        </Link>
        <nav className="flex flex-wrap gap-x-6 gap-y-1 md:ml-auto">
          {[
            { l: "Ürün", to: "#urun" },
            { l: "İletişim", to: "/iletisim" },
            { l: "Gizlilik", to: "/gizlilik-politikasi" },
            { l: "Kullanım Koşulları", to: "/kullanim-sartlari" },
            { l: "Giriş", to: "/login" },
          ].map((x) =>
            x.to.startsWith("#") ? (
              <a key={x.l} href={x.to} className="text-[13.5px] flex items-center" style={{ color: T.muted, minHeight: 44, ...body }}>
                {x.l}
              </a>
            ) : (
              <Link key={x.l} to={x.to} className="text-[13.5px] flex items-center" style={{ color: T.muted, minHeight: 44, ...body }}>
                {x.l}
              </Link>
            ),
          )}
        </nav>
      </div>
      <p className="mt-8 text-[12px]" style={{ color: T.faint, ...body }}>
        © {new Date().getFullYear()} Şantiyem AI · Göktaş Global
      </p>
    </div>
  </footer>
);

/* ── Sayfa ──────────────────────────────────────────────── */
export default function LandingV4() {
  return (
    <div style={{ background: T.bg, color: T.text, minHeight: "100dvh", overflowX: "hidden", ...body }}>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Capabilities />
        <Showcase />
        <HowItWorks />
        <ExcelEase />
        <WhatsAppSection />
        <Audience />
        <PlanSection />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
