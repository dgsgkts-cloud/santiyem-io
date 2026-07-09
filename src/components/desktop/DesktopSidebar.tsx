import { useState, useEffect, useMemo } from "react";
import { useUser, isOfficePlan } from "@/contexts/UserContext";
import { useAccessGuard, type GuardTab } from "@/lib/accessControl";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, FolderKanban, Receipt,
  BookOpen, Wallet, HardHat, BarChart3,
  Settings, LogOut, ChevronLeft, ChevronRight, Lock, Zap, Package, FileSpreadsheet, ShoppingCart, Warehouse, Truck,
} from "lucide-react";
import logo from "@/assets/muhendis-logo.png";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isNativeApp } from "@/lib/nativeGuards";
import { getCompanyProfile } from "@/lib/companyProfile";

// Localized role labels — extend as new roles are added
const ROLE_LABELS: Record<string, string> = {
  admin: "Yönetici",
  owner: "Sahip",
  site_chief: "Şantiye Şefi",
  accounting: "Muhasebe",
  purchasing: "Satın Alma",
  personnel: "Personel",
  member: "Üye",
  viewer: "İzleyici",
};

type Tab =
  | "chat" | "render" | "reminders" | "pricing" | "daily" | "dashboard" | "projects"
  | "hakedis" | "settings" | "site-diary" | "payments-kasa" | "contracts" | "materials"
  | "e-invoices" | "personnel" | "meetings" | "communication" | "reports" | "procurement" | "warehouse" | "fleet"
  | "company-memory" | "company-kb" | "ai-decisions" | "decision-history" | "company-docs";

interface DesktopSidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

// Sadeleştirilmiş navigasyon — Sprint 15.2 Production Polish.
// Company Brain (Memory / AI Decisions / Decision History / Docs) menüden kaldırıldı;
// ilgili tab id'leri Index.tsx tarafından dashboard'a yönlendiriliyor.
const NAV_SECTIONS = [
  {
    label: "ANA",
    items: [
      { id: "dashboard" as Tab, label: "Dashboard", icon: LayoutDashboard },
      { id: "projects" as Tab, label: "Projeler", icon: FolderKanban },
    ],
  },
  {
    label: "FİNANS",
    items: [
      { id: "payments-kasa" as Tab, label: "Ödemeler & Kasa", icon: Wallet },
      { id: "e-invoices" as Tab, label: "E-Fatura", icon: FileSpreadsheet },
    ],
  },
  {
    label: "OPERASYON",
    items: [
      { id: "hakedis" as Tab, label: "Hakediş", icon: Receipt },
      { id: "site-diary" as Tab, label: "Şantiye Günlüğü", icon: BookOpen },
      { id: "materials" as Tab, label: "Malzeme", icon: Package },
      { id: "personnel" as Tab, label: "Personel", icon: HardHat },
    ],
  },
  {
    label: "SATIN ALMA",
    items: [
      { id: "procurement" as Tab, label: "Satın Alma", icon: ShoppingCart },
      { id: "warehouse" as Tab, label: "Depo & Envanter", icon: Warehouse },
      { id: "fleet" as Tab, label: "Makine & Ekipman", icon: Truck },
    ],
  },
  {
    label: "ZEKA",
    items: [
      { id: "chat" as Tab, label: "Şantiyem AI", icon: MessageSquare },
      { id: "reports" as Tab, label: "Raporlar", icon: BarChart3 },
    ],
  },
  {
    label: "AYARLAR",
    items: [
      { id: "settings" as Tab, label: "Ayarlar", icon: Settings },
    ],
  },
] as Array<{ label: string; items: Array<{ id: Tab; label: string; icon: React.ElementType; soon?: boolean }> }>;
// Not: isNativeApp / Planlar linki, Ayarlar > Abonelik altından erişilebilir.
void isNativeApp;

