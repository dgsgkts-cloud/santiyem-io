import { useState, useEffect, useMemo } from "react";
import { useUser, isOfficePlan } from "@/contexts/UserContext";
import { useAccessGuard, type GuardTab } from "@/lib/accessControl";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, FolderKanban, Receipt,
  BookOpen, Wallet, HardHat, BarChart3, Activity,
  Settings, LogOut, ChevronLeft, ChevronRight, Lock, Package, FileSpreadsheet,
  ShoppingCart, Warehouse, Truck, FileSignature, Users, Radio, ChevronRight as Arrow,
} from "lucide-react";
import { SantiyemMark, SantiyemWordmark } from "@/components/brand/SantiyemLogo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isNativeApp } from "@/lib/nativeGuards";
import { useDisplayName } from "@/hooks/useDisplayName";
import { useNotifications } from "@/hooks/useNotifications";

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

// Sprint 35 — Premium sidebar. Modules grouped by mental model, not by feature age.
const NAV_SECTIONS = [
  {
    label: "OPERASYON",
    items: [
      { id: "dashboard" as Tab, label: "Dashboard", icon: LayoutDashboard },
      { id: "projects" as Tab, label: "Projeler", icon: FolderKanban },
      { id: "site-diary" as Tab, label: "Şantiye Günlüğü", icon: BookOpen },
      { id: "materials" as Tab, label: "Malzeme", icon: Package },
      { id: "personnel" as Tab, label: "Personel", icon: HardHat },
    ],
  },
  {
    label: "TEDARİK",
    items: [
      { id: "procurement" as Tab, label: "Satın Alma", icon: ShoppingCart },
      { id: "warehouse" as Tab, label: "Depo & Envanter", icon: Warehouse },
      { id: "fleet" as Tab, label: "Makine & Ekipman", icon: Truck },
    ],
  },
  {
    label: "FİNANS",
    items: [
      { id: "payments-kasa" as Tab, label: "Kasa", icon: Wallet },
      { id: "hakedis" as Tab, label: "Hakediş", icon: Receipt },
      { id: "e-invoices" as Tab, label: "Faturalar", icon: FileSpreadsheet },
      { id: "contracts" as Tab, label: "Sözleşmeler", icon: FileSignature },
    ],
  },
  {
    label: "YAPAY ZEKA",
    items: [
      { id: "chat" as Tab, label: "AI Asistan", icon: MessageSquare },
      { id: "reports" as Tab, label: "AI Analizleri", icon: BarChart3 },
    ],
  },
  {
    label: "İLETİŞİM",
    items: [
      { id: "meetings" as Tab, label: "Toplantılar", icon: Users },
      { id: "communication" as Tab, label: "İletişim", icon: Radio },
    ],
  },
  {
    label: "",
    items: [
      { id: "settings" as Tab, label: "Ayarlar", icon: Settings },
    ],
  },
] as Array<{ label: string; items: Array<{ id: Tab; label: string; icon: React.ElementType; soon?: boolean }> }>;

void isNativeApp;

