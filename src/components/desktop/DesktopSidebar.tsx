import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";
import {
  Home, MessageSquare, FolderOpen, Receipt,
  FileSearch, Camera, Zap, Calculator,
  FileText, BookOpen, Lightbulb, BarChart3,
  Settings, LogOut, Gem, User, ChevronRight
} from "lucide-react";
import logo from "@/assets/muhendis-logo.png";
import { Progress } from "@/components/ui/progress";

type Tab = "chat" | "weather" | "news" | "events" | "calc" | "render" | "reminders" | "pricing" | "daily" | "dashboard" | "projects" | "hakedis" | "settings" | "realestate";

interface DesktopSidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const NAV_SECTIONS = [
  {
    label: "ANA",
    items: [
      { id: "dashboard" as Tab, label: "Dashboard", icon: Home },
      { id: "chat" as Tab, label: "AI Asistan", icon: MessageSquare },
    ],
  },
  {
    label: "PROJELER",
    items: [
      { id: "projects" as Tab, label: "Proje Yönetimi", icon: FolderOpen },
      { id: "hakedis" as Tab, label: "Hakediş Yönetimi", icon: Receipt },
    ],
  },
  {
    label: "ARAÇLAR",
    items: [
      { id: "render" as Tab, label: "AI Mimari Render", icon: FileSearch },
      { id: "weather" as Tab, label: "Hava Durumu", icon: Camera },
      { id: "calc" as Tab, label: "Hesap Araçları", icon: Zap },
      { id: "events" as Tab, label: "Etkinlik Takvimi", icon: Calculator },
    ],
  },
  {
    label: "İÇERİK",
    items: [
      { id: "news" as Tab, label: "Haberler ve Mevzuat", icon: FileText },
      { id: "reminders" as Tab, label: "Hatırlatıcı", icon: BookOpen },
      { id: "daily" as Tab, label: "Günlük Bilgi", icon: Lightbulb },
    ],
  },
];

const DesktopSidebar = ({ activeTab, onTabChange }: DesktopSidebarProps) => {
  const { user, profile, plan, usage, signOut } = useUser();
  const navigate = useNavigate();

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Kullanıcı";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside className="hidden lg:flex flex-col w-[240px] h-screen sticky top-0 shrink-0" style={{ backgroundColor: "#0F1419", borderRight: "1px solid #1E2732" }}>
      {/* Logo */}
      <div className="px-4 py-5 cursor-pointer flex items-center gap-2" style={{ borderBottom: "1px solid #1E2732" }} onClick={() => onTabChange("dashboard")}>
        <img src={logo} alt="MühendisAI" className="w-8 h-8" />
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "#F1F5F9", fontSize: 16 }}>
          MühendisAI
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-2.5 mb-1.5 text-[10px] font-semibold tracking-[0.08em] uppercase" style={{ color: "#334155" }}>
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className="w-full flex items-center gap-2.5 px-2.5 rounded-lg transition-all duration-150 relative"
                    style={{
                      height: 36,
                      backgroundColor: isActive ? "rgba(255,107,43,0.12)" : "transparent",
                      color: isActive ? "#FF6B2B" : "#64748B",
                    }}
                    onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = "#161C23"; e.currentTarget.style.color = "#F1F5F9"; }}}
                    onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#64748B"; }}}
                  >
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r" style={{ backgroundColor: "#FF6B2B" }} />}
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-[13px] font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto" style={{ borderTop: "1px solid #1E2732" }}>
        {/* Plan badge */}
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: plan === "pro" ? "rgba(255,107,43,0.15)" : plan === "office" ? "rgba(59,130,246,0.15)" : "rgba(100,116,139,0.15)",
                color: plan === "pro" ? "#FF6B2B" : plan === "office" ? "#60A5FA" : "#64748B",
              }}
            >
              {plan === "pro" ? "Pro ⭐" : plan === "office" ? "Ofis 🏢" : "Ücretsiz"}
            </span>
            {plan === "free" && (
              <button onClick={() => onTabChange("pricing")} className="text-[11px] font-medium transition-colors" style={{ color: "#FF6B2B" }}>
                Yükselt →
              </button>
            )}
          </div>

          {plan === "free" && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px]" style={{ color: "#64748B" }}>AI Soruları</span>
                <span className="text-[11px] font-mono" style={{ color: "#64748B" }}>{usage.aiQuestions.used}/{usage.aiQuestions.max}</span>
              </div>
              <div className="w-full h-1 rounded-full" style={{ backgroundColor: "#1E2732" }}>
                <div className="h-full rounded-full transition-all duration-600" style={{ backgroundColor: "#FF6B2B", width: `${(usage.aiQuestions.used / usage.aiQuestions.max) * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* User row */}
        <div className="px-2 pb-1">
          <button
            onClick={() => onTabChange("settings")}
            className="w-full flex items-center gap-2.5 px-2 rounded-lg transition-colors duration-150"
            style={{ height: 40 }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#161C23"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#FF6B2B" }}>
              <span className="text-white text-[11px] font-bold">{initials}</span>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[12px] font-semibold truncate" style={{ color: "#F1F5F9" }}>{displayName}</p>
              <p className="text-[10px] truncate" style={{ color: "#64748B" }}>{profile?.title || "Mühendis"}</p>
            </div>
            <Settings className="w-3.5 h-3.5 shrink-0" style={{ color: "#475569" }} />
          </button>
        </div>

        {/* Logout */}
        <div className="px-2 pb-2">
          <button
            onClick={user ? signOut : () => navigate("/login")}
            className="w-full flex items-center gap-2.5 px-2 rounded-lg transition-colors duration-150"
            style={{ height: 32, color: "#64748B" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#EF4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#64748B"; }}
          >
            <LogOut className="w-4 h-4" />
            <span className="text-[13px]">{user ? "Çıkış Yap" : "Giriş Yap"}</span>
          </button>
        </div>

        {/* Plans button */}
        <div className="px-2 pb-3">
          <button
            onClick={() => onTabChange("pricing")}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg transition-all duration-150"
            style={{ height: 32, border: "1px solid #1E2732", color: "#64748B" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FF6B2B"; e.currentTarget.style.color = "#FF6B2B"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1E2732"; e.currentTarget.style.color = "#64748B"; }}
          >
            <Gem className="w-3.5 h-3.5" />
            <span className="text-[12px] font-medium">Planlar</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
