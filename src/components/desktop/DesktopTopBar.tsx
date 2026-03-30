import { Bell, Search } from "lucide-react";
import { useState } from "react";

interface DesktopTopBarProps {
  title: string;
  breadcrumb?: string[];
  actions?: React.ReactNode;
}

const DesktopTopBar = ({ title, breadcrumb, actions }: DesktopTopBarProps) => {
  const [notifOpen, setNotifOpen] = useState(false);

  const notifications = [
    { text: "Proje A hakediş onayı bekleniyor", time: "2 saat önce" },
    { text: "Yeni mevzuat güncellemesi yayınlandı", time: "5 saat önce" },
    { text: "Yapı denetim raporu yüklendi", time: "1 gün önce" },
  ];

  return (
    <div
      className="hidden lg:flex items-center justify-between px-6 shrink-0"
      style={{ height: 52, backgroundColor: "#0F1419", borderBottom: "1px solid #1E2732" }}
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

        {/* Search */}
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
            onClick={() => setNotifOpen(!notifOpen)}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-150 relative"
            style={{ color: "#64748B" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#F1F5F9"; e.currentTarget.style.backgroundColor = "#161C23"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <Bell className="w-4 h-4" />
            <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: "#EF4444" }} />
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-11 z-50 w-[280px] rounded-xl shadow-2xl" style={{ backgroundColor: "#161C23", border: "1px solid #1E2732" }}>
                <div className="p-3" style={{ borderBottom: "1px solid #1E2732" }}>
                  <p className="text-[13px] font-semibold" style={{ color: "#F1F5F9" }}>Bildirimler</p>
                </div>
                {notifications.map((n, i) => (
                  <div
                    key={i}
                    className="px-3 py-3 transition-colors duration-150 cursor-pointer"
                    style={{ borderBottom: i < notifications.length - 1 ? "1px solid #1E2732" : undefined }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1C242D"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <p className="text-[12px]" style={{ color: "#F1F5F9" }}>{n.text}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>{n.time}</p>
                  </div>
                ))}
                <div className="p-2 text-center">
                  <button className="text-[12px] font-medium" style={{ color: "#FF6B2B" }}>Tümünü Gör</button>
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
