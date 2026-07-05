// LandingV3 — Şantiyem AI marketing surface.
// Noir & Ember palette · Space Grotesk + DM Sans · split-screen hero.
// 12 sections, real product mockups (in-app UI language, not fake dashboards).

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Play, Mic, Sparkles, TrendingUp, AlertTriangle, CheckCircle2,
  Building2, Wallet, Users, Package, FileText, ClipboardList, Receipt, BookOpen,
  Brain, MessageSquare, Send, Zap, ShieldCheck, Clock, ArrowUpRight,
  BarChart3, Activity, Waves, Database, Layers, ChevronDown, Check,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   Design tokens (Noir & Ember)
   ═══════════════════════════════════════════════════════════════════ */
const T = {
  bg: "#000000",
  elev: "#0A0A0A",
  surface: "#141414",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  text: "#FAFAFA",
  muted: "#A1A1AA",
  faint: "#71717A",
  ember: "#FF6B2B",
  emberGlow: "#FF8F5A",
  emberFaint: "rgba(255,107,43,0.08)",
};

const heading = { fontFamily: "'Space Grotesk', system-ui, sans-serif", letterSpacing: "-0.02em" };
const body = { fontFamily: "'DM Sans', system-ui, sans-serif" };

/* Scroll-reveal helper */
const useReveal = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
};

const Reveal = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 700ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 700ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

/* Count-up */
const CountUp = ({ to, suffix = "", duration = 1400 }: { to: number; suffix?: string; duration?: number }) => {
  const { ref, visible } = useReveal();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, to, duration]);
  return <span ref={ref as any}>{n.toLocaleString("tr-TR")}{suffix}</span>;
};

/* ═══════════════════════════════════════════════════════════════════
   Shared primitives
   ═══════════════════════════════════════════════════════════════════ */
const EmberBadge = ({ children }: { children: React.ReactNode }) => (
  <span
    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-[0.14em]"
    style={{
      background: T.emberFaint,
      color: T.emberGlow,
      border: `1px solid ${T.ember}33`,
      ...body,
    }}
  >
    <span className="w-1 h-1 rounded-full" style={{ background: T.ember, boxShadow: `0 0 8px ${T.ember}` }} />
    {children}
  </span>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: T.ember, ...body }}>
    {children}
  </p>
);

const H2 = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <h2 className={`text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] ${className}`} style={{ color: T.text, ...heading }}>
    {children}
  </h2>
);

