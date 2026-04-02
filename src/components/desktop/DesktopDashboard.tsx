import { useMemo, useState, useEffect, useCallback } from "react";
import { useUser, canAccessProjects, canAccessHakedis, canAccessProfitability, canAccessReminders } from "@/contexts/UserContext";
import {
  FolderOpen, Clock, TrendingUp, AlertTriangle, Wallet,
  MessageSquare, ChevronRight, Lightbulb, ArrowUp, ArrowDown, CalendarClock, Lock, FileSignature
} from "lucide-react";
import { useContracts } from "@/hooks/useContracts";
import { useProjects } from "@/hooks/useProjects";
import { useReminders } from "@/hooks/useReminders";
import { supabase } from "@/integrations/supabase/client";
import UpgradeModal from "@/components/UpgradeModal";

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
  const [totalHakedis, setTotalHakedis] = useState(0);
  const [pendingHakedis, setPendingHakedis] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [cashWarning, setCashWarning] = useState("");
  const [allHakedisData, setAllHakedisData] = useState<any[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueTotal, setOverdueTotal] = useState(0);
  const [overdueBannerDismissed, setOverdueBannerDismissed] = useState(() => {
    try { const d = localStorage.getItem("muhendisai_overdue_dismiss"); return d === new Date().toISOString().slice(0, 10); } catch { return false; }
  });
  const [paymentTab, setPaymentTab] = useState<"week" | "month" | "overdue">("week");
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature: string; requiresOffice: boolean }>({ open: false, feature: "", requiresOffice: false });
  const openUpgrade = useCallback((feature: string, requiresOffice: boolean) => setUpgradeModal({ open: true, feature, requiresOffice }), []);
  const name = profile?.full_name?.split(" ")[0] || "Mühendis";

  const profitLocked = !canAccessProfitability(plan, role);

  // Fetch hakedis totals + this month revenue + overdue tracking
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
      });
  }, [user]);

  // Fetch this month expenses
  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    supabase
      .from("project_expenses")
      .select("amount")
      .gte("expense_date", startOfMonth)
      .then(({ data }) => {
        if (!data) return;
        setMonthExpense(data.reduce((s, e) => s + Number(e.amount), 0));
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
    <div className="p-3 sm:p-4 lg:p-6 max-w-[1200px] mx-auto space-y-4 lg:space-y-5">
      {/* Welcome */}
      <div className="rounded-xl p-4 lg:p-5" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732", borderLeft: "3px solid #FF6B2B" }}>
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <h2 className="text-base lg:text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#F1F5F9" }}>
            ☀️ Günaydın, {name}
          </h2>
          <span className="text-[11px] lg:text-[13px] hidden sm:block" style={{ color: "#64748B" }}>{formatDate(new Date())}</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniStat emoji="📌" label="Aktif Projeler" value={projectsLocked ? "🔒" : String(activeProjects)} />
          <MiniStat emoji="⏰" label="Bu Hafta Teslim" value={remindersLocked ? "🔒" : String(upcomingThisWeek)} />
          <MiniStat emoji="💰" label="Bekleyen Tahsilat" value={hakedisLocked ? "🔒" : formatCurrency(pendingHakedis)} />
          <MiniStat emoji="⚠️" label="Geciken Hatırlatıcı" value={remindersLocked ? "🔒" : String(delayedReminders)} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl p-3 lg:p-5 transition-all duration-150 relative overflow-hidden"
              style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}
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
      <div className="rounded-xl p-4 lg:p-5 relative overflow-hidden" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
        {profitLocked && <LockedOverlay label="Profesyonel Paket" onClick={() => openUpgrade("Finansal Özet", false)} />}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4" style={{ color: "#FF6B2B" }} />
            <h3 className="text-[13px] lg:text-[14px] font-semibold" style={{ color: "#F1F5F9" }}>Finansal Özet — Bu Ay</h3>
          </div>
          <button onClick={() => onTabChange("profitability")} className="flex items-center gap-0.5 text-[11px] lg:text-[12px] font-medium" style={{ color: "#FF6B2B" }}>
            Detay <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg p-3" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#64748B" }}>Ciro</p>
            <p className="text-lg lg:text-xl font-bold" style={{ color: "#3B82F6", fontFamily: "'Space Grotesk', sans-serif" }}>{formatCurrency(monthRevenue)}</p>
          </div>
          <div className="rounded-lg p-3" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#64748B" }}>Gider</p>
            <p className="text-lg lg:text-xl font-bold" style={{ color: "#EF4444", fontFamily: "'Space Grotesk', sans-serif" }}>{formatCurrency(monthExpense)}</p>
          </div>
          <div className="rounded-lg p-3" style={{ backgroundColor: "#0F1419", border: "1px solid #1E2732" }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: "#64748B" }}>Net Kar</p>
            <p className="text-lg lg:text-xl font-bold" style={{ color: monthRevenue - monthExpense >= 0 ? "#22C55E" : "#EF4444", fontFamily: "'Space Grotesk', sans-serif" }}>
              {formatCurrency(monthRevenue - monthExpense)}
            </p>
          </div>
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

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 lg:gap-5">
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
              Tüm Sohbetler <ChevronRight className="w-3 h-3" />
            </button>
          </div>


          {/* Upcoming */}
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

const MiniStat = ({ emoji, label, value }: { emoji: string; label: string; value: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-base lg:text-lg">{emoji}</span>
    <div className="min-w-0">
      <p className="text-[10px] lg:text-[11px] truncate" style={{ color: "#64748B" }}>{label}</p>
      <p className="text-[12px] lg:text-[14px] font-semibold truncate" style={{ color: "#F1F5F9" }}>{value}</p>
    </div>
  </div>
);

export default DesktopDashboard;
