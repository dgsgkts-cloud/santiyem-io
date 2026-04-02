import { useState, useEffect } from "react";
import { useUser, isOfficePlan, canAccessProjects, canAccessHakedis, canAccessRender, canAccessReminders } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";
import {
  Home, MessageSquare, FolderOpen, Receipt,
  FileSearch, Camera, Zap, Calculator,
  FileText, BookOpen, Lightbulb, ClipboardList, BarChart3,
  Settings, LogOut, Gem, User, ChevronLeft, ChevronRight, Lock
} from "lucide-react";
import logo from "@/assets/muhendis-logo.png";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Tab = "chat" | "calc" | "render" | "reminders" | "pricing" | "daily" | "dashboard" | "projects" | "hakedis" | "settings" | "site-diary" | "profitability";

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
      { id: "profitability" as Tab, label: "Karlılık & Nakit Akışı", icon: BarChart3 },
      { id: "site-diary" as Tab, label: "Şantiye Günlüğü", icon: ClipboardList },
    ],
  },
  {
    label: "ARAÇLAR",
    items: [
      { id: "render" as Tab, label: "AI Mimari Render", icon: FileSearch },
      { id: "calc" as Tab, label: "Hesap Araçları", icon: Zap },
    ],
  },
  {
    label: "İÇERİK",
    items: [
      { id: "reminders" as Tab, label: "Hatırlatıcı", icon: BookOpen },
      { id: "daily" as Tab, label: "Günlük Bilgi", icon: Lightbulb },
    ],
  },
];