const DesktopSidebar = ({ activeTab, onTabChange }: DesktopSidebarProps) => {
  const { user, profile, plan, role, usage, signOut, isAdmin, profileLoaded } = useUser();
  const guard = useAccessGuard();
  // Feature locks are evaluated by the central access guard (Sprint 28.6).
  // Loading window kept so we don't flash "locked" while auth/plan settle.
  const gatesReady = !user || profileLoaded;
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebarCollapsed") === "true"; } catch { return false; }
  });

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(collapsed));
  }, [collapsed]);

  const { firstName: cachedFirst, fullName: cachedFull, hasName: nameHasName, ready: nameReady } = useDisplayName();
  const displayName = cachedFull;
  const initials = (cachedFull || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const title = profile?.title || "İnşaat Mühendisi";
  const companyShort = useMemo(() => {
    try {
      const cp = getCompanyProfile();
      return cp.companyName.split(" ").slice(0, 2).join(" ");
    } catch { return ""; }
  }, []);
  const roleLabel = ROLE_LABELS[String(role || "").toLowerCase()] || (isAdmin ? "Yönetici" : "");

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

                // Sprint 28.6 — Ask the central access guard whether this
                // module is currently locked. Clicking still routes to the
                // tab so LockedPage explains why (no more silent redirects).
                const decision = guard.check(item.id as GuardTab);
                const isLocked = gatesReady && !decision.ok;

                const handleClick = () => {
                  if (!gatesReady) return;
                  onTabChange(item.id);
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
                    {!collapsed && (item as any).soon && !isLocked && (
                      <span className="ml-auto text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        Yakında
                      </span>
                    )}
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
        {!collapsed && !isAdmin && (
          <div className="px-3 pt-3 pb-2">
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                style={{
                  backgroundColor: plan === "pro" || plan === "plus" || plan === "team" ? "rgba(255,107,43,0.15)" : plan === "enterprise" || isOfficePlan(plan) ? "rgba(59,130,246,0.15)" : "rgba(100,116,139,0.15)",
                  color: plan === "pro" || plan === "plus" || plan === "team" ? "#FF6B2B" : plan === "enterprise" || isOfficePlan(plan) ? "#60A5FA" : "#64748B",
                }}
              >
                {plan === "pro" ? "Profesyonel ⭐" : plan === "team" ? "Ekip 👥" : plan === "enterprise" ? "Kurumsal 🏢" : plan === "plus" ? "Plus ✨" : plan === "office_pro" ? "Kurumsal Pro 🏢" : plan === "office_free" ? "Kurumsal 🏢" : plan === "office_custom" ? "Özel 🏢" : "Ücretsiz"}
              </span>
              {plan === "free" && !isNativeApp() && (
                <button
                  onClick={() => onTabChange("pricing")}
                  className="text-[11px] font-medium hover-upgrade-link"
                >
                  Yükselt →
                </button>
              )}
            </div>

            {plan === "free" && (
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

        {/* User row — premium, minimal (Linear / Notion / Slack feel) */}
        <div className="px-2 pt-2 pb-3">
          {collapsed ? (
          <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onTabChange("settings")}
                  className="w-full flex items-center justify-center rounded-lg hover-icon-btn"
                  style={{ height: 40 }}
                >
                  <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 26, height: 26, backgroundColor: "#FF6B2B" }}>
                    <span className="text-white text-[10px] font-bold">{initials}</span>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" style={{ backgroundColor: "#1E2732", border: "1px solid #2A3441" }}>
                {displayName}{roleLabel ? ` · ${roleLabel}` : ""}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div
              className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-colors"
              style={{ backgroundColor: "transparent" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <div className="shrink-0">
                <div className="rounded-full flex items-center justify-center" style={{ width: 26, height: 26, backgroundColor: "#FF6B2B" }}>
                  <span className="text-white text-[10px] font-bold">{initials}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-semibold truncate text-foreground leading-tight">{displayName}</p>
                  {roleLabel && (
                    <span
                      className="text-[9px] font-medium px-1.5 py-[1px] rounded shrink-0"
                      style={{ backgroundColor: "rgba(255,107,43,0.12)", color: "#FFB088" }}
                    >
                      {roleLabel}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => onTabChange("settings")}
                className="shrink-0 p-1.5 rounded-md hover-icon-btn"
                aria-label="Ayarlar"
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
