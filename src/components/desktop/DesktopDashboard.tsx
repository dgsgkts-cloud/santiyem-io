import { useMemo, useState, useEffect, useCallback } from "react";
import { useUser, canAccessProjects, canAccessHakedis, canAccessProfitability, canAccessReminders } from "@/contexts/UserContext";
import {
  FolderOpen, Clock, TrendingUp, AlertTriangle, Wallet,
  MessageSquare, ChevronRight, Lightbulb, ArrowUp, ArrowDown, CalendarClock, Lock, FileSignature, BarChart3, Banknote, Building2, FileText
} from "lucide-react";
import { useContracts } from "@/hooks/useContracts";
import { useProjects } from "@/hooks/useProjects";
import { useReminders } from "@/hooks/useReminders";
import { useCashAccounts } from "@/hooks/useCashAccounts";
import { useCashChecks } from "@/hooks/useCashChecks";
import { supabase } from "@/integrations/supabase/client";
import UpgradeModal from "@/components/UpgradeModal";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

interface DesktopDashboardProps {
  onTabChange: (tab: string) => void;
  onSend?: (text: string) => void;
  onProjectSelect?: (projectId: string) => void;
}

const formatDate = (d: Date) =>
  `${d.getDate()} ${["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"][d.getMonth()]} ${d.getFullYear()}`;

const formatCurrency = (n: number) => {
  if (n >= 1_000_000) return `₺${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₺${Math.round(n / 1_000)}K`;
  return `₺${Math.round(n)}`;
};

const UPCOMING_STATIC = [
  { task: "Temel betonu dökümü", project: "Fabrika", days: 2, urgent: true },
  { task: "Yapı denetim kontrolü", project: "Villa", days: 4, urgent: false },
  { task: "Hakediş sunumu", project: "AVM", days: 5, urgent: false },
];

