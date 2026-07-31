import { useIsMobile } from "@/hooks/use-mobile";
import { useMemo, useState, useEffect, useCallback } from "react";
import { TodayTimeline } from "@/components/dashboard/TodayTimeline";
import { WorkspaceSetupCard } from "@/components/dashboard/WorkspaceSetupCard";
// SPRINT 38B — premium dashboard surfaces
import { DailyBriefHero, type BriefLine } from "@/components/dashboard/DailyBriefHero";
import { CriticalAlertsCard, type AlertItem } from "@/components/dashboard/CriticalAlertsCard";
import { CompactKpiStrip, type CompactKpi } from "@/components/dashboard/CompactKpiStrip";
import { TodayActionsCard, type TodayAction } from "@/components/dashboard/TodayActionsCard";
import { useExecutiveBrief } from "@/hooks/useExecutiveBrief";
import { useActionExecutor } from "@/hooks/useActionExecutor";
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
  Package,
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
  const { kpis: briefKpis, ops: aiOps, findings } = useExecutiveBrief();
  const { execute } = useActionExecutor();
  const isMobileView = useIsMobile();


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

  // SPRINT 38B — the brief is the hero: short, calm sentences instead of stat walls.
  const briefLines: BriefLine[] = useMemo(() => {
    const out: BriefLine[] = [];

    if (overdueCount > 0) {
      out.push({
        id: "overdue",
        tone: "alert",
        text: `${overdueCount} gecikmiş tahsilat dikkat bekliyor — toplam ${formatCurrency(overdueTotal)}.`,
      });
    }
    if (briefKpis.criticalRisks > 0) {
      out.push({
        id: "risks",
        tone: "alert",
        text: `${briefKpis.criticalRisks} kritik konu bugün aksiyon gerektiriyor.`,
      });
    }
    if (delayedReminders > 0) {
      out.push({
        id: "delayed",
        tone: "warn",
        text: `${delayedReminders} hatırlatıcı gecikmiş durumda; ${upcomingThisWeek} tanesi bu hafta içinde.`,
      });
    }
    if (briefKpis.criticalStockItems > 0) {
      out.push({
        id: "stock",
        tone: "warn",
        text: `${briefKpis.criticalStockItems} malzeme kritik stok seviyesinde.`,
      });
    } else if (out.length < 4) {
      out.push({ id: "stock-ok", tone: "good", text: "Malzeme stoğu sağlıklı seviyede." });
    }
    if (out.length < 4) {
      out.push({
        id: "cash",
        tone: netProfit >= 0 ? "good" : "warn",
        text: netProfit >= 0
          ? `Bu ay nakit dengesi pozitif — ${formatCurrency(netProfit)} kâr görünüyor.`
          : `Bu ay giderler geliri ${formatCurrency(Math.abs(netProfit))} aşıyor.`,
      });
    }
    if (aiOps.headline && out.length < 4) {
      out.push({ id: "headline", tone: "info", text: aiOps.headline });
    }
    if (out.length === 0) {
      out.push({ id: "calm", tone: "good", text: "Bugün için kritik bir konu yok. Operasyon sakin görünüyor." });
    }
    return out.slice(0, 4);
  }, [overdueCount, overdueTotal, briefKpis.criticalRisks, briefKpis.criticalStockItems, delayedReminders, upcomingThisWeek, netProfit, aiOps.headline]);

  const topPriority = aiOps.topAction ?? aiOps.topInsight;
  const heroAction = topPriority
    ? {
        label: topPriority.actions?.[0]?.label ?? "Önceliği incele",
        onClick: () => {
          if (topPriority.actions?.[0]) execute(topPriority.actions[0]);
          else onTabChange("chat");
        },
      }
    : null;

  // Grouped + deduped alerts (critical findings first, then AI risks).
  const alertItems: AlertItem[] = useMemo(() => {
    const seen = new Set<string>();
    const out: AlertItem[] = [];
    const push = (item: AlertItem) => {
      const key = item.title.trim().toLocaleLowerCase("tr");
      if (seen.has(key)) return;
      seen.add(key);
      out.push(item);
    };

    findings
      .filter((f) => f.severity === "critical" || f.severity === "important")
      .forEach((f) =>
        push({
          id: f.id,
          severity: f.severity,
          title: f.title,
          detail: f.detail,
          actionLabel: f.action ? f.action.label ?? "Aç" : undefined,
          onAction: f.action
            ? () => {
                if (f.action?.projectId) onProjectSelect?.(f.action.projectId);
                else if (f.action) onTabChange(f.action.tab);
              }
            : undefined,
        })
      );

    aiOps.topRisks.forEach((r) =>
      push({
        id: r.id,
        severity: r.priority === "critical" ? "critical" : "important",
        title: r.title,
        detail: r.detail ?? r.recommendation,
        actionLabel: r.actions?.[0]?.label,
        onAction: r.actions?.[0] ? () => execute(r.actions![0]) : undefined,
      })
    );

    return out.slice(0, 8);
  }, [findings, aiOps.topRisks, onTabChange, onProjectSelect, execute]);

  const kpiItems: CompactKpi[] = [
    {
      key: "health",
      label: "Şirket Sağlığı",
      value: `${briefKpis.healthScore}`,
      tone: briefKpis.healthScore >= 80 ? "good" : briefKpis.healthScore >= 60 ? "warn" : "alert",
      icon: TrendingUp,
    },
    {
      key: "cash",
      label: "Kasa",
      value: formatCurrency(cashTotal),
      tone: "muted",
      icon: Wallet,
      onClick: () => onTabChange("payments-kasa"),
    },
    {
      key: "projects",
      label: "Aktif Proje",
      value: activeProjects,
      tone: "muted",
      icon: FolderOpen,
      onClick: () => onTabChange("projects"),
    },
    {
      key: "today",
      label: "Bugün Görev",
      value: briefKpis.tasksDueToday,
      tone: briefKpis.tasksDueToday > 0 ? "warn" : "good",
      icon: CalendarClock,
      onClick: () => onTabChange("tasks"),
    },
  ];

  const financeItems: CompactKpi[] = [
    { key: "rev", label: "Ciro", value: formatCurrency(monthRevenue), tone: "good", onClick: () => onTabChange("payments-kasa") },
    { key: "exp", label: "Gider", value: formatCurrency(monthExpense), tone: "alert", onClick: () => onTabChange("payments-kasa") },
    { key: "pending", label: "Bekleyen Hakediş", value: briefKpis.pendingHakedisCount, tone: "warn", onClick: () => onTabChange("hakedis") },
    { key: "profit", label: "Aylık Kâr", value: formatCurrency(netProfit), tone: netProfit >= 0 ? "good" : "alert" },
  ];

  const todayActions: TodayAction[] = [
    { key: "hakedis", label: "Hakediş oluştur", hint: `${briefKpis.pendingHakedisCount} bekleyen`, icon: Receipt, onClick: () => onTabChange("hakedis"), locked: hakedisLocked },
    { key: "payment", label: "Ödeme onayla", hint: overdueCount > 0 ? `${overdueCount} gecikmiş` : "Kasa ve ödemeler", icon: Wallet, onClick: () => onTabChange("payments-kasa") },
    { key: "diary", label: "Şantiye günlüğü", hint: "Günlük kaydı gir", icon: BookOpen, onClick: () => onTabChange("site-diary") },
    { key: "stock", label: "Stok kontrolü", hint: briefKpis.criticalStockItems > 0 ? `${briefKpis.criticalStockItems} kritik` : "Depo sağlıklı", icon: Package, onClick: () => onTabChange("materials") },
    { key: "delayed", label: "Geciken projeyi aç", hint: `${activeProjects} aktif proje`, icon: FolderOpen, onClick: () => onTabChange("projects"), locked: projectsLocked },
    { key: "ai", label: "AI'ya sor", hint: "Şantiyem AI", icon: Sparkles, onClick: () => onTabChange("chat") },
  ];

  return (
    <PageShell maxWidth={1120}>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>

      {/* Dashboard root stack — single source of truth for major section spacing.
          mobile 16px · tablet 20px · desktop 24px. No section adds its own margins. */}
      <div className="flex flex-col gap-4 md:gap-5 lg:gap-6">
        {/* Zone A — Setup */}
        <div className="flex flex-col gap-3 md:gap-4">
          <TrialBanner />
          <PinnedInsights />
          <WorkspaceSetupCard />
        </div>

        {/* Zone B — AI Command Center (greeting + daily brief + ask) */}
        <DailyBriefHero
          greeting={greeting.text}
          name={name}
          nameReady={nameReady && hasName}
          dateLabel={formatDate(new Date())}
          lines={isMobileView ? briefLines.slice(0, 3) : briefLines}
          loading={!loaded}
          topAction={heroAction}
          onAsk={(text) => {
            if (onSend) onSend(text);
            else {
              window.dispatchEvent(new CustomEvent("canvas-followup", { detail: { text } }));
              onTabChange("chat");
            }
          }}
        />

        {/* Zone C — Attention */}
        <CriticalAlertsCard items={alertItems} loading={!loaded} />

        {/* Zone D — Executive overview (KPI group: row 1 + row 2, 16px row gap) */}
        <div className="flex flex-col gap-3 md:gap-4">
          <CompactKpiStrip items={kpiItems} loading={!loaded} />

          <div className="relative">
            {profitLocked && (
              <LockedOverlay label="Profesyonel Paket" onClick={() => openUpgrade("Finansal Özet", false)} />
            )}
            <CompactKpiStrip items={financeItems} loading={!loaded} />
          </div>
        </div>

        {/* Zone E — Actions */}
        <TodayActionsCard actions={todayActions} />

        {/* 7 — Recent activity */}
        <section className="rounded-card border border-border/70 bg-card shadow-card overflow-hidden">

        <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-2.5">
          <h2 className="ds-title text-foreground">Son Aktiviteler</h2>
          <button
            onClick={() => onTabChange("projects")}
            className="inline-flex items-center gap-0.5 ds-caption font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Tümü <ChevronRight className="w-3 h-3" />
          </button>
        </header>
        <div className="px-4 pb-4">
          {projects.length === 0 ? (
            <EmptyState
              icon="📋"
              title="Aktivite yok"
              description="Projeleriniz üzerinde işlem yaptıkça burada listelenir."
            />
          ) : (
            <ul className="divide-y divide-border/50">
              {displayProjects.map((p) => {
                const src = projects.find((x) => x.id === p.id);
                const ago = src
                  ? Math.max(1, Math.round((Date.now() - new Date(src.created_at).getTime()) / 86400000))
                  : 1;
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => onProjectSelect?.(p.id)}
                      className="w-full flex items-center gap-3 py-2.5 text-left transition-colors hover:opacity-80 active:scale-[0.995]"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.statusColor }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block ds-body text-foreground truncate">{p.name}</span>
                        <span className="block ds-caption text-muted-foreground truncate">
                          {p.status} · %{p.progress}
                        </span>
                      </span>
                      <span className="ds-caption text-muted-foreground/70 shrink-0 tabular-nums">{ago}g</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        </section>

        {/* 8 — Everything else stays available but visually quiet */}
        <TodayTimeline />
      </div>



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
