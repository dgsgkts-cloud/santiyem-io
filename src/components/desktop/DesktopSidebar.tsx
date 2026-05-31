import { useState, useEffect } from "react";
import { useUser, isOfficePlan, canAccessProjects, canAccessHakedis, canAccessProfitability, canAccessReminders, isProOrAbove } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, FolderKanban, Receipt,
  BookOpen, TrendingUp, Calculator,
  Bell, Crown, FileSignature, Wallet,
  Settings, LogOut, User, ChevronLeft, ChevronRight, Lock, Zap, Camera, Package, FileSpreadsheet
} from "lucide-react";
import logo from "@/assets/muhendis-logo.png";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isNativeApp } from "@/lib/nativeGuards";

type Tab = "chat" | "render" | "reminders" | "pricing" | "daily" | "dashboard" | "projects" | "hakedis" | "settings" | "site-diary" | "payments-kasa" | "contracts" | "materials" | "e-invoices";

interface DesktopSidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const NAV_SECTIONS = [
  {
    label: "ANA",
    items: [
      { id: "dashboard" as Tab, label: "Dashboard", icon: LayoutDashboard },
      { id: "chat" as Tab, label: "AI Asistan", icon: MessageSquare },
    ],
  },
  {
    label: "PROJELER",
    items: [
      { id: "projects" as Tab, label: "Proje Yönetimi", icon: FolderKanban },
      { id: "hakedis" as Tab, label: "Hakediş Yönetimi", icon: Receipt },
      { id: "contracts" as Tab, label: "Sözleşme Takibi", icon: FileSignature },
      { id: "payments-kasa" as Tab, label: "Ödemeler & Kasa", icon: Wallet },
      { id: "site-diary" as Tab, label: "Şantiye Günlüğü", icon: BookOpen },
      { id: "materials" as Tab, label: "Malzeme Takibi", icon: Package },
      { id: "e-invoices" as Tab, label: "E-Fatura / E-Arşiv", icon: FileSpreadsheet },
    ],
  },
  {
    label: "İÇERİK",
    items: [
      { id: "reminders" as Tab, label: "Hatırlatıcı", icon: Bell },
      // "pricing" intentionally omitted on native (Apple/Google IAP rules)
      ...(isNativeApp() ? [] : [{ id: "pricing" as Tab, label: "Planlar", icon: Crown }]),
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
      className="hidden lg:flex flex-col h-screen sticky top-0 shrink-0 relative bg-sidebar border-r border-sidebar-border"
      style={{
        width: collapsed ? 48 : 240,
        transition: "width 250ms ease-in-out",
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute z-10 flex items-center justify-center bg-muted border border-border border-l-0 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-200"
        style={{
          right: -10,
          top: "50%",
          transform: "translateY(-50%)",
          width: 20,
          height: 48,
          borderRadius: "0 6px 6px 0",
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo */}
      <div
        className="flex items-center cursor-pointer shrink-0 overflow-hidden border-b border-sidebar-border"
        style={{
          height: 56,
          padding: collapsed ? "0 8px" : "0 16px",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: collapsed ? 0 : 8,
        }}
        onClick={() => onTabChange("dashboard")}
      >
        <img src={logo} alt="Şantiyem" className="w-8 h-8 shrink-0" />
        {!collapsed && (
          <span className="whitespace-nowrap text-[16px] font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Şantiyem
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4" style={{ padding: collapsed ? "12px 4px" : "12px 8px", overflow: "visible auto" }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-2.5 mb-1.5 text-[10px] font-semibold tracking-[0.08em] uppercase text-muted-foreground/60">
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
                  (item.id === "contracts" && !isProOrAbove(plan) && role !== "admin") ||
                  (item.id === "payments-kasa" && !canAccessProfitability(plan, role)) ||
                   (item.id === "site-diary" && !canAccessProjects(plan, role)) ||
                  (item.id === "materials" && !canAccessProjects(plan, role)) ||
                  (item.id === "e-invoices" && !canAccessProfitability(plan, role)) ||
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
                      color: isLocked ? "hsl(var(--muted-foreground) / 0.5)" : isActive ? "#FF6B2B" : "hsl(var(--muted-foreground))",
                      justifyContent: collapsed ? "center" : "flex-start",
                      padding: collapsed ? "0" : "0 10px",
                      gap: collapsed ? 0 : 10,
                      opacity: isLocked ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = "hsl(var(--muted))"; e.currentTarget.style.color = isLocked ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))"; }}}
                    onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = isLocked ? "hsl(var(--muted-foreground) / 0.5)" : "hsl(var(--muted-foreground))"; }}}
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
                      <TooltipContent side="right" className="text-xs" style={{ backgroundColor: "#1E2732", border: "1px solid #2A3441" }}>
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
      <div className="mt-auto shrink-0 overflow-hidden border-t border-sidebar-border">
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
              {!isAdmin && plan === "free" && !isNativeApp() && (
                <button
                  onClick={() => onTabChange("pricing")}
                  className="text-[11px] font-medium hover-upgrade-link"
                >
                  Yükselt →
                </button>
              )}
            </div>

            {!isAdmin && plan === "free" && (
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-muted-foreground">AI Soruları</span>
                  <span className="text-[11px] font-mono text-muted-foreground">{usage.aiQuestions.used}/3</span>
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
                  className="w-full flex items-center justify-center rounded-lg hover-icon-btn relative"
                  style={{ height: 40 }}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: isAdmin ? "#8B5CF6" : "#FF6B2B" }}>
                    <span className="text-white text-[11px] font-bold">{initials}</span>
                  </div>
                  {isAdmin && (
                    <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#8B5CF6", border: "2px solid hsl(var(--sidebar-background))" }}>
                      <Zap className="w-2 h-2 text-white" />
                    </div>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" style={{ backgroundColor: "#1E2732", border: "1px solid #2A3441" }}>
                {displayName} {isAdmin && "⚡ Admin"}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2.5 px-2 rounded-lg" style={{ height: 44 }}>
              <div className="relative shrink-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: isAdmin ? "#8B5CF6" : "#FF6B2B" }}>
                  <span className="text-white text-[11px] font-bold">{initials}</span>
                </div>
                {isAdmin && (
                  <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#8B5CF6", border: "2px solid hsl(var(--sidebar-background))" }}>
                    <Zap className="w-2 h-2 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-bold truncate text-foreground">{displayName}</p>
                  {isAdmin && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(139,92,246,0.2)", color: "#A78BFA" }}>ADMIN</span>}
                </div>
                <p className="text-[11px] truncate text-muted-foreground">{profile?.title || "Mühendis"}</p>
              </div>
              <button
                onClick={() => onTabChange("settings")}
                className="shrink-0 p-1 rounded hover-icon-btn"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="px-1 pb-3">
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={user ? signOut : () => navigate("/login")}
                  className="w-full flex items-center justify-center rounded-lg hover-logout"
                  style={{ height: 32 }}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" style={{ backgroundColor: "#1E2732", border: "1px solid #2A3441" }}>
                {user ? "Çıkış Yap" : "Giriş Yap"}
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={user ? signOut : () => navigate("/login")}
              className="w-full flex items-center gap-2.5 px-2 rounded-lg hover-logout"
              style={{ height: 28 }}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-[12px]">{user ? "Çıkış Yap" : "Giriş Yap"}</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
