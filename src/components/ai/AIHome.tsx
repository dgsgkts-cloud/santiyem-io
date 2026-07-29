// Sprint 37 — AI Home.
// The landing surface of the AI experience: greeting, daily brief, project
// health, critical issues, recommended actions, recent activity, suggestions.
// Read-only: it consumes data the app already fetches.

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock,
  HardHat,
  History,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AIOrb } from "@/components/ai/AIOrb";
import AIInsightCard from "@/components/ai/AIInsightCard";
import AISmartSuggestions from "@/components/ai/AISmartSuggestions";
import { useExecutiveBrief } from "@/hooks/useExecutiveBrief";
import { useUser } from "@/contexts/UserContext";
import { Skeleton } from "@/components/ui/Skeletons";

const greeting = (d: Date) => {
  const h = d.getHours();
  if (h < 6) return "İyi geceler";
  if (h < 12) return "Günaydın";
  if (h < 18) return "İyi günler";
  return "İyi akşamlar";
};

const fmtTRY = (n: number) => `${Math.round(n).toLocaleString("tr-TR")} ₺`;

const healthTone = (score: number) =>
  score >= 75
    ? { text: "text-success", ring: "hsl(var(--success))", label: "Sağlıklı" }
    : score >= 50
      ? { text: "text-warning", ring: "hsl(var(--warning))", label: "İzlenmeli" }
      : { text: "text-danger", ring: "hsl(var(--danger))", label: "Müdahale gerekli" };

