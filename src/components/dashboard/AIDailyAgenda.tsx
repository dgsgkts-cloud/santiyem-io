// AIDailyAgenda — Sprint 14.2. Pure orchestration on top of
// useExecutiveBrief (findings) + executiveRecommendations.recommendFor
// (why / impact / actions) + actionRegistry.executeAction. No new
// intelligence, no new reasoning: this is a scheduling/timeline view
// of already-computed findings.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clock, CheckCircle2, Circle, ChevronRight, PlayCircle, Volume2,
  AlertTriangle, AlertCircle, Info, Sparkles,
} from "lucide-react";
import { useExecutiveBrief, type Finding, type Severity } from "@/hooks/useExecutiveBrief";
import { recommendFor } from "@/lib/executiveRecommendations";
import { executeAction, type ActionDef, type ExecuteContext } from "@/lib/actionRegistry";
import { canvasStore } from "@/hooks/useCanvasTurns";
import { Button } from "@/components/ui/button";

interface Props extends ExecuteContext {
  voiceEnabled?: boolean;
}

type Slot = "now" | "next" | "later";
type SlotOrDone = Slot | "done";

// Local-only completion state — never modifies AI reasoning.
const STORAGE_KEY = "ai_daily_agenda_completed_v1";
const dayKey = () => new Date().toISOString().slice(0, 10);

function loadCompleted(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}
function saveCompleted(map: Record<string, string[]>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch { /* noop */ }
}

// Duration heuristic — display-only, no scheduling engine.
function estimateMinutes(f: Finding): number {
  if (f.id.startsWith("project-late-")) return 45;
  if (f.id === "cash-shortfall") return 30;
  if (f.id === "overdue-checks" || f.id === "sub-overdue" || f.id === "hakedis-rejected") return 25;
  if (f.severity === "critical") return 20;
  if (f.severity === "important") return 15;
  return 5;
}

// Why-now — short trigger line. Reuses finding shape only.
function whyNow(f: Finding): string {
  if (f.id === "overdue-checks" || f.id === "sub-overdue") return "Ödeme vadesi geçti.";
  if (f.id === "upcoming-checks" || f.id === "sub-today") return "Ödeme günü bugün / bu hafta.";
  if (f.id === "stock-critical") return "Stok eşiğin altına indi.";
  if (f.id === "tasks-today") return "Bugün teslim tarihi.";
  if (f.id === "tasks-overdue") return "Görev tarihi geçti.";
  if (f.id.startsWith("project-late-")) return "Proje süresi doldu.";
  if (f.id === "hakedis-pending") return "7+ gündür onay bekliyor.";
  if (f.id === "hakedis-rejected") return "Hakediş reddedildi.";
  if (f.id === "cash-shortfall") return "Kasa, yaklaşan ödemeleri karşılamıyor.";
  if (f.id === "expense-spike") return "Aylık gider trendi belirgin arttı.";
  return "Bugün dikkat gerektiriyor.";
}

const sevIcon: Record<Severity, typeof AlertTriangle> = {
  critical: AlertTriangle,
  important: AlertCircle,
  info: Info,
};
const sevTone: Record<Severity, string> = {
  critical: "text-destructive border-destructive/30 bg-destructive/[0.04]",
  important: "text-amber-500 border-amber-500/30 bg-amber-500/[0.04]",
  info: "text-muted-foreground border-border/60 bg-muted/20",
};
const slotLabel: Record<SlotOrDone, string> = {
  now: "Şimdi",
  next: "Sıradaki",
  later: "Sonra",
  done: "Tamamlandı",
};