const DesktopDashboard = ({ onTabChange, onSend, onProjectSelect }: DesktopDashboardProps) => {
  const { profile, user, plan, role } = useUser();
  const { projects } = useProjects();
  const { reminders } = useReminders();
  const { contracts, stats: contractStats } = useContracts();
  const { accounts } = useCashAccounts();
  const { checks } = useCashChecks();
  const [totalHakedis, setTotalHakedis] = useState(0);
  const [pendingHakedis, setPendingHakedis] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [prevMonthRevenue, setPrevMonthRevenue] = useState(0);
  const [prevMonthExpense, setPrevMonthExpense] = useState(0);
  const [cashWarning, setCashWarning] = useState("");
  const [allHakedisData, setAllHakedisData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<{ month: string; ciro: number; gider: number }[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueTotal, setOverdueTotal] = useState(0);
  const [overdueBannerDismissed, setOverdueBannerDismissed] = useState(() => {
    try { const d = localStorage.getItem("santiyem_overdue_dismiss"); return d === new Date().toISOString().slice(0, 10); } catch { return false; }
  });
  const [paymentTab, setPaymentTab] = useState<"week" | "month" | "overdue">("week");
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature: string; requiresOffice: boolean }>({ open: false, feature: "", requiresOffice: false });
  const openUpgrade = useCallback((feature: string, requiresOffice: boolean) => setUpgradeModal({ open: true, feature, requiresOffice }), []);
  const name = profile?.full_name?.split(" ")[0] || "Mühendis";

  const profitLocked = !canAccessProfitability(plan, role);

  // Fetch hakedis totals + this month revenue + overdue tracking
  // Build 6 month keys helper
  const monthKeys = useMemo(() => {
    const keys: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return keys;
  }, []);

  const MONTH_LABELS = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];

  useEffect(() => {
    if (!user) return;
    supabase
      .from("project_hakedis")
      .select("*")
      .then(({ data }) => {
        if (!data) return;
        setAllHakedisData(data);
        setTotalHakedis(data.reduce((s, h) => s + Number(h.net), 0));
        setPendingHakedis(data.filter(h => h.status === "Bekliyor").reduce((s, h) => s + Number(h.net), 0));
        const now = new Date();
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const rev = data.filter(h => h.status === "Ödendi" && h.payment_date && (h.payment_date as string).startsWith(ym)).reduce((s, h) => s + Number(h.net), 0);
        setMonthRevenue(rev);
        // Previous month revenue
        const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const pym = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
        const prevRev = data.filter(h => h.status === "Ödendi" && h.payment_date && (h.payment_date as string).startsWith(pym)).reduce((s, h) => s + Number(h.net), 0);
        setPrevMonthRevenue(prevRev);
        const pendingTotal = data.filter(h => h.status === "Bekliyor" || h.status === "Gönderildi").reduce((s, h) => s + Number(h.net), 0);
        if (pendingTotal > 0) setCashWarning(`⚠️ ${formatCurrency(pendingTotal)} tahsilat bekliyor. Detay →`);
        // Overdue: 30+ days
        const nowMs = Date.now();
        const overdueItems = data.filter(h => {
          if (h.status === "Ödendi" || h.status === "Taslak" || h.status === "Reddedildi") return false;
          if (h.expected_payment_date) return nowMs > new Date(h.expected_payment_date).getTime();
          return (nowMs - new Date(h.created_at).getTime()) > 30 * 24 * 60 * 60 * 1000;
        });
        setOverdueCount(overdueItems.length);
        setOverdueTotal(overdueItems.reduce((s, h) => s + Number(h.net), 0));

        // 6-month revenue map
        const revenueByMonth: Record<string, number> = {};
        monthKeys.forEach(k => { revenueByMonth[k] = 0; });
        data.filter(h => h.status === "Ödendi" && h.payment_date).forEach(h => {
          const key = (h.payment_date as string).slice(0, 7);
          if (revenueByMonth[key] !== undefined) revenueByMonth[key] += Number(h.net);
        });

        // Fetch 6 months of expenses for chart
        const sixMonthsAgo = `${monthKeys[0]}-01`;
        supabase.from("project_expenses").select("amount,expense_date").gte("expense_date", sixMonthsAgo).then(({ data: expData }) => {
          const expenseByMonth: Record<string, number> = {};
          monthKeys.forEach(k => { expenseByMonth[k] = 0; });
          (expData || []).forEach(e => {
            const key = (e.expense_date as string).slice(0, 7);
            if (expenseByMonth[key] !== undefined) expenseByMonth[key] += Number(e.amount);
          });
          setChartData(monthKeys.map(k => {
            const monthIdx = parseInt(k.split("-")[1]) - 1;
            return { month: MONTH_LABELS[monthIdx], ciro: revenueByMonth[k], gider: expenseByMonth[k] };
          }));
        });
      });
  }, [user, monthKeys]);

  // Fetch this month expenses
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
        if (!data) return;
        setMonthExpense(data.filter(e => e.expense_date >= startOfMonth).reduce((s, e) => s + Number(e.amount), 0));
        setPrevMonthExpense(data.filter(e => e.expense_date >= startOfPrevMonth && e.expense_date < startOfMonth).reduce((s, e) => s + Number(e.amount), 0));
      });
  }, [user]);

  // Computed stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === "Devam Ediyor").length;
  const delayedReminders = reminders.filter(r => {
    if (r.done) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const rd = new Date(r.reminder_date); rd.setHours(0,0,0,0);
    return rd < today;
  }).length;

  const upcomingThisWeek = reminders.filter(r => {
    if (r.done) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const rd = new Date(r.reminder_date); rd.setHours(0,0,0,0);
    const diff = (rd.getTime() - today.getTime()) / (1000*60*60*24);
    return diff >= 0 && diff <= 7;
  }).length;

  const projectsLocked = !canAccessProjects(plan, role);
  const hakedisLocked = !canAccessHakedis(plan, role);
  const remindersLocked = !canAccessReminders(plan);

  const statCards = [
    { label: "Toplam Proje", value: String(totalProjects), icon: FolderOpen, desc: "Kayıtlı", locked: projectsLocked },
    { label: "Devam Eden", value: String(activeProjects), icon: Clock, desc: "Aktif", locked: projectsLocked },
    { label: "Hakediş", value: formatCurrency(totalHakedis), icon: TrendingUp, desc: "Toplam", locked: hakedisLocked },
    { label: "Geciken", value: String(delayedReminders), icon: AlertTriangle, desc: "Dikkat!", isAlert: delayedReminders > 0, locked: remindersLocked },
  ];

  const displayProjects = projects.slice(0, 5).map(p => ({
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

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[1200px] mx-auto space-y-4 lg:space-y-4">
      {/* Welcome */}
      <div className="rounded-xl p-5 lg:p-6" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", borderLeft: "3px solid #FF6B2B" }}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg lg:text-xl font-bold mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#F1F5F9" }}>
              Günaydın, {name} 👋
            </h2>
            <p className="text-[12px]" style={{ color: "#64748B" }}>{formatDate(new Date())} — Bugün şantiyende ne var?</p>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <MiniStat label="Aktif Projeler" value={projectsLocked ? "🔒" : String(activeProjects)} />
            <MiniStat label="Bu Hafta Teslim" value={remindersLocked ? "🔒" : String(upcomingThisWeek)} />
            <MiniStat label="Bekleyen Tahsilat" value={hakedisLocked ? "🔒" : formatCurrency(pendingHakedis)} />
            <MiniStat label="Geciken" value={remindersLocked ? "🔒" : String(delayedReminders)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:hidden mt-3">
          <MiniStat label="Aktif Projeler" value={projectsLocked ? "🔒" : String(activeProjects)} />
          <MiniStat label="Bu Hafta Teslim" value={remindersLocked ? "🔒" : String(upcomingThisWeek)} />
          <MiniStat label="Bekleyen Tahsilat" value={hakedisLocked ? "🔒" : formatCurrency(pendingHakedis)} />
          <MiniStat label="Geciken" value={remindersLocked ? "🔒" : String(delayedReminders)} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl transition-all duration-150 relative overflow-hidden"
              style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", padding: "20px 24px" }}
            >
              {stat.locked && <LockedOverlay label="Kurumsal Paket" onClick={() => openUpgrade(stat.label, true)} />}
              <div className="flex items-center gap-2 mb-2 lg:mb-3">
                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(255,107,43,0.15)" }}>
                  <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4" style={{ color: "#FF6B2B" }} />
                </div>
                <span className="text-[10px] lg:text-[11px] font-semibold uppercase tracking-wide truncate" style={{ color: "#64748B" }}>{stat.label}</span>
              </div>
              <p className="text-xl lg:text-[28px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#F1F5F9" }}>
                {stat.locked ? "—" : stat.value}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[11px] lg:text-[12px] truncate" style={{ color: stat.isAlert ? "#EF4444" : "#64748B" }}>{stat.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Financial Summary Widget */}
      <div className="rounded-xl p-5 lg:p-6 relative overflow-hidden" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
        {profitLocked && <LockedOverlay label="Profesyonel Paket" onClick={() => openUpgrade("Finansal Özet", false)} />}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4" style={{ color: "#FF6B2B" }} />
            <h3 className="text-[13px] lg:text-[14px] font-semibold" style={{ color: "#F1F5F9" }}>Finansal Özet — Bu Ay</h3>
          </div>
          <button onClick={() => onTabChange("profitability")} className="flex items-center gap-0.5 text-[11px] lg:text-[12px] font-medium" style={{ color: "#FF6B2B" }}>
            Detay <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
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
              { label: "CİRO", value: monthRevenue, color: "#22C55E", change: revenueChange },
              { label: "GİDER", value: monthExpense, color: "#EF4444", change: expenseChange },
              { label: "NET KAR", value: netProfit, color: "#FF6B2B", change: profitChange },
            ];

            return items.map(item => {
              const isUp = item.change >= 0;
              const changeColor = item.label === "GİDER"
                ? (isUp ? "#EF4444" : "#22C55E")
                : (isUp ? "#22C55E" : "#EF4444");
              return (
                <div key={item.label} className="rounded-lg p-4" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "#64748B" }}>{item.label}</p>
                  <p className="text-xl lg:text-2xl font-bold" style={{ color: item.color, fontFamily: "'Space Grotesk', sans-serif" }}>{formatCurrency(item.value)}</p>
                  <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: changeColor }}>
                    {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    <span>%{Math.abs(item.change)} geçen aya göre</span>
                  </p>
                </div>
              );
            });
          })()}
        </div>
        {cashWarning && (
          <div
            className="mt-3 rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors hover:opacity-90"
            style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
            onClick={() => onTabChange("profitability")}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: "#EF4444" }} />
            <span className="text-[11px] lg:text-[12px] font-medium" style={{ color: "#FCA5A5" }}>{cashWarning}</span>
          </div>
        )}
      </div>

      {/* 6-Month Revenue/Expense Chart */}
      <div className="rounded-xl p-5 lg:p-6 relative overflow-hidden" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
        {profitLocked && <LockedOverlay label="Profesyonel Paket" onClick={() => openUpgrade("Finansal Grafik", false)} />}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: "#FF6B2B" }} />
            <h3 className="text-[13px] lg:text-[14px] font-semibold" style={{ color: "#F1F5F9" }}>Son 6 Ay — Ciro & Gider</h3>
          </div>
        </div>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2732" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1_000 ? `${Math.round(v/1_000)}K` : String(v)} width={50} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#F1F5F9", fontWeight: 600 }}
                itemStyle={{ color: "#94A3B8" }}
                formatter={(value: number, name: string) => [formatCurrency(value), name === "ciro" ? "Ciro" : "Gider"]}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value: string) => <span style={{ color: "#94A3B8" }}>{value === "ciro" ? "Ciro" : "Gider"}</span>}
              />
              <Bar dataKey="ciro" fill="#22C55E" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="gider" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Kasa Durumu Widget */}
      {(() => {
        const kasaBalance = accounts.filter(a => a.account_type === "nakit_kasa").reduce((s, a) => s + Number(a.balance), 0);
        const bankaBalance = accounts.filter(a => a.account_type === "banka").reduce((s, a) => s + Number(a.balance), 0);
        const toplamBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
        const now = new Date();
        const upcomingChecks = checks.filter(c => {
          const diff = (new Date(c.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return diff >= 0 && diff <= 7 && c.status !== "odendi" && c.status !== "tahsil_edildi";
        });

        return (
          <div className="rounded-xl p-5 lg:p-6 relative overflow-hidden" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            {profitLocked && <LockedOverlay label="Profesyonel Paket" onClick={() => openUpgrade("Kasa Durumu", false)} />}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4" style={{ color: "#FF6B2B" }} />
                <h3 className="text-[13px] lg:text-[14px] font-semibold" style={{ color: "#F1F5F9" }}>Kasa Durumu</h3>
              </div>
              <button onClick={() => onTabChange("cash-tracking")} className="flex items-center gap-0.5 text-[11px] lg:text-[12px] font-medium" style={{ color: "#FF6B2B" }}>
                Detay <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg p-4" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#64748B" }}>Nakit Kasa</p>
                </div>
                <p className="text-xl lg:text-2xl font-bold" style={{ color: "#F59E0B", fontFamily: "'Space Grotesk', sans-serif" }}>{formatCurrency(kasaBalance)}</p>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-3.5 h-3.5" style={{ color: "#3B82F6" }} />
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#64748B" }}>Banka</p>
                </div>
                <p className="text-xl lg:text-2xl font-bold" style={{ color: "#3B82F6", fontFamily: "'Space Grotesk', sans-serif" }}>{formatCurrency(bankaBalance)}</p>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Banknote className="w-3.5 h-3.5" style={{ color: "#22C55E" }} />
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#64748B" }}>Toplam</p>
                </div>
                <p className="text-xl lg:text-2xl font-bold" style={{ color: "#22C55E", fontFamily: "'Space Grotesk', sans-serif" }}>{formatCurrency(toplamBalance)}</p>
              </div>
            </div>
            {upcomingChecks.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {upcomingChecks.slice(0, 3).map(chk => {
                  const days = Math.ceil((new Date(chk.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div
                      key={chk.id}
                      className="rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer transition-colors hover:opacity-90"
                      style={{ backgroundColor: days <= 3 ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)", border: `1px solid ${days <= 3 ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}` }}
                      onClick={() => onTabChange("cash-tracking")}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: days <= 3 ? "#EF4444" : "#F59E0B" }} />
                      <span className="text-[11px] lg:text-[12px] font-medium" style={{ color: days <= 3 ? "#FCA5A5" : "#FCD34D" }}>
                        📄 {chk.due_date} tarihinde {formatCurrency(chk.amount)} vadeli çek — {chk.counterparty} ({chk.bank_name})
                        {days === 0 ? " • Bugün!" : ` • ${days} gün sonra`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-4">
        {/* Left column */}
        <div className="space-y-4 lg:space-y-5 min-w-0">
          {/* Projects */}
          <div className="rounded-xl overflow-hidden relative" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            {projectsLocked && <LockedOverlay label="Kurumsal Paket" onClick={() => openUpgrade("Proje Yönetimi", true)} />}
            <div className="flex items-center justify-between p-4 lg:p-5 pb-3">
              <h3 className="text-sm lg:text-[15px] font-semibold" style={{ color: "#F1F5F9" }}>Aktif Projeler</h3>
              <button onClick={() => onTabChange("projects")} className="flex items-center gap-0.5 text-[12px] font-medium shrink-0" style={{ color: "#FF6B2B" }}>
                Tümü <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {displayProjects.length === 0 ? (
              <p className="text-[12px] text-center py-6" style={{ color: "#64748B" }}>Henüz proje eklenmemiş</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr style={{ backgroundColor: "#0F1419" }}>
                        {["Proje Adı", "Müşteri", "İlerleme", "Durum"].map((h) => (
                          <th key={h} className="text-left px-5 py-2.5 font-semibold uppercase tracking-wide" style={{ color: "#64748B", fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayProjects.map((p) => (
                        <tr key={p.id} onClick={() => onProjectSelect?.(p.id)} className="transition-colors duration-150 cursor-pointer" style={{ borderBottom: "1px solid #1E2732" }}>
                          <td className="px-5 py-3 font-semibold" style={{ color: "#F1F5F9" }}>{p.name}</td>
                          <td className="px-5 py-3" style={{ color: "#94A3B8" }}>{p.client}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "#1E2732" }}>
                                <div className="h-full rounded-full" style={{ backgroundColor: "#FF6B2B", width: `${p.progress}%` }} />
                              </div>
                              <span className="text-[12px] font-mono" style={{ color: "#94A3B8" }}>{p.progress}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: `${p.statusColor}15`, color: p.statusColor }}>{p.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile/Tablet card list */}
                <div className="lg:hidden divide-y" style={{ borderColor: "#1E2732" }}>
                  {displayProjects.map((p) => (
                    <div key={p.id} onClick={() => onProjectSelect?.(p.id)} className="px-4 py-3 space-y-2 cursor-pointer active:bg-[#1C242D] transition-colors" style={{ borderColor: "#1E2732" }}>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold truncate" style={{ color: "#F1F5F9" }}>{p.name}</p>
                          <p className="text-[11px]" style={{ color: "#64748B" }}>{p.client}</p>
                        </div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md shrink-0 ml-2" style={{ backgroundColor: `${p.statusColor}15`, color: p.statusColor }}>{p.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: "#1E2732" }}>
                          <div className="h-full rounded-full" style={{ backgroundColor: "#FF6B2B", width: `${p.progress}%` }} />
                        </div>
                        <span className="text-[11px] font-mono shrink-0" style={{ color: "#94A3B8" }}>{p.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Activities - still static for now, could be event-sourced later */}
          <div className="rounded-xl p-4 lg:p-5 relative overflow-hidden" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            {projectsLocked && <LockedOverlay label="Kurumsal Paket" onClick={() => openUpgrade("Son Aktiviteler", true)} />}
            <h3 className="text-sm lg:text-[15px] font-semibold mb-3 lg:mb-4" style={{ color: "#F1F5F9" }}>Son Aktiviteler</h3>
            {projects.length === 0 ? (
              <p className="text-[12px] text-center py-4" style={{ color: "#64748B" }}>Henüz aktivite yok</p>
            ) : (
              <div className="space-y-2.5 lg:space-y-3">
                {projects.slice(0, 4).map((p, i) => {
                  const colors = ["#22C55E", "#3B82F6", "#F59E0B", "#818CF8"];
                  const ago = Math.max(1, Math.round((Date.now() - new Date(p.created_at).getTime()) / (1000*60*60*24)));
                  return (
                    <div key={p.id} className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                      <span className="text-[12px] lg:text-[13px] flex-1 min-w-0 truncate" style={{ color: "#94A3B8" }}>
                        {p.name} — {p.status}
                      </span>
                      <span className="text-[11px] lg:text-[12px] shrink-0" style={{ color: "#64748B" }}>{ago}g</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hatırlatıcılar */}
          <div
            className="rounded-xl p-4 lg:p-5 cursor-pointer transition-colors duration-150 hover:border-[#FF6B2B]/30 relative overflow-hidden"
            style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}
            onClick={() => !remindersLocked && onTabChange("reminders")}
          >
            {remindersLocked && <LockedOverlay label="Plus Paket" onClick={() => openUpgrade("Hatırlatıcılar", false)} />}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4" style={{ color: "#FF6B2B" }} />
                <h3 className="text-[13px] lg:text-[14px] font-semibold" style={{ color: "#F1F5F9" }}>Hatırlatıcılar</h3>
              </div>
              <button className="flex items-center gap-0.5 text-[11px] lg:text-[12px] font-medium" style={{ color: "#FF6B2B" }}>
                Tümü <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {recentReminders.length === 0 ? (
              <p className="text-[12px] text-center py-4" style={{ color: "#64748B" }}>Henüz hatırlatıcı yok</p>
            ) : (
              <div className="space-y-2.5">
                {recentReminders.map((r) => {
                  const today = new Date(); today.setHours(0,0,0,0);
                  const rDate = new Date(r.reminder_date); rDate.setHours(0,0,0,0);
                  const diff = Math.round((rDate.getTime() - today.getTime()) / (1000*60*60*24));
                  const isOverdue = !r.done && diff < 0;
                  const isToday = diff === 0;
                  return (
                    <div key={r.id} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: r.done ? "#22C55E" : isOverdue ? "#EF4444" : isToday ? "#F59E0B" : "#3B82F6" }} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] lg:text-[13px] font-medium truncate ${r.done ? "line-through" : ""}`} style={{ color: r.done ? "#64748B" : "#F1F5F9" }}>{r.title}</p>
                        {r.note && <p className="text-[10px] lg:text-[11px] truncate" style={{ color: "#64748B" }}>{r.note}</p>}
                      </div>
                      <span
                        className="text-[10px] lg:text-[11px] font-medium px-1.5 py-0.5 rounded-md shrink-0"
                        style={{
                          backgroundColor: r.done ? "rgba(34,197,94,0.1)" : isOverdue ? "rgba(239,68,68,0.1)" : isToday ? "rgba(245,158,11,0.1)" : "rgba(59,130,246,0.1)",
                          color: r.done ? "#22C55E" : isOverdue ? "#EF4444" : isToday ? "#F59E0B" : "#3B82F6"
                        }}
                      >
                        {r.done ? "✓" : isOverdue ? `${Math.abs(diff)}g gecikmiş` : isToday ? "Bugün" : `${diff}g`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4 lg:space-y-5">
          {/* AI Widget */}
          <div className="rounded-xl p-4 lg:p-5" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4" style={{ color: "#FF6B2B" }} />
              <h3 className="text-[13px] lg:text-[14px] font-semibold" style={{ color: "#F1F5F9" }}>AI Asistan</h3>
            </div>
            <div
              className="flex items-center gap-2 rounded-lg px-3 mb-3 cursor-pointer"
              style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732", height: 36 }}
              onClick={() => onTabChange("chat")}
            >
              <span className="text-[12px] lg:text-[13px]" style={{ color: "#475569" }}>Bir şey sorun...</span>
            </div>
            <div className="space-y-1.5">
              {["Hangi projede maliyet sapması var?", "Bu ay en geciken hakedişim hangisi?", "Şantiye verimliliğim geçen haftaya göre nasıl?"].map((q, i) => (
                <button
                  key={i}
                  onClick={() => { onTabChange("chat"); onSend?.(q); }}
                  className="w-full text-left text-[11px] lg:text-[12px] px-3 py-2 rounded-lg transition-colors duration-150 truncate"
                  style={{ color: "#94A3B8" }}
                >
                  {q}
                </button>
              ))}
            </div>
            <button onClick={() => onTabChange("chat")} className="flex items-center gap-0.5 text-[11px] lg:text-[12px] font-medium mt-2" style={{ color: "#FF6B2B" }}>
              AI Asistanı Aç <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Contract Warnings Widget */}
          {(plan === "pro" || plan === "team" || plan === "enterprise" || role === "admin") && (
            <div className="rounded-xl p-4 lg:p-5" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileSignature className="w-4 h-4" style={{ color: "#FF6B2B" }} />
                  <h3 className="text-[13px] lg:text-[14px] font-semibold" style={{ color: "#F1F5F9" }}>Sözleşme Uyarıları</h3>
                </div>
                <button onClick={() => onTabChange("contracts")} className="flex items-center gap-0.5 text-[11px] lg:text-[12px] font-medium" style={{ color: "#FF6B2B" }}>
                  Tümü <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {(() => {
                const now = new Date();
                const expiring = contracts.filter(c => {
                  if (!c.end_date) return false;
                  const end = new Date(c.end_date);
                  const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                  return diff > 0 && diff <= 30;
                });
                const expired = contracts.filter(c => {
                  if (!c.end_date) return false;
                  return new Date(c.end_date) < now;
                });
                const warnings = [
                  ...expired.map(c => {
                    const days = Math.round((now.getTime() - new Date(c.end_date!).getTime()) / (1000*60*60*24));
                    return { ...c, label: `${days}g süresi doldu`, color: "#EF4444", bgColor: "rgba(239,68,68,0.1)" };
                  }),
                  ...expiring.map(c => {
                    const days = Math.round((new Date(c.end_date!).getTime() - now.getTime()) / (1000*60*60*24));
                    return { ...c, label: `${days}g kaldı`, color: "#F59E0B", bgColor: "rgba(245,158,11,0.1)" };
                  }),
                ];
                if (warnings.length === 0) {
                  return <p className="text-[12px] text-center py-4" style={{ color: "#64748B" }}>Yaklaşan sözleşme uyarısı yok ✓</p>;
                }
                return (
                  <div className="space-y-2.5">
                    {warnings.slice(0, 5).map((w) => (
                      <div key={w.id} className="flex items-start gap-2 cursor-pointer" onClick={() => onTabChange("contracts")}>
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: w.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] lg:text-[13px] font-medium truncate" style={{ color: "#F1F5F9" }}>{w.name}</p>
                          <p className="text-[10px] lg:text-[11px] truncate" style={{ color: "#64748B" }}>{w.counterparty}</p>
                        </div>
                        <span className="text-[10px] lg:text-[11px] font-medium px-1.5 py-0.5 rounded-md shrink-0" style={{ backgroundColor: w.bgColor, color: w.color }}>
                          {w.label}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}


          <div className="rounded-xl p-4 lg:p-5 relative overflow-hidden" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            {projectsLocked && <LockedOverlay label="Kurumsal Paket" onClick={() => openUpgrade("Yaklaşan İşler", true)} />}
            <h3 className="text-[13px] lg:text-[14px] font-semibold mb-3" style={{ color: "#F1F5F9" }}>Yaklaşan İşler</h3>
            <div className="space-y-2.5">
              {UPCOMING_STATIC.map((u, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: u.urgent ? "#EF4444" : "#F59E0B" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] lg:text-[13px] font-medium truncate" style={{ color: "#F1F5F9" }}>{u.task}</p>
                    <p className="text-[10px] lg:text-[11px]" style={{ color: "#64748B" }}>{u.project}</p>
                  </div>
                  <span
                    className="text-[10px] lg:text-[11px] font-medium px-1.5 py-0.5 rounded-md shrink-0"
                    style={{ backgroundColor: u.urgent ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)", color: u.urgent ? "#EF4444" : "#F59E0B" }}
                  >
                    {u.days}g
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal(prev => ({ ...prev, open: false }))}
        feature={upgradeModal.feature}
        requiresOffice={upgradeModal.requiresOffice}
      />
    </div>
  );
};

const LockedOverlay = ({ label, onClick }: { label: string; onClick?: () => void }) => (
  <div
    className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl cursor-pointer"
    style={{ backgroundColor: "rgba(15,20,25,0.85)", backdropFilter: "blur(4px)" }}
    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
  >
    <Lock className="w-5 h-5 mb-1.5" style={{ color: "#FF6B2B" }} />
    <span className="text-[11px] font-semibold" style={{ color: "#F1F5F9" }}>🔒 {label}</span>
    <span className="text-[10px] mt-0.5" style={{ color: "#64748B" }}>Bu özellik için planınızı yükseltin</span>
  </div>
);

const MiniStat = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0">
    <p className="text-[10px] lg:text-[11px] truncate" style={{ color: "#64748B" }}>{label}</p>
    <p className="text-[13px] lg:text-[15px] font-bold truncate" style={{ color: "#F1F5F9", fontFamily: "'Space Grotesk', sans-serif" }}>{value}</p>
  </div>
);

export default DesktopDashboard;
