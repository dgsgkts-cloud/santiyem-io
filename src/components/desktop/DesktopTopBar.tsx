import { Bell, Search } from "lucide-react";
import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationCenter from "@/components/NotificationCenter";
import { PlanBadge } from "@/components/licensing/PlanBadge";
import { useLicense, openSubscriptionPage } from "@/lib/licenseStore";

interface DesktopTopBarProps {
  title: string;
  breadcrumb?: string[];
  actions?: React.ReactNode;
  onTabChange?: (tab: string) => void;
  onProjectSelect?: (id: string) => void;
}

const DesktopTopBar = ({ title, breadcrumb, actions, onTabChange, onProjectSelect }: DesktopTopBarProps) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const license = useLicense();



  const handleNavigate = (tab: string, projectId?: string) => {
    if (tab === "projects" && projectId && onProjectSelect) onProjectSelect(projectId);
    onTabChange?.(tab);
  };


  return (
    <div
      className="hidden lg:flex items-center justify-between px-6 shrink-0 bg-background border-b border-border"
      style={{ height: 52 }}
    >
      <div className="flex items-center gap-2">
        <h1 className="text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18 }}>
          {title}
        </h1>
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="flex items-center gap-1 ml-2">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                <span style={{ color: "#334155", fontSize: 13 }}>/</span>
                <span style={{ color: "#64748B", fontSize: 13 }}>{crumb}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {actions}

        <button
          onClick={openSubscriptionPage}
          className="hidden md:inline-flex"
          title={license.isTrial ? `Deneme — ${license.daysRemaining ?? 0} gün kaldı` : `${license.planLabel} planı`}
        >
          <PlanBadge plan={license.plan} />
        </button>


        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          className="hidden md:flex items-center gap-2 px-3 h-9 rounded-lg hover-icon-btn text-muted-foreground"
          title="Komut paleti (⌘K)"
        >
          <Search className="w-4 h-4" />
          <span className="text-[12px]">Ara veya komut…</span>
          <kbd className="ml-2 text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">⌘K</kbd>
        </button>

        {/* Notifications — opens global center */}
        <button
          onClick={() => setNotifOpen(true)}
          className="w-9 h-9 rounded-lg flex items-center justify-center relative hover-icon-btn"
          title="İş Merkezi"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1 bg-red-500">
              {unreadCount > 9 ? "9+" : unreadCount}
            </div>
          )}
        </button>
        <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} onNavigate={handleNavigate} />
      </div>
    </div>
  );
};

export default DesktopTopBar;
