// Sprint 27.1 — Premium Şirket Kurulum Sihirbazı.
// Frontend-only redesign of the dashboard workspace setup card. Reuses the
// existing setup-progress store, completion logic and navigation event —
// only the presentation layer is new.

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, ArrowRight, Sparkles, Building2, Wallet, FolderPlus,
  HardHat, Truck, FileText, Mail, MessageCircle, Bot, Lock, Loader2,
  Clock, PartyPopper, Rocket, ChevronRight,
} from "lucide-react";
import {
  loadSetupProgress, completionPercent, TOTAL_SETUP_STEPS, isSetupComplete,
  type SetupProgress,
} from "@/lib/setupProgress";

type Step = {
  id: number;
  title: string;
  desc: string;
  icon: any;
  eta: string;
};

// IDs are locked by setupProgress.ts (1..9). We keep ids stable and only
// change ordering/labels/visuals to match the sprint spec.
const STEPS: Step[] = [
  { id: 1, title: "Firma Bilgileri",   desc: "Şirket adı, vergi bilgileri ve logo.",         icon: Building2,   eta: "≈ 1 dakika" },
  { id: 6, title: "Finansal Hesaplar", desc: "Kasa, banka ve IBAN tanımları.",               icon: Wallet,      eta: "≈ 2 dakika" },
  { id: 2, title: "İlk Proje",         desc: "İlk projenizi oluşturun.",                     icon: FolderPlus,  eta: "≈ 1 dakika" },
  { id: 3, title: "Personeller",       desc: "Çalışanlarınızı sisteme ekleyin.",             icon: HardHat,     eta: "≈ 2 dakika" },
  { id: 4, title: "Tedarikçiler",      desc: "İlk tedarikçilerinizi tanımlayın.",            icon: Truck,       eta: "≈ 1 dakika" },
  { id: 5, title: "Belgeler",          desc: "Sözleşmeler, ruhsatlar ve dosyalar.",          icon: FileText,    eta: "≈ 2 dakika" },
  { id: 7, title: "E-posta Ayarları",  desc: "Kurumsal bildirim gönderimi.",                 icon: Mail,        eta: "≈ 30 saniye" },
  { id: 8, title: "WhatsApp Business", desc: "Mesajlaşma entegrasyonu.",                     icon: MessageCircle, eta: "≈ 1 dakika" },
  { id: 9, title: "Şantiyem AI",       desc: "Yapay zeka asistanınızı aktifleştirin.",       icon: Bot,         eta: "≈ 30 saniye" },
];

const openSettingsSetup = () => {
  window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "settings" }));
  setTimeout(() => window.dispatchEvent(new CustomEvent("open-workspace-setup")), 50);
};

const openStep = (id: number) => {
  window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "settings" }));
  setTimeout(() => window.dispatchEvent(new CustomEvent("open-workspace-setup", { detail: { step: id } })), 50);
};

const askAI = () => {
  window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "chat" }));
  setTimeout(() =>
    window.dispatchEvent(new CustomEvent("canvas-followup", {
      detail: { text: "Şirket kurulumunda bana rehberlik et — hangi adımdan başlamalıyım?" },
    })),
  150);
};

// ---------- Sub components -------------------------------------------------

const ProgressBar = ({ pct }: { pct: number }) => (
  <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
    <div
      className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
      style={{
        width: `${pct}%`,
        background: "linear-gradient(90deg, #FF6B2B 0%, #FF8A55 50%, #FFB88A 100%)",
        boxShadow: "0 0 20px rgba(255,107,43,0.45)",
      }}
    />
    <div
      className="absolute inset-y-0 left-0 rounded-full opacity-40 animate-pulse"
      style={{
        width: `${pct}%`,
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
      }}
    />
  </div>
);

type Status = "done" | "current" | "pending" | "locked";

