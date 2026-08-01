// Desktop AI workspace landing surface.
// Calm, focused hierarchy: greeting → primary actions → quick prompts →
// compact daily summary. Read-only: consumes data the app already fetches.

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  FileText,
  HardHat,
  Mic,
  Package,
  Pencil,
  Wallet,
} from "lucide-react";
import { useExecutiveBrief } from "@/hooks/useExecutiveBrief";
import { useDisplayName } from "@/hooks/useDisplayName";

const greeting = (d: Date) => {
  const h = d.getHours();
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
};

const QUICK_PROMPTS = [
  { icon: HardHat, label: "Bugünkü saha durumunu özetle" },
  { icon: BarChart3, label: "Proje ilerlemesini özetle" },
  { icon: ClipboardList, label: "Günlük şantiye raporu üret" },
  { icon: FileText, label: "Yönetici özeti hazırla" },
];

interface Props {
  onSend: (text: string) => void;
}

const DesktopAIWorkspace = ({ onSend }: Props) => {
  const { firstName } = useDisplayName();
  const { loading, kpis } = useExecutiveBrief();
  const [now] = useState(() => new Date());

  const metrics = useMemo(
    () => [
      { icon: AlertTriangle, label: "Kritik konu", value: kpis?.criticalRisks ?? 0 },
      { icon: Wallet, label: "Geciken ödeme", value: kpis?.pendingPayments ?? 0 },
      { icon: Package, label: "Kritik stok", value: kpis?.criticalStockItems ?? 0 },
      { icon: HardHat, label: "Aktif proje", value: kpis?.activeProjects ?? 0 },
    ],
    [kpis],
  );

  const startVoice = () =>
    window.dispatchEvent(
      new CustomEvent("open-voice-copilot", { detail: { autoSpeak: false } }),
    );

  const focusComposer = () => {
    const el = document.querySelector<HTMLTextAreaElement>("main textarea, textarea");
    el?.focus();
  };

  return (
    <div className="mx-auto w-full max-w-[860px] px-8 py-10 xl:px-10">
      {/* 1 — Greeting */}
      <header>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-foreground">
          {greeting(now)}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed text-muted-foreground">
          Projelerinizi, finansınızı ve sahanızı sizin adınıza analiz etmeye hazır.
        </p>
      </header>

      {/* 2 — Primary actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={startVoice}
          className="flex items-center gap-2.5 rounded-[16px] bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:opacity-80"
          style={{ minHeight: 50 }}
        >
          <Mic className="h-[19px] w-[19px]" />
          Sesli Görüşmeyi Başlat
        </button>
        <button
          type="button"
          onClick={focusComposer}
          className="flex items-center gap-2 rounded-[16px] border border-border/70 px-5 text-[15px] font-medium text-muted-foreground transition-colors duration-200 hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ minHeight: 50 }}
        >
          <Pencil className="h-[17px] w-[17px]" />
          Yazarak Sor
        </button>
      </div>

      {/* 3 — Quick prompts */}
      <section className="mt-7">
        <h2 className="text-[16px] font-semibold text-foreground">Ne sormak istersiniz?</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {QUICK_PROMPTS.map(({ icon: Icon, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => onSend(label)}
              className="group flex items-center gap-2.5 rounded-[14px] border border-border/60 px-4 text-left text-[14px] text-foreground/85 transition-colors duration-200 hover:border-primary/40 hover:bg-primary/[0.04] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ minHeight: 52 }}
            >
              <Icon className="h-[17px] w-[17px] shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 4 — Compact daily summary */}
      <section className="mt-7">
        <h2 className="text-[16px] font-semibold text-foreground">Bugünün AI Özeti</h2>
        <div className="mt-3 rounded-[16px] border border-border/60 px-5 py-4">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-8 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
          ) : !kpis ? (
            <p className="text-[13px] text-muted-foreground">
              Bugünün özeti henüz hazır değil.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-4">
              {metrics.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <Icon className="h-[15px] w-[15px] shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] text-muted-foreground">{label}</p>
                    <p className="text-[16px] font-semibold leading-tight text-foreground">
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DesktopAIWorkspace;
