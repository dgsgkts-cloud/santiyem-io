import { useMemo, useState, useEffect, useCallback } from "react";
import { MorningBriefingCard } from "@/components/voice/MorningBriefingCard";
import { ExecutiveBrief } from "@/components/dashboard/executive/ExecutiveBrief";
import {
  useUser,
  canAccessProjects,
  canAccessHakedis,
  canAccessProfitability,
  canAccessReminders,
} from "@/contexts/UserContext";
import {
  FolderOpen,
  Clock,
  TrendingUp,
  AlertTriangle,
  Wallet,
  MessageSquare,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  CalendarClock,
  Lock,
  FileSignature,
  BarChart3,
  Banknote,
  Building2,
  FileText,
  Sparkles,
  Plus,
  Receipt,
  BookOpen,
  ArrowUpRight,
  CheckCircle2,
  Sun,
  Moon,
  Coffee,
} from "lucide-react";
import { useContracts } from "@/hooks/useContracts";
import { useProjects } from "@/hooks/useProjects";
import { useReminders } from "@/hooks/useReminders";
import { useAutoReminders } from "@/hooks/useAutoReminders";
import { useCashAccounts } from "@/hooks/useCashAccounts";
import { useCashChecks } from "@/hooks/useCashChecks";
import { supabase } from "@/integrations/supabase/client";
import UpgradeModal from "@/components/UpgradeModal";
import TrialBanner from "@/components/TrialBanner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import MetricTooltip from "@/components/MetricTooltip";
import {
  formatCurrencyShort as formatCurrency,
  formatCurrencyFull,
  formatPercent,
  formatPercentFull,
} from "@/lib/formatCurrency";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import EmptyState from "./EmptyState";

interface DesktopDashboardProps {
  onTabChange: (tab: string) => void;
  onSend?: (text: string) => void;
  onProjectSelect?: (projectId: string) => void;
}

const MONTHS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const DAYS_TR = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

const formatDate = (d: Date) =>
  `${DAYS_TR[d.getDay()]}, ${d.getDate()} ${MONTHS_TR[d.getMonth()]}`;

const getDaysDiff = (dateStr: string) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 6) return { text: "İyi geceler", Icon: Moon };
  if (h < 12) return { text: "Günaydın", Icon: Sun };
  if (h < 18) return { text: "İyi günler", Icon: Sun };
  return { text: "İyi akşamlar", Icon: Coffee };
};

/* -------------------------------------------------------------------------- */
/*                                    Card                                    */
/* -------------------------------------------------------------------------- */