export function AIDailyAgenda({ onTabChange, onProjectSelect, voiceEnabled = true }: Props) {
  const { loading, findings } = useExecutiveBrief();
  const [completedMap, setCompletedMap] = useState<Record<string, string[]>>(() => loadCompleted());
  const today = dayKey();
  const doneIds = useMemo(() => new Set(completedMap[today] ?? []), [completedMap, today]);

  // Top 5 findings — already sorted by severity in useExecutiveBrief.
  const items = useMemo(() => findings.slice(0, 5), [findings]);

  // Bucket into Now / Next / Later.
  const bucketed = useMemo(() => {
    const buckets: Record<SlotOrDone, Finding[]> = { now: [], next: [], later: [], done: [] };
    items.forEach((f, i) => {
      if (doneIds.has(f.id)) { buckets.done.push(f); return; }
      if (i === 0) buckets.now.push(f);
      else if (i <= 2) buckets.next.push(f);
      else buckets.later.push(f);
    });
    return buckets;
  }, [items, doneIds]);

  const toggleDone = (id: string) => {
    setCompletedMap((prev) => {
      const list = new Set(prev[today] ?? []);
      if (list.has(id)) list.delete(id); else list.add(id);
      const next = { ...prev, [today]: Array.from(list) };
      saveCompleted(next);
      return next;
    });
  };

  // ── Push agenda into AI Canvas (separate section from Morning Brief).
  const pushedKeyRef = useRef<string>("");
  useEffect(() => {
    if (loading) return;
    const key = items.map((f) => `${f.id}:${doneIds.has(f.id) ? 1 : 0}`).join("|");
    if (pushedKeyRef.current === key) return;
    pushedKeyRef.current = key;

    if (items.length === 0) return; // Morning Brief already covers empty state.

    const raw = JSON.stringify({
      speech: buildAgendaSpeech(items, doneIds),
      ui: [
        {
          type: "list",
          title: "Bugünün Ajandası",
          items: items.map((f) => ({
            title: f.title,
            subtitle: `${whyNow(f)} • ${estimateMinutes(f)} dk`,
            tone: f.severity === "critical" ? "danger" : f.severity === "important" ? "warning" : "neutral",
          })),
        },
      ],
    });

    canvasStore.pushTurn({
      question: "Bugünün Ajandası",
      raw,
      source: "chat",
      meta: {
        title: "Bugünün Ajandası",
        recordsAnalysed: items.length,
        sources: [{ label: "Yönetim Özeti", kind: "system" }],
        followups: [
          "Ajandayı sesli oku",
          "İlk maddeyi aç",
          "Sadece kritik olanları göster",
        ],
      },
    });
  }, [loading, items, doneIds]);

  const narrate = () => {
    const text = buildAgendaSpeech(items, doneIds);
    (window as unknown as { __briefingText?: string }).__briefingText = text;
    window.dispatchEvent(new CustomEvent("open-voice-copilot"));
  };

  const totalMinutes = items.filter((f) => !doneIds.has(f.id))
    .reduce((s, f) => s + estimateMinutes(f), 0);

  // ── Empty state ──────────────────────────────────
  if (!loading && items.length === 0) {
    return (
      <section
        className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-5 sm:p-6 animate-fade-in"
        aria-label="Bugünün ajandası"
      >
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-emerald-500 mb-2">
          <Sparkles className="w-3.5 h-3.5" /> Bugünün Ajandası
        </div>
        <p className="text-[16px] text-foreground font-medium">Bugün her şey yolunda görünüyor.</p>
        <p className="text-[13px] text-muted-foreground mt-1">
          Acil bir maddesi olan gün değil. İstersen genel duruma göz at.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onTabChange("dashboard")}
          className="mt-3"
        >
          Yönetim Panelini Aç
          <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 space-y-5 animate-fade-in"
      aria-label="Bugünün ajandası"
    >
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-primary/80">
            <Clock className="w-3.5 h-3.5" /> Bugünün Ajandası
          </div>
          <h3
            className="mt-1.5 text-[18px] sm:text-[20px] font-medium tracking-tight text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.01em" }}
          >
            {loading ? "Ajanda hazırlanıyor…" : `${items.length} madde • yaklaşık ${totalMinutes} dk`}
          </h3>
        </div>
        {voiceEnabled && items.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={narrate}
            className="text-muted-foreground hover:text-foreground"
          >
            <Volume2 className="w-3.5 h-3.5 mr-1.5" /> Sesli Oku
          </Button>
        )}
      </header>

      {/* Timeline */}
      <ol className="relative border-l border-border/60 pl-5 space-y-4">
        {(["now", "next", "later", "done"] as SlotOrDone[]).map((slot) => {
          const list = bucketed[slot];
          if (list.length === 0) return null;
          return (
            <li key={slot} className="space-y-3">
              <div className="absolute -left-[7px] mt-1.5">
                <div
                  className={`w-3 h-3 rounded-full ${
                    slot === "now" ? "bg-primary ring-4 ring-primary/20" :
                    slot === "done" ? "bg-emerald-500" :
                    "bg-muted-foreground/40"
                  }`}
                />
              </div>
              <p className="text-[10.5px] uppercase tracking-widest text-muted-foreground">
                {slotLabel[slot]}
              </p>
              <div className="space-y-2.5">
                {list.map((f) => (
                  <AgendaItem
                    key={f.id}
                    finding={f}
                    completed={slot === "done"}
                    isNow={slot === "now"}
                    onToggleDone={() => toggleDone(f.id)}
                    ctx={{ onTabChange, onProjectSelect }}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function buildAgendaSpeech(items: Finding[], done: Set<string>): string {
  const pending = items.filter((f) => !done.has(f.id));
  if (pending.length === 0) return "Bugünün ajandasındaki tüm maddeleri tamamladın. Tebrikler.";
  const first = pending[0];
  const lead = `Bugünün ajandasında ${pending.length} madde var. İlk madde: ${first.title}. Sebep: ${whyNow(first)} Tahmini süre ${estimateMinutes(first)} dakika.`;
  const rest = pending.slice(1, 3).map((f) => `Ardından: ${f.title}, yaklaşık ${estimateMinutes(f)} dakika.`).join(" ");
  return `${lead} ${rest}`.trim();
}

function AgendaItem({
  finding,
  completed,
  isNow,
  onToggleDone,
  ctx,
}: {
  finding: Finding;
  completed: boolean;
  isNow: boolean;
  onToggleDone: () => void;
  ctx: ExecuteContext;
}) {
  const rec = recommendFor(finding); // reused — no new logic
  const SevIcon = sevIcon[finding.severity];
  const [busyId, setBusyId] = useState<string | null>(null);
  const primary = rec.actions.find((a) => a.variant === "primary") ?? rec.actions[0];
  const secondary = rec.actions.filter((a) => a !== primary).slice(0, 2);

  const mins = estimateMinutes(finding);
  const why = whyNow(finding);

  const run = async (a: ActionDef) => {
    setBusyId(a.id);
    await executeAction(a, ctx);
    setBusyId(null);
  };

  return (
    <article
      className={`rounded-xl border p-3.5 sm:p-4 transition-opacity ${
        completed ? "opacity-55 bg-muted/30 border-border/50" :
        isNow ? "border-primary/30 bg-primary/[0.03] shadow-[0_1px_0_hsl(var(--primary)/0.15)_inset]" :
        "border-border/60 bg-background/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggleDone}
          aria-label={completed ? "Tamamlanmadı olarak işaretle" : "Tamamlandı olarak işaretle"}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          {completed
            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            : <Circle className="w-5 h-5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <SevIcon className={`w-3.5 h-3.5 shrink-0 ${sevTone[finding.severity].split(" ")[0]}`} />
            <h4 className={`text-[13.5px] font-medium leading-snug ${completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {finding.title}
            </h4>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] ${sevTone[finding.severity]}`}>
              {finding.severity === "critical" ? "Kritik" : finding.severity === "important" ? "Yüksek" : "Bilgi"}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3" /> {mins} dk
            </span>
          </div>

          {!completed && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[12px]">
              <p className="text-muted-foreground">
                <span className="text-foreground/80 font-medium">Neden şimdi: </span>{why}
              </p>
              <p className="text-muted-foreground">
                <span className="text-foreground/80 font-medium">Etki: </span>{rec.impact}
              </p>
            </div>
          )}

          {!completed && (
            <p className="mt-1.5 text-[12px] text-foreground/85">
              <span className="text-muted-foreground">Öneri: </span>{rec.recommendation}
            </p>
          )}

          {!completed && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {primary && (
                <button
                  onClick={() => run(primary)}
                  disabled={busyId === primary.id}
                  className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 transition-colors disabled:opacity-60"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  {busyId === primary.id ? "…" : primary.label}
                </button>
              )}
              {secondary.map((a) => (
                <button
                  key={a.id}
                  onClick={() => run(a)}
                  disabled={busyId === a.id}
                  className="text-[12px] px-2.5 py-1.5 rounded-md border border-border text-foreground/80 hover:bg-muted transition-colors disabled:opacity-60"
                >
                  {busyId === a.id ? "…" : a.label}
                </button>
              ))}
              <button
                onClick={onToggleDone}
                className="text-[12px] px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground ml-auto"
              >
                Tamamlandı
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default AIDailyAgenda;
