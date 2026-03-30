import { useUser } from "@/contexts/UserContext";
import {
  FolderOpen, Clock, TrendingUp, AlertTriangle,
  MessageSquare, ChevronRight, Lightbulb, ArrowUp, ArrowDown, CalendarClock
} from "lucide-react";
import { PROJECTS as SHARED_PROJECTS } from "@/lib/projectsData";
import { useReminders } from "@/hooks/useReminders";

interface DesktopDashboardProps {
  onTabChange: (tab: string) => void;
  onSend?: (text: string) => void;
  onProjectSelect?: (projectId: string) => void;
}

const formatDate = (d: Date) =>
  `${d.getDate()} ${["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"][d.getMonth()]} ${d.getFullYear()}`;

const STAT_CARDS = [
  { label: "Toplam Proje", value: "12", icon: FolderOpen, change: "+2", up: true, desc: "Bu ay" },
  { label: "Devam Eden", value: "8", icon: Clock, change: "+1", up: true, desc: "Aktif" },
  { label: "Hakediş", value: "₺485K", icon: TrendingUp, change: "+15%", up: true, desc: "Bu ay" },
  { label: "Geciken", value: "3", icon: AlertTriangle, change: "+1", up: false, desc: "Dikkat!", isAlert: true },
];

const PROJECTS = SHARED_PROJECTS.map(p => ({
  id: p.id,
  name: p.name.replace("Villa Projesi - ", "Villa - ").replace("AVM İnşaatı - ", "AVM - ").replace("Konut Projesi - ", "Konut - "),
  client: p.client,
  progress: p.progress,
  delayed: p.delayed,
  status: p.status === "Tamamlanıyor" ? "Bitmek üzere" : p.status === "Devam Ediyor" ? "Devam" : p.status,
  statusColor: p.statusColor,
}));

const ACTIVITIES = [
  { text: "Villa hakediş onaylandı", time: "2sa", color: "#22C55E" },
  { text: "AVM gecikme raporu eklendi", time: "4sa", color: "#EF4444" },
  { text: "Mevzuat güncellemesi", time: "6sa", color: "#818CF8" },
  { text: "Konut projesi %90'ı aştı", time: "1g", color: "#F59E0B" },
];

const UPCOMING = [
  { task: "Temel betonu dökümü", project: "Fabrika", days: 2, urgent: true },
  { task: "Yapı denetim kontrolü", project: "Villa", days: 4, urgent: false },
  { task: "Hakediş sunumu", project: "AVM", days: 5, urgent: false },
];