const Card = ({
  children,
  className = "",
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) => (
  <div
    className={`relative rounded-2xl bg-card/70 border border-border/60 backdrop-blur-sm transition-colors ${
      padded ? "p-5" : ""
    } ${className}`}
  >
    {children}
  </div>
);

const SectionHeader = ({
  icon: Icon,
  title,
  action,
  onAction,
}: {
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  action?: string;
  onAction?: () => void;
}) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2 min-w-0">
      {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground/80" />}
      <h3 className="text-[13px] font-semibold text-foreground tracking-tight truncate">
        {title}
      </h3>
    </div>
    {action && (
      <button
        onClick={onAction}
        className="flex items-center gap-0.5 text-[11.5px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {action}
        <ChevronRight className="w-3 h-3" />
      </button>
    )}
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                  Skeleton                                  */
/* -------------------------------------------------------------------------- */

const Skeleton = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => (
  <div
    className={`animate-pulse rounded-md bg-gradient-to-r from-muted/40 via-muted/70 to-muted/40 bg-[length:200%_100%] ${className}`}
    style={{ animation: "shimmer 1.6s ease-in-out infinite", ...style }}
  />
);

/* -------------------------------------------------------------------------- */
/*                                Dashboard                                   */
/* -------------------------------------------------------------------------- */

const DesktopDashboard = ({ onTabChange, onSend, onProjectSelect }: DesktopDashboardProps) => {
  const { profile, user, plan, role } = useUser();
  const { projects } = useProjects();
  const { reminders } = useReminders();
  const autoReminders = useAutoReminders();
  const { contracts } = useContracts();
  const { accounts } = useCashAccounts();
  const { checks } = useCashChecks();

  const [totalHakedis, setTotalHakedis] = useState(0);
  const [pendingHakedis, setPendingHakedis] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [prevMonthRevenue, setPrevMonthRevenue] = useState(0);
  const [prevMonthExpense, setPrevMonthExpense] = useState(0);
  const [chartData, setChartData] = useState<{ month: string; ciro: number; gider: number }[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueTotal, setOverdueTotal] = useState(0);
  const [financeLoaded, setFinanceLoaded] = useState(false);
  const [expenseLoaded, setExpenseLoaded] = useState(false);

  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    feature: string;
    requiresOffice: boolean;
  }>({ open: false, feature: "", requiresOffice: false });

  const openUpgrade = useCallback(
    (feature: string, requiresOffice: boolean) =>
      setUpgradeModal({ open: true, feature, requiresOffice }),
    []
  );

  const name = profile?.full_name?.split(" ")[0] || "Mühendis";
  const greeting = getGreeting();
  const profitLocked = !canAccessProfitability(plan, role);

  /* --------------------------- Data loading (unchanged) --------------------------- */

  const monthKeys = useMemo(() => {
    const keys: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return keys;
  }, []);

  const MONTH_LABELS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

  useEffect(() => {
    if (!user) return;
    supabase.from("project_hakedis").select("*").then(({ data }) => {
      if (!data) {
        setFinanceLoaded(true);
        return;
      }
      setTotalHakedis(data.reduce((s, h) => s + Number(h.net), 0));
      setPendingHakedis(
        data.filter((h) => h.status === "Bekliyor").reduce((s, h) => s + Number(h.net), 0)
      );
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const rev = data
        .filter((h) => h.status === "Ödendi" && h.payment_date && (h.payment_date as string).startsWith(ym))
        .reduce((s, h) => s + Number(h.net), 0);
      setMonthRevenue(rev);

      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const pym = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
      const prevRev = data
        .filter((h) => h.status === "Ödendi" && h.payment_date && (h.payment_date as string).startsWith(pym))
        .reduce((s, h) => s + Number(h.net), 0);
      setPrevMonthRevenue(prevRev);

      const nowMs = Date.now();
      const overdueItems = data.filter((h) => {
        if (h.status === "Ödendi" || h.status === "Taslak" || h.status === "Reddedildi") return false;
        if (h.expected_payment_date) return nowMs > new Date(h.expected_payment_date).getTime();
        return nowMs - new Date(h.created_at).getTime() > 30 * 24 * 60 * 60 * 1000;
      });
      setOverdueCount(overdueItems.length);
      setOverdueTotal(overdueItems.reduce((s, h) => s + Number(h.net), 0));

      const revenueByMonth: Record<string, number> = {};
      monthKeys.forEach((k) => (revenueByMonth[k] = 0));
      data
        .filter((h) => h.status === "Ödendi" && h.payment_date)
        .forEach((h) => {
          const key = (h.payment_date as string).slice(0, 7);
          if (revenueByMonth[key] !== undefined) revenueByMonth[key] += Number(h.net);
        });

      const sixMonthsAgo = `${monthKeys[0]}-01`;
      supabase
        .from("project_expenses")
        .select("amount,expense_date")
        .gte("expense_date", sixMonthsAgo)
        .then(({ data: expData }) => {
          const expenseByMonth: Record<string, number> = {};
          monthKeys.forEach((k) => (expenseByMonth[k] = 0));
          (expData || []).forEach((e) => {
            const key = (e.expense_date as string).slice(0, 7);
            if (expenseByMonth[key] !== undefined) expenseByMonth[key] += Number(e.amount);
          });
          setChartData(
            monthKeys.map((k) => {
              const monthIdx = parseInt(k.split("-")[1]) - 1;
              return {
                month: MONTH_LABELS[monthIdx],
                ciro: revenueByMonth[k],
                gider: expenseByMonth[k],
              };
            })
          );
          setFinanceLoaded(true);
        });
    });
  }, [user, monthKeys]);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfPrevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-01`;
    supabase
      .from("project_expenses")
      .select("amount,expense_date")
      .gte("expense_date", startOfPrevMonth)
      .then(({ data }) => {
        if (data) {
          setMonthExpense(
            data.filter((e) => e.expense_date >= startOfMonth).reduce((s, e) => s + Number(e.amount), 0)
          );
          setPrevMonthExpense(
            data
              .filter((e) => e.expense_date >= startOfPrevMonth && e.expense_date < startOfMonth)
              .reduce((s, e) => s + Number(e.amount), 0)
          );
        }
        setExpenseLoaded(true);
      });
  }, [user]);

  /* ------------------------------ Computed stats ------------------------------ */

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "Devam Ediyor").length;
  const delayedReminders = reminders.filter((r) => {
    if (r.done) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rd = new Date(r.reminder_date);
    rd.setHours(0, 0, 0, 0);
    return rd < today;
  }).length;

  const upcomingThisWeek = reminders.filter((r) => {
    if (r.done) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rd = new Date(r.reminder_date);
    rd.setHours(0, 0, 0, 0);
    const diff = (rd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).length;

  const projectsLocked = !canAccessProjects(plan, role);
  const hakedisLocked = !canAccessHakedis(plan, role);
  const remindersLocked = !canAccessReminders(plan);
  const loaded = financeLoaded && expenseLoaded;

  const statCards = [
    { label: "Toplam Proje", value: String(totalProjects), icon: FolderOpen, locked: projectsLocked, tone: "muted", tooltip: "Sistemdeki tüm projeleriniz" },
    { label: "Devam Eden", value: String(activeProjects), icon: Clock, locked: projectsLocked, tone: "muted", tooltip: "Şu an aktif projeler" },
    { label: "Hakediş Toplam", value: formatCurrency(totalHakedis), icon: TrendingUp, locked: hakedisLocked, tone: "muted", tooltip: "Tüm hakedişlerin net toplamı" },
    { label: "Geciken", value: String(delayedReminders), icon: AlertTriangle, locked: remindersLocked, tone: delayedReminders > 0 ? "alert" : "muted", tooltip: "Vadesi geçmiş hatırlatıcılar" },
  ];

  const displayProjects = projects.slice(0, 5).map((p) => ({
    id: p.id,
    name: p.name,
    client: p.client,
    progress: p.progress,
    status: p.status,
    statusColor: p.status_color,
  }));

  const recentReminders = [...reminders]
    .sort((a, b) => new Date(b.reminder_date).getTime() - new Date(a.reminder_date).getTime())
    .slice(0, 5);

  /* ------------------------------- AI Insights ------------------------------- */

  const insights = useMemo(() => {
    const items: { text: string; tone: "good" | "warn" | "info"; actionLabel?: string; onAction?: () => void }[] = [];

    if (overdueTotal > 0) {
      items.push({
        tone: "warn",
        text: `${formatCurrency(overdueTotal)} tutarında ${overdueCount} adet gecikmiş tahsilat var — nakit akışını etkiliyor.`,
        actionLabel: "Hakedişleri aç",
        onAction: () => onTabChange("hakedis"),
      });
    }

    if (monthRevenue > 0 && prevMonthRevenue > 0) {
      const diffPct = ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100;
      if (Math.abs(diffPct) >= 10) {
        items.push({
          tone: diffPct > 0 ? "good" : "warn",
          text: diffPct > 0
            ? `Bu ay ciro geçen aya göre %${diffPct.toFixed(0)} arttı.`
            : `Bu ay ciro geçen aya göre %${Math.abs(diffPct).toFixed(0)} düştü.`,
        });
      }
    }

    const now = Date.now();
    const upcomingChecks = checks.filter((c) => {
      const d = (new Date(c.due_date).getTime() - now) / (1000 * 60 * 60 * 24);
      return d >= 0 && d <= 7 && c.status !== "odendi" && c.status !== "tahsil_edildi";
    }).length;
    if (upcomingChecks > 0) {
      items.push({
        tone: "warn",
        text: `Önümüzdeki 7 gün içinde vadesi gelen ${upcomingChecks} çek var.`,
        actionLabel: "Kasa",
        onAction: () => onTabChange("payments-kasa"),
      });
    }

    if (delayedReminders > 0) {
      items.push({
        tone: "warn",
        text: `${delayedReminders} adet geciken hatırlatıcı bekliyor.`,
        actionLabel: "Aç",
        onAction: () => onTabChange("reminders"),
      });
    }

    if (autoReminders.length > 0 && items.length < 3) {
      items.push({
        tone: "info",
        text: `${autoReminders.length} adet bekleyen otomatik işlem tespit edildi.`,
        actionLabel: "İncele",
        onAction: () => onTabChange("reminders"),
      });
    }

    if (items.length === 0) {
      items.push({
        tone: "good",
        text: loaded
          ? "Şu an için kritik uyarı yok. Şantiye sakin görünüyor."
          : "Veriler analiz ediliyor…",
      });
    }

    return items.slice(0, 3);
  }, [overdueTotal, overdueCount, monthRevenue, prevMonthRevenue, checks, delayedReminders, autoReminders.length, loaded, onTabChange]);

  const suggestedQuestions = [
    "Hangi projede maliyet sapması var?",
    "Bu ay en geciken hakedişim hangisi?",
    "Şantiye verimliliğim geçen haftaya göre nasıl?",
  ];

  /* ------------------------------ Quick actions ------------------------------ */

  const quickActions = [
    { label: "Ödeme Ekle", icon: Wallet, onClick: () => onTabChange("payments-kasa") },
    { label: "Hakediş Oluştur", icon: Receipt, onClick: () => onTabChange("hakedis"), locked: hakedisLocked },
    { label: "Şantiye Günlüğü", icon: BookOpen, onClick: () => onTabChange("site-diary") },
    { label: "AI'ya Sor", icon: Sparkles, onClick: () => onTabChange("chat"), primary: true },
  ];

  /* ---------------------------------- Render ---------------------------------- */

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-[1120px] mx-auto space-y-8">
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>

      <TrialBanner />

      <MorningBriefingCard />



      {/* ─────────────────────────  GREETING  ───────────────────────── */}
      <header className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-muted-foreground/80 mb-2">
              <greeting.Icon className="w-3.5 h-3.5" />
              <span className="text-[12px] tracking-wide uppercase">{formatDate(new Date())}</span>
            </div>
            <h1
              className="text-[26px] lg:text-[32px] font-medium tracking-tight text-foreground leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
            >
              {greeting.text},{" "}
              <span className="text-muted-foreground/90 font-normal">{name}.</span>
            </h1>
            <p className="text-[13.5px] text-muted-foreground mt-1.5">
              Şantiyende bugün ne oluyor bir bakalım.
            </p>
          </div>

          {/* Compact mini stats — right aligned */}
          <div className="hidden md:grid grid-cols-4 gap-x-8 gap-y-1 shrink-0">
            <MiniStat label="Aktif" value={projectsLocked ? "—" : String(activeProjects)} />
            <MiniStat label="Bu Hafta" value={remindersLocked ? "—" : String(upcomingThisWeek)} />
            <MiniStat label="Bekleyen" value={hakedisLocked ? "—" : formatCurrency(pendingHakedis)} />
            <MiniStat label="Geciken" value={remindersLocked ? "—" : String(delayedReminders)} accent={delayedReminders > 0} />
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={a.onClick}
                disabled={a.locked}
                className={`group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] font-medium border transition-all ${
                  a.primary
                    ? "bg-[#FF6B2B] border-[#FF6B2B] text-white hover:brightness-110 shadow-sm shadow-[#FF6B2B]/20"
                    : "bg-card/60 border-border/60 text-foreground hover:border-border hover:bg-card"
                } ${a.locked ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {a.label}
                {!a.primary && (
                  <Plus className="w-3 h-3 opacity-0 group-hover:opacity-60 -ml-1 transition-opacity" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ─────────────────────────  AI INSIGHTS  ───────────────────────── */}
      <Card className="overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-px opacity-70"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,107,43,0.4), rgba(129,140,248,0.4), transparent)",
          }}
        />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-[#FF6B2B]/10 border border-[#FF6B2B]/20">
              <Sparkles className="w-3 h-3 text-[#FF6B2B]" />
            </div>
            <h3 className="text-[13px] font-semibold tracking-tight text-foreground">AI İçgörüsü</h3>
            <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70 border border-border/50 rounded px-1.5 py-0.5">
              beta
            </span>
          </div>
          <button
            onClick={() => onTabChange("chat")}
            className="flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Asistanı aç <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2.5 mb-5">
          {!loaded
            ? [0, 1].map((i) => <Skeleton key={i} className="h-4 w-full max-w-lg" />)
            : insights.map((ins, i) => {
                const dot =
                  ins.tone === "warn" ? "#F59E0B" : ins.tone === "good" ? "#22C55E" : "#818CF8";
                return (
                  <div key={i} className="flex items-start gap-3 group">
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-[9px] shrink-0"
                      style={{ backgroundColor: dot }}
                    />
                    <p className="text-[13px] leading-relaxed text-foreground/90 flex-1">
                      {ins.text}
                      {ins.onAction && (
                        <button
                          onClick={ins.onAction}
                          className="ml-2 text-[12px] font-medium text-[#FF6B2B] hover:underline"
                        >
                          {ins.actionLabel} →
                        </button>
                      )}
                    </p>
                  </div>
                );
              })}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-4 border-t border-border/50">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => {
                onTabChange("chat");
                onSend?.(q);
              }}
              className="text-[11.5px] px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent hover:border-border/60 transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      </Card>

      {/* ─────────────────────────  STAT CARDS  ───────────────────────── */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Tooltip key={stat.label} delayDuration={200}>
                <TooltipTrigger asChild>
                  <div className="relative rounded-xl bg-card/60 border border-border/50 p-4 hover:border-border transition-colors overflow-hidden">
                    {stat.locked && (
                      <LockedOverlay
                        label="Kurumsal Paket"
                        onClick={() => openUpgrade(stat.label, true)}
                      />
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/80 truncate">
                        {stat.label}
                      </span>
                      <Icon
                        className="w-3.5 h-3.5 shrink-0"
                        style={{
                          color: stat.tone === "alert" ? "#EF4444" : "hsl(var(--muted-foreground))",
                        }}
                      />
                    </div>
                    {!loaded && !stat.locked ? (
                      <Skeleton className="h-6 w-20" />
                    ) : (
                      <p
                        className="text-[22px] font-semibold tracking-tight tabular-nums"
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          letterSpacing: "-0.02em",
                          color: stat.tone === "alert" ? "#EF4444" : "hsl(var(--foreground))",
                        }}
                      >
                        {stat.locked ? "—" : stat.value}
                      </p>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {stat.tooltip}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────  FINANCIAL SUMMARY  ───────────────────────── */}
      <Card>
        {profitLocked && (
          <LockedOverlay label="Profesyonel Paket" onClick={() => openUpgrade("Finansal Özet", false)} />
        )}
        <SectionHeader
          icon={Wallet}
          title="Finansal Özet — Bu Ay"
          action="Detay"
          onAction={() => onTabChange("payments-kasa")}
        />
        <div className="grid grid-cols-3 gap-3">
          {(() => {
            const calcChange = (curr: number, prev: number) => {
              if (prev === 0) return curr > 0 ? 100 : 0;
              return Math.round(((curr - prev) / prev) * 100);
            };
            const revenueChange = calcChange(monthRevenue, prevMonthRevenue);
            const expenseChange = calcChange(monthExpense, prevMonthExpense);
            const netProfit = monthRevenue - monthExpense;
            const prevNetProfit = prevMonthRevenue - prevMonthExpense;
            const profitChange = calcChange(netProfit, prevNetProfit);

            const items = [
              { label: "Ciro", value: monthRevenue, color: "#22C55E", change: revenueChange },
              { label: "Gider", value: monthExpense, color: "#EF4444", change: expenseChange },
              { label: "Net Kâr", value: netProfit, color: "#FF6B2B", change: profitChange },
            ];

            return items.map((item) => {
              const isUp = item.change >= 0;
              const changeColor =
                item.label === "Gider" ? (isUp ? "#EF4444" : "#22C55E") : isUp ? "#22C55E" : "#EF4444";
              return (
                <div key={item.label} className="rounded-xl p-4 bg-background/50 border border-border/50 min-w-0">
                  <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/80 mb-2">
                    {item.label}
                  </p>
                  {!loaded ? (
                    <Skeleton className="h-6 w-24" />
                  ) : (
                    <>
                      <MetricTooltip full={formatCurrencyFull(item.value)}>
                        <p
                          className="text-[20px] font-semibold truncate cursor-help tabular-nums"
                          style={{
                            color: item.color,
                            fontFamily: "'Space Grotesk', sans-serif",
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {formatCurrency(item.value)}
                        </p>
                      </MetricTooltip>
                      <MetricTooltip full={`${formatPercentFull(item.change)} geçen aya göre`}>
                        <p
                          className="text-[10.5px] mt-1 flex items-center gap-1 truncate cursor-help tabular-nums"
                          style={{ color: changeColor }}
                        >
                          {isUp ? <ArrowUp className="w-3 h-3 shrink-0" /> : <ArrowDown className="w-3 h-3 shrink-0" />}
                          <span className="truncate">{formatPercent(item.change)} geçen aya göre</span>
                        </p>
                      </MetricTooltip>
                    </>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </Card>

      {/* ─────────────────────────  CHART  ───────────────────────── */}
      <Card>
        {profitLocked && (
          <LockedOverlay label="Profesyonel Paket" onClick={() => openUpgrade("Finansal Grafik", false)} />
        )}
        <SectionHeader icon={BarChart3} title="Son 6 Ay — Ciro & Gider" />
        <div style={{ width: "100%", height: 220 }}>
          {!loaded ? (
            <div className="h-full flex items-end gap-3 pb-6 pt-4">
              {[40, 65, 45, 80, 55, 70].map((h, i) => (
                <Skeleton key={i} className="flex-1" style={{ height: `${h}%` } as React.CSSProperties} />
              ))}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: "#64748B", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${Math.round(v / 1_000)}K` : String(v)
                  }
                  width={50}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ fontWeight: 600 }}
                  itemStyle={{ color: "#94A3B8" }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name === "ciro" ? "Ciro" : "Gider"]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(value: string) => (
                    <span className="text-muted-foreground">{value === "ciro" ? "Ciro" : "Gider"}</span>
                  )}
                />
                <Bar dataKey="ciro" fill="#22C55E" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="gider" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* ─────────────────────────  KASA  ───────────────────────── */}
      {(() => {
        const kasaBalance = accounts.filter((a) => a.account_type === "nakit_kasa").reduce((s, a) => s + Number(a.balance), 0);
        const bankaBalance = accounts.filter((a) => a.account_type === "banka").reduce((s, a) => s + Number(a.balance), 0);
        const toplamBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
        const now = new Date();
        const upcomingChecks = checks.filter((c) => {
          const diff = (new Date(c.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return diff >= 0 && diff <= 7 && c.status !== "odendi" && c.status !== "tahsil_edildi";
        });

        return (
          <Card>
            {profitLocked && <LockedOverlay label="Profesyonel Paket" onClick={() => openUpgrade("Kasa Durumu", false)} />}
            <SectionHeader
              icon={Banknote}
              title="Kasa Durumu"
              action="Detay"
              onAction={() => onTabChange("payments-kasa")}
            />
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Nakit Kasa", value: kasaBalance, color: "#F59E0B", Icon: Wallet },
                { label: "Banka", value: bankaBalance, color: "#3B82F6", Icon: Building2 },
                { label: "Toplam", value: toplamBalance, color: "#22C55E", Icon: Banknote },
              ].map(({ label, value, color, Icon }) => (
                <div key={label} className="rounded-xl p-4 bg-background/50 border border-border/50 min-w-0">
                  <div className="flex items-center gap-1.5 mb-2 min-w-0">
                    <Icon className="w-3 h-3 shrink-0" style={{ color }} />
                    <p className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/80 truncate">
                      {label}
                    </p>
                  </div>
                  <MetricTooltip full={formatCurrencyFull(value)}>
                    <p
                      className="text-[20px] font-semibold truncate cursor-help tabular-nums"
                      style={{ color, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
                    >
                      {formatCurrency(value)}
                    </p>
                  </MetricTooltip>
                </div>
              ))}
            </div>
            {upcomingChecks.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {upcomingChecks.slice(0, 3).map((chk) => {
                  const days = Math.ceil((new Date(chk.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const urgent = days <= 3;
                  return (
                    <button
                      key={chk.id}
                      onClick={() => onTabChange("payments-kasa")}
                      className="w-full rounded-lg px-3 py-2 flex items-center gap-2 text-left border transition-colors hover:bg-muted/30"
                      style={{
                        backgroundColor: urgent ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)",
                        borderColor: urgent ? "rgba(239,68,68,0.18)" : "rgba(245,158,11,0.18)",
                      }}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: urgent ? "#EF4444" : "#F59E0B" }} />
                      <span
                        className="text-[11.5px] font-medium truncate"
                        style={{ color: urgent ? "#FCA5A5" : "#FCD34D" }}
                      >
                        {chk.due_date} • {formatCurrency(chk.amount)} vadeli çek — {chk.counterparty} ({chk.bank_name})
                        {days === 0 ? " • Bugün" : ` • ${days} gün sonra`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })()}

      {/* ─────────────────────────  GRID: LEFT + RIGHT  ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[64fr_36fr] gap-5">
        {/* LEFT */}
        <div className="space-y-5 min-w-0">
          {/* Projects */}
          <Card padded={false}>
            {projectsLocked && (
              <LockedOverlay label="Kurumsal Paket" onClick={() => openUpgrade("Proje Yönetimi", true)} />
            )}
            <div className="p-5 pb-3">
              <SectionHeader
                title="Aktif Projeler"
                action="Tümü"
                onAction={() => onTabChange("projects")}
              />
            </div>
            {displayProjects.length === 0 ? (
              <div className="pb-6 px-4">
                <EmptyState
                  icon="🏗️"
                  title="Henüz proje yok"
                  description="İlk projenizi ekleyerek şantiye takibine başlayın."
                  buttonText="İlk Projeyi Oluştur"
                  onButtonClick={() => onTabChange("projects")}
                />
              </div>
            ) : (
              <>
                <div className="hidden lg:block">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr>
                        {["Proje Adı", "Müşteri", "İlerleme", "Durum"].map((h) => (
                          <th
                            key={h}
                            className="text-left px-5 py-2.5 font-medium uppercase tracking-wider text-muted-foreground/80 text-[10.5px] border-b border-border/50"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayProjects.map((p, idx) => (
                        <tr
                          key={p.id}
                          onClick={() => onProjectSelect?.(p.id)}
                          className={`transition-colors duration-150 cursor-pointer hover:bg-muted/30 ${
                            idx !== displayProjects.length - 1 ? "border-b border-border/40" : ""
                          }`}
                        >
                          <td className="px-5 py-3.5 font-medium text-foreground tracking-tight">{p.name}</td>
                          <td className="px-5 py-3.5 text-muted-foreground">{p.client}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ backgroundColor: "#FF6B2B", width: `${p.progress}%` }}
                                />
                              </div>
                              <span className="text-[11.5px] tabular-nums text-muted-foreground w-9 text-right">
                                {p.progress}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className="text-[10.5px] font-medium px-2 py-0.5 rounded-md"
                              style={{ backgroundColor: `${p.statusColor}15`, color: p.statusColor }}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="lg:hidden divide-y divide-border/50">
                  {displayProjects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => onProjectSelect?.(p.id)}
                      className="px-5 py-3.5 space-y-2 cursor-pointer active:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium truncate text-foreground">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground">{p.client}</p>
                        </div>
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0 ml-2"
                          style={{ backgroundColor: `${p.statusColor}15`, color: p.statusColor }}
                        >
                          {p.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ backgroundColor: "#FF6B2B", width: `${p.progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] tabular-nums shrink-0 text-muted-foreground">
                          {p.progress}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Activities */}
          <Card>
            {projectsLocked && (
              <LockedOverlay label="Kurumsal Paket" onClick={() => openUpgrade("Son Aktiviteler", true)} />
            )}
            <SectionHeader title="Son Aktiviteler" />
            {projects.length === 0 ? (
              <EmptyState
                icon="📋"
                title="Aktivite yok"
                description="Projeleriniz üzerinde işlem yaptıkça burada listelenir."
              />
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 4).map((p, i) => {
                  const colors = ["#22C55E", "#3B82F6", "#F59E0B", "#818CF8"];
                  const ago = Math.max(1, Math.round((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)));
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                      <span className="text-[12.5px] flex-1 min-w-0 truncate text-foreground/90">
                        {p.name} <span className="text-muted-foreground">— {p.status}</span>
                      </span>
                      <span className="text-[11px] shrink-0 text-muted-foreground tabular-nums">{ago}g</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Reminders */}
          <Card className="cursor-pointer hover:border-[#FF6B2B]/30" >
            <div onClick={() => !remindersLocked && onTabChange("reminders")}>
              {remindersLocked && (
                <LockedOverlay label="Plus Paket" onClick={() => openUpgrade("Hatırlatıcılar", false)} />
              )}
              <SectionHeader icon={CalendarClock} title="Hatırlatıcılar" action="Tümü" onAction={() => onTabChange("reminders")} />
              {recentReminders.length === 0 ? (
                <EmptyState
                  icon="🔔"
                  title="Hatırlatıcı yok"
                  description="Önemli tarihleri kaçırmamak için hatırlatıcı ekleyin."
                  linkText="+ Hatırlatıcı Ekle"
                  onLinkClick={() => onTabChange("reminders")}
                />
              ) : (
                <div className="space-y-3">
                  {recentReminders.map((r) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const rDate = new Date(r.reminder_date);
                    rDate.setHours(0, 0, 0, 0);
                    const diff = Math.round((rDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const isOverdue = !r.done && diff < 0;
                    const isToday = diff === 0;
                    const dot = r.done ? "#22C55E" : isOverdue ? "#EF4444" : isToday ? "#F59E0B" : "#3B82F6";
                    return (
                      <div key={r.id} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: dot }} />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[12.5px] font-medium truncate ${r.done ? "line-through text-muted-foreground" : "text-foreground"}`}
                          >
                            {r.title}
                          </p>
                          {r.note && <p className="text-[11px] truncate text-muted-foreground">{r.note}</p>}
                        </div>
                        <span
                          className="text-[10.5px] font-medium px-1.5 py-0.5 rounded-md shrink-0 tabular-nums"
                          style={{
                            backgroundColor: `${dot}15`,
                            color: dot,
                          }}
                        >
                          {r.done ? "✓" : isOverdue ? `${Math.abs(diff)}g geç` : isToday ? "Bugün" : `${diff}g`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="space-y-5">
          {/* AI quick composer */}
          <Card>
            <SectionHeader icon={MessageSquare} title="AI Asistan" />
            <button
              onClick={() => onTabChange("chat")}
              className="w-full flex items-center gap-2 rounded-xl px-3 mb-3 bg-background/60 border border-border/60 hover:border-[#FF6B2B]/40 transition-colors"
              style={{ height: 38 }}
            >
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[12.5px] text-muted-foreground">Bir şey sorun…</span>
            </button>
            <div className="space-y-0.5">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    onTabChange("chat");
                    onSend?.(q);
                  }}
                  className="w-full text-left text-[12px] px-2.5 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors truncate"
                >
                  {q}
                </button>
              ))}
            </div>
          </Card>

          {/* Contract Warnings */}
          {(plan === "pro" || plan === "team" || plan === "enterprise" || role === "admin") && (
            <Card>
              <SectionHeader
                icon={FileSignature}
                title="Sözleşme Uyarıları"
                action="Tümü"
                onAction={() => onTabChange("contracts")}
              />
              {(() => {
                const now = new Date();
                const expiring = contracts.filter((c) => {
                  if (!c.end_date) return false;
                  const end = new Date(c.end_date);
                  const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                  return diff > 0 && diff <= 30;
                });
                const expired = contracts.filter((c) => {
                  if (!c.end_date) return false;
                  return new Date(c.end_date) < now;
                });
                const warnings = [
                  ...expired.map((c) => {
                    const days = Math.round((now.getTime() - new Date(c.end_date!).getTime()) / (1000 * 60 * 60 * 24));
                    return { ...c, label: `${days}g doldu`, color: "#EF4444" };
                  }),
                  ...expiring.map((c) => {
                    const days = Math.round((new Date(c.end_date!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return { ...c, label: `${days}g kaldı`, color: "#F59E0B" };
                  }),
                ];
                if (warnings.length === 0) {
                  return (
                    <div className="flex items-center gap-2 py-2 text-[12px] text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Yaklaşan uyarı yok
                    </div>
                  );
                }
                return (
                  <div className="space-y-3">
                    {warnings.slice(0, 5).map((w) => (
                      <div
                        key={w.id}
                        className="flex items-start gap-3 cursor-pointer"
                        onClick={() => onTabChange("contracts")}
                      >
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: w.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-medium truncate text-foreground">{w.name}</p>
                          <p className="text-[11px] truncate text-muted-foreground">{w.counterparty}</p>
                        </div>
                        <span
                          className="text-[10.5px] font-medium px-1.5 py-0.5 rounded-md shrink-0 tabular-nums"
                          style={{ backgroundColor: `${w.color}15`, color: w.color }}
                        >
                          {w.label}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </Card>
          )}

          {/* Upcoming */}
          <Card>
            {projectsLocked && (
              <LockedOverlay label="Kurumsal Paket" onClick={() => openUpgrade("Yaklaşan İşler", true)} />
            )}
            <SectionHeader icon={Clock} title="Yaklaşan İşler" />
            {(() => {
              const upcomingReminders = reminders
                .filter((r) => !r.done && getDaysDiff(r.reminder_date) >= 0 && getDaysDiff(r.reminder_date) <= 14)
                .sort((a, b) => getDaysDiff(a.reminder_date) - getDaysDiff(b.reminder_date))
                .slice(0, 5);
              if (upcomingReminders.length === 0) {
                return (
                  <div className="flex items-center gap-2 py-2 text-[12px] text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Yaklaşan iş yok
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  {upcomingReminders.map((u) => {
                    const days = getDaysDiff(u.reminder_date);
                    const urgent = days <= 2;
                    const color = urgent ? "#EF4444" : "#F59E0B";
                    return (
                      <div key={u.id} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-medium truncate text-foreground">{u.title}</p>
                          {u.note && <p className="text-[11px] text-muted-foreground truncate">{u.note}</p>}
                        </div>
                        <span
                          className="text-[10.5px] font-medium px-1.5 py-0.5 rounded-md shrink-0 tabular-nums"
                          style={{ backgroundColor: `${color}15`, color }}
                        >
                          {days === 0 ? "Bugün" : `${days}g`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Card>
        </div>
      </div>

      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal((prev) => ({ ...prev, open: false }))}
        feature={upgradeModal.feature}
        requiresOffice={upgradeModal.requiresOffice}
      />
    </div>
  );
};

const LockedOverlay = ({ label, onClick }: { label: string; onClick?: () => void }) => (
  <div
    className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl cursor-pointer"
    style={{ backgroundColor: "rgba(15,20,25,0.85)", backdropFilter: "blur(4px)" }}
    onClick={(e) => {
      e.stopPropagation();
      onClick?.();
    }}
  >
    <Lock className="w-4 h-4 mb-1.5 text-[#FF6B2B]" />
    <span className="text-[11.5px] font-semibold text-foreground">{label}</span>
    <span className="text-[10.5px] mt-0.5 text-muted-foreground">Planınızı yükseltin</span>
  </div>
);

const MiniStat = ({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) => (
  <div className="min-w-0 text-right">
    <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70 truncate">{label}</p>
    <p
      className="text-[15px] font-semibold truncate tabular-nums mt-0.5"
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        letterSpacing: "-0.02em",
        color: accent ? "#EF4444" : undefined,
      }}
    >
      {value}
    </p>
  </div>
);

export default DesktopDashboard;
