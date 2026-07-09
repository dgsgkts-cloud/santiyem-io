import { useMemo, useState, useEffect, useCallback } from "react";
import { ExecutiveMorningBrief } from "@/components/dashboard/ExecutiveMorningBrief";
import { WorkspaceSetupCard } from "@/components/dashboard/WorkspaceSetupCard";
import { useExecutiveBrief } from "@/hooks/useExecutiveBrief";
import { useDisplayName } from "@/hooks/useDisplayName";


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
import PinnedInsights from "@/components/canvas/PinnedInsights";
import {
  PageShell,
  SectionCard,
  ResponsiveGrid,
  ResponsiveTable,
  type ResponsiveColumn,
} from "@/components/ui/responsive";

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
  const { user, plan, role } = useUser();
  const { projects } = useProjects();
  const { reminders } = useReminders();
  const autoReminders = useAutoReminders();
  const { contracts } = useContracts();
  const { accounts } = useCashAccounts();
  const { checks } = useCashChecks();
  const { kpis: briefKpis } = useExecutiveBrief();

  // Sprint 19 — swap login title for a dashboard-specific one immediately after render.
  useEffect(() => {
    document.title = "Dashboard • Şantiyem";
  }, []);


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

  const { ready: nameReady, firstName, hasName } = useDisplayName();
  const name = firstName;
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

  // ── Financial snapshot derived values ──
  const kasaBalance = accounts.filter((a) => a.account_type === "nakit_kasa").reduce((s, a) => s + Number(a.balance), 0);
  const bankaBalance = accounts.filter((a) => a.account_type === "banka").reduce((s, a) => s + Number(a.balance), 0);
  const cashTotal = kasaBalance + bankaBalance;
  const netProfit = monthRevenue - monthExpense;
  const prevNetProfit = prevMonthRevenue - prevMonthExpense;
  const calcChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };
  const revenueChange = calcChange(monthRevenue, prevMonthRevenue);
  const expenseChange = calcChange(monthExpense, prevMonthExpense);
  const profitChange = calcChange(netProfit, prevNetProfit);

  // ── Health cards (5-second scan) ──
  const healthCards = [
    {
      label: "Şirket Sağlığı",
      value: `${briefKpis.healthScore}/100`,
      icon: TrendingUp,
      tone:
        briefKpis.healthScore >= 80 ? "good" :
        briefKpis.healthScore >= 60 ? "warn" : "alert",
      hint: "Nakit, tahsilat ve risk sinyallerinden hesaplandı.",
    },
    {
      label: "Kritik Risk",
      value: String(briefKpis.criticalRisks),
      icon: AlertTriangle,
      tone: briefKpis.criticalRisks > 0 ? "alert" : "good",
      hint: "Bugün acilen ilgilenilmesi gereken bulgular.",
    },
    {
      label: "Bekleyen Ödeme",
      value: String(briefKpis.pendingPayments),
      icon: Wallet,
      tone: briefKpis.pendingPayments > 0 ? "warn" : "good",
      hint: "Onay veya tahsilat bekleyen kayıtlar.",
    },
    {
      label: "Bugünkü Görev",
      value: String(briefKpis.tasksDueToday),
      icon: CalendarClock,
      tone: briefKpis.tasksDueToday > 0 ? "warn" : "good",
      hint: "Bugün için planlanmış işler.",
    },
  ] as const;

  // ── Richer, human-sounding AI insight (Sprint 19 §11) ──
  const richInsight = useMemo(() => {
    if (!loaded) return null;
    if (monthExpense > 0 && prevMonthExpense > 0) {
      const diff = ((monthExpense - prevMonthExpense) / prevMonthExpense) * 100;
      if (diff <= -25) {
        return `Giderler geçen aya göre %${Math.abs(diff).toFixed(0)} azaldı. Büyük alımların tamamlanmış olması bu düşüşün başlıca sebebi görünüyor. Bu ay nakit akışı belirgin biçimde daha sağlıklı.`;
      }
      if (diff >= 25) {
        return `Giderler geçen aya göre %${diff.toFixed(0)} arttı. Yeni sözleşmeler ve malzeme alımları bu artışı besliyor olabilir; nakit dengesini yakından izlemek faydalı olur.`;
      }
    }
    if (monthRevenue > 0 && prevMonthRevenue > 0) {
      const diff = ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100;
      if (Math.abs(diff) >= 15) {
        return diff > 0
          ? `Bu ay ciro geçen aya göre %${diff.toFixed(0)} arttı. Ödenen hakedişlerdeki hızlanma tahsilat performansınızı olumlu etkiliyor.`
          : `Bu ay ciro geçen aya göre %${Math.abs(diff).toFixed(0)} düştü. Bekleyen hakedişlerin onay süreçlerini hızlandırmak toparlanmayı destekleyebilir.`;
      }
    }
    if (overdueTotal > 0) {
      return `${formatCurrency(overdueTotal)} tutarında ${overdueCount} gecikmiş tahsilat, nakit akışını baskılıyor. En eski kayıtlardan başlayarak müşterilerle iletişime geçmek belirgin bir rahatlama sağlar.`;
    }
    return "Şu an nakit akışınız dengeli; hem gelir hem gider tarafı beklenen aralıkta seyrediyor.";
  }, [loaded, monthRevenue, prevMonthRevenue, monthExpense, prevMonthExpense, overdueTotal, overdueCount]);

  const toneColor = (t: "good" | "warn" | "alert" | "muted") =>
    t === "alert" ? "#EF4444" : t === "warn" ? "#F59E0B" : t === "good" ? "#22C55E" : "hsl(var(--muted-foreground))";

  // ── Projects table column definition (used by ResponsiveTable) ──
  const projectColumns: ResponsiveColumn<typeof displayProjects[number]>[] = [
    {
      key: "name",
      header: "Proje Adı",
      primary: true,
      cell: (p) => <span className="font-medium text-foreground">{p.name}</span>,
    },
    {
      key: "client",
      header: "Müşteri",
      cell: (p) => <span className="text-muted-foreground">{p.client}</span>,
    },
    {
      key: "progress",
      header: "İlerleme",
      cell: (p) => (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ backgroundColor: "#FF6B2B", width: `${p.progress}%` }}
            />
          </div>
          <span className="text-fs-xs tabular-nums text-muted-foreground w-9 text-right">
            {p.progress}%
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Durum",
      cell: (p) => (
        <span
          className="text-fs-xs font-medium px-2 py-0.5 rounded-md"
          style={{ backgroundColor: `${p.statusColor}15`, color: p.statusColor }}
        >
          {p.status}
        </span>
      ),
    },
  ];

  /* ---------------------------------- Render ---------------------------------- */

  return (
    <PageShell maxWidth={1120} className="space-y-6 lg:space-y-8">
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>

      <TrialBanner />
      <PinnedInsights />
      <div style={{ marginBottom: 40 }}>
        <WorkspaceSetupCard />
      </div>

      {/* 1. Manager Greeting — warm executive header */}
      <header className="flex flex-wrap items-end justify-between gap-4 !mt-0" style={{ marginBottom: 32 }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-foreground/70" style={{ marginBottom: 8 }}>
            <greeting.Icon className="w-3.5 h-3.5" />
            <span className="text-fs-xs tracking-wide uppercase font-medium">{formatDate(new Date())}</span>
          </div>
          <h1
            className="text-fs-2xl font-medium tracking-tight text-foreground leading-tight flex items-center gap-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
          >
            <span>{greeting.text}{hasName ? "," : "."}</span>
            {!nameReady ? (
              <span
                aria-hidden
                className="inline-block h-[0.9em] w-[8ch] rounded-md bg-muted/40 animate-pulse align-middle"
              />
            ) : hasName ? (
              <span className="text-muted-foreground/90 font-normal">{name}.</span>
            ) : null}
          </h1>
          <p className="text-fs-sm text-muted-foreground" style={{ marginTop: 12 }}>
            Bugün şirketinizde olup bitenler.
          </p>
        </div>
      </header>

      {/* 2. Executive Brief — the hero: top 5 AI priorities */}
      <div className="!mt-0">
        <ExecutiveMorningBrief
          onTabChange={onTabChange}
          onProjectSelect={onProjectSelect}
          compact
          maxPriorities={5}
        />
      </div>

      {/* 3. Quick Actions — 44px touch minimum */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={a.onClick}
              disabled={a.locked}
              className={`inline-flex items-center gap-2 px-4 rounded-xl text-fs-sm font-medium border transition-all touch-target ${
                a.primary
                  ? "bg-[#FF6B2B] border-[#FF6B2B] text-white hover:brightness-110 shadow-sm shadow-[#FF6B2B]/20"
                  : "bg-card/60 border-border/60 text-foreground hover:border-border hover:bg-card"
              } ${a.locked ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <Icon className="w-4 h-4" />
              {a.label}
            </button>
          );
        })}
      </div>

      {/* 4. Company Health — 4 KPI tiles */}
      <ResponsiveGrid variant="kpi">
        {healthCards.map((c) => {
          const Icon = c.icon;
          const color = toneColor(c.tone);
          return (
            <Tooltip key={c.label} delayDuration={200}>
              <TooltipTrigger asChild>
                <div className="card-refined p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-fs-xs font-medium uppercase tracking-wider text-muted-foreground/80 truncate">
                      {c.label}
                    </span>
                    <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                  </div>
                  {!loaded ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    <p
                      className="text-fs-xl font-semibold tracking-tight tabular-nums"
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        letterSpacing: "-0.02em",
                        color: c.tone === "good" ? "hsl(var(--foreground))" : color,
                      }}
                    >
                      {c.value}
                    </p>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{c.hint}</TooltipContent>
            </Tooltip>
          );
        })}
      </ResponsiveGrid>

      {/* 5. Financial Snapshot — 4 merged metrics */}
      <div className="relative">
        {profitLocked && (
          <LockedOverlay label="Profesyonel Paket" onClick={() => openUpgrade("Finansal Özet", false)} />
        )}
        <SectionCard
          title={
            <span className="inline-flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-muted-foreground/80" />
              Finansal Özet — Bu Ay
            </span>
          }
          action={
            <button
              onClick={() => onTabChange("payments-kasa")}
              className="flex items-center gap-0.5 text-fs-xs font-medium text-muted-foreground hover:text-foreground transition-colors touch-target px-2"
            >
              Detay <ChevronRight className="w-3 h-3" />
            </button>
          }
        >
          <ResponsiveGrid variant="kpi">
            {[
              { label: "Ciro", value: monthRevenue, color: "#22C55E", change: revenueChange, inv: false },
              { label: "Gider", value: monthExpense, color: "#EF4444", change: expenseChange, inv: true },
              { label: "Kasa", value: cashTotal, color: "#3B82F6", change: null as number | null, inv: false },
              { label: "Aylık Kâr", value: netProfit, color: "#FF6B2B", change: profitChange, inv: false },
            ].map((item) => {
              const isUp = (item.change ?? 0) >= 0;
              const changeColor = item.change == null
                ? "hsl(var(--muted-foreground))"
                : item.inv
                  ? (isUp ? "#EF4444" : "#22C55E")
                  : (isUp ? "#22C55E" : "#EF4444");
              return (
                <div key={item.label} className="rounded-xl p-4 bg-background/50 border border-border/50 min-w-0">
                  <p className="text-fs-xs font-medium uppercase tracking-wider text-muted-foreground/80 mb-2">
                    {item.label}
                  </p>
                  {!loaded ? (
                    <Skeleton className="h-6 w-24" />
                  ) : (
                    <>
                      <MetricTooltip full={formatCurrencyFull(item.value)}>
                        <p
                          className="text-fs-lg font-semibold truncate cursor-help tabular-nums"
                          style={{ color: item.color, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
                        >
                          {formatCurrency(item.value)}
                        </p>
                      </MetricTooltip>
                      {item.change != null && (
                        <p className="text-fs-xs mt-1 flex items-center gap-1 tabular-nums" style={{ color: changeColor }}>
                          {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          <span>{formatPercent(item.change)} vs geçen ay</span>
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </ResponsiveGrid>

          {richInsight && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border/50 bg-background/40 px-3 py-3">
              <Sparkles className="w-3.5 h-3.5 text-[#FF6B2B] mt-0.5 shrink-0" />
              <p className="text-fs-sm leading-relaxed text-foreground/85">{richInsight}</p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* 6. Projects Overview */}
      <div className="relative">
        {projectsLocked && (
          <LockedOverlay label="Kurumsal Paket" onClick={() => openUpgrade("Proje Yönetimi", true)} />
        )}
        <SectionCard
          title="Aktif Projeler"
          action={
            <button
              onClick={() => onTabChange("projects")}
              className="flex items-center gap-0.5 text-fs-xs font-medium text-muted-foreground hover:text-foreground transition-colors touch-target px-2"
            >
              Tümü <ChevronRight className="w-3 h-3" />
            </button>
          }
          padded={false}
        >
          {displayProjects.length === 0 ? (
            <div className="px-4 pb-4">
              <EmptyState
                icon="🏗️"
                title="Henüz proje yok"
                description="İlk projenizi ekleyerek şantiye takibine başlayın."
                buttonText="İlk Projeyi Oluştur"
                onButtonClick={() => onTabChange("projects")}
              />
            </div>
          ) : (
            <div className="px-2 pb-3">
              <ResponsiveTable
                columns={projectColumns}
                rows={displayProjects}
                rowKey={(p) => p.id}
                onRowClick={(p) => onProjectSelect?.(p.id)}
              />
            </div>
          )}
        </SectionCard>
      </div>

      {/* 7. Latest Activities */}
      <SectionCard title="Son Aktiviteler">
        {projects.length === 0 ? (
          <EmptyState icon="📋" title="Aktivite yok" description="Projeleriniz üzerinde işlem yaptıkça burada listelenir." />
        ) : (
          <div className="space-y-3">
            {projects.slice(0, 5).map((p, i) => {
              const colors = ["#22C55E", "#3B82F6", "#F59E0B", "#818CF8", "#FF6B2B"];
              const ago = Math.max(1, Math.round((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)));
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                  <span className="text-fs-sm flex-1 min-w-0 truncate text-foreground/90">
                    {p.name} <span className="text-muted-foreground">— {p.status}</span>
                  </span>
                  <span className="text-fs-xs shrink-0 text-muted-foreground tabular-nums">{ago}g</span>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal((prev) => ({ ...prev, open: false }))}
        feature={upgradeModal.feature}
        requiresOffice={upgradeModal.requiresOffice}
      />
    </PageShell>
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
