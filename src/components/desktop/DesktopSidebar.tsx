import { useState, useEffect } from "react";
import { useUser, isOfficePlan } from "@/contexts/UserContext";
import { useAccessGuard, type GuardTab } from "@/lib/accessControl";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings, LogOut, ChevronLeft, ChevronRight, ChevronDown, Lock } from "lucide-react";
import { BrandHomeLink } from "@/components/brand/BrandHomeLink";
import { SantiyemMark } from "@/components/brand/SantiyemLogo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isNativeApp } from "@/lib/nativeGuards";
import { useDisplayName } from "@/hooks/useDisplayName";
import {
  NAV_AREAS, isAreaActive, isLeafActive, type NavArea, type NavLeaf, type NavSearch,
} from "@/lib/navConfig";

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

type Tab = string;

interface DesktopSidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab, search?: NavSearch) => void;
}

void isNativeApp;

const DesktopSidebar = ({ activeTab, onTabChange }: DesktopSidebarProps) => {
  const { user, profile, plan, role, signOut, isAdmin, profileLoaded } = useUser();
  const guard = useAccessGuard();
  const gatesReady = !user || profileLoaded;
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebarCollapsed") === "true"; } catch { return false; }
  });
  // Accordion state — the group owning the active tab stays open.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

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
    : plan === "office_custom" ? "Özel" : plan === "demo_full_access" ? "Demo Hesabı" : "Ücretsiz";
  const planTone =
    plan === "pro" || plan === "plus" || plan === "team" ? "ds-chip-warning"
    : plan === "enterprise" || plan === "demo_full_access" || isOfficePlan(plan) ? "ds-chip-info" : "ds-chip-neutral";

  // Hide only what the role is not permitted to see; plan/setup gates stay
  // visible with a lock so the user can still discover the module.
  const leafVisible = (leaf: NavLeaf) =>
    !gatesReady || guard.check(leaf.tab as GuardTab).reason !== "role-forbidden";

  const areas: NavArea[] = NAV_AREAS
    .map((a) => (a.children ? { ...a, children: a.children.filter(leafVisible) } : a))
    .filter((a) => (a.children ? a.children.length > 0 : true));

  const isGroupOpen = (area: NavArea) =>
    openGroups[area.id] ?? isAreaActive(area, activeTab);

  const toggleGroup = (area: NavArea) => {
    if (collapsed) {
      setCollapsed(false);
      setOpenGroups((s) => ({ ...s, [area.id]: true }));
      return;
    }
    setOpenGroups((s) => ({ ...s, [area.id]: !isGroupOpen(area) }));
  };

  const rowStyle = (active: boolean, accent: boolean, locked: boolean, depth: 0 | 1) => ({
    height: depth === 0 ? 42 : 36,
    borderRadius: depth === 0 ? 13 : 11,
    background: active ? "hsl(var(--primary) / 0.18)" : accent ? "hsl(var(--primary) / 0.06)" : "transparent",
    color: locked
      ? "hsl(var(--muted-foreground) / 0.55)"
      : active || accent
        ? "hsl(var(--primary))"
        : "hsl(var(--muted-foreground))",
    justifyContent: collapsed ? "center" : "flex-start",
    padding: collapsed ? 0 : depth === 0 ? "0 12px" : "0 12px 0 14px",
    gap: collapsed ? 0 : 12,
    boxShadow: active
      ? "inset 0 0 0 1px hsl(var(--primary) / 0.32), 0 1px 2px hsl(var(--primary) / 0.12)"
      : accent
        ? "inset 0 0 0 1px hsl(var(--primary) / 0.18)"
        : "none",
    fontWeight: active || accent ? 600 : 500,
  }) as React.CSSProperties;

  const withHover = (active: boolean, accent: boolean, locked: boolean) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      if (active) return;
      e.currentTarget.style.background = accent ? "hsl(var(--primary) / 0.14)" : "hsl(var(--muted) / 0.6)";
      e.currentTarget.style.color = locked
        ? "hsl(var(--muted-foreground))"
        : accent ? "hsl(var(--primary))" : "hsl(var(--foreground))";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      if (active) return;
      e.currentTarget.style.background = accent ? "hsl(var(--primary) / 0.06)" : "transparent";
      e.currentTarget.style.color = locked
        ? "hsl(var(--muted-foreground) / 0.55)"
        : accent ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";
    },
  });

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

      {/* Brand — navigates to Ana Sayfa (dashboard) */}
      <BrandHomeLink
        className={`flex items-center shrink-0 ${collapsed ? "overflow-hidden" : ""}`}
        onNavigate={() => onTabChange("dashboard")}
      >
        <span
          className={`flex items-center w-full ${collapsed ? "justify-center" : "justify-start"}`}
          style={{
            height: collapsed ? 64 : 72,
            padding: collapsed ? "0 16px" : "0 18px",
          }}
        >
        {collapsed ? (
          <SantiyemMark px={36} />
        ) : (
          <>
            <img
              src="/brand/horizontal-light.svg"
              alt="Şantiyem AI"
              className="brand-ink-light select-none shrink-0"
              style={{ width: 180, height: "auto", maxWidth: "calc(100% - 36px)", objectFit: "contain", objectPosition: "left center" }}
              draggable={false}
            />
            <img
              src="/brand/horizontal.svg"
              alt=""
              aria-hidden
              className="brand-ink-dark select-none shrink-0"
              style={{ width: 180, height: "auto", maxWidth: "calc(100% - 36px)", objectFit: "contain", objectPosition: "left center" }}
              draggable={false}
            />
          </>
        )}
        </span>
      </BrandHomeLink>

      {/* Compact user card — no KPIs, health cards or quota counters in navigation */}
      <div className="shrink-0" style={{ padding: collapsed ? "0 12px 20px" : "0 14px 22px" }}>
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
        )}
      </div>

      {/* Navigation — six primary areas, accordion sub-groups */}
      <nav
        className="flex-1"
        style={{
          padding: collapsed ? "0 12px 16px" : "0 14px 16px",
          overflow: "visible auto",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {areas.map((area) => {
          const Icon = area.icon;
          const decision = guard.check((area.tab ?? area.children![0].tab) as GuardTab);
          const isLocked = gatesReady && !!area.tab && !decision.ok;
          const active = area.tab ? activeTab === area.tab : isAreaActive(area, activeTab);
          const accent = !!area.accent && !isLocked;
          const open = isGroupOpen(area);

          const areaBtn = (
            <button
              onClick={() => {
                if (!gatesReady) return;
                if (area.children) toggleGroup(area);
                else onTabChange(area.tab!);
              }}
              aria-expanded={area.children ? open : undefined}
              className="ds-press ds-focus-ring w-full flex items-center relative overflow-hidden"
              style={rowStyle(active, accent, isLocked, 0)}
              {...withHover(active, accent, isLocked)}
            >
              {active && !isLocked && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                  style={{ width: 3, height: 22, background: "hsl(var(--primary))" }}
                />
              )}
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {!collapsed && <span className="ds-body-strong whitespace-nowrap">{area.label}</span>}
              {!collapsed && isLocked && <Lock className="w-3.5 h-3.5 ml-auto shrink-0 opacity-70" />}
              {!collapsed && area.children && (
                <ChevronDown
                  className="w-3.5 h-3.5 ml-auto shrink-0 transition-transform duration-200"
                  style={{ transform: open ? "rotate(180deg)" : "none", opacity: 0.7 }}
                />
              )}
            </button>
          );

          return (
            <div key={area.id}>
              {collapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>{areaBtn}</TooltipTrigger>
                  <TooltipContent side="right">{area.label}</TooltipContent>
                </Tooltip>
              ) : (
                areaBtn
              )}

              {!collapsed && area.children && open && (
                <div
                  className="ml-[18px] pl-3 border-l border-border/60"
                  style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4, marginBottom: 4 }}
                >
                  {area.children.map((leaf) => {
                    const LeafIcon = leaf.icon;
                    const leafDecision = guard.check(leaf.tab as GuardTab);
                    const leafLocked = gatesReady && !leafDecision.ok;
                    const leafActive = isLeafActive(leaf, activeTab, location.search);
                    return (
                      <button
                        key={leaf.id}
                        onClick={() => { if (gatesReady) onTabChange(leaf.tab, leaf.search); }}
                        className="ds-press ds-focus-ring w-full flex items-center overflow-hidden"
                        style={rowStyle(leafActive, false, leafLocked, 1)}
                        {...withHover(leafActive, false, leafLocked)}
                      >
                        <LeafIcon className="w-4 h-4 shrink-0" />
                        <span className="ds-caption whitespace-nowrap" style={{ fontSize: 12.5 }}>{leaf.label}</span>
                        {leafLocked && <Lock className="w-3 h-3 ml-auto shrink-0 opacity-70" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Ayarlar */}
        <div style={{ marginTop: 10 }}>
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onTabChange("settings")}
                  className="ds-press ds-focus-ring w-full flex items-center overflow-hidden"
                  style={rowStyle(activeTab === "settings", false, false, 0)}
                  {...withHover(activeTab === "settings", false, false)}
                >
                  <Settings className="w-[18px] h-[18px] shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Ayarlar</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => onTabChange("settings")}
              className="ds-press ds-focus-ring w-full flex items-center overflow-hidden"
              style={rowStyle(activeTab === "settings", false, false, 0)}
              {...withHover(activeTab === "settings", false, false)}
            >
              <Settings className="w-[18px] h-[18px] shrink-0" />
              <span className="ds-body-strong whitespace-nowrap">Ayarlar</span>
            </button>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="mt-auto shrink-0 border-t border-sidebar-border" style={{ padding: collapsed ? 12 : 12 }}>
        {plan === "free" && !collapsed && !isNativeApp() && (
          <button
            onClick={() => onTabChange("pricing")}
            className="ds-press ds-focus-ring w-full mb-2 ds-body-strong text-primary-foreground"
            style={{ height: 40, borderRadius: "var(--radius-control-md)", background: "hsl(var(--primary))" }}
          >
            Planı Yükselt
          </button>
        )}
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={user ? signOut : () => navigate("/login")}
                className="ds-press ds-focus-ring w-full flex items-center justify-center rounded-control hover-logout"
                style={{ height: 40 }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{user ? "Çıkış Yap" : "Giriş Yap"}</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={user ? signOut : () => navigate("/login")}
            className="ds-press ds-focus-ring w-full flex items-center gap-3 rounded-control hover-logout ds-body-strong"
            style={{ height: 40, padding: "0 12px" }}
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
