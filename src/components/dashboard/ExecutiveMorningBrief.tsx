// ExecutiveMorningBrief — proactive AI briefing shown as the first thing
// executives see. Pure orchestration: reuses useExecutiveBrief (health,
// findings, insights), ActionCard (recommendations + ActionExecutor
// buttons via actionRegistry), HealthScoreCard, and the AI Canvas store.
//
// No new intelligence, no new prompts. This is a composition layer.
//
// Sprint 14.1 — Executive Morning Brief.

import { useEffect, useMemo, useRef, useState } from "react";
import { Sun, Sunrise, Moon, Volume2, RefreshCw, Sparkles, AlertTriangle, Target, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useExecutiveBrief, type Finding } from "@/hooks/useExecutiveBrief";
import { HealthScoreCard } from "./executive/HealthScoreCard";
import { ActionCard } from "./executive/ActionCard";
import { useUser } from "@/contexts/UserContext";
import { canvasStore } from "@/hooks/useCanvasTurns";
import { Button } from "@/components/ui/button";

interface Props {
  onTabChange: (tab: string) => void;
  onProjectSelect?: (projectId: string) => void;
  voiceEnabled?: boolean;
}

/** Greeting by local time. */
function useGreeting(name?: string) {
  return useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return { icon: Moon, text: "İyi Geceler", name };
    if (h < 12) return { icon: Sunrise, text: "Günaydın", name };
    if (h < 18) return { icon: Sun, text: "İyi Günler", name };
    return { icon: Moon, text: "İyi Akşamlar", name };
  }, [name]);
}

/**
 * Build a short natural-language brief for the AI Canvas / voice narration.
 * Reuses the *already computed* findings/insights — no extra logic.
 */
function buildSpokenBrief(args: {
  greeting: string;
  name?: string;
  score: number;
  priorities: Finding[];
  opportunities: string[];
}): string {
  const { greeting, name, score, priorities, opportunities } = args;
  const parts: string[] = [];
  parts.push(`${greeting}${name ? " " + name : ""}. Şirket sağlık skoru bugün ${score} üzerinden 100.`);
  if (priorities.length === 0) {
    parts.push("Bugün için kritik bir konu görünmüyor, şantiye sakin.");
  } else {
    const top = priorities.slice(0, 3).map((p) => p.title.replace(/\.$/, "")).join("; ");
    parts.push(`Bugünün öncelikleri: ${top}.`);
  }
  if (opportunities.length > 0) {
    parts.push(`Not: ${opportunities.slice(0, 2).join(" ")}`);
  }
  return parts.join(" ");
}

