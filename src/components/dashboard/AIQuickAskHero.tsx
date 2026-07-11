// Sprint 30.1 — Dashboard AI Elevation
// Premium full-width hero card that positions Şantiyem AI as the primary
// interaction point of the dashboard. Frontend-only — reuses the existing
// canvas-followup event bus + onSend hook.

import { useState, KeyboardEvent } from "react";
import { Sparkles, ArrowRight, Send } from "lucide-react";

interface Props {
  onSend?: (text: string) => void;
  onTabChange: (tab: string) => void;
  /** Sprint 31 — optional AI-generated headline for the ticker strip. */
  topInsight?: string | null;
}

const QUICK_PROMPTS = [
  "Bugün kaç kişi sahada?",
  "En riskli proje hangisi?",
  "Bu ay en fazla harcamayı neye yaptık?",
  "Önümüzdeki 30 günde nakit açığı oluşur mu?",
  "Hangi taşeron en fazla gecikiyor?",
];

const ask = (text: string, onSend?: (t: string) => void, onTabChange?: (t: string) => void) => {
  const q = text.trim();
  if (!q) return;
  if (onSend) {
    onSend(q);
  } else {
    window.dispatchEvent(new CustomEvent("canvas-followup", { detail: { text: q } }));
    onTabChange?.("chat");
  }
};

export const AIQuickAskHero = ({ onSend, onTabChange, topInsight }: Props) => {
  const [value, setValue] = useState("");

  const submit = () => {
    ask(value, onSend, onTabChange);
    setValue("");
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <section
      className="relative w-full rounded-2xl overflow-hidden border border-[#FF6B2B]/30"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,107,43,0.12) 0%, rgba(255,143,90,0.06) 40%, hsl(var(--card)) 100%)",
      }}
    >
      {/* Subtle ember glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-40"
        style={{ background: "radial-gradient(circle, rgba(255,107,43,0.35), transparent 70%)" }}
      />

      <div className="relative p-5 sm:p-6 lg:p-7">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF6B2B]/20 flex items-center justify-center shrink-0 border border-[#FF6B2B]/30">
            <Sparkles className="w-4 h-4 text-[#FF6B2B]" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                className="text-fs-lg font-semibold tracking-tight text-foreground leading-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
              >
                Şantiyem AI
              </h2>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#FF6B2B] px-1.5 py-0.5 rounded bg-[#FF6B2B]/10 border border-[#FF6B2B]/25">
                Yapı Direktörünüz
              </span>
            </div>
            <p className="text-fs-xs text-muted-foreground mt-0.5">
              Şirketiniz hakkında ne isterseniz sorun — projeler, nakit, personel, riskler.
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch">
          <div className="relative flex-1 min-w-0">
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder="Örn. Bu ay nakit akışım nasıl gidiyor?"
              className="w-full resize-none rounded-xl bg-background/70 border border-border/70 focus:border-[#FF6B2B]/60 focus:ring-2 focus:ring-[#FF6B2B]/20 outline-none px-4 py-3 text-fs-sm text-foreground placeholder:text-muted-foreground/70 transition-all"
              style={{ minHeight: 48 }}
            />
          </div>
          <button
            onClick={submit}
            disabled={!value.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 rounded-xl bg-[#FF6B2B] text-white text-fs-sm font-semibold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-[#FF6B2B]/20 touch-target"
          >
            <Send className="w-4 h-4" />
            Sor
          </button>
        </div>

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-1.5 mt-3.5">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              onClick={() => ask(q, onSend, onTabChange)}
              className="group inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-fs-xs text-foreground/85 bg-background/60 hover:bg-background border border-border/60 hover:border-[#FF6B2B]/40 transition-all"
            >
              <span>{q}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-[#FF6B2B] transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AIQuickAskHero;
