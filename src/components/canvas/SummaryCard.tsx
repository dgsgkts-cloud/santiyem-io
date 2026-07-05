import { Lightbulb, ArrowRight, Layers } from "lucide-react";
import type { CanvasTurn } from "@/hooks/useCanvasTurns";

// Splits speech into a lead summary + bullet findings. Deterministic, no AI.
const parseFindings = (text: string) => {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bullets: string[] = [];
  const rest: string[] = [];
  for (const line of lines) {
    if (/^[-•*·]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      bullets.push(line.replace(/^[-•*·]\s+/, "").replace(/^\d+[.)]\s+/, ""));
    } else rest.push(line);
  }
  return { summary: rest.join(" ").trim(), bullets };
};

const modulesFromMeta = (turn: CanvasTurn): string[] => {
  const kinds = turn.meta?.sources?.map((s) => (s.kind || s.label || "").toLowerCase()) ?? [];
  const out = new Set<string>();
  for (const k of kinds) {
    if (k.includes("project")) out.add("Projeler");
    else if (k.includes("finance") || k.includes("payment") || k.includes("cash")) out.add("Ödemeler & Kasa");
    else if (k.includes("personnel") || k.includes("worker")) out.add("Personel");
    else if (k.includes("memory")) out.add("Şirket Hafızası");
    else if (k.includes("kb") || k.includes("knowledge") || k.includes("doc")) out.add("Mevzuat");
    else if (k.includes("meeting")) out.add("Toplantılar");
    else if (k.includes("hakedis")) out.add("Hakediş");
  }
  return Array.from(out).slice(0, 4);
};

export const SummaryCard = ({ turn }: { turn: CanvasTurn }) => {
  const { summary, bullets } = parseFindings(turn.speech);
  const modules = modulesFromMeta(turn);
  const nextStep = bullets[0] || "İlgili modülü açarak detaya inebilirsin.";

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4 animate-scale-in">
      {summary && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Özet
          </p>
          <p className="text-[13px] leading-relaxed text-foreground">{summary}</p>
        </div>
      )}
      {bullets.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Öne Çıkanlar
          </p>
          <ul className="space-y-1.5">
            {bullets.slice(0, 6).map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-foreground/85">
                <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-amber-500 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-start gap-2">
        <ArrowRight className="w-4 h-4 mt-0.5 text-primary shrink-0" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-0.5">
            Önerilen Sonraki Adım
          </p>
          <p className="text-[13px] text-foreground/90">{nextStep}</p>
        </div>
      </div>
      {modules.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1">
            <Layers className="w-3 h-3" /> İlgili Modüller
          </p>
          <div className="flex flex-wrap gap-1.5">
            {modules.map((m) => (
              <span
                key={m}
                className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-foreground/80 border border-border/60"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryCard;