/** Live operational health, derived from the user's real reminders & milestones. */
const AIHealthCard = ({ onOpen }: { onOpen: () => void }) => {
  const { notifications, loading } = useNotifications();

  const { score, critical, today, overdue } = useMemo(() => {
    const open = notifications.filter((n) => !n.completed);
    const overdue = open.filter((n) => n.daysLeft < 0).length;
    const today = open.filter((n) => n.daysLeft === 0).length;
    const soon = open.filter((n) => n.daysLeft > 0 && n.daysLeft <= 3).length;
    const raw = 100 - overdue * 8 - today * 4 - soon * 2;
    return {
      score: Math.max(0, Math.min(100, raw)),
      critical: overdue + today,
      today,
      overdue,
    };
  }, [notifications]);

  const tone =
    score >= 80 ? "success" : score >= 55 ? "warning" : "danger";
  const toneColor = `hsl(var(--${tone}))`;

  if (loading) {
    return (
      <div className="ds-card" style={{ padding: 16, borderRadius: 16 }}>
        <div className="ds-skeleton h-2.5 w-20 mb-3" />
        <div className="ds-skeleton h-6 w-24 mb-3" />
        <div className="ds-skeleton h-2 w-full" />
      </div>
    );
  }

  return (
    <button
      onClick={onOpen}
      className="ds-press ds-focus-ring w-full text-left ds-card ds-card-interactive ds-enter"
      style={{ padding: 16, borderRadius: 16 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="ds-label" style={{ fontSize: 10 }}>Bugünkü Sağlık</span>
        <Activity className="w-3.5 h-3.5" style={{ color: toneColor }} />
      </div>

      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="ds-heading ds-numeric" style={{ color: toneColor, fontSize: 26, lineHeight: "28px" }}>
          {score}
        </span>
        <span className="ds-caption">/100</span>
      </div>

      <div className="h-1.5 w-full rounded-full overflow-hidden bg-muted/60 mb-3">
        <div
          className="h-full rounded-full"
          style={{
            width: `${score}%`,
            background: toneColor,
            transition: "width 640ms var(--ease-spring)",
          }}
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between ds-caption">
          <span>Kritik</span>
          <span className="ds-numeric font-semibold" style={{ color: critical ? "hsl(var(--danger-muted))" : undefined }}>
            {critical}
          </span>
        </div>
        <div className="flex items-center justify-between ds-caption">
          <span>Gecikme</span>
          <span className="ds-numeric font-semibold" style={{ color: overdue ? "hsl(var(--warning-muted))" : undefined }}>
            {overdue}
          </span>
        </div>
        <div className="flex items-center justify-between ds-caption">
          <span>Bugün</span>
          <span className="ds-numeric font-semibold">{today}</span>
        </div>
      </div>

      <span className="mt-3 inline-flex items-center gap-1 ds-caption text-primary font-semibold">
        Detay <Arrow className="w-3 h-3" />
      </span>
    </button>
  );
};

const DesktopSidebar = ({ activeTab, onTabChange }: DesktopSidebarProps) => {
  const { user, profile, plan, role, usage, signOut, isAdmin, profileLoaded } = useUser();
  const guard = useAccessGuard();
  const gatesReady = !user || profileLoaded;
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebarCollapsed") === "true"; } catch { return false; }
  });

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(collapsed));
  }, [collapsed]);

  const { fullName: cachedFull, hasName: nameHasName, ready: nameReady } = useDisplayName();
  const displayName = cachedFull;
  const initials = (cachedFull || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const roleLabel = ROLE_LABELS[String(role || "").toLowerCase()] || (isAdmin ? "Yönetici" : "");
  const title = profile?.title || "İnşaat Mühendisi";

  const planLabel =
    plan === "pro" ? "Profesyonel" : plan === "team" ? "Ekip" : plan === "enterprise" ? "Kurumsal"
    : plan === "plus" ? "Plus" : plan === "office_pro" ? "Kurumsal Pro" : plan === "office_free" ? "Kurumsal"
    : plan === "office_custom" ? "Özel" : "Ücretsiz";
  const planTone =
    plan === "pro" || plan === "plus" || plan === "team" ? "ds-chip-warning"
    : plan === "enterprise" || isOfficePlan(plan) ? "ds-chip-info" : "ds-chip-neutral";

  return (
    <aside
      className="hidden lg:flex flex-col h-dvh sticky top-0 shrink-0 relative border-r border-sidebar-border ds-gpu"
      style={{
        width: collapsed ? 72 : 264,
        transition: "width 280ms var(--ease-spring)",
        background: "hsl(var(--sidebar-background) / 0.86)",
        backdropFilter: "blur(var(--glass-blur)) saturate(140%)",
        WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(140%)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
        className="ds-press ds-focus-ring absolute z-10 flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-foreground"
        style={{
          right: -11, top: "50%", transform: "translateY(-50%)",
          width: 22, height: 48, borderRadius: "0 12px 12px 0",
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Brand */}
      <div
        className={`flex items-center cursor-pointer shrink-0 ${collapsed ? "overflow-hidden" : ""}`}
        style={{
          height: collapsed ? 64 : 72,
          padding: collapsed ? "0 16px" : "0 20px",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
        onClick={() => onTabChange("dashboard")}
      >
        {collapsed ? (
          <SantiyemMark px={32} />
        ) : (
          <>
            <img
              src="/brand/horizontal-light.svg"
              alt="Şantiyem AI"
              className="brand-ink-light object-contain select-none shrink-0"
              style={{ width: 180, height: "auto", maxWidth: "100%" }}
              draggable={false}
            />
            <img
              src="/brand/horizontal.svg"
              alt=""
              aria-hidden
              className="brand-ink-dark object-contain select-none shrink-0"
              style={{ width: 180, height: "auto", maxWidth: "100%" }}
              draggable={false}
            />
          </>
        )}
      </div>


      {/* User card + AI health */}
      <div className="shrink-0" style={{ padding: collapsed ? "0 12px 12px" : "0 16px 16px" }}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onTabChange("settings")}
                className="ds-press ds-focus-ring w-full flex items-center justify-center rounded-control bg-muted/40 border border-border/60"
                style={{ height: 44 }}
              >
                <span
                  className="rounded-full flex items-center justify-center text-primary-foreground ds-caption font-bold"
                  style={{ width: 28, height: 28, background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                >
                  {initials}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {nameHasName ? `${displayName}${roleLabel ? ` · ${roleLabel}` : ""}` : "…"}
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => onTabChange("settings")}
              className="ds-press ds-focus-ring w-full ds-card ds-card-interactive flex items-center gap-3 text-left"
              style={{ padding: 12, borderRadius: 16 }}
            >
              <span
                className="rounded-full flex items-center justify-center shrink-0 ds-body-strong"
                style={{ width: 34, height: 34, background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
              >
                {initials}
              </span>
              <span className="flex-1 min-w-0">
                {nameHasName ? (
                  <span className="block ds-subtitle truncate text-foreground">{displayName}</span>
                ) : !nameReady ? (
                  <span className="ds-skeleton block h-3 w-24" />
                ) : (
                  <span className="block ds-subtitle text-foreground">—</span>
                )}
                <span className="block ds-caption truncate">{roleLabel || title}</span>
              </span>
              <span className={`ds-chip ${planTone} shrink-0`} style={{ height: 20, fontSize: 10, padding: "0 8px" }}>
                {planLabel}
              </span>
            </button>

            <AIHealthCard onOpen={() => onTabChange("dashboard")} />

            {plan === "free" && (
              <div className="px-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="ds-caption">AI Soruları</span>
                  <span className="ds-caption ds-numeric">{usage.aiQuestions.used}/{usage.aiQuestions.max}</span>
                </div>
                <div className="w-full h-1 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: "hsl(var(--primary))",
                      width: `${(usage.aiQuestions.used / usage.aiQuestions.max) * 100}%`,
                      transition: "width 600ms var(--ease-spring)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 space-y-6"
        style={{ padding: collapsed ? "0 12px 16px" : "0 12px 16px", overflow: "visible auto" }}
      >
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.label || `s-${si}`}>
            {!collapsed && section.label && (
              <p className="ds-label px-3 mb-2.5" style={{ fontSize: 10, opacity: 0.7 }}>
                {section.label}
              </p>
            )}
            {collapsed && si > 0 && <div className="h-px bg-border/60 mx-2 mb-3" />}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                const decision = guard.check(item.id as GuardTab);
                const isLocked = gatesReady && !decision.ok;

                const btn = (
                  <button
                    key={item.id}
                    onClick={() => { if (gatesReady) onTabChange(item.id); }}
                    className="ds-press ds-focus-ring w-full flex items-center relative overflow-hidden"
                    style={{
                      height: 38,
                      borderRadius: 12,
                      background: isActive ? "hsl(var(--primary) / 0.18)" : "transparent",
                      color: isLocked
                        ? "hsl(var(--muted-foreground) / 0.55)"
                        : isActive
                          ? "hsl(var(--primary))"
                          : "hsl(var(--muted-foreground))",
                      justifyContent: collapsed ? "center" : "flex-start",
                      padding: collapsed ? 0 : "0 12px",
                      gap: collapsed ? 0 : 12,
                      boxShadow: isActive
                        ? "inset 0 0 0 1px hsl(var(--primary) / 0.32), 0 1px 2px hsl(var(--primary) / 0.12)"
                        : "none",
                      fontWeight: isActive ? 600 : 500,
                    }}
                    onMouseEnter={(e) => {
                      if (isActive) return;
                      e.currentTarget.style.background = "hsl(var(--muted) / 0.6)";
                      e.currentTarget.style.color = isLocked
                        ? "hsl(var(--muted-foreground))"
                        : "hsl(var(--foreground))";
                    }}
                    onMouseLeave={(e) => {
                      if (isActive) return;
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = isLocked
                        ? "hsl(var(--muted-foreground) / 0.55)"
                        : "hsl(var(--muted-foreground))";
                    }}
                  >
                    {isActive && !isLocked && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                        style={{ width: 3, height: 22, background: "hsl(var(--primary))" }}
                      />
                    )}
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    {!collapsed && <span className="ds-body-strong whitespace-nowrap">{item.label}</span>}
                    {!collapsed && isLocked && <Lock className="w-3.5 h-3.5 ml-auto shrink-0 opacity-70" />}
                    {!collapsed && (item as any).soon && !isLocked && (
                      <span className="ds-chip ds-chip-neutral ml-auto shrink-0" style={{ height: 18, fontSize: 9 }}>
                        Yakında
                      </span>
                    )}
                  </button>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.id} delayDuration={0}>
                      <TooltipTrigger asChild>{btn}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                }
                return btn;
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto shrink-0 border-t border-sidebar-border" style={{ padding: collapsed ? 12 : 12 }}>
        {plan === "free" && !collapsed && !isNativeApp() && (
          <button
            onClick={() => onTabChange("pricing")}
            className="ds-press ds-focus-ring w-full mb-2 ds-body-strong text-primary-foreground"
            style={{ height: 36, borderRadius: 12, background: "hsl(var(--primary))" }}
          >
            Planı Yükselt
          </button>
        )}
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={user ? signOut : () => navigate("/login")}
                className="ds-press ds-focus-ring w-full flex items-center justify-center rounded-md hover-logout"
                style={{ height: 36 }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{user ? "Çıkış Yap" : "Giriş Yap"}</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={user ? signOut : () => navigate("/login")}
            className="ds-press ds-focus-ring w-full flex items-center gap-3 rounded-md hover-logout ds-body-strong"
            style={{ height: 36, padding: "0 12px" }}
          >
            <LogOut className="w-4 h-4" />
            <span>{user ? "Çıkış Yap" : "Giriş Yap"}</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default DesktopSidebar;