const Sub = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-base md:text-lg leading-relaxed ${className}`} style={{ color: T.muted, ...body }}>
    {children}
  </p>
);

const PrimaryBtn = ({ to = "/register", children, icon }: { to?: string; children: React.ReactNode; icon?: React.ReactNode }) => (
  <Link
    to={to}
    className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-[14px] font-semibold text-white transition-all hover:scale-[1.02]"
    style={{ background: T.ember, boxShadow: `0 8px 32px ${T.ember}55`, ...body }}
  >
    {children}
    {icon ?? <ArrowRight className="w-4 h-4" />}
  </Link>
);

const GhostBtn = ({ to, onClick, children, icon }: { to?: string; onClick?: () => void; children: React.ReactNode; icon?: React.ReactNode }) => {
  const cls = "inline-flex items-center gap-2 px-5 py-3 rounded-full text-[14px] font-medium transition-all hover:border-white/30";
  const style = { background: "rgba(255,255,255,0.03)", border: `1px solid ${T.borderStrong}`, color: T.text, ...body };
  if (to) return <Link to={to} className={cls} style={style}>{icon}{children}</Link>;
  return <button onClick={onClick} className={cls} style={style}>{icon}{children}</button>;
};

/* Reusable "browser chrome" for mockups */
const AppFrame = ({ children, label = "santiyem.io/dashboard" }: { children: React.ReactNode; label?: string }) => (
  <div
    className="rounded-2xl overflow-hidden"
    style={{
      background: T.elev,
      border: `1px solid ${T.border}`,
      boxShadow: "0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02) inset",
    }}
  >
    <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: T.border, background: "#080808" }}>
      <div className="flex gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#3F3F46" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#3F3F46" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#3F3F46" }} />
      </div>
      <div className="flex-1 flex justify-center">
        <span className="text-[10.5px] px-2.5 py-0.5 rounded" style={{ background: "#000", color: T.faint, border: `1px solid ${T.border}`, ...body }}>
          {label}
        </span>
      </div>
      <div className="w-10" />
    </div>
    <div>{children}</div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   1 · HERO — split-screen
   ═══════════════════════════════════════════════════════════════════ */
const HeroDashboardMock = () => {
  const { ref, visible } = useReveal();
  const [score, setScore] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1400);
      const eased = 1 - Math.pow(1 - p, 3);
      setScore(Math.round(87 * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible]);
  return (
  <AppFrame label="santiyem.io/dashboard">
    <div ref={ref} className="p-4 md:p-5 grid grid-cols-6 gap-3" style={{ background: T.elev, minHeight: 380 }}>
      {/* Sidebar */}
      <div className="col-span-1 space-y-1.5">
        {[Building2, Wallet, Users, Package, FileText].map((I, i) => (
          <div key={i} className="flex items-center justify-center rounded-lg h-8" style={{ background: i === 0 ? T.emberFaint : "transparent", border: i === 0 ? `1px solid ${T.ember}33` : "1px solid transparent" }}>
            <I className="w-3.5 h-3.5" style={{ color: i === 0 ? T.ember : T.faint }} />
          </div>
        ))}
      </div>
      {/* Content */}
      <div className="col-span-5 space-y-3">
        {/* Health score card */}
        <div className="rounded-xl p-3.5" style={{ background: "#0F0F0F", border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: T.faint, ...body }}>Firma Sağlığı</span>
            <span className="text-[10px]" style={{ color: "#4ade80", ...body }}>▲ +4</span>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-semibold tabular-nums" style={{ color: T.text, ...heading }}>{score}</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "#1a1a1a" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${score}%`,
                  background: `linear-gradient(90deg, ${T.ember}, ${T.emberGlow})`,
                  transition: "width 1.4s cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            </div>
          </div>
        </div>
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "Aktif Proje", v: "12" },
            { l: "Bu Ay Hakediş", v: "₺4.2M" },
            { l: "Personel", v: "148" },
          ].map((k, i) => (
            <div key={i} className="rounded-lg p-2.5" style={{ background: "#0F0F0F", border: `1px solid ${T.border}` }}>
              <p className="text-[9px] uppercase tracking-wider" style={{ color: T.faint, ...body }}>{k.l}</p>
              <p className="text-base font-semibold mt-0.5" style={{ color: T.text, ...heading }}>{k.v}</p>
            </div>
          ))}
        </div>
        {/* AI insight */}
        <div
          className="rounded-xl p-3"
          style={{
            background: T.emberFaint,
            border: `1px solid ${T.ember}33`,
            boxShadow: visible ? `0 0 24px ${T.ember}22` : "none",
            transition: "box-shadow 1.2s ease",
          }}
        >
          <div className="flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 mt-0.5" style={{ color: T.ember, animation: visible ? "pulse 2.4s ease-in-out infinite" : "none" }} />
            <div className="flex-1">
              <p className="text-[11px] font-semibold" style={{ color: T.text, ...body }}>Şantiyem AI</p>
              <p className="text-[10.5px] mt-0.5" style={{ color: T.muted, ...body }}>
                3 proje gecikmiş hakediş içeriyor. Öncelikli olarak Arsuz-2'yi incelemenizi öneriyorum.
              </p>
            </div>
          </div>
        </div>
        {/* Bar chart */}
        <div className="rounded-xl p-3" style={{ background: "#0F0F0F", border: `1px solid ${T.border}` }}>
          <div className="flex items-end gap-1.5 h-16">
            {[40, 65, 45, 80, 55, 90, 70, 85].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{
                  height: visible ? `${h}%` : "0%",
                  background: i === 5 ? T.ember : "rgba(255,255,255,0.12)",
                  transition: `height 900ms cubic-bezier(0.22,1,0.36,1) ${i * 70}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  </AppFrame>
  );
};


const Hero = () => (
  <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden" style={{ background: T.bg }}>
    {/* Ember glow */}
    <div className="absolute inset-0 pointer-events-none opacity-60">
      <div className="absolute top-1/4 -left-40 w-[600px] h-[600px] rounded-full" style={{ background: `radial-gradient(circle, ${T.ember}22 0%, transparent 70%)`, filter: "blur(60px)" }} />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full" style={{ background: `radial-gradient(circle, ${T.ember}18 0%, transparent 70%)`, filter: "blur(80px)" }} />
    </div>
    {/* Grid pattern */}
    <div
      className="absolute inset-0 opacity-[0.021]"
      style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    />

    <div className="relative max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
      <Reveal className="lg:col-span-6">
        <div className="mb-6"><EmberBadge>Şantiyem AI · v3</EmberBadge></div>
        <h1
          className="text-[40px] sm:text-5xl md:text-6xl lg:text-[64px] font-semibold leading-[1.04] mb-6"
          style={{ color: T.text, ...heading }}
        >
          Tüm şirketinizi{" "}
          <span style={{ background: `linear-gradient(90deg, ${T.ember}, ${T.emberGlow})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            tek bir yapay zekayla
          </span>{" "}
          yönetin.
        </h1>
        <Sub className="max-w-xl mb-8">
          Projeler, finans, hakediş, personel, stok ve şantiye yönetimi tek bir yapay zekâda birleşiyor.
        </Sub>
        <div className="flex flex-wrap gap-3 mb-10">
          <PrimaryBtn to="/register">Ücretsiz Dene</PrimaryBtn>
          <GhostBtn icon={<Play className="w-4 h-4" style={{ color: T.ember }} />} onClick={() => {}}>
            2 dk Demo İzle
          </GhostBtn>
          <GhostBtn to="/iletisim">Demo Talep Et</GhostBtn>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-2 text-[12.5px]" style={{ color: T.faint, ...body }}>
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" style={{ color: T.ember }} /> 14 gün ücretsiz</span>
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" style={{ color: T.ember }} /> Kart gerekmez</span>
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" style={{ color: T.ember }} /> 5 dakikada kurulum</span>
        </div>
      </Reveal>

      <Reveal delay={200} className="lg:col-span-6">
        <HeroDashboardMock />
      </Reveal>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════════
   2 · AI EXECUTIVE
   ═══════════════════════════════════════════════════════════════════ */
const AIExecutive = () => (
  <section id="ai-executive" className="py-24 md:py-32 relative" style={{ background: T.bg }}>
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <Reveal className="max-w-3xl mb-16">
        <div className="mb-4"><SectionLabel>AI Executive</SectionLabel></div>
        <H2>Her sabah, işe başlamadan önce brifing alın.</H2>
        <Sub className="mt-5">
          Şantiyem AI; gece boyunca firmanızın tüm verilerini analiz eder ve sabah size hazır bir
          yönetici özeti sunar. Ne acil, ne fırsat, ne risk — hepsi 30 saniyede.
        </Sub>
      </Reveal>

      <div className="grid lg:grid-cols-2 gap-6">
        <Reveal delay={100}>
          <AppFrame label="Morning Brief · 07:30">
            <div className="p-5 space-y-4" style={{ background: T.elev }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10.5px] uppercase tracking-widest" style={{ color: T.ember, ...body }}>Bu Sabah</p>
                  <h3 className="text-xl font-semibold mt-1" style={{ color: T.text, ...heading }}>Günaydın, hoş geldiniz</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px]" style={{ color: T.faint, ...body }}>SAĞLIK SKORU</p>
                  <p className="text-2xl font-semibold" style={{ color: T.text, ...heading }}>87<span className="text-sm" style={{ color: T.faint }}>/100</span></p>
                </div>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: T.muted, ...body }}>
                Dün 3 hakediş onaylandı, ₺842K nakit girişi bekleniyor. Arsuz-2'de kritik risk:
                subcontractor sözleşme bitişi 4 gün içinde.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-2">
                {[
                  { l: "Nakit Pozisyonu", v: "₺12.4M", tone: "up" },
                  { l: "Açık Hakediş", v: "3", tone: "warn" },
                  { l: "Aktif Personel", v: "148", tone: "flat" },
                ].map((k) => (
                  <div key={k.l} className="rounded-lg p-2.5" style={{ background: "#0A0A0A", border: `1px solid ${T.border}` }}>
                    <p className="text-[9.5px] uppercase tracking-wider" style={{ color: T.faint, ...body }}>{k.l}</p>
                    <p className="text-[15px] font-semibold mt-0.5" style={{ color: T.text, ...heading }}>{k.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </AppFrame>
        </Reveal>

        <Reveal delay={200}>
          <AppFrame label="Bugünkü Ajanda">
            <div className="p-5 space-y-3" style={{ background: T.elev }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" style={{ color: T.ember }} />
                <h3 className="text-[15px] font-semibold" style={{ color: T.text, ...heading }}>AI Önerileri</h3>
              </div>
              {[
                { icon: AlertTriangle, tone: "#ef4444", t: "Arsuz-2 subcontractor", d: "Sözleşme 4 gün içinde bitiyor — yenile" },
                { icon: TrendingUp, tone: T.ember, t: "Mersin Sitesi hakedişi", d: "₺1.2M onay bekliyor · imzala" },
                { icon: CheckCircle2, tone: "#4ade80", t: "3 fatura eşleştirildi", d: "Otomatik kabul edildi · onay bekliyor" },
                { icon: Clock, tone: "#a1a1aa", t: "Bayilerle toplantı", d: "14:00 · hazırlık dosyası hazır" },
              ].map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg" style={{ background: "#0A0A0A", border: `1px solid ${T.border}` }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${r.tone}18` }}>
                    <r.icon className="w-3.5 h-3.5" style={{ color: r.tone }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium" style={{ color: T.text, ...body }}>{r.t}</p>
                    <p className="text-[11.5px] mt-0.5" style={{ color: T.muted, ...body }}>{r.d}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 mt-1" style={{ color: T.faint }} />
                </div>
              ))}
            </div>
          </AppFrame>
        </Reveal>
      </div>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════════
   3 · TALK TO YOUR COMPANY
   ═══════════════════════════════════════════════════════════════════ */
const VoiceSection = () => (
  <section className="py-24 md:py-32 relative overflow-hidden" style={{ background: T.elev }}>
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full" style={{ background: `radial-gradient(circle, ${T.ember}12 0%, transparent 60%)`, filter: "blur(80px)" }} />
    </div>
    <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
      <Reveal className="text-center max-w-3xl mx-auto mb-16">
        <div className="mb-4 flex justify-center"><SectionLabel>Voice</SectionLabel></div>
        <H2>Firmanızla konuşun.</H2>
        <Sub className="mt-5">
          "Bu ay hangi proje kârda?" diye sorun. Cevabı sesli alın, canvas'ta görün, dashboard'a
          yansısın. Tek bir konuşma, tüm firmayı hareketlendirir.
        </Sub>
      </Reveal>

      <Reveal delay={150}>
        <div
          className="rounded-3xl overflow-hidden grid lg:grid-cols-5"
          style={{ background: "#000", border: `1px solid ${T.borderStrong}`, boxShadow: `0 60px 160px rgba(0,0,0,0.7)` }}
        >
          {/* Voice orb */}
          <div className="lg:col-span-2 p-10 flex flex-col items-center justify-center relative" style={{ background: "radial-gradient(circle at center, #0a0a0a 0%, #000 70%)", minHeight: 420 }}>
            <div className="relative">
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: `${T.ember}22`, animationDuration: "2.5s" }} />
              <div className="absolute inset-0 rounded-full" style={{ background: `${T.ember}12`, transform: "scale(1.4)", filter: "blur(20px)" }} />
              <div
                className="relative w-40 h-40 rounded-full flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${T.emberGlow}, ${T.ember} 60%, #B54019 100%)`,
                  boxShadow: `0 20px 60px ${T.ember}66, inset 0 0 40px rgba(255,255,255,0.15)`,
                }}
              >
                <Mic className="w-14 h-14 text-white" strokeWidth={2} />
              </div>
            </div>
            <p className="mt-8 text-[11px] uppercase tracking-[0.3em] font-semibold" style={{ color: T.emberGlow, ...body }}>Dinliyor</p>
            <div className="mt-5 w-full max-w-sm space-y-2.5">
              {/* User bubble */}
              <div className="flex justify-end">
                <div
                  className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-tr-sm text-[12.5px] leading-snug"
                  style={{ background: T.ember, color: "#fff", ...body, boxShadow: `0 4px 16px ${T.ember}44` }}
                >
                  Bu ay en kârlı proje hangisi ve neden?
                </div>
              </div>
              {/* AI bubble */}
              <div className="flex justify-start items-start gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `linear-gradient(135deg, ${T.ember}, ${T.emberGlow})` }}>
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div
                  className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-tl-sm text-[12.5px] leading-snug"
                  style={{ background: "#0A0A0A", color: T.text, border: `1px solid ${T.border}`, ...body }}
                >
                  <span style={{ color: T.emberGlow }}>Arsuz Konut</span> — ₺1.8M net kâr, %22 marj. Erken teslim primi belirleyici oldu.
                </div>
              </div>
            </div>

          </div>

          {/* Live analysis panel */}
          <div className="lg:col-span-3 p-6 md:p-8 space-y-4" style={{ background: T.elev, borderLeft: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" style={{ color: T.ember }} />
                <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: T.muted, ...body }}>Canlı Analiz</span>
              </div>
              <span className="text-[10.5px]" style={{ color: "#4ade80", ...body }}>● online</span>
            </div>

            <div className="rounded-xl p-4" style={{ background: "#0A0A0A", border: `1px solid ${T.border}` }}>
              <p className="text-[13px] leading-relaxed" style={{ color: T.text, ...body }}>
                <span style={{ color: T.emberGlow }}>Arsuz Konut Projesi</span> bu ay ₺1.8M net kâr üretti
                (%22 marj). Ana neden: erken teslim primi + malzeme optimizasyonu.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { l: "Net Kâr", v: "₺1.8M", d: "%22 marj" },
                { l: "İlerleme", v: "%78", d: "3 hafta önde" },
              ].map((k, i) => (
                <div key={i} className="rounded-xl p-3" style={{ background: "#0A0A0A", border: `1px solid ${T.border}` }}>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: T.faint, ...body }}>{k.l}</p>
                  <p className="text-xl font-semibold mt-0.5" style={{ color: T.text, ...heading }}>{k.v}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: T.emberGlow, ...body }}>{k.d}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-[10.5px] uppercase tracking-widest" style={{ color: T.faint, ...body }}>Önerilen Aksiyonlar</p>
              {["Projeyi Aç", "Yönetici raporu oluştur", "WhatsApp ile ekiple paylaş"].map((a) => (
                <button key={a} className="w-full text-left flex items-center justify-between p-2.5 rounded-lg transition-colors hover:bg-white/[0.03]" style={{ background: "#0A0A0A", border: `1px solid ${T.border}` }}>
                  <span className="text-[12.5px]" style={{ color: T.text, ...body }}>{a}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" style={{ color: T.ember }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════════
   4 · ONE AI. EVERY DEPARTMENT.
   ═══════════════════════════════════════════════════════════════════ */
const departments = [
  { icon: Building2, label: "Projeler", d: "Kanban, milestone, roller" },
  { icon: Wallet, label: "Finans", d: "Kasa, ödeme, tahsilat" },
  { icon: Users, label: "Personel", d: "QR puantaj, bordro" },
  { icon: Package, label: "Malzeme", d: "Stok, tedarik, sarfiyat" },
  { icon: ClipboardList, label: "Hakediş", d: "AI BOQ eşleştirme" },
  { icon: FileText, label: "Şantiye Günlüğü", d: "Foto, hava, işgücü" },
  { icon: Receipt, label: "E-Fatura", d: "UBL, otomatik eşleşme" },
  { icon: BookOpen, label: "Belgeler", d: "PDF, RAG arama" },
  { icon: Brain, label: "Şirket Hafızası", d: "Kurumsal bilgi tabanı" },
];

const OneAI = () => (
  <section className="py-24 md:py-32" style={{ background: T.bg }}>
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <Reveal className="max-w-3xl mb-16">
        <div className="mb-4"><SectionLabel>Bir Zeka · Her Departman</SectionLabel></div>
        <H2>Ayrı yazılımlar değil. Tek bir sistem.</H2>
        <Sub className="mt-5">
          Excel + hakediş programı + muhasebe + WhatsApp grupları... hepsi tek bir Şantiyem AI
          içinde birleşir. Aralarındaki bağ, size zaman kazandırır.
        </Sub>
      </Reveal>

      <div className="relative">
        {/* Central hub */}
        <div className="hidden lg:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${T.emberGlow}, ${T.ember})`,
              boxShadow: `0 20px 60px ${T.ember}44`,
            }}
          >
            <div className="text-center">
              <Sparkles className="w-6 h-6 text-white mx-auto mb-1" />
              <p className="text-[9px] uppercase tracking-widest text-white font-bold" style={body}>Şantiyem AI</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {departments.map((d, i) => (
            <Reveal key={d.label} delay={i * 60}>
              <div
                className="p-5 rounded-2xl transition-all hover:border-white/20 hover:-translate-y-0.5"
                style={{ background: T.elev, border: `1px solid ${T.border}`, minHeight: 128 }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: T.emberFaint }}>
                  <d.icon className="w-4 h-4" style={{ color: T.ember }} />
                </div>
                <p className="text-[15px] font-semibold" style={{ color: T.text, ...heading }}>{d.label}</p>
                <p className="text-[12.5px] mt-1" style={{ color: T.muted, ...body }}>{d.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════════
   5 · INTERACTIVE AI CANVAS
   ═══════════════════════════════════════════════════════════════════ */
const CanvasSection = () => (
  <section className="py-24 md:py-32" style={{ background: T.elev }}>
    <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-12 gap-12 items-center">
      <Reveal className="lg:col-span-5">
        <div className="mb-4"><SectionLabel>Şantiyem AI · Canlı Görünüm</SectionLabel></div>
        <H2>Cevaplar metin değil — canlı görsel.</H2>
        <Sub className="mt-5">
          Her sorunun cevabı Canvas'ta canlanır: tablo, grafik, KPI, timeline, önerilen aksiyon,
          kaynak referansı. Tek bir sorudan, tam bir yönetici raporu.
        </Sub>
        <div className="mt-8 space-y-3">
          {[
            { icon: BarChart3, t: "Grafik & Tablo", d: "Bar, line, pie, KPI cards" },
            { icon: Layers, t: "Kaynak Panel", d: "Hangi veriden geldiği şeffaf" },
            { icon: Zap, t: "Tek tıkla aksiyon", d: "Rapor oluştur, mesaj gönder, aç" },
          ].map((r) => (
            <div key={r.t} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.emberFaint }}>
                <r.icon className="w-4 h-4" style={{ color: T.ember }} />
              </div>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: T.text, ...body }}>{r.t}</p>
                <p className="text-[12.5px]" style={{ color: T.muted, ...body }}>{r.d}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={150} className="lg:col-span-7">
        <AppFrame label="Şantiyem AI · Canlı Görünüm">
          <div className="p-5 space-y-3" style={{ background: T.elev, minHeight: 460 }}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" style={{ color: T.ember }} />
              <span className="text-[10.5px] uppercase tracking-widest font-semibold" style={{ color: T.muted, ...body }}>
                "Son 3 ayın proje kâr dağılımı"
              </span>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { l: "Toplam", v: "₺8.4M" },
                { l: "Ort. Marj", v: "%19" },
                { l: "En Kârlı", v: "Arsuz-2" },
                { l: "Zararlı", v: "0" },
              ].map((k) => (
                <div key={k.l} className="rounded-lg p-2" style={{ background: "#0A0A0A", border: `1px solid ${T.border}` }}>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: T.faint, ...body }}>{k.l}</p>
                  <p className="text-[13px] font-semibold" style={{ color: T.text, ...heading }}>{k.v}</p>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            <div className="rounded-xl p-3" style={{ background: "#0A0A0A", border: `1px solid ${T.border}` }}>
              <div className="flex items-end gap-2 h-32">
                {[
                  { l: "Arsuz-2", v: 92 },
                  { l: "Mersin", v: 68 },
                  { l: "Osmaniye", v: 54 },
                  { l: "Adana-A", v: 78 },
                  { l: "Adana-B", v: 40 },
                  { l: "İskenderun", v: 65 },
                ].map((b, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full rounded-t" style={{ height: `${b.v}%`, background: i === 0 ? `linear-gradient(180deg, ${T.emberGlow}, ${T.ember})` : "rgba(255,255,255,0.14)" }} />
                    <span className="text-[9px]" style={{ color: T.faint, ...body }}>{b.l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Table row */}
            <div className="rounded-xl overflow-hidden" style={{ background: "#0A0A0A", border: `1px solid ${T.border}` }}>
              <div className="grid grid-cols-4 px-3 py-2 text-[10px] uppercase tracking-wider" style={{ color: T.faint, borderBottom: `1px solid ${T.border}`, ...body }}>
                <span>Proje</span><span>Gelir</span><span>Gider</span><span>Marj</span>
              </div>
              {[
                ["Arsuz-2", "₺2.1M", "₺1.6M", "%23"],
                ["Mersin", "₺1.4M", "₺1.1M", "%21"],
                ["Adana-A", "₺1.8M", "₺1.5M", "%17"],
              ].map((row) => (
                <div key={row[0]} className="grid grid-cols-4 px-3 py-2 text-[12px]" style={{ color: T.text, ...body }}>
                  {row.map((c, j) => <span key={j} style={{ color: j === 0 ? T.text : T.muted }}>{c}</span>)}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button className="text-[11px] px-3 py-1.5 rounded-full" style={{ background: T.ember, color: "#fff", ...body }}>PDF Raporu Al</button>
              <button className="text-[11px] px-3 py-1.5 rounded-full" style={{ background: "transparent", color: T.muted, border: `1px solid ${T.border}`, ...body }}>Detayları Aç</button>
            </div>
          </div>
        </AppFrame>
      </Reveal>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════════
   6 · REAL ACTIONS
   ═══════════════════════════════════════════════════════════════════ */
const actions = [
  { icon: Building2, l: "Proje Aç" },
  { icon: CheckCircle2, l: "Görev Oluştur" },
  { icon: FileText, l: "PDF Üret" },
  { icon: MessageSquare, l: "WhatsApp Gönder" },
  { icon: Send, l: "E-posta At" },
  { icon: Receipt, l: "Fatura Kes" },
  { icon: Users, l: "Personele Bildir" },
  { icon: Waves, l: "Ödeme Onayla" },
];

const ActionsSection = () => (
  <section className="py-24 md:py-32" style={{ background: T.bg }}>
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <Reveal className="max-w-3xl mb-16">
        <div className="mb-4"><SectionLabel>Gerçek Aksiyonlar</SectionLabel></div>
        <H2>Konuşmak yetmez — iş yaptırın.</H2>
        <Sub className="mt-5">
          Şantiyem AI sadece cevap vermez; PDF üretir, WhatsApp mesajı gönderir, projeyi açar,
          faturayı keser. Her cevap, tek tıkla eylem.
        </Sub>
      </Reveal>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((a, i) => (
          <Reveal key={a.l} delay={i * 40}>
            <div
              className="p-4 rounded-xl flex items-center gap-3 transition-all hover:border-[#FF6B2B]/40 cursor-pointer"
              style={{ background: T.elev, border: `1px solid ${T.border}` }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: T.emberFaint }}>
                <a.icon className="w-4 h-4" style={{ color: T.ember }} />
              </div>
              <span className="text-[13px] font-medium" style={{ color: T.text, ...body }}>{a.l}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════════
   7 · COMPANY HEALTH ENGINE
   ═══════════════════════════════════════════════════════════════════ */
const HealthEngine = () => {
  const { ref, visible } = useReveal();
  const [score, setScore] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1600);
      const eased = 1 - Math.pow(1 - p, 3);
      setScore(Math.round(87 * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  const circ = 2 * Math.PI * 90;
  const offset = circ - (score / 100) * circ;

  return (
    <section className="py-24 md:py-32" style={{ background: T.elev }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <Reveal className="text-center max-w-3xl mx-auto mb-16">
          <div className="mb-4 flex justify-center"><SectionLabel>Company Health Engine</SectionLabel></div>
          <H2>Firmanız nasıl? Tek bir skorda.</H2>
          <Sub className="mt-5">
            Nakit, projeler, personel, hakediş, risk — 50+ metrik tek bir sağlık skoru olarak
            özetlenir. Ne iyi, ne kötü, nereye odaklanmalı: bir bakışta.
          </Sub>
        </Reveal>

        <div ref={ref} className="grid lg:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
          {/* Circular score */}
          <div className="flex justify-center">
            <div className="relative w-64 h-64">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="90" strokeWidth="10" fill="none" stroke="rgba(255,255,255,0.06)" />
                <circle
                  cx="100" cy="100" r="90" strokeWidth="10" fill="none"
                  stroke={`url(#healthGrad)`} strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={offset}
                  style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.22,1,0.36,1)" }}
                />
                <defs>
                  <linearGradient id="healthGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={T.emberGlow} />
                    <stop offset="100%" stopColor={T.ember} />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[11px] uppercase tracking-widest" style={{ color: T.faint, ...body }}>Sağlık</p>
                <p className="text-7xl font-semibold mt-1" style={{ color: T.text, ...heading }}>{score}</p>
                <p className="text-[12px] mt-1" style={{ color: T.emberGlow, ...body }}>iyi seviye</p>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-4">
            {[
              { l: "Nakit Sağlığı", v: 92, note: "12M nakit, 45 gün run-way" },
              { l: "Proje İlerleme", v: 84, note: "12 aktif proje, 2 gecikme" },
              { l: "Hakediş Döngüsü", v: 78, note: "Ort. tahsilat 32 gün" },
              { l: "Risk Seviyesi", v: 90, note: "Kritik uyarı yok" },
            ].map((r) => (
              <div key={r.l}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[13px] font-medium" style={{ color: T.text, ...body }}>{r.l}</span>
                  <span className="text-[13px] font-semibold" style={{ color: T.emberGlow, ...heading }}>{r.v}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: visible ? `${r.v}%` : "0%",
                      background: `linear-gradient(90deg, ${T.ember}, ${T.emberGlow})`,
                      transition: "width 1.4s cubic-bezier(0.22,1,0.36,1)",
                    }}
                  />
                </div>
                <p className="text-[11.5px] mt-1" style={{ color: T.faint, ...body }}>{r.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   8 · DESIGNED FOR CONSTRUCTION (Device showcase)
   ═══════════════════════════════════════════════════════════════════ */
const DeviceShowcase = () => (
  <section className="py-24 md:py-32 overflow-hidden" style={{ background: T.bg }}>
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <Reveal className="text-center max-w-3xl mx-auto mb-16">
        <div className="mb-4 flex justify-center"><SectionLabel>İnşaat için tasarlandı</SectionLabel></div>
        <H2>Ofiste. Sahada. Yolda.</H2>
        <Sub className="mt-5">
          Şantiye şefi telefondan puantaj alsın, muhasebe tabletten fatura eşleştirsin, yönetici
          masaüstünden rapor okusun. Aynı veri, üç ekran.
        </Sub>
      </Reveal>

      <Reveal delay={150}>
        <div className="relative flex justify-center items-end gap-4 md:gap-8">
          {/* Phone */}
          <div className="w-32 md:w-48 aspect-[9/19] rounded-3xl p-2 shrink-0" style={{ background: "#0F0F0F", border: `1px solid ${T.borderStrong}`, boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }}>
            <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col" style={{ background: T.elev }}>
              <div className="h-6 flex items-center justify-center" style={{ background: "#000" }}>
                <div className="w-16 h-1 rounded-full" style={{ background: "#1F1F1F" }} />
              </div>
              <div className="p-2 space-y-1.5 flex-1">
                <div className="h-6 rounded" style={{ background: T.emberFaint, border: `1px solid ${T.ember}22` }} />
                <div className="h-8 rounded" style={{ background: "#0A0A0A" }} />
                <div className="h-8 rounded" style={{ background: "#0A0A0A" }} />
                <div className="grid grid-cols-2 gap-1">
                  <div className="h-10 rounded" style={{ background: "#0A0A0A" }} />
                  <div className="h-10 rounded" style={{ background: "#0A0A0A" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Laptop */}
          <div className="flex-1 max-w-3xl relative">
            <div className="rounded-t-xl p-2" style={{ background: "#0F0F0F", border: `1px solid ${T.borderStrong}`, boxShadow: "0 40px 100px rgba(0,0,0,0.6)" }}>
              <div className="rounded-lg overflow-hidden" style={{ background: T.elev }}>
                <HeroDashboardMock />
              </div>
            </div>
            <div className="h-3 rounded-b-2xl mx-auto" style={{ width: "108%", background: "#0A0A0A", border: `1px solid ${T.borderStrong}`, marginLeft: "-4%" }} />
          </div>

          {/* Tablet */}
          <div className="hidden md:block w-40 aspect-[3/4] rounded-2xl p-2 shrink-0" style={{ background: "#0F0F0F", border: `1px solid ${T.borderStrong}`, boxShadow: "0 30px 60px rgba(0,0,0,0.5)" }}>
            <div className="w-full h-full rounded-xl overflow-hidden" style={{ background: T.elev }}>
              <div className="p-2 space-y-1.5">
                <div className="h-4 rounded" style={{ background: T.emberFaint }} />
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="h-16 rounded" style={{ background: "#0A0A0A" }} />
                  <div className="h-16 rounded" style={{ background: "#0A0A0A" }} />
                </div>
                <div className="h-24 rounded" style={{ background: "#0A0A0A" }} />
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════════
   9 · WHY COMPANIES CHOOSE
   ═══════════════════════════════════════════════════════════════════ */
const whyCards = [
  { icon: Clock, kpi: 12, suffix: "sa", l: "Haftada kazanılan zaman", d: "Yönetici başına ortalama" },
  { icon: FileText, kpi: 78, suffix: "%", l: "Daha az evrak işi", d: "Otomatik PDF ve eşleştirme" },
  { icon: TrendingUp, kpi: 3, suffix: "x", l: "Daha hızlı karar", d: "AI özetlerle" },
  { icon: ShieldCheck, kpi: 92, suffix: "%", l: "Daha az risk", d: "Erken uyarı sistemi" },
  { icon: Brain, kpi: 24, suffix: "/7", l: "AI yönetici asistan", d: "Uyumaz, unutmaz" },
];

const WhyChoose = () => (
  <section className="py-24 md:py-32" style={{ background: T.elev }}>
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <Reveal className="max-w-3xl mb-16">
        <div className="mb-4"><SectionLabel>Neden Şantiyem AI</SectionLabel></div>
        <H2>Sayılar konuşsun.</H2>
      </Reveal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {whyCards.map((c, i) => (
          <Reveal key={c.l} delay={i * 80}>
            <div
              className="p-6 rounded-2xl h-full transition-all hover:border-[#FF6B2B]/30"
              style={{ background: T.bg, border: `1px solid ${T.border}`, minHeight: 200 }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4" style={{ background: T.emberFaint }}>
                <c.icon className="w-4 h-4" style={{ color: T.ember }} />
              </div>
              <p className="text-3xl font-semibold" style={{ color: T.text, ...heading }}>
                <CountUp to={c.kpi} suffix={c.suffix} />
              </p>
              <p className="text-[13px] font-semibold mt-2" style={{ color: T.text, ...body }}>{c.l}</p>
              <p className="text-[12px] mt-1" style={{ color: T.muted, ...body }}>{c.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════════
   10 · PRICING
   ═══════════════════════════════════════════════════════════════════ */
const plans = [
  {
    name: "Starter", price: "0", period: "",
    d: "Küçük ekipler için başlangıç",
    features: ["1 proje", "3 kullanıcı", "Temel raporlar", "AI: 20 soru/gün"],
    cta: "Ücretsiz Başla", to: "/register", highlight: false,
  },
  {
    name: "Professional", price: "499", period: "/ay",
    d: "Aktif çalışan firmalar için",
    features: ["Sınırsız proje", "10 kullanıcı", "Hakediş & E-Fatura", "Şantiyem AI sınırsız", "Sesli asistan", "PDF raporlar"],
    cta: "14 Gün Ücretsiz Dene", to: "/register", highlight: true,
  },
  {
    name: "Enterprise", price: "Özel", period: "",
    d: "Çok şirketli yapılar için",
    features: ["Sınırsız kullanıcı", "Özel entegrasyon", "SSO / SAML", "Öncelikli destek", "Özel eğitim"],
    cta: "Bize Ulaşın", to: "/iletisim", highlight: false,
  },
];

const PricingV3 = () => (
  <section id="pricing" className="py-24 md:py-32" style={{ background: T.bg }}>
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <Reveal className="text-center max-w-2xl mx-auto mb-16">
        <div className="mb-4 flex justify-center"><SectionLabel>Fiyatlar</SectionLabel></div>
        <H2>Basit. Şeffaf. Ölçeklenir.</H2>
        <Sub className="mt-5">Kredi kartı gerekmez. İstediğiniz zaman iptal.</Sub>
      </Reveal>

      <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {plans.map((p, i) => (
          <Reveal key={p.name} delay={i * 100}>
            <div
              className="rounded-2xl p-7 h-full flex flex-col relative"
              style={{
                background: p.highlight ? `linear-gradient(180deg, ${T.ember}15, transparent)` : T.elev,
                border: p.highlight ? `1px solid ${T.ember}55` : `1px solid ${T.border}`,
                boxShadow: p.highlight ? `0 30px 80px ${T.ember}22` : "none",
              }}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <EmberBadge>Popüler</EmberBadge>
                </div>
              )}
              <p className="text-[13px] font-semibold uppercase tracking-wider" style={{ color: p.highlight ? T.emberGlow : T.muted, ...body }}>{p.name}</p>
              <p className="text-[12.5px] mt-1" style={{ color: T.faint, ...body }}>{p.d}</p>
              <div className="mt-5 mb-6 flex items-baseline gap-1">
                <span className="text-5xl font-semibold" style={{ color: T.text, ...heading }}>{p.price}</span>
                {p.period && <span className="text-[14px]" style={{ color: T.muted, ...body }}>₺{p.period}</span>}
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13px]" style={{ color: T.text, ...body }}>
                    <Check className="w-4 h-4 shrink-0" style={{ color: T.ember }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={p.to}
                className="w-full text-center py-3 rounded-full text-[13.5px] font-semibold transition-all"
                style={
                  p.highlight
                    ? { background: T.ember, color: "#fff", boxShadow: `0 8px 24px ${T.ember}44`, ...body }
                    : { background: "transparent", color: T.text, border: `1px solid ${T.borderStrong}`, ...body }
                }
              >
                {p.cta}
              </Link>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════════
   11 · FAQ
   ═══════════════════════════════════════════════════════════════════ */
const faqs = [
  { q: "Verilerim güvende mi?", a: "Tüm veriler şifreli olarak saklanır ve her firma kendi izole alanında çalışır. Türkiye'de barındırılan sunucular." },
  { q: "AI hangi modelleri kullanıyor?", a: "Şantiyem AI, Google Gemini ve OpenAI'nin son sürüm modellerini kullanır. Cevaplar firmanızın gerçek verisi üzerinden üretilir." },
  { q: "Mevcut Excel dosyalarımı aktarabilir miyim?", a: "Evet. Hakediş, personel, malzeme ve fatura verilerinizi Excel/CSV üzerinden içeri aktarabilirsiniz." },
  { q: "Kaç kullanıcı ekleyebilirim?", a: "Starter'da 3, Professional'da 10, Enterprise'da sınırsız. Ekip üyeleri rol bazlı yetkiyle çalışır." },
  { q: "İptal edebilir miyim?", a: "İstediğiniz an tek tıkla. Kalan dönem sonuna kadar kullanmaya devam edersiniz." },
  { q: "Şantiye ekibim internet olmadan kullanabilir mi?", a: "Puantaj ve şantiye günlüğü offline modda çalışır, bağlantı gelince senkronize olur." },
];

const FAQV3 = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-24 md:py-32" style={{ background: T.elev }}>
      <div className="max-w-3xl mx-auto px-6 lg:px-12">
        <Reveal className="mb-12 text-center">
          <div className="mb-4 flex justify-center"><SectionLabel>SSS</SectionLabel></div>
          <H2>Merak edilenler.</H2>
        </Reveal>
        <div className="space-y-2">
          {faqs.map((f, i) => (
            <Reveal key={i} delay={i * 40}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full text-left rounded-xl overflow-hidden transition-colors"
                style={{ background: T.bg, border: `1px solid ${T.border}` }}
              >
                <div className="flex items-center justify-between p-5">
                  <span className="text-[15px] font-medium" style={{ color: T.text, ...body }}>{f.q}</span>
                  <ChevronDown
                    className="w-4 h-4 shrink-0 transition-transform"
                    style={{ color: T.muted, transform: open === i ? "rotate(180deg)" : "none" }}
                  />
                </div>
                {open === i && (
                  <div className="px-5 pb-5 text-[13.5px] leading-relaxed" style={{ color: T.muted, ...body }}>
                    {f.a}
                  </div>
                )}
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   12 · FINAL CTA
   ═══════════════════════════════════════════════════════════════════ */
const FinalCTA = () => (
  <section className="py-32 md:py-40 relative overflow-hidden" style={{ background: T.bg }}>
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full" style={{ background: `radial-gradient(circle, ${T.ember}22 0%, transparent 60%)`, filter: "blur(100px)" }} />
    </div>
    <div className="relative max-w-4xl mx-auto px-6 lg:px-12 text-center">
      <Reveal>
        <div className="mb-6 flex justify-center"><EmberBadge>Şantiyem AI</EmberBadge></div>
        <h2 className="text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.02] mb-6" style={{ color: T.text, ...heading }}>
          İnşaat firmanızı<br />
          <span style={{ background: `linear-gradient(90deg, ${T.ember}, ${T.emberGlow})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            AI ile yönetmeye hazır mısınız?
          </span>
        </h2>
        <Sub className="max-w-xl mx-auto mb-10">
          14 gün ücretsiz. Kredi kartı gerekmez. 5 dakikada kurulur, ilk günden değer üretir.
        </Sub>
        <div className="flex flex-wrap justify-center gap-3">
          <PrimaryBtn to="/register">Ücretsiz Başla</PrimaryBtn>
          <GhostBtn to="/iletisim">Demo Talep Et</GhostBtn>
        </div>
      </Reveal>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════════════════════
   NAVBAR (v3)
   ═══════════════════════════════════════════════════════════════════ */
const LINKS = [
  { l: "Ürün", h: "#ai-executive" },
  { l: "Departmanlar", h: "#pricing" },
  { l: "Fiyatlar", h: "#pricing" },
  { l: "SSS", h: "#faq" },
];

const NavV3 = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const scrollTo = (h: string) => { setOpen(false); document.querySelector(h)?.scrollIntoView({ behavior: "smooth" }); };
  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 transition-all"
      style={{
        background: scrolled ? "rgba(0,0,0,0.7)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? `1px solid ${T.border}` : "1px solid transparent",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${T.ember}, ${T.emberGlow})` }}>
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[15px] font-semibold text-white" style={heading}>Şantiyem AI</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {LINKS.map((l) => (
            <button key={l.h} onClick={() => scrollTo(l.h)} className="text-[13px] hover:text-white transition-colors" style={{ color: T.muted, ...body }}>{l.l}</button>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-[13px]" style={{ color: T.muted, ...body }}>Giriş</Link>
          <PrimaryBtn to="/register">Ücretsiz Başla</PrimaryBtn>
        </div>
        <button className="md:hidden text-white p-2" onClick={() => setOpen(!open)} aria-label="menu">
          <div className="w-5 flex flex-col gap-1">
            <span className="h-0.5 bg-white transition-all" style={{ transform: open ? "rotate(45deg) translate(3px,3px)" : "none" }} />
            <span className="h-0.5 bg-white transition-all" style={{ opacity: open ? 0 : 1 }} />
            <span className="h-0.5 bg-white transition-all" style={{ transform: open ? "rotate(-45deg) translate(3px,-3px)" : "none" }} />
          </div>
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t px-6 py-5 space-y-4" style={{ background: "rgba(0,0,0,0.95)", borderColor: T.border }}>
          {LINKS.map((l) => (
            <button key={l.h} onClick={() => scrollTo(l.h)} className="block text-[15px]" style={{ color: T.muted, ...body }}>{l.l}</button>
          ))}
          <div className="pt-4 flex flex-col gap-2 border-t" style={{ borderColor: T.border }}>
            <Link to="/login" className="text-center py-2 text-[14px]" style={{ color: T.muted, ...body }}>Giriş</Link>
            <Link to="/register" className="text-center py-3 rounded-full font-semibold text-white" style={{ background: T.ember, ...body }}>Ücretsiz Başla</Link>
          </div>
        </div>
      )}
    </nav>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   FOOTER (v3, compact)
   ═══════════════════════════════════════════════════════════════════ */
const FooterV3 = () => (
  <footer className="py-16 border-t" style={{ background: T.bg, borderColor: T.border }}>
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <div className="grid md:grid-cols-4 gap-10 mb-12">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${T.ember}, ${T.emberGlow})` }}>
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-white" style={heading}>Şantiyem AI</span>
          </div>
          <p className="text-[13px] max-w-sm" style={{ color: T.muted, ...body }}>
            İnşaat firmaları için AI işletim sistemi. Türkiye'de tasarlandı, küresel ölçeğe hazır.
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest mb-3" style={{ color: T.faint, ...body }}>Ürün</p>
          <ul className="space-y-2 text-[13px]" style={body}>
            <li><a href="#ai-executive" style={{ color: T.muted }}>AI Executive</a></li>
            <li><a href="#pricing" style={{ color: T.muted }}>Fiyatlar</a></li>
            <li><a href="#faq" style={{ color: T.muted }}>SSS</a></li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-widest mb-3" style={{ color: T.faint, ...body }}>Firma</p>
          <ul className="space-y-2 text-[13px]" style={body}>
            <li><Link to="/hakkimizda" style={{ color: T.muted }}>Hakkımızda</Link></li>
            <li><Link to="/iletisim" style={{ color: T.muted }}>İletişim</Link></li>
            <li><Link to="/gizlilik-politikasi" style={{ color: T.muted }}>Gizlilik</Link></li>
            <li><Link to="/kullanim-sartlari" style={{ color: T.muted }}>Şartlar</Link></li>
          </ul>
        </div>
      </div>
      <div className="pt-8 border-t flex flex-col md:flex-row justify-between gap-4 text-[12px]" style={{ borderColor: T.border, color: T.faint, ...body }}>
        <p>© {new Date().getFullYear()} Şantiyem AI · Göktaş Global</p>
        <p>Made with <span style={{ color: T.ember }}>▲</span> in İstanbul</p>
      </div>
    </div>
  </footer>
);

/* ═══════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════ */
export default function LandingV3() {
  return (
    <div style={{ background: T.bg, color: T.text, minHeight: "100vh", ...body }}>
      <NavV3 />
      <main>
        <Hero />
        <AIExecutive />
        <VoiceSection />
        <OneAI />
        <CanvasSection />
        <ActionsSection />
        <HealthEngine />
        <DeviceShowcase />
        <WhyChoose />
        <PricingV3 />
        <FAQV3 />
        <FinalCTA />
      </main>
      <FooterV3 />
    </div>
  );
}