const DesktopDashboard = ({ onTabChange, onSend, onProjectSelect }: DesktopDashboardProps) => {
  const { profile } = useUser();
  const name = profile?.full_name?.split(" ")[0] || "Mühendis";

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
          <MiniStat emoji="📌" label="Aktif Projeler" value="8" />
          <MiniStat emoji="⏰" label="Bu Hafta Teslim" value="3" />
          <MiniStat emoji="💰" label="Bekleyen Tahsilat" value="₺125K" />
          <MiniStat emoji="🌤️" label="Şantiye Havası" value="28°C" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {STAT_CARDS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl p-3 lg:p-5 transition-all duration-150"
              style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}
            >
              <div className="flex items-center gap-2 mb-2 lg:mb-3">
                <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(255,107,43,0.15)" }}>
                  <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4" style={{ color: "#FF6B2B" }} />
                </div>
                <span className="text-[10px] lg:text-[11px] font-semibold uppercase tracking-wide truncate" style={{ color: "#64748B" }}>{stat.label}</span>
              </div>
              <p className="text-xl lg:text-[28px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#F1F5F9" }}>
                {stat.value}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {stat.up ? <ArrowUp className="w-3 h-3 shrink-0" style={{ color: stat.isAlert ? "#EF4444" : "#22C55E" }} /> : <ArrowDown className="w-3 h-3 shrink-0" style={{ color: "#EF4444" }} />}
                <span className="text-[11px] lg:text-[12px]" style={{ color: stat.isAlert ? "#EF4444" : stat.up ? "#22C55E" : "#EF4444" }}>{stat.change}</span>
                <span className="text-[11px] lg:text-[12px] ml-0.5 truncate" style={{ color: "#64748B" }}>{stat.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main content - stacked on mobile, two columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 lg:gap-5">
        {/* Left column */}
        <div className="space-y-4 lg:space-y-5 min-w-0">
          {/* Projects - card list on mobile, table on desktop */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <div className="flex items-center justify-between p-4 lg:p-5 pb-3">
              <h3 className="text-sm lg:text-[15px] font-semibold" style={{ color: "#F1F5F9" }}>Aktif Projeler</h3>
              <button onClick={() => onTabChange("projects")} className="flex items-center gap-0.5 text-[12px] font-medium shrink-0" style={{ color: "#FF6B2B" }}>
                Tümü <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ backgroundColor: "#0F1419" }}>
                    {["Proje Adı", "Müşteri", "İlerleme", "Geciken", "Durum"].map((h) => (
                      <th key={h} className="text-left px-5 py-2.5 font-semibold uppercase tracking-wide" style={{ color: "#64748B", fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PROJECTS.map((p, i) => (
                    <tr key={i} onClick={() => onProjectSelect?.(p.id)} className="transition-colors duration-150 cursor-pointer" style={{ borderBottom: "1px solid #1E2732" }}>
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
                      <td className="px-5 py-3"><span style={{ color: p.delayed > 0 ? "#EF4444" : "#22C55E" }}>{p.delayed}</span></td>
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
              {PROJECTS.map((p, i) => (
                <div key={i} onClick={() => onProjectSelect?.(p.id)} className="px-4 py-3 space-y-2 cursor-pointer active:bg-[#1C242D] transition-colors" style={{ borderColor: "#1E2732" }}>
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
          </div>

          {/* Activities */}
          <div className="rounded-xl p-4 lg:p-5" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <h3 className="text-sm lg:text-[15px] font-semibold mb-3 lg:mb-4" style={{ color: "#F1F5F9" }}>Son Aktiviteler</h3>
            <div className="space-y-2.5 lg:space-y-3">
              {ACTIVITIES.map((a, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                  <span className="text-[12px] lg:text-[13px] flex-1 min-w-0 truncate" style={{ color: "#94A3B8" }}>{a.text}</span>
                  <span className="text-[11px] lg:text-[12px] shrink-0" style={{ color: "#64748B" }}>{a.time}</span>
                </div>
              ))}
            </div>
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
              {["Deprem yükü hesabı nasıl yapılır?", "TAKS/KAKS hesaplama yöntemi", "TS 825 yalıtım kalınlığı"].map((q, i) => (
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

          {/* Daily Knowledge */}
          <div className="rounded-xl p-4 lg:p-5" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4" style={{ color: "#FF6B2B" }} />
              <h3 className="text-[13px] lg:text-[14px] font-semibold" style={{ color: "#F1F5F9" }}>Günlük Bilgi</h3>
            </div>
            <p className="text-[12px] lg:text-[13px] font-semibold mb-1" style={{ color: "#F1F5F9" }}>Deprem Yönetmeliğinde Min. Kolon Boyutu</p>
            <p className="text-[11px] lg:text-[12px] leading-relaxed mb-2" style={{ color: "#64748B" }}>
              TBDY 2018'e göre deprem bölgelerinde minimum kolon kesit boyutu 300mm olarak belirlenmiştir...
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: "rgba(255,107,43,0.1)", color: "#FF6B2B" }}>TBDY 2018</span>
              <button onClick={() => onTabChange("daily")} className="flex items-center gap-0.5 text-[11px] lg:text-[12px] font-medium ml-auto" style={{ color: "#FF6B2B" }}>
                Devamı <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Upcoming */}
          <div className="rounded-xl p-4 lg:p-5" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
            <h3 className="text-[13px] lg:text-[14px] font-semibold mb-3" style={{ color: "#F1F5F9" }}>Yaklaşan İşler</h3>
            <div className="space-y-2.5">
              {UPCOMING.map((u, i) => (
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
    </div>
  );
};

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
