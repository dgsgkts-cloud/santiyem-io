import { Sparkles, ArrowRight, Send } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

/**
 * SPRINT 38B — AI Daily Brief hero.
 * One calm, sentence-based operational summary instead of a wall of numbers.
 * Merges the old AI ask hero + ops brief headline into a single surface.
 * Presentation only — all text is composed by the caller from existing data.
 */

export interface BriefLine {
  id: string;
  text: string;
  tone: "good" | "warn" | "alert" | "info";
}

interface Props {
  greeting: string;
  name?: string | null;
  nameReady: boolean;
  dateLabel: string;
  lines: BriefLine[];
  loading: boolean;
  topAction?: { label: string; onClick: () => void } | null;
  onAsk: (text: string) => void;
}

const QUICK_PROMPTS = [
  "Bugün kaç kişi sahada?",
  "En riskli proje hangisi?",
  "Nakit açığı oluşur mu?",
];

const dotColor = (tone: BriefLine["tone"]) =>
  tone === "alert" ? "#EF4444" : tone === "warn" ? "#F59E0B" : tone === "good" ? "#22C55E" : "hsl(var(--muted-foreground))";

export function DailyBriefHero({
  greeting, name, nameReady, dateLabel, lines, loading, topAction, onAsk,
}: Props) {
  const [value, setValue] = useState("");

  const submit = () => {
    const q = value.trim();
    if (!q) return;
    onAsk(q);
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
      className="relative w-full rounded-card overflow-hidden border border-primary/25"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--primary) / 0.10) 0%, hsl(var(--primary) / 0.04) 45%, hsl(var(--card)) 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 w-64 h-64 rounded-full blur-3xl opacity-40"
        style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.30), transparent 70%)" }}
      />

      <div className="relative p-5">
        {/* Greeting */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h1
              className="ds-heading text-foreground truncate"
              style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
            >
              {greeting}
              {nameReady && name ? `, ${name}` : ""}
            </h1>
            <p className="ds-caption text-muted-foreground mt-0.5">{dateLabel}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 shrink-0 ds-caption font-medium px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3 h-3" />
            AI Brifing
          </span>
        </div>

        {/* Brief lines */}
        <div className="rounded-card border border-border/50 bg-background/50 p-4">
          {loading ? (
            <div className="space-y-2.5" aria-label="Brifing hazırlanıyor">
              <div className="h-3.5 rounded bg-muted/60 animate-pulse w-11/12" />
              <div className="h-3.5 rounded bg-muted/50 animate-pulse w-9/12" />
              <div className="h-3.5 rounded bg-muted/40 animate-pulse w-7/12" />
            </div>
          ) : (
            <ul className="space-y-2">
              {lines.map((l) => (
                <li key={l.id} className="flex items-start gap-2.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0 mt-[7px]"
                    style={{ backgroundColor: dotColor(l.tone) }}
                  />
                  <p className="ds-body text-foreground/90 leading-relaxed">{l.text}</p>
                </li>
              ))}
            </ul>
          )}

          {topAction && !loading && (
            <button
              onClick={topAction.onClick}
              className="mt-3 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-button ds-body font-semibold bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all"
            >
              {topAction.label}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Ask */}
        <div className="flex gap-2 items-stretch mt-3">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            placeholder="Şantiyem AI'ya sorun…"
            aria-label="Şantiyem AI'ya sorun"
            className="flex-1 min-w-0 resize-none rounded-button bg-background/70 border border-border/60 focus:border-primary/50 outline-none px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground/70 transition-colors"
            style={{ minHeight: 44, fontSize: 16 }}
          />
          <button
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Gönder"
            className="w-11 shrink-0 rounded-button bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110 disabled:opacity-40 active:scale-[0.96] transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              onClick={() => onAsk(q)}
              className="ds-caption px-2.5 h-7 rounded-full text-foreground/80 bg-background/60 hover:bg-background border border-border/50 hover:border-primary/40 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default DailyBriefHero;