const STATUS_META: Record<Status, { label: string; pill: string; ring: string; iconWrap: string }> = {
  done: {
    label: "✔ Tamamlandı",
    pill: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    ring: "border-emerald-500/25 hover:border-emerald-400/50",
    iconWrap: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  current: {
    label: "Devam Ediyor",
    pill: "bg-[#FF6B2B]/15 text-[#FF6B2B] border-[#FF6B2B]/30",
    ring: "border-[#FF6B2B]/40 hover:border-[#FF6B2B]/70 shadow-[0_0_30px_-8px_rgba(255,107,43,0.5)]",
    iconWrap: "bg-[#FF6B2B]/20 text-[#FF6B2B] border-[#FF6B2B]/40",
  },
  pending: {
    label: "Bekliyor",
    pill: "bg-white/5 text-white/50 border-white/10",
    ring: "border-white/10 hover:border-white/25",
    iconWrap: "bg-white/5 text-white/60 border-white/10",
  },
  locked: {
    label: "Henüz Açılmadı",
    pill: "bg-white/[0.02] text-white/30 border-white/5",
    ring: "border-white/5 opacity-60",
    iconWrap: "bg-white/[0.02] text-white/30 border-white/5",
  },
};

const StepCard = ({ step, status, onOpen }: { step: Step; status: Status; onOpen: () => void }) => {
  const meta = STATUS_META[status];
  const Icon = step.icon;
  const disabled = status === "locked";
  return (
    <button
      onClick={disabled ? undefined : onOpen}
      disabled={disabled}
      className={`group relative text-left rounded-2xl border bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-5 transition-all duration-300 ${meta.ring} ${
        disabled ? "cursor-not-allowed" : "hover:-translate-y-0.5 hover:from-white/[0.05] cursor-pointer"
      }`}
    >
      {/* soft glow overlay */}
      {status === "current" && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#FF6B2B]/10 to-transparent pointer-events-none" />
      )}

      <div className="relative flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${meta.iconWrap}`}>
          {status === "done" ? <CheckCircle2 className="w-5 h-5" /> :
           status === "locked" ? <Lock className="w-4 h-4" /> :
           status === "current" ? <Loader2 className="w-5 h-5 animate-spin" /> :
           <Icon className="w-5 h-5" />}
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${meta.pill}`}>{meta.label}</span>
      </div>

      <div className="relative">
        <div className="text-white font-semibold text-[14px] tracking-tight">{step.title}</div>
        <p className="text-[12px] text-white/55 mt-1 leading-relaxed line-clamp-2">{step.desc}</p>
      </div>

      <div className="relative flex items-center justify-between mt-4 pt-3 border-t border-white/5">
        <span className="text-[11px] text-white/40 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {step.eta}
        </span>
        {!disabled && (
          <span className={`text-[11px] flex items-center gap-0.5 transition-colors ${
            status === "done" ? "text-emerald-400" : "text-[#FF6B2B] group-hover:translate-x-0.5"
          } transition-transform`}>
            {status === "done" ? "Görüntüle" : status === "current" ? "Devam et" : "Başlat"}
            <ChevronRight className="w-3 h-3" />
          </span>
        )}
      </div>
    </button>
  );
};

const AICompanionCard = ({ nextTitle, remaining }: { nextTitle?: string; remaining: number }) => (
  <aside className="relative rounded-2xl border border-[#FF6B2B]/25 bg-gradient-to-br from-[#FF6B2B]/12 via-white/[0.02] to-transparent p-5 overflow-hidden">
    {/* decorative gradient blob */}
    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#FF6B2B]/20 blur-3xl pointer-events-none" />

    <div className="relative flex items-center gap-2 mb-3">
      <div className="w-9 h-9 rounded-lg bg-[#FF6B2B]/20 border border-[#FF6B2B]/30 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-[#FF6B2B]" />
      </div>
      <div>
        <div className="text-white font-semibold text-sm">Şantiyem AI Yardımcısı</div>
        <div className="text-[11px] text-white/50">Kurulum boyunca yanınızda</div>
      </div>
    </div>

    <p className="relative text-[13px] text-white/80 leading-relaxed">
      Kurulumu yaklaşık <span className="text-[#FF6B2B] font-medium">4 dakikada</span> tamamlayabilirsiniz.
      {nextTitle ? (
        <> İlk olarak <span className="text-white font-medium">{nextTitle}</span> ile başlamanızı öneriyorum.</>
      ) : (
        <> İlk olarak firma bilgilerinizi eklemenizi öneriyorum.</>
      )}
    </p>

    {remaining > 0 && (
      <div className="relative mt-3 text-[11px] text-white/50">
        Kalan adım · <span className="text-white/80 font-medium">{remaining}</span>
      </div>
    )}

    <div className="relative flex flex-col sm:flex-row gap-2 mt-4">
      <button
        onClick={openSettingsSetup}
        className="flex-1 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-white flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.02]"
        style={{
          background: "linear-gradient(135deg, #FF6B2B, #E55A20)",
          boxShadow: "0 8px 24px -8px rgba(255,107,43,0.5)",
        }}
      >
        <Rocket className="w-3.5 h-3.5" /> Kurulumu Başlat
      </button>
      <button
        onClick={askAI}
        className="flex-1 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center gap-1.5"
      >
        <Sparkles className="w-3.5 h-3.5" /> AI'dan Yardım Al
      </button>
    </div>
  </aside>
);

// ---------- Celebration ----------------------------------------------------

const Confetti = () => {
  const pieces = useMemo(() => Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 1.6 + Math.random() * 1.2,
    color: ["#FF6B2B", "#FFB88A", "#22c55e", "#facc15", "#60a5fa"][i % 5],
    size: 4 + Math.random() * 6,
  })), []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pieces.map(p => (
        <span
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
            animation: `santiyem-confetti ${p.duration}s ease-in ${p.delay}s forwards`,
            transform: "translateY(-20px) rotate(0deg)",
          }}
        />
      ))}
      <style>{`
        @keyframes santiyem-confetti {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(420px) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

const CelebrationCard = ({ onOpenDashboard, onOpenProject }: { onOpenDashboard: () => void; onOpenProject: () => void }) => (
  <section className="relative rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-white/[0.02] to-transparent p-6 lg:p-8 overflow-hidden">
    <Confetti />
    <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
          <PartyPopper className="w-4 h-4" /> Kurulum Tamamlandı
        </div>
        <h3 className="text-white text-2xl md:text-3xl font-semibold tracking-tight mt-2">🎉 Tebrikler!</h3>
        <p className="text-white/70 text-sm mt-1 max-w-xl">
          Şirketiniz başarıyla kuruldu. Artık Şantiyem'in tüm özelliklerini kullanmaya hazırsınız.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
        <button
          onClick={onOpenDashboard}
          className="px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white bg-white/5 border border-white/10 hover:bg-white/10"
        >
          Dashboard'a Git
        </button>
        <button
          onClick={onOpenProject}
          className="px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white flex items-center gap-1.5"
          style={{ background: "linear-gradient(135deg, #FF6B2B, #E55A20)", boxShadow: "0 8px 24px -8px rgba(255,107,43,0.5)" }}
        >
          İlk Projeyi Aç <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </section>
);

// ---------- Main -----------------------------------------------------------

export const WorkspaceSetupCard = () => {
  const [progress, setProgress] = useState<SetupProgress>(() => loadSetupProgress());
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const h = () => setProgress(loadSetupProgress());
    window.addEventListener("setup-progress-changed", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("setup-progress-changed", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  const pct = completionPercent(progress);
  const complete = isSetupComplete();

  // Show celebration once when hitting 100% within this session.
  useEffect(() => {
    if (complete) setShowCelebration(true);
  }, [complete]);

  if (complete && !showCelebration) return null;

  const completedCount = progress.completed.length;
  const remaining = TOTAL_SETUP_STEPS - completedCount;

  // First non-completed step in the display order.
  const nextStep = STEPS.find(s => !progress.completed.includes(s.id));

  if (complete && showCelebration) {
    return (
      <CelebrationCard
        onOpenDashboard={() => setShowCelebration(false)}
        onOpenProject={() => {
          setShowCelebration(false);
          window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "projects" }));
        }}
      />
    );
  }

  return (
    <section className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] via-white/[0.015] to-transparent p-5 lg:p-7 overflow-hidden backdrop-blur-sm">
      {/* decorative glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#FF6B2B]/8 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/40">
            <span>Çalışma Alanı Kurulumu</span>
          </div>
          <h2 className="text-white text-xl lg:text-2xl font-semibold tracking-tight mt-1 flex items-center gap-2">
            <span>🏗</span> Şirket Kurulum Sihirbazı
          </h2>
          <p className="text-white/60 text-[13px] mt-1 max-w-xl leading-relaxed">
            Şirketinizi kullanıma hazırlamak için aşağıdaki adımları tamamlayın.
          </p>
        </div>
        <button
          onClick={() => nextStep ? openStep(nextStep.id) : openSettingsSetup()}
          className="shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white flex items-center gap-2 transition-transform hover:scale-[1.02]"
          style={{
            background: "linear-gradient(135deg, #FF6B2B, #E55A20)",
            boxShadow: "0 10px 30px -10px rgba(255,107,43,0.55)",
          }}
        >
          Kuruluma Devam Et <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Progress meter */}
      <div className="relative mb-7">
        <div className="flex items-end justify-between mb-2">
          <div className="text-white text-3xl font-semibold tracking-tight tabular-nums">
            %{pct}<span className="text-white/40 text-sm font-normal ml-2">Tamamlandı</span>
          </div>
          <div className="text-[11px] text-white/50 flex items-center gap-3">
            <span><span className="text-emerald-400 font-medium">{completedCount}</span> Tamamlandı</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span><span className="text-white font-medium">{remaining}</span> Kalan</span>
          </div>
        </div>
        <ProgressBar pct={pct} />
      </div>

      {/* Grid + AI companion */}
      <div className="relative grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {STEPS.map((step, idx) => {
            const done = progress.completed.includes(step.id);
            const firstPendingIdx = STEPS.findIndex(s => !progress.completed.includes(s.id));
            const status: Status =
              done ? "done"
              : idx === firstPendingIdx ? "current"
              : idx > firstPendingIdx + 5 ? "locked"
              : "pending";
            return (
              <StepCard
                key={step.id}
                step={step}
                status={status}
                onOpen={() => openStep(step.id)}
              />
            );
          })}
        </div>

        <div className="xl:col-span-1">
          <AICompanionCard nextTitle={nextStep?.title} remaining={remaining} />
        </div>
      </div>
    </section>
  );
};

export default WorkspaceSetupCard;
