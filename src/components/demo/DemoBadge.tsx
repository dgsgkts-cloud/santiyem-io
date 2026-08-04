import { useEffect, useState } from "react";
import { Sparkles, X, Clock } from "lucide-react";
import { useDemoAccount } from "@/hooks/useDemoAccount";

const DISMISS_KEY = "santiyem_demo_badge_dismissed";

/** Small, dismissible "Demo Hesabı" label. Never blocks controls. */
export const DemoBadge = () => {
  const demo = useDemoAccount();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => {
    if (dismissed) { try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ } }
  }, [dismissed]);

  if (!demo.isDemo || demo.blocked || dismissed) return null;

  return (
    <div
      className="fixed left-3 z-40 flex items-center gap-2 rounded-full border border-border/70 bg-card/95 px-3 py-1.5 shadow-lg backdrop-blur pointer-events-auto"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}
    >
      <Sparkles className="h-3.5 w-3.5" style={{ color: "#FF6B2B" }} />
      <span className="text-[11px] font-semibold text-foreground">Demo Hesabı</span>
      {demo.remainingDays !== null && (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          Kalan süre: {demo.remainingDays} gün
        </span>
      )}
      <button
        aria-label="Demo etiketini kapat"
        onClick={() => setDismissed(true)}
        className="ml-0.5 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default DemoBadge;
