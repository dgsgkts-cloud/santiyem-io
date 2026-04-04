import { Bell, Search, CalendarClock, FolderOpen, Check } from "lucide-react";
import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";

interface DesktopTopBarProps {
  title: string;
  breadcrumb?: string[];
  actions?: React.ReactNode;
  onTabChange?: (tab: string) => void;
  onProjectSelect?: (id: string) => void;
}

const DesktopTopBar = ({ title, breadcrumb, actions, onTabChange, onProjectSelect }: DesktopTopBarProps) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismissedIds } = useNotifications();

  const handleNotifClick = (n: typeof notifications[0]) => {
    markAsRead([n.id]);
    if (n.targetTab === "projects" && n.targetProjectId && onProjectSelect) {
      onProjectSelect(n.targetProjectId);
    }
    onTabChange?.(n.targetTab);
    setNotifOpen(false);
  };

  return (
    <div
      className="hidden lg:flex items-center justify-between px-6 shrink-0 bg-background border-b border-border"
      style={{ height: 52 }}
    >
      <div className="flex items-center gap-2">
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: "#F1F5F9" }}>
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
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-150"
          style={{ color: "#64748B" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#F1F5F9"; e.currentTarget.style.backgroundColor = "#161C23"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); }}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-150 relative"
            style={{ color: "#64748B" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#F1F5F9"; e.currentTarget.style.backgroundColor = "#161C23"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1" style={{ backgroundColor: "#EF4444" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </div>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-11 z-50 w-[320px] rounded-xl shadow-2xl max-h-[400px] flex flex-col" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
                <div className="p-3 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid #1E2732" }}>
                  <p className="text-[13px] font-semibold" style={{ color: "#F1F5F9" }}>Bildirimler</p>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-[11px] font-medium flex items-center gap-1" style={{ color: "#FF6B2B" }}>
                      <Check className="w-3 h-3" /> Tümünü Okundu
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: "#334155" }} />
                      <p className="text-[12px]" style={{ color: "#64748B" }}>Bildirim yok</p>
                    </div>
                  ) : (
                    notifications.map((n, i) => {
                      const isRead = dismissedIds.includes(n.id);
                      const Icon = n.type === "reminder" ? CalendarClock : FolderOpen;
                      const iconColor = n.completed ? "#22C55E" : n.daysLeft < 0 ? "#EF4444" : n.daysLeft === 0 ? "#F59E0B" : "#3B82F6";
                      return (
                        <button
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className="w-full text-left px-3 py-3 transition-colors duration-150 flex items-start gap-3"
                          style={{
                            borderBottom: i < notifications.length - 1 ? "1px solid #1E2732" : undefined,
                            backgroundColor: isRead ? "transparent" : "rgba(255,107,43,0.04)",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1C242D"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isRead ? "transparent" : "rgba(255,107,43,0.04)"; }}
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${iconColor}15` }}>
                            <Icon className="w-4 h-4" style={{ color: iconColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium truncate" style={{ color: isRead ? "#94A3B8" : "#F1F5F9" }}>{n.title}</p>
                            <p className="text-[11px] mt-0.5" style={{ color: isRead ? "#475569" : "#94A3B8" }}>{n.message}</p>
                          </div>
                          {!isRead && <div className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ backgroundColor: "#FF6B2B" }} />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesktopTopBar;