export function ExecutiveMorningBrief({ onTabChange, onProjectSelect, voiceEnabled = true }: Props) {
  const { user } = useUser();
  const firstName = useMemo(() => {
    const n = (user?.user_metadata as { full_name?: string } | undefined)?.full_name?.split(" ")[0];
    return n || "";
  }, [user]);
  const greeting = useGreeting(firstName);
  const { loading, findings, insights, kpis, refresh } = useExecutiveBrief();
  const [expanded, setExpanded] = useState(false);

  // Priorities = top 5 findings, already sorted critical → important → info
  // by useExecutiveBrief. No re-ranking, no re-analysis.
  const priorities = useMemo(() => findings.slice(0, 5), [findings]);
  const risks = useMemo(
    () => findings.filter((f) => f.severity === "critical"),
    [findings],
  );
  // Positive framing lines already produced by useExecutiveBrief.
  const opportunities = useMemo(
    () => insights.filter((s) => /art|azal|sağlıklı|sakin|iyi|verim/i.test(s)),
    [insights],
  );

  // ── Push a summary of the brief into the AI Canvas so the right-hand
  // panel isn't empty on open. Pure hand-off — no assistant call.
  const pushedKeyRef = useRef<string>("");
  useEffect(() => {
    if (loading) return;
    // Refresh key: only re-push when the meaningful shape changes.
    const key = [
      kpis.healthScore,
      priorities.map((p) => p.id).join("|"),
      opportunities.length,
    ].join("::");
    if (pushedKeyRef.current === key) return;
    pushedKeyRef.current = key;

    const raw = JSON.stringify({
      speech: buildSpokenBrief({
        greeting: greeting.text,
        name: firstName,
        score: kpis.healthScore,
        priorities,
        opportunities,
      }),
      ui: [
        {
          type: "kpi_cards",
          title: "Bugünün Özeti",
          cards: [
            { label: "Sağlık Skoru", value: `${kpis.healthScore}/100`, tone: kpis.healthScore >= 80 ? "positive" : kpis.healthScore >= 60 ? "warning" : "danger" },
            { label: "Kritik Risk", value: String(kpis.criticalRisks), tone: kpis.criticalRisks > 0 ? "danger" : "positive" },
            { label: "Bekleyen Ödeme", value: String(kpis.pendingPayments), tone: kpis.pendingPayments > 0 ? "warning" : "neutral" },
            { label: "Bugün Görev", value: String(kpis.tasksDueToday), tone: kpis.tasksDueToday > 0 ? "warning" : "neutral" },
          ],
        },
        ...(priorities.length
          ? [{
              type: "list",
              title: "Bugünün Öncelikleri",
              items: priorities.map((p) => ({
                title: p.title,
                subtitle: p.detail,
                tone: p.severity === "critical" ? "danger" : p.severity === "important" ? "warning" : "neutral",
              })),
            }]
          : []),
      ],
    });

    canvasStore.pushTurn({
      question: `${greeting.text} — Yönetici brifingi`,
      raw,
      source: "chat",
      meta: {
        title: "Sabah Brifingi",
        recordsAnalysed: findings.length + insights.length,
        sources: [
          { label: "Yönetim Özeti", kind: "system" },
          { label: "Şirket Belleği", kind: "system" },
        ],
        followups: [
          "Bugünkü kritik ödemeleri göster",
          "Bu haftanın risklerini özetle",
          "Aktif projelerin ilerlemesini karşılaştır",
        ],
      },
    });
  }, [loading, kpis, priorities, opportunities, insights.length, findings.length, greeting.text, firstName]);

  const narrate = () => {
    const text = buildSpokenBrief({
      greeting: greeting.text,
      name: firstName,
      score: kpis.healthScore,
      priorities,
      opportunities,
    });
    (window as unknown as { __briefingText?: string }).__briefingText = text;
    window.dispatchEvent(new CustomEvent("open-voice-copilot"));
  };

  const GreetingIcon = greeting.icon;
  const scoreTone = kpis.healthScore >= 80 ? "text-emerald-500" : kpis.healthScore >= 60 ? "text-amber-500" : "text-destructive";

  return (
    <section
      className="relative rounded-2xl border border-border/70 bg-gradient-to-br from-primary/[0.04] via-card to-card p-5 sm:p-6 space-y-5 animate-fade-in"
      aria-label="Yönetici sabah brifingi"
    >
      {/* ── Greeting header ───────────────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-primary/80">
            <GreetingIcon className="w-3.5 h-3.5" />
            Yönetici Brifingi
          </div>
          <h2
            className="mt-1.5 text-[22px] sm:text-[26px] font-medium tracking-tight text-foreground leading-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
          >
            {greeting.text}{firstName ? "," : ""}{" "}
            {firstName && <span className="text-muted-foreground/90 font-normal">{firstName}.</span>}
          </h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            {loading
              ? "Şirket verileri analiz ediliyor…"
              : findings.length === 0
                ? "Bugün için işaretlenen kritik bir konu yok. Şantiye sakin."
                : `Bugün ${findings.length} önemli bulgu var; en kritik ${Math.min(priorities.length, 5)} tanesi aşağıda.`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {voiceEnabled && (
            <Button
              size="sm"
              onClick={narrate}
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Volume2 className="w-3.5 h-3.5 mr-1.5" />
              Sesli Dinle
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={refresh}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Brifingi yenile"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      {/* ── Snapshot row: score + counts ─────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <HealthScoreCard score={kpis.healthScore} />
        <SnapshotTile
          icon={AlertTriangle}
          label="Kritik Risk"
          value={kpis.criticalRisks}
          tone={kpis.criticalRisks > 0 ? "danger" : "positive"}
          onClick={() => setExpanded(true)}
        />
        <SnapshotTile
          icon={Target}
          label="Öncelik"
          value={priorities.length}
          tone={priorities.length > 0 ? "warning" : "positive"}
          onClick={() => setExpanded(true)}
        />
        <SnapshotTile
          icon={TrendingUp}
          label="Fırsat"
          value={opportunities.length}
          tone={opportunities.length > 0 ? "positive" : "neutral"}
        />
      </div>

      {/* ── Priorities (top 5) ───────────────────────── */}
      {priorities.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Bugünün Öncelikleri
              </p>
            </div>
            {priorities.length > 2 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                {expanded ? <>Kapat <ChevronUp className="w-3.5 h-3.5" /></> : <>Tümünü Aç <ChevronDown className="w-3.5 h-3.5" /></>}
              </button>
            )}
          </div>
          <div className="space-y-2.5">
            {(expanded ? priorities : priorities.slice(0, 2)).map((f) => (
              <ActionCard
                key={f.id}
                finding={f}
                ctx={{ onTabChange, onProjectSelect }}
              />
            ))}
          </div>
        </div>
      ) : !loading ? (
        <EmptyPositive />
      ) : null}

      {/* ── Opportunities / positive insights ────────── */}
      {opportunities.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Bugünün Fırsatları
            </p>
          </div>
          <ul className="space-y-1.5">
            {opportunities.slice(0, 3).map((o, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[13px] text-foreground/85 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2"
              >
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function SnapshotTile({
  icon: Icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: number | string;
  tone: "positive" | "warning" | "danger" | "neutral";
  onClick?: () => void;
}) {
  const toneCls =
    tone === "danger" ? "text-destructive border-destructive/30" :
    tone === "warning" ? "text-amber-500 border-amber-500/30" :
    tone === "positive" ? "text-emerald-500 border-emerald-500/30" :
    "text-muted-foreground border-border/60";
  const Wrap = (onClick ? "button" : "div") as "button" | "div";
  return (
    <Wrap
      onClick={onClick}
      className={`rounded-2xl border ${toneCls} bg-card p-4 text-left transition-colors ${onClick ? "hover:bg-muted/40" : ""}`}
    >
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide text-muted-foreground">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`mt-1.5 text-[22px] font-semibold tabular-nums ${toneCls.split(" ")[0]}`}>{value}</div>
    </Wrap>
  );
}

function EmptyPositive() {
  return (
    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4 flex items-start gap-3">
      <Sparkles className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
      <div>
        <p className="text-[13.5px] font-medium text-foreground">Bugün her şey yolunda görünüyor.</p>
        <p className="text-[12.5px] text-muted-foreground mt-0.5">
          Kritik risk yok. Yeni fırsatlara odaklanabilir, planlı görevlere devam edebilirsiniz.
        </p>
      </div>
    </div>
  );
}

export default ExecutiveMorningBrief;