const Metric = ({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  sub?: string;
}) => (
  <div className="rounded-card border border-border/60 bg-background/40 p-3">
    <div className="mb-1 flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
    <p className="text-[18px] font-semibold leading-none text-foreground">{value}</p>
    {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
  </div>
);

const SectionTitle = ({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Wallet;
  title: string;
  desc?: string;
}) => (
  <div className="mb-3">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h2 className="text-[14px] font-semibold text-foreground">{title}</h2>
    </div>
    {desc && <p className="mt-0.5 text-[12px] text-muted-foreground">{desc}</p>}
  </div>
);

interface Props {
  onSend: (text: string) => void;
  /** Titles of the user's recent AI conversations (memory continuity). */
  recentTopics?: string[];
}

const AIHome = ({ onSend, recentTopics = [] }: Props) => {
  const { user } = useUser();
  const { loading, kpis, ops } = useExecutiveBrief();
  const [now] = useState(() => new Date());

  const [recentQuestions, setRecentQuestions] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("canvas_recent_questions");
      setRecentQuestions(raw ? (JSON.parse(raw) as string[]).slice(0, 4) : []);
    } catch {
      setRecentQuestions([]);
    }
  }, []);

  const name = (user?.email?.split("@")[0] ?? "").replace(/[._-]/g, " ");
  const criticalIssues = useMemo(
    () => ops.topRisks.filter((i) => i.priority === "critical" || i.priority === "high").slice(0, 3),
    [ops.topRisks]
  );
  const recommended = useMemo(
    () => [...ops.todayPriorities, ...ops.topOpportunities].slice(0, 3),
    [ops.todayPriorities, ops.topOpportunities]
  );

  const score = kpis?.healthScore ?? 0;
  const tone = healthTone(score);
  const activity = [...recentTopics, ...recentQuestions].filter(Boolean).slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-6 space-y-6 animate-fade-in">
      {/* ── Greeting + Orb ── */}
      <div className="flex items-center gap-4">
        <AIOrb state="idle" size={64} />
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-tight text-foreground">
            {greeting(now)}
            {name ? `, ${name}` : ""}
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {ops.headline ??
              "Şantiyem AI projelerinizi, finansınızı ve sahayı sizin adınıza izliyor."}
          </p>
        </div>
      </div>

      {/* ── Today's AI Brief ── */}
      <section className="rounded-card border border-border/70 bg-card/60 p-5">
        <SectionTitle
          icon={Sparkles}
          title="Bugünün AI Brifingi"
          desc={now.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" })}
        />
        {loading ? (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[72px] rounded-card" />
            ))}
          </div>
        ) : (
          <>
            {/* Project health */}
            <div className="mb-3 flex items-center gap-4 rounded-card border border-border/60 bg-background/40 p-4">
              <div
                className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(${tone.ring} ${score * 3.6}deg, hsl(var(--muted)) 0deg)`,
                }}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-card">
                  <span className={`text-[15px] font-semibold ${tone.text}`}>{score}</span>
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Proje Sağlık Skoru
                </p>
                <p className={`text-[14px] font-semibold ${tone.text}`}>{tone.label}</p>
                <p className="text-[11.5px] text-muted-foreground">
                  {kpis?.activeProjects ?? 0} aktif proje · {kpis?.criticalRisks ?? 0} kritik risk
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <Metric
                icon={Wallet}
                label="Nakit"
                value={fmtTRY(kpis?.cashOnHand ?? 0)}
                sub={`${kpis?.pendingPayments ?? 0} bekleyen ödeme`}
              />
              <Metric
                icon={Clock}
                label="Bugün Vadesi"
                value={fmtTRY(kpis?.paymentsDueTodayAmount ?? 0)}
                sub={`${kpis?.paymentsDueTodayCount ?? 0} kayıt`}
              />
              <Metric
                icon={HardHat}
                label="Sahada"
                value={`${kpis?.activeWorkersToday ?? 0} kişi`}
                sub={`${kpis?.tasksDueToday ?? 0} görev bugün`}
              />
              <Metric
                icon={TrendingUp}
                label="Stok Uyarısı"
                value={`${kpis?.criticalStockItems ?? 0} kalem`}
                sub={`${kpis?.pendingHakedisCount ?? 0} bekleyen hakediş`}
              />
            </div>

            {!!kpis?.todayEvents?.length && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {kpis.todayEvents.slice(0, 4).map((e) => (
                  <span
                    key={e.id}
                    className="rounded-control border border-border/60 bg-background/50 px-2 py-1 text-[11px] text-muted-foreground"
                  >
                    {e.label}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Critical issues ── */}
      {!loading && criticalIssues.length > 0 && (
        <section>
          <SectionTitle
            icon={AlertTriangle}
            title="Kritik Başlıklar"
            desc="AI'ın verilerinizde tespit ettiği, bugün ilgilenmeniz gereken konular"
          />
          <div className="space-y-2">
            {criticalIssues.map((i) => (
              <AIInsightCard key={i.id} insight={i} />
            ))}
          </div>
        </section>
      )}

      {/* ── Recommended actions ── */}
      {!loading && recommended.length > 0 && (
        <section>
          <SectionTitle
            icon={Activity}
            title="Önerilen Aksiyonlar"
            desc="Bugünün önceliklerine göre AI'ın önerdiği adımlar"
          />
          <div className="space-y-2">
            {recommended.map((i) => (
              <AIInsightCard key={i.id} insight={i} />
            ))}
          </div>
        </section>
      )}

      {/* ── Smart suggestions ── */}
      <section>
        <SectionTitle
          icon={Sparkles}
          title="Ne sormak istersiniz?"
          desc="Öneriler güncel proje verilerinize göre değişir"
        />
        <AISmartSuggestions kpis={kpis ?? null} ops={ops} onSelect={onSend} />
      </section>

      {/* ── Recent AI activity ── */}
      {activity.length > 0 && (
        <section>
          <SectionTitle icon={History} title="Son AI Aktiviteleri" />
          <div className="space-y-1.5">
            {activity.map((q) => (
              <button
                key={q}
                onClick={() => onSend(q)}
                className="group flex w-full items-center gap-2 rounded-control border border-border/50 bg-card/40 px-3 py-2 text-left transition-all hover:border-primary/30 hover:bg-card active:scale-[0.99]"
              >
                <History className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground/85">{q}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default AIHome;