const DesktopSidebar = ({ activeTab, onTabChange }: DesktopSidebarProps) => {
  const { user, profile, plan, role, usage, signOut, isAdmin } = useUser();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebarCollapsed") === "true"; } catch { return false; }
  });

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(collapsed));
  }, [collapsed]);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Kullanıcı";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <aside
      className="hidden lg:flex flex-col h-screen sticky top-0 shrink-0 relative"
      style={{
        width: collapsed ? 48 : 240,
        backgroundColor: "#0F1419",
        borderRight: "1px solid #1E2732",
        transition: "width 250ms ease-in-out",
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute z-10 flex items-center justify-center"
        style={{
          right: -10,
          top: "50%",
          transform: "translateY(-50%)",
          width: 20,
          height: 48,
          borderRadius: "0 6px 6px 0",
          backgroundColor: "#1E2732",
          border: "1px solid #2A3441",
          borderLeft: "none",
          color: "#64748B",
          transition: "background-color 200ms, color 200ms",
        }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#2A3441"; e.currentTarget.style.color = "#94A3B8"; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#1E2732"; e.currentTarget.style.color = "#64748B"; }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo */}
      <div
        className="flex items-center cursor-pointer shrink-0 overflow-hidden"
        style={{
          borderBottom: "1px solid #1E2732",
          height: 56,
          padding: collapsed ? "0 8px" : "0 16px",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: collapsed ? 0 : 8,
        }}
        onClick={() => onTabChange("dashboard")}
      >
        <img src={logo} alt="MühendisAI" className="w-8 h-8 shrink-0" />
        {!collapsed && (
          <span className="whitespace-nowrap text-[16px] font-bold" style={{ color: "#F1F5F9", fontFamily: "'Space Grotesk', sans-serif" }}>
            MühendisAI
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-4" style={{ padding: collapsed ? "12px 4px" : "12px 8px" }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-2.5 mb-1.5 text-[10px] font-semibold tracking-[0.08em] uppercase" style={{ color: "#334155" }}>
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;

                // Check if feature is locked
                const isLocked =
                  (item.id === "projects" && !canAccessProjects(plan, role)) ||
                  (item.id === "hakedis" && !canAccessHakedis(plan, role)) ||
                  (item.id === "site-diary" && !canAccessProjects(plan, role)) ||
                  (item.id === "render" && !canAccessRender(plan)) ||
                  (item.id === "reminders" && !canAccessReminders(plan));

                const handleClick = () => {
                  if (isLocked) {
                    onTabChange("pricing");
                  } else {
                    onTabChange(item.id);
                  }
                };

                const btn = (
                  <button
                    key={item.id}
                    onClick={handleClick}
                    className="w-full flex items-center rounded-lg transition-all duration-150 relative"
                    style={{
                      height: 36,
                      backgroundColor: isActive ? "rgba(255,107,43,0.12)" : "transparent",
                      color: isLocked ? "#334155" : isActive ? "#FF6B2B" : "#64748B",
                      justifyContent: collapsed ? "center" : "flex-start",
                      padding: collapsed ? "0" : "0 10px",
                      gap: collapsed ? 0 : 10,
                      opacity: isLocked ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = "#161C23"; e.currentTarget.style.color = isLocked ? "#475569" : "#F1F5F9"; }}}
                    onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = isLocked ? "#334155" : "#64748B"; }}}
                  >
                    {isActive && !isLocked && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r" style={{ backgroundColor: "#FF6B2B" }} />}
                    <Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span className="text-[13px] font-medium whitespace-nowrap">{item.label}</span>}
                    {!collapsed && isLocked && <Lock className="w-3 h-3 ml-auto shrink-0" style={{ color: "#475569" }} />}
                  </button>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.id} delayDuration={0}>
                      <TooltipTrigger asChild>{btn}</TooltipTrigger>
                      <TooltipContent side="right" className="text-xs" style={{ backgroundColor: "#1E2732", color: "#F1F5F9", border: "1px solid #2A3441" }}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return btn;
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto shrink-0 overflow-hidden" style={{ borderTop: "1px solid #1E2732" }}>
        {/* Plan badge — expanded only */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                style={{
                  backgroundColor: isAdmin ? "rgba(139,92,246,0.2)" : plan === "pro" || plan === "plus" || plan === "team" ? "rgba(255,107,43,0.15)" : plan === "enterprise" || isOfficePlan(plan) ? "rgba(59,130,246,0.15)" : "rgba(100,116,139,0.15)",
                  color: isAdmin ? "#A78BFA" : plan === "pro" || plan === "plus" || plan === "team" ? "#FF6B2B" : plan === "enterprise" || isOfficePlan(plan) ? "#60A5FA" : "#64748B",
                }}
              >
                {isAdmin ? "Admin 🔧" : plan === "pro" ? "Profesyonel ⭐" : plan === "team" ? "Ekip 👥" : plan === "enterprise" ? "Kurumsal 🏢" : plan === "plus" ? "Plus ✨" : plan === "office_pro" ? "Kurumsal Pro 🏢" : plan === "office_free" ? "Kurumsal 🏢" : plan === "office_custom" ? "Özel 🏢" : "Ücretsiz"}
              </span>
              {!isAdmin && plan === "free" && (
                <button
                  onClick={() => onTabChange("pricing")}
                  className="text-[11px] font-medium transition-all duration-150"
                  style={{ color: "#FF6B2B" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#FF8F5C"; e.currentTarget.style.transform = "translateX(2px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#FF6B2B"; e.currentTarget.style.transform = "translateX(0)"; }}
                >
                  Yükselt →
                </button>
              )}
            </div>

            {!isAdmin && plan === "free" && (
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px]" style={{ color: "#64748B" }}>AI Soruları</span>
                  <span className="text-[11px] font-mono" style={{ color: "#64748B" }}>{usage.aiQuestions.used}/3</span>
                </div>
                <div className="w-full h-1 rounded-full" style={{ backgroundColor: "#1E2732" }}>
                  <div className="h-full rounded-full transition-all duration-600" style={{ backgroundColor: "#FF6B2B", width: `${(usage.aiQuestions.used / usage.aiQuestions.max) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* User row */}
        <div className="px-1 pb-1">
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onTabChange("settings")}
                  className="w-full flex items-center justify-center rounded-lg transition-colors duration-150"
                  style={{ height: 40 }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#161C23"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#FF6B2B" }}>
                    <span className="text-white text-[11px] font-bold">{initials}</span>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" style={{ backgroundColor: "#1E2732", color: "#F1F5F9", border: "1px solid #2A3441" }}>
                {displayName}
              </TooltipContent>
            </Tooltip>
          ) : (
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
          )}
        </div>

        {/* Logout */}
        <div className="px-1 pb-1">
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={user ? signOut : () => navigate("/login")}
                  className="w-full flex items-center justify-center rounded-lg transition-colors duration-150"
                  style={{ height: 32, color: "#64748B" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "#EF4444"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#64748B"; }}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" style={{ backgroundColor: "#1E2732", color: "#F1F5F9", border: "1px solid #2A3441" }}>
                {user ? "Çıkış Yap" : "Giriş Yap"}
              </TooltipContent>
            </Tooltip>
          ) : (
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
          )}
        </div>

        {/* Plans button */}
        <div className="px-1 pb-3">
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onTabChange("pricing")}
                  className="w-full flex items-center justify-center rounded-lg transition-all duration-150"
                  style={{ height: 32, border: "1px solid #1E2732", color: "#64748B" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FF6B2B"; e.currentTarget.style.color = "#FF6B2B"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1E2732"; e.currentTarget.style.color = "#64748B"; }}
                >
                  <Gem className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" style={{ backgroundColor: "#1E2732", color: "#F1F5F9", border: "1px solid #2A3441" }}>
                Planlar
              </TooltipContent>
            </Tooltip>
          ) : (
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
          )}
        </div>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
