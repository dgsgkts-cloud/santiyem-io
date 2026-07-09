// Sprint M1.4 — AI Procurement Insights (ember accent, tokenised).
import { ChevronRight, Sparkles, TrendingUp, AlertTriangle, Award, Zap } from "lucide-react";

const insights = [
  {
    icon: TrendingUp,
    tone: "text-amber-400",
    text: "Çimento fiyatı son 30 günde %8 arttı — beton alımını bu hafta öne çekin.",
  },
  {
    icon: AlertTriangle,
    tone: "text-red-400",
    text: "Erdemir Çelik tedarikçisinde 2 sipariş gecikti; alternatif için Kardemir teklif verdi.",
  },
  {
    icon: Award,
    tone: "text-emerald-400",
    text: "Kalekim son 5 siparişte %100 zamanında teslim — puanını 92'ye taşıdı.",
  },
  {
    icon: Zap,
    tone: "text-[#FF6B2B]",
    text: "PR-2026-1028 için Cuma öncesi sipariş verilmezse bütçe %6 aşacak.",
  },
];

export const AIInsightsCard = () => (
  <section className="rounded-2xl border border-[#FF6B2B]/25 bg-gradient-to-br from-[#FF6B2B]/10 via-card to-card p-4 sm:p-5">
    <div className="flex items-center justify-between mb-3 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-[#FF6B2B]" />
        </div>
        <div className="min-w-0">
          <div className="text-foreground font-semibold text-fs-sm truncate">
            AI Satın Alma Öngörüleri
          </div>
          <div className="text-muted-foreground text-fs-xs truncate">
            Gerçek zamanlı analiz · şimdi güncellendi
          </div>
        </div>
      </div>
      <button
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent("canvas-followup", {
              detail: { text: "Satın alma modülü için AI özeti hazırla." },
            })
          )
        }
        className="text-fs-xs text-[#FF6B2B] hover:text-[#FF8A55] flex items-center gap-1 shrink-0"
      >
        Detaylı özet <ChevronRight className="w-3 h-3" />
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {insights.map((i, idx) => (
        <div
          key={idx}
          className="flex items-start gap-2 p-2.5 rounded-lg bg-background/40 border border-border"
        >
          <i.icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${i.tone}`} />
          <span className="text-foreground/80 text-fs-xs leading-snug">
            {i.text}
          </span>
        </div>
      ))}
    </div>
  </section>
);

export default AIInsightsCard;
