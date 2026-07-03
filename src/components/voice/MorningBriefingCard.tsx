import { useEffect, useState } from "react";
import { Sun, Sparkles, PlayCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Briefing {
  summary: {
    greeting: string;
    health_score: number;
    active_projects: number;
    overdue_tasks: number;
    overdue_payments: number;
    critical_stock: number;
  };
  spoken_text: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/**
 * Proactive morning executive briefing card. Shown once per day per user.
 */
export function MorningBriefingCard() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const key = `briefing_shown_${today}`;
    if (localStorage.getItem(key)) { setDismissed(true); return; }

    (async () => {
      setLoading(true);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const jwt = sess?.session?.access_token;
        if (!jwt) return;
        const res = await fetch(`${SUPABASE_URL}/functions/v1/morning-briefing`, {
          method: "POST",
          headers: { Authorization: `Bearer ${jwt}` },
        });
        if (res.ok) {
          const b = (await res.json()) as Briefing;
          setBriefing(b);
          localStorage.setItem(key, "1");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (dismissed || (!loading && !briefing)) return null;

  const startVoice = () => {
    if (briefing?.spoken_text) {
      // ContextualUpdate before agent turn: pass via query string on window
      (window as unknown as { __briefingText?: string }).__briefingText = briefing.spoken_text;
    }
    window.dispatchEvent(new CustomEvent("open-voice-copilot"));
    setDismissed(true);
  };

  return (
    <div className="voice-card-in rounded-2xl border border-[#FF6B2B]/30 bg-gradient-to-br from-[#FF6B2B]/10 to-transparent p-5 mb-4 relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-white/40 hover:text-white/70"
        aria-label="Kapat"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#FF6B2B] mb-2">
        <Sun className="w-3.5 h-3.5" /> Günlük Brifing
      </div>
      {loading ? (
        <div className="text-white/50 text-sm">Brifing hazırlanıyor…</div>
      ) : briefing ? (
        <>
          <p className="text-white text-base md:text-lg leading-relaxed font-medium">{briefing.spoken_text}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <MiniStat label="Sağlık" value={`${briefing.summary.health_score}`} />
            <MiniStat label="Aktif Proje" value={`${briefing.summary.active_projects}`} />
            {briefing.summary.overdue_payments > 0 && (
              <MiniStat label="Geciken Ödeme" value={`${briefing.summary.overdue_payments}`} tone="warning" />
            )}
            {briefing.summary.critical_stock > 0 && (
              <MiniStat label="Kritik Stok" value={`${briefing.summary.critical_stock}`} tone="danger" />
            )}
            {briefing.summary.overdue_tasks > 0 && (
              <MiniStat label="Vadeli Görev" value={`${briefing.summary.overdue_tasks}`} tone="warning" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button onClick={startVoice} className="bg-[#FF6B2B] hover:bg-[#FF7A3F] text-white">
              <PlayCircle className="w-4 h-4 mr-1.5" /> Sesli Dinle
            </Button>
            <Button variant="ghost" onClick={() => setDismissed(true)} className="text-white/60">
              <Sparkles className="w-4 h-4 mr-1.5" /> Sonra
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "warning" | "danger" }) {
  const cls = tone === "warning" ? "text-amber-400" : tone === "danger" ? "text-red-400" : "text-white";
  return (
    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
      <div className="text-[10px] uppercase tracking-wide text-white/40">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}
